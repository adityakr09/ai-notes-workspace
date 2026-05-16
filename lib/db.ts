import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_URL || './data/peblo.db';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  // Ensure directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT NOT NULL DEFAULT 'Untitled Note',
      content     TEXT NOT NULL DEFAULT '',
      is_archived INTEGER NOT NULL DEFAULT 0,
      is_public   INTEGER NOT NULL DEFAULT 0,
      share_id    TEXT UNIQUE,
      category    TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id      TEXT PRIMARY KEY,
      name    TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(name, user_id)
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (note_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS ai_summaries (
      id          TEXT PRIMARY KEY,
      note_id     TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      summary     TEXT NOT NULL,
      action_items TEXT NOT NULL DEFAULT '[]',
      suggested_title TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_note_tags_note ON note_tags(note_id);
    CREATE INDEX IF NOT EXISTS idx_ai_summaries_user ON ai_summaries(user_id);
    CREATE INDEX IF NOT EXISTS idx_ai_summaries_note ON ai_summaries(note_id);
  `);
}

// ─── Type Definitions ─────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_archived: number;
  is_public: number;
  share_id: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
  tags?: string[];
  latest_summary?: AiSummary | null;
}

export interface Tag {
  id: string;
  name: string;
  user_id: string;
}

export interface AiSummary {
  id: string;
  note_id: string;
  user_id: string;
  summary: string;
  action_items: string; // JSON array
  suggested_title: string | null;
  created_at: string;
}

// ─── User Queries ─────────────────────────────────────────────────────────────

export function createUser(id: string, name: string, email: string, passwordHash: string): User {
  const db = getDb();
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)
  `).run(id, name, email, passwordHash);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;
}

export function getUserByEmail(email: string): User | null {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as User | null;
}

export function getUserById(id: string): User | null {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | null;
}

// ─── Note Queries ─────────────────────────────────────────────────────────────

export function getNotesByUser(
  userId: string,
  opts: { search?: string; tag?: string; archived?: boolean; sort?: string } = {}
): Note[] {
  const db = getDb();
  const { search, tag, archived = false, sort = 'updated_at' } = opts;

  let query = `
    SELECT n.*, GROUP_CONCAT(t.name) as tag_list
    FROM notes n
    LEFT JOIN note_tags nt ON n.id = nt.note_id
    LEFT JOIN tags t ON nt.tag_id = t.id
    WHERE n.user_id = ? AND n.is_archived = ?
  `;
  const params: (string | number)[] = [userId, archived ? 1 : 0];

  if (search) {
    query += ` AND (n.title LIKE ? OR n.content LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (tag) {
    query += ` AND n.id IN (
      SELECT nt2.note_id FROM note_tags nt2
      JOIN tags t2 ON nt2.tag_id = t2.id
      WHERE t2.name = ? AND t2.user_id = ?
    )`;
    params.push(tag, userId);
  }

  const sortColumn = sort === 'created_at' ? 'n.created_at' : 'n.updated_at';
  query += ` GROUP BY n.id ORDER BY ${sortColumn} DESC`;

  const rows = db.prepare(query).all(...params) as (Note & { tag_list: string | null })[];

  return rows.map((r) => ({
    ...r,
    tags: r.tag_list ? r.tag_list.split(',') : [],
  }));
}

export function getNoteById(noteId: string, userId?: string): Note | null {
  const db = getDb();
  const query = userId
    ? 'SELECT * FROM notes WHERE id = ? AND user_id = ?'
    : 'SELECT * FROM notes WHERE id = ?';
  const params = userId ? [noteId, userId] : [noteId];
  const note = db.prepare(query).get(...params) as Note | null;
  if (!note) return null;

  const tags = db
    .prepare(`SELECT t.name FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?`)
    .all(noteId) as { name: string }[];

  const summary = db
    .prepare(`SELECT * FROM ai_summaries WHERE note_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(noteId) as AiSummary | null;

  return { ...note, tags: tags.map((t) => t.name), latest_summary: summary };
}

export function getNoteByShareId(shareId: string): Note | null {
  const db = getDb();
  const note = db
    .prepare('SELECT * FROM notes WHERE share_id = ? AND is_public = 1')
    .get(shareId) as Note | null;
  if (!note) return null;

  const tags = db
    .prepare(`SELECT t.name FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?`)
    .all(note.id) as { name: string }[];

  const summary = db
    .prepare(`SELECT * FROM ai_summaries WHERE note_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(note.id) as AiSummary | null;

  return { ...note, tags: tags.map((t) => t.name), latest_summary: summary };
}

export function createNote(
  id: string,
  userId: string,
  title: string,
  content: string,
  category?: string
): Note {
  const db = getDb();
  db.prepare(`
    INSERT INTO notes (id, user_id, title, content, category) VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, title, content, category ?? null);
  return getNoteById(id, userId) as Note;
}

export function updateNote(
  noteId: string,
  userId: string,
  data: Partial<Pick<Note, 'title' | 'content' | 'is_archived' | 'is_public' | 'share_id' | 'category'>>
): Note | null {
  const db = getDb();
  const fields = Object.keys(data)
    .map((k) => `${k} = ?`)
    .join(', ');
  const values = [...Object.values(data), new Date().toISOString(), noteId, userId];

  db.prepare(`UPDATE notes SET ${fields}, updated_at = ? WHERE id = ? AND user_id = ?`).run(
    ...values
  );
  return getNoteById(noteId, userId);
}

export function deleteNote(noteId: string, userId: string): void {
  getDb().prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(noteId, userId);
}

// ─── Tag Queries ──────────────────────────────────────────────────────────────

export function upsertTag(id: string, name: string, userId: string): Tag {
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM tags WHERE name = ? AND user_id = ?')
    .get(name, userId) as Tag | null;
  if (existing) return existing;
  db.prepare('INSERT INTO tags (id, name, user_id) VALUES (?, ?, ?)').run(id, name, userId);
  return { id, name, user_id: userId };
}

export function setNoteTags(noteId: string, tagIds: string[]): void {
  const db = getDb();
  const deleteStmt = db.prepare('DELETE FROM note_tags WHERE note_id = ?');
  const insertStmt = db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)');

  const setTags = db.transaction(() => {
    deleteStmt.run(noteId);
    for (const tagId of tagIds) insertStmt.run(noteId, tagId);
  });
  setTags();
}

export function getUserTags(userId: string): (Tag & { count: number })[] {
  return getDb().prepare(`
    SELECT t.*, COUNT(nt.note_id) as count
    FROM tags t
    LEFT JOIN note_tags nt ON t.id = nt.tag_id
    LEFT JOIN notes n ON nt.note_id = n.id AND n.is_archived = 0
    WHERE t.user_id = ?
    GROUP BY t.id
    ORDER BY count DESC
  `).all(userId) as (Tag & { count: number })[];
}

// ─── AI Summary Queries ───────────────────────────────────────────────────────

export function createAiSummary(
  id: string,
  noteId: string,
  userId: string,
  summary: string,
  actionItems: string[],
  suggestedTitle?: string
): AiSummary {
  const db = getDb();
  db.prepare(`
    INSERT INTO ai_summaries (id, note_id, user_id, summary, action_items, suggested_title)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, noteId, userId, summary, JSON.stringify(actionItems), suggestedTitle ?? null);
  return db.prepare('SELECT * FROM ai_summaries WHERE id = ?').get(id) as AiSummary;
}

export function getAiSummaryCount(userId: string): number {
  const result = getDb()
    .prepare('SELECT COUNT(*) as count FROM ai_summaries WHERE user_id = ?')
    .get(userId) as { count: number };
  return result.count;
}

// ─── Insights Queries ─────────────────────────────────────────────────────────

export function getInsights(userId: string) {
  const db = getDb();

  const totalNotes = (
    db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND is_archived = 0').get(userId) as { count: number }
  ).count;

  const archivedNotes = (
    db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND is_archived = 1').get(userId) as { count: number }
  ).count;

  const recentNotes = db.prepare(`
    SELECT id, title, updated_at FROM notes
    WHERE user_id = ? AND is_archived = 0
    ORDER BY updated_at DESC LIMIT 5
  `).all(userId) as { id: string; title: string; updated_at: string }[];

  const topTags = getUserTags(userId).slice(0, 8);

  const aiUsage = getAiSummaryCount(userId);

  // Weekly activity (last 7 days)
  const weeklyActivity = db.prepare(`
    SELECT DATE(updated_at) as day, COUNT(*) as count
    FROM notes
    WHERE user_id = ? AND updated_at >= datetime('now', '-7 days')
    GROUP BY DATE(updated_at)
    ORDER BY day ASC
  `).all(userId) as { day: string; count: number }[];

  return { totalNotes, archivedNotes, recentNotes, topTags, aiUsage, weeklyActivity };
}

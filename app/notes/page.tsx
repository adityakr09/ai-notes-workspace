'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string | null;
  updated_at: string;
  is_archived: number;
  is_public: number;
  share_id: string | null;
}

interface Tag {
  id: string;
  name: string;
  count: number;
}

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const fetchNotes = useCallback(async (q?: string, tag?: string, archived?: boolean) => {
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    if (tag) params.set('tag', tag);
    if (archived) params.set('archived', 'true');
    const res = await fetch(`/api/notes?${params}`);
    if (res.status === 401) { router.push('/login'); return; }
    const data = await res.json();
    setNotes(data.notes || []);
  }, [router]);

  const fetchTags = useCallback(async () => {
    const res = await fetch('/api/insights');
    if (!res.ok) return;
    const data = await res.json();
    setTags(data.topTags || []);
  }, []);

  useEffect(() => {
    async function init() {
      const res = await fetch('/api/auth/me');
      if (!res.ok) { router.push('/login'); return; }
      setUser(await res.json());
      await fetchNotes();
      await fetchTags();
      setLoading(false);
    }
    init();
  }, [router, fetchNotes, fetchTags]);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchNotes(search, activeTag, showArchived);
    }, 300);
  }, [search, activeTag, showArchived, fetchNotes]);

  async function createNote() {
    setCreating(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Note', content: '' }),
      });
      const data = await res.json();
      router.push(`/notes/${data.note.id}`);
    } catch {
      toast.error('Failed to create note');
      setCreating(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/me', { method: 'DELETE' });
    router.push('/login');
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col w-56 border-r flex-shrink-0"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        {/* Logo */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">📝</span>
            <span className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
              Peblo Notes
            </span>
          </div>
        </div>

        {/* New Note */}
        <div className="p-3">
          <button onClick={createNote} disabled={creating} className="btn-primary w-full text-sm py-2">
            {creating ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : '+ New Note'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          <button
            onClick={() => { setShowArchived(false); setActiveTag(''); }}
            className={`sidebar-item w-full text-left ${!showArchived && !activeTag ? 'active' : ''}`}
          >
            <span>🗒️</span> All Notes
          </button>
          <Link href="/dashboard" className="sidebar-item">
            <span>📊</span> Dashboard
          </Link>
          <button
            onClick={() => { setShowArchived(true); setActiveTag(''); }}
            className={`sidebar-item w-full text-left ${showArchived ? 'active' : ''}`}
          >
            <span>🗃️</span> Archive
          </button>

          {tags.length > 0 && (
            <>
              <div
                className="px-3 py-2 text-xs uppercase tracking-widest font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                Tags
              </div>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => { setActiveTag(activeTag === tag.name ? '' : tag.name); setShowArchived(false); }}
                  className={`sidebar-item w-full text-left ${activeTag === tag.name ? 'active' : ''}`}
                >
                  <span style={{ color: 'var(--accent)' }}>#</span>
                  <span className="truncate">{tag.name}</span>
                  <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{tag.count}</span>
                </button>
              ))}
            </>
          )}
        </nav>

        {/* User */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
              style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
            </div>
            <button onClick={logout} className="text-xs" style={{ color: 'var(--text-muted)' }} title="Sign out">
              ↪
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div
          className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
        >
          <input
            type="text"
            className="input-base max-w-sm"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {activeTag && (
            <span className="tag-pill">
              #{activeTag}
              <button onClick={() => setActiveTag('')} style={{ marginLeft: 4, opacity: 0.7 }}>✕</button>
            </span>
          )}
          <span className="ml-auto text-sm" style={{ color: 'var(--text-muted)' }}>
            {notes.length} note{notes.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto p-4">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 animate-fade-in">
              <span className="text-5xl opacity-20">📓</span>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {search ? 'No notes match your search.' : 'No notes yet. Create your first one!'}
              </p>
              {!search && (
                <button onClick={createNote} className="btn-primary text-sm">+ New Note</button>
              )}
            </div>
          ) : (
            <div className="grid gap-2 max-w-3xl mx-auto">
              {notes.map((note) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  className="card p-4 hover:border-amber-300 transition-all animate-fade-in group block"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-display font-medium truncate group-hover:text-amber-700 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {note.title || 'Untitled Note'}
                      </h3>
                      {note.content && (
                        <p
                          className="text-sm mt-0.5 line-clamp-2"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {note.content.slice(0, 120)}
                        </p>
                      )}
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.tags.map((t) => (
                            <span key={t} className="tag-pill">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(note.updated_at)}
                      </span>
                      {note.is_public === 1 && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--sage-light)', color: 'var(--sage)' }}
                        >
                          Public
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

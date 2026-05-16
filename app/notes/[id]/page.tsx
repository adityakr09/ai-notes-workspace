'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface AiSummary {
  summary: string;
  action_items: string;
  suggested_title: string | null;
}

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
  latest_summary?: AiSummary | null;
}

export default function NoteEditorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ summary: string; action_items: string[]; suggested_title: string } | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const isDirty = useRef(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/notes/${params.id}`);
      if (res.status === 401) { router.push('/login'); return; }
      if (!res.ok) { toast.error('Note not found'); router.push('/notes'); return; }
      const { note } = await res.json();
      setNote(note);
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags || []);
      setCategory(note.category || '');
      if (note.is_public && note.share_id) {
        setShareUrl(`${window.location.origin}/shared/${note.share_id}`);
      }
      if (note.latest_summary) {
        const s = note.latest_summary;
        setAiResult({
          summary: s.summary,
          action_items: JSON.parse(s.action_items || '[]'),
          suggested_title: s.suggested_title || note.title,
        });
      }
    }
    load();
  }, [params.id, router]);

  const save = useCallback(
    async (data: { title?: string; content?: string; tags?: string[]; category?: string }) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/notes/${params.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Save failed');
        setLastSaved(new Date());
        isDirty.current = false;
      } catch {
        toast.error('Auto-save failed');
      } finally {
        setSaving(false);
      }
    },
    [params.id]
  );

  // Auto-save after 800ms of inactivity
  function scheduleAutoSave(data: { title?: string; content?: string }) {
    isDirty.current = true;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => save({ ...data, tags, category }), 800);
  }

  function handleTitleChange(v: string) {
    setTitle(v);
    scheduleAutoSave({ title: v, content });
  }

  function handleContentChange(v: string) {
    setContent(v);
    scheduleAutoSave({ title, content: v });
  }

  function addTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const t = tagInput.trim().toLowerCase();
      if (t && !tags.includes(t)) {
        const newTags = [...tags, t];
        setTags(newTags);
        save({ title, content, tags: newTags, category });
      }
      setTagInput('');
    }
  }

  function removeTag(t: string) {
    const newTags = tags.filter((x) => x !== t);
    setTags(newTags);
    save({ title, content, tags: newTags, category });
  }

  async function generateSummary() {
    setAiLoading(true);
    setShowAiPanel(true);
    try {
      const res = await fetch(`/api/notes/${params.id}/generate-summary`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiResult(data);
      toast.success('AI summary generated!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  }

  async function togglePublic() {
    const newPublic = note?.is_public ? 0 : 1;
    const res = await fetch(`/api/notes/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_public: newPublic }),
    });
    const data = await res.json();
    setNote(data.note);
    if (data.note.is_public && data.note.share_id) {
      const url = `${window.location.origin}/shared/${data.note.share_id}`;
      setShareUrl(url);
      toast.success('Note is now public!');
    } else {
      setShareUrl('');
      toast.success('Note set to private.');
    }
  }

  async function archiveNote() {
    await fetch(`/api/notes/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived: 1 }),
    });
    toast.success('Note archived');
    router.push('/notes');
  }

  async function deleteNote() {
    if (!confirm('Delete this note permanently?')) return;
    await fetch(`/api/notes/${params.id}`, { method: 'DELETE' });
    toast.success('Note deleted');
    router.push('/notes');
  }

  function copyShareUrl() {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied!');
  }

  if (!note) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg)' }}>
      {/* Topbar */}
      <header
        className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <Link href="/notes" className="btn-ghost text-xs">← Back</Link>

        <div className="flex-1" />

        {/* Save status */}
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}
        </span>

        {/* AI Button */}
        <button
          onClick={generateSummary}
          disabled={aiLoading}
          className="btn-ghost text-xs gap-1.5"
          style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
        >
          {aiLoading ? <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> : '✦'}
          AI Summary
        </button>

        {/* Share toggle */}
        <button onClick={togglePublic} className="btn-ghost text-xs">
          {note.is_public ? '🔓 Public' : '🔒 Private'}
        </button>

        {/* Archive */}
        <button onClick={archiveNote} className="btn-ghost text-xs">Archive</button>

        {/* Delete */}
        <button onClick={deleteNote} className="btn-ghost text-xs" style={{ color: '#e53e3e', borderColor: '#e53e3e' }}>Delete</button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-10">
            {/* Category */}
            <input
              type="text"
              className="text-xs mb-3 px-2 py-1 rounded border outline-none"
              style={{
                background: 'transparent',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
              }}
              placeholder="Category (e.g. Work, Personal)"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                save({ title, content, tags, category: e.target.value });
              }}
            />

            {/* Title */}
            <textarea
              className="w-full resize-none outline-none font-display font-semibold leading-tight"
              style={{
                fontSize: '2rem',
                background: 'transparent',
                color: 'var(--text-primary)',
                border: 'none',
                fontFamily: 'var(--font-display)',
              }}
              rows={1}
              placeholder="Untitled Note"
              value={title}
              onChange={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
                handleTitleChange(e.target.value);
              }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = t.scrollHeight + 'px';
              }}
            />

            {/* Divider */}
            <div className="my-4" style={{ borderTop: '1px solid var(--border)' }} />

            {/* Content */}
            <textarea
              className="note-content w-full resize-none outline-none min-h-96"
              style={{ background: 'transparent', border: 'none' }}
              placeholder="Start writing… Press Tab to indent, Enter for new paragraph."
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
            />

            {/* Tags */}
            <div className="mt-8 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span key={t} className="tag-pill">
                    {t}
                    <button onClick={() => removeTag(t)} className="opacity-60 hover:opacity-100">✕</button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                className="text-sm outline-none"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
                placeholder="Add tag — press Enter or comma"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
              />
            </div>

            {/* Share URL */}
            {shareUrl && (
              <div
                className="mt-4 p-3 rounded-lg flex items-center gap-2 text-sm"
                style={{ background: 'var(--sage-light)', color: 'var(--sage)' }}
              >
                <span>🔗</span>
                <span className="flex-1 truncate font-mono text-xs">{shareUrl}</span>
                <button onClick={copyShareUrl} className="flex-shrink-0 underline text-xs">Copy</button>
              </div>
            )}
          </div>
        </div>

        {/* AI Panel */}
        {showAiPanel && (
          <aside
            className="w-80 border-l flex flex-col overflow-y-auto flex-shrink-0 animate-fade-in"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>✦ AI Insights</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Powered by Claude</p>
              </div>
              <button onClick={() => setShowAiPanel(false)} style={{ color: 'var(--text-muted)' }}>✕</button>
            </div>

            {aiLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                <div className="spinner" style={{ width: 24, height: 24 }} />
                <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                  Analysing your note…
                </p>
              </div>
            ) : aiResult ? (
              <div className="p-4 space-y-5 flex-1">
                {/* Suggested title */}
                {aiResult.suggested_title && aiResult.suggested_title !== title && (
                  <div>
                    <p className="text-xs uppercase tracking-widest font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      Suggested Title
                    </p>
                    <p className="text-sm font-display font-medium" style={{ color: 'var(--text-primary)' }}>
                      {aiResult.suggested_title}
                    </p>
                    <button
                      onClick={() => handleTitleChange(aiResult.suggested_title)}
                      className="mt-1.5 text-xs underline"
                      style={{ color: 'var(--accent)' }}
                    >
                      Apply title
                    </button>
                  </div>
                )}

                {/* Summary */}
                <div>
                  <p className="text-xs uppercase tracking-widest font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Summary
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {aiResult.summary}
                  </p>
                </div>

                {/* Action items */}
                {aiResult.action_items.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-widest font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                      Action Items
                    </p>
                    <ul className="space-y-1.5">
                      {aiResult.action_items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }}>◻</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button onClick={generateSummary} className="btn-ghost w-full text-xs">
                  ↻ Regenerate
                </button>
              </div>
            ) : null}
          </aside>
        )}
      </div>
    </div>
  );
}

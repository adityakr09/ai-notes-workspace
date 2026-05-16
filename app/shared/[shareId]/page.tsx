import Link from 'next/link';

interface AiSummary {
  summary: string;
  action_items: string;
  suggested_title: string | null;
}

interface SharedNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  category: string | null;
  updated_at: string;
  created_at: string;
  latest_summary: AiSummary | null;
}

async function getSharedNote(shareId: string): Promise<{ note: SharedNote; author: { name: string } | null } | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/shared/${shareId}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function SharedNotePage({ params }: { params: { shareId: string } }) {
  const data = await getSharedNote(params.shareId);

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: 'var(--bg)' }}>
        <span className="text-5xl mb-4">🔒</span>
        <h1 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Note not found
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          This note is private or doesn&apos;t exist.
        </p>
        <Link href="/" className="btn-primary text-sm">
          Go to Peblo Notes
        </Link>
      </div>
    );
  }

  const { note, author } = data;
  const actionItems: string[] = note.latest_summary
    ? JSON.parse(note.latest_summary.action_items || '[]')
    : [];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="border-b px-6 py-3 flex items-center gap-3"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <Link href="/" className="flex items-center gap-2">
          <span>📝</span>
          <span className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Peblo Notes
          </span>
        </Link>
        <span className="mx-2" style={{ color: 'var(--border-strong)' }}>/</span>
        <span className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>{note.title}</span>
        <div className="ml-auto">
          <span
            className="text-xs px-2 py-1 rounded"
            style={{ background: 'var(--sage-light)', color: 'var(--sage)' }}
          >
            Public note
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Meta */}
        <div className="flex items-center gap-3 mb-6">
          {author && (
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}
              >
                {author.name[0].toUpperCase()}
              </div>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{author.name}</span>
            </div>
          )}
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Updated {new Date(note.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        {/* Category */}
        {note.category && (
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            {note.category}
          </p>
        )}

        {/* Title */}
        <h1 className="font-display text-3xl font-semibold leading-tight mb-6" style={{ color: 'var(--text-primary)' }}>
          {note.title}
        </h1>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {note.tags.map((t) => (
              <span key={t} className="tag-pill">{t}</span>
            ))}
          </div>
        )}

        {/* AI Summary */}
        {note.latest_summary && (
          <div
            className="p-4 rounded-lg mb-8 border"
            style={{ background: 'var(--accent-light)', borderColor: 'color-mix(in srgb, var(--accent) 20%, transparent)' }}
          >
            <p className="text-xs uppercase tracking-widest font-medium mb-2" style={{ color: 'var(--accent)' }}>
              ✦ AI Summary
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {note.latest_summary.summary}
            </p>
            {actionItems.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--accent)' }}>Action Items</p>
                <ul className="space-y-1">
                  {actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }}>◻</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="my-6" style={{ borderTop: '1px solid var(--border)' }} />

        {/* Content */}
        <div className="note-content whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
          {note.content || <em style={{ color: 'var(--text-muted)' }}>This note has no content.</em>}
        </div>

        {/* Footer */}
        <div
          className="mt-16 pt-6 border-t flex items-center justify-between text-xs"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <span>Shared via Peblo Notes</span>
          <Link href="/signup" style={{ color: 'var(--accent)' }} className="underline-anim">
            Create your own workspace →
          </Link>
        </div>
      </div>
    </div>
  );
}

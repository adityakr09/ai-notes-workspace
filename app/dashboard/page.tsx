'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Insights {
  totalNotes: number;
  archivedNotes: number;
  recentNotes: { id: string; title: string; updated_at: string }[];
  topTags: { id: string; name: string; count: number }[];
  aiUsage: number;
  weeklyActivity: { day: string; count: number }[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DashboardPage() {
  const router = useRouter();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    async function load() {
      const authRes = await fetch('/api/auth/me');
      if (!authRes.ok) { router.push('/login'); return; }
      setUser(await authRes.json());

      const res = await fetch('/api/insights');
      if (!res.ok) return;
      setInsights(await res.json());
    }
    load();
  }, [router]);

  if (!insights) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  const maxActivity = Math.max(...insights.weeklyActivity.map((w) => w.count), 1);

  // Build last 7 days including zeros
  const last7: { day: string; label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split('T')[0];
    const found = insights.weeklyActivity.find((w) => w.day === dayStr);
    last7.push({
      day: dayStr,
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      count: found?.count || 0,
    });
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="flex items-center gap-4 px-6 py-3 border-b sticky top-0 z-10"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <Link href="/notes" className="btn-ghost text-xs">← Notes</Link>
        <div className="flex items-center gap-2">
          <span>📝</span>
          <span className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>Peblo Notes</span>
        </div>
        <span className="ml-auto text-sm font-display italic" style={{ color: 'var(--text-muted)' }}>
          Good work, {user?.name?.split(' ')[0]}
        </span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Your Workspace
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Productivity insights & statistics</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Active Notes', value: insights.totalNotes, icon: '🗒️' },
            { label: 'Archived', value: insights.archivedNotes, icon: '🗃️' },
            { label: 'AI Summaries', value: insights.aiUsage, icon: '✦' },
            { label: 'Tags Used', value: insights.topTags.length, icon: '#' },
          ].map((stat) => (
            <div key={stat.label} className="card p-4 animate-fade-in">
              <div className="text-xl mb-2">{stat.icon}</div>
              <div
                className="font-display text-2xl font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {stat.value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Weekly Activity */}
          <div className="card p-5">
            <h2 className="font-display font-semibold mb-4 text-sm uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Weekly Activity
            </h2>
            <div className="flex items-end gap-2 h-24">
              {last7.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm transition-all"
                    style={{
                      height: `${(d.count / maxActivity) * 80}px`,
                      minHeight: d.count > 0 ? 4 : 2,
                      background: d.count > 0 ? 'var(--accent)' : 'var(--border)',
                    }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.label}</span>
                  {d.count > 0 && (
                    <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{d.count}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Top Tags */}
          <div className="card p-5">
            <h2 className="font-display font-semibold mb-4 text-sm uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Top Tags
            </h2>
            {insights.topTags.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No tags yet. Add some to your notes!</p>
            ) : (
              <div className="space-y-2">
                {insights.topTags.map((tag, i) => (
                  <div key={tag.id} className="flex items-center gap-3">
                    <span className="text-xs w-4" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          #{tag.name}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{tag.count}</span>
                      </div>
                      <div className="h-1 rounded-full" style={{ background: 'var(--border)' }}>
                        <div
                          className="h-1 rounded-full"
                          style={{
                            width: `${(tag.count / (insights.topTags[0]?.count || 1)) * 100}%`,
                            background: 'var(--accent)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notes */}
          <div className="card p-5 md:col-span-2">
            <h2 className="font-display font-semibold mb-4 text-sm uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Recently Edited
            </h2>
            {insights.recentNotes.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No recent notes.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {insights.recentNotes.map((note) => (
                  <Link
                    key={note.id}
                    href={`/notes/${note.id}`}
                    className="flex items-center justify-between py-2.5 group"
                  >
                    <span
                      className="text-sm font-medium group-hover:underline truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {note.title || 'Untitled Note'}
                    </span>
                    <span className="text-xs flex-shrink-0 ml-4" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(note.updated_at)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

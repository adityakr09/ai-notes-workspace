'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Account created! Welcome to Peblo Notes.');
      router.push('/notes');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      <div
        className="hidden lg:flex flex-col justify-between w-96 p-12"
        style={{ background: 'var(--ink-950)', color: '#f5f0e8' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-16">
            <span className="text-2xl">📝</span>
            <span className="font-display text-xl font-semibold">Peblo Notes</span>
          </div>
          <h2 className="font-display text-2xl leading-snug">
            Your AI-powered workspace for capturing, organising, and understanding your thoughts.
          </h2>
          <ul className="mt-8 space-y-3">
            {['AI summaries & action items', 'Tags & categories', 'Search & filtering', 'Public share links', 'Productivity insights'].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm opacity-80">
                <span className="text-amber-400">✦</span> {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs opacity-30 font-body">Free to use during evaluation.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <span className="text-xl">📝</span>
              <span className="font-display text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Peblo Notes
              </span>
            </div>
            <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Create your account
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Start your AI-powered workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Full name
              </label>
              <input
                type="text"
                className="input-base"
                placeholder="Jane Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Email
              </label>
              <input
                type="email"
                className="input-base"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <input
                type="password"
                className="input-base"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" className="underline-anim font-medium" style={{ color: 'var(--accent)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

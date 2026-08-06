'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      setSent(true);
      if (data.resetLink) {
        setResetLink(data.resetLink);
      }
      showToast(data.message || 'Password reset link sent!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to send reset email', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] px-4">
      <div className="max-w-md w-full space-y-8 p-8 bg-[#1a1a1a] border border-[#282828] rounded-2xl shadow-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#6e56f8]/10 text-[#6e56f8] mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Reset your password
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Enter your email address and we&apos;ll send you a recovery link.
          </p>
        </div>
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#121212] border border-[#282828] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#6e56f8] transition-colors"
              placeholder="Enter your email"
            />
          </div>

          {sent && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-xl text-xs space-y-1">
              <p className="font-semibold">{resetLink ? 'Password reset link generated:' : 'Check your email for the reset link.'}</p>
              {resetLink && (
                <a href={resetLink} className="text-[#6e56f8] hover:underline break-all font-mono">
                  {resetLink}
                </a>
              )}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || sent}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-[#6e56f8] hover:bg-[#5b45e0] active:scale-[0.99] transition-all disabled:opacity-50 shadow-lg shadow-[#6e56f8]/20"
            >
              {loading ? 'Sending...' : sent ? 'Email Sent' : 'Send Reset Link'}
            </button>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-xs text-zinc-400 hover:text-white transition-colors"
            >
              ← Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}


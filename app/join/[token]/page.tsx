'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState<{ id: string; state: string } | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/sessions/guest/${token}`);
        if (!response.ok) {
          setError('Invalid join link or session expired');
          setLoading(false);
          return;
        }

        const data = await response.json();
        setSession(data.session);
      } catch (err) {
        setError('Failed to load session details');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSession();
    } else {
      setError('Invalid join link');
      setLoading(false);
    }
  }, [token]);

  const handleJoin = () => {
    if (session) {
      router.push(`/record/guest/${token}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212] text-white">
        <div className="text-sm font-medium text-zinc-400">Loading studio invitation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212] px-4">
        <div className="max-w-md w-full p-8 bg-[#1a1a1a] border border-[#282828] rounded-2xl shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Invitation Unavailable</h1>
          <p className="text-sm text-zinc-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] px-4">
      <div className="max-w-md w-full space-y-6 p-8 bg-[#1a1a1a] border border-[#282828] rounded-2xl shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#6e56f8]/10 text-[#6e56f8]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Join Studio Session
          </h2>
          <p className="text-sm text-zinc-400">
            You&apos;ve been invited to join a studio recording. No account required.
          </p>
        </div>
        <button
          onClick={handleJoin}
          className="w-full py-3.5 px-4 bg-[#6e56f8] hover:bg-[#5b45e0] active:scale-[0.99] text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-[#6e56f8]/20 flex items-center justify-center gap-2"
        >
          <span>Join Studio Room</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}


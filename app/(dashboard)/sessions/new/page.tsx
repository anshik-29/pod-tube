'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Radio, Plus, Copy, Mail, Video, CheckCircle, ArrowRight } from 'lucide-react';

export default function NewSessionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<{ id: string; guest_token: string } | null>(null);
  const [guestLink, setGuestLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreateSession = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create session');
        setLoading(false);
        return;
      }

      setSession(data.session);
      setLoading(false);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session && typeof window !== 'undefined') {
      setGuestLink(`${window.location.origin}/join/${session.guest_token}`);
    }
  }, [session]);

  return (
    <div className="max-w-2xl mx-auto py-8 text-white space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create New Studio Session</h1>
        <p className="text-xs text-[#aaaaaa] mt-1">Set up a local multi-track studio session for yourself or invite guests.</p>
      </div>

      <div className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-6 space-y-6 shadow-2xl">
        {!session ? (
          <div className="space-y-6">
            <div className="bg-[#141418] border border-[#24242e] rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold text-[#6e56f8] uppercase tracking-wider">Studio Setup</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Record high-quality uncompressed video and audio locally in your browser. You can record solo or share a guest link.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-center gap-2">
                <span>⚠️ {error}</span>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={async () => {
                  setLoading(true);
                  setError('');
                  try {
                    const token = localStorage.getItem('token');
                    const response = await fetch('/api/sessions', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                    });

                    const data = await response.json();

                    if (!response.ok) {
                      setError(data.error || 'Failed to create session');
                      setLoading(false);
                      return;
                    }

                    router.push(`/record/${data.session.id}`);
                  } catch (err) {
                    setError('An error occurred. Please try again.');
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full py-3.5 px-6 bg-[#e53935] hover:bg-[#d32f2f] text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading ? (
                  <span>Creating Studio...</span>
                ) : (
                  <>
                    <Radio className="w-4 h-4" />
                    <span>Start Solo Studio</span>
                  </>
                )}
              </button>

              <div className="relative flex justify-center text-xs">
                <div className="w-full border-t border-[#282828] absolute top-1/2"></div>
                <span className="bg-[#1a1a1a] px-3 text-[#666666] relative z-10 font-medium">or</span>
              </div>

              <button
                onClick={handleCreateSession}
                disabled={loading}
                className="w-full py-3.5 px-6 bg-[#6e56f8] hover:bg-[#5e44f6] text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading ? (
                  <span>Creating Studio...</span>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Create Session with Guest Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-emerald-300">Studio Session Created!</div>
                <div className="text-xs text-slate-300 mt-0.5">Share the guest link below or jump into the studio.</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">Guest Invite Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={guestLink}
                  readOnly
                  className="flex-1 bg-[#121215] border border-[#282828] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(guestLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    copied
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-[#28282e] hover:bg-[#32323a] text-slate-200 border border-[#383842]'
                  }`}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => router.push(`/record/${session.id}`)}
                className="flex-1 py-3 px-6 bg-[#6e56f8] hover:bg-[#5e44f6] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" />
                <span>Enter Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-3 bg-[#24242a] hover:bg-[#2c2c34] text-slate-300 rounded-xl text-xs font-bold transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

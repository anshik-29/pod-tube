'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/ui/Toast';

interface Session {
  id: string;
  guest_token: string;
  state: string;
  recording_started_at: string | null;
  created_at: string;
  updated_at: string;
  episode_title?: string | null;
  episode_id?: string | null;
}

export default function SessionsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchSessions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/sessions', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }

        const data = await response.json();
        setSessions(data.sessions || []);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        showToast('Failed to load sessions', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user, showToast]);

  const handleDeleteSession = async (sessionId: string) => {
    if (deletingSessionId === sessionId) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete session');
        }

        showToast('Session deleted successfully', 'success');
        const sessionsResponse = await fetch('/api/sessions', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await sessionsResponse.json();
        setSessions(data.sessions || []);
        setDeletingSessionId(null);
      } catch (error) {
        console.error('Error deleting session:', error);
        showToast('Failed to delete session', 'error');
        setDeletingSessionId(null);
      }
    } else {
      setDeletingSessionId(sessionId);
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'ready':
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'processing':
      case 'uploading':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'recording':
        return 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse';
      case 'failed':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-zinc-400 text-sm">
        Loading session history...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Studio Sessions</h1>
          <p className="text-sm text-zinc-400 mt-1">History of all active and completed recording studio rooms</p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No sessions recorded yet</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto mt-1">
              Start a new recording session from your studio dashboard to begin creating content.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6e56f8] hover:bg-[#5b45e0] text-white rounded-xl text-xs font-medium transition-all shadow-lg shadow-[#6e56f8]/20"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-5 hover:border-[#383838] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-white truncate">
                    {session.episode_title || `Session ${session.id.substring(0, 8)}`}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider ${getStateBadge(session.state)}`}>
                    {session.state}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Created: {new Date(session.created_at).toLocaleString()}
                </p>
                {session.episode_id && (
                  <p className="text-xs text-[#6e56f8] font-medium">
                    Episode: <Link href={`/episodes/${session.episode_id}`} className="hover:underline">{session.episode_title || 'View Recording'}</Link>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/sessions/${session.id}`}
                  className="px-3.5 py-2 bg-[#121212] hover:bg-zinc-800 border border-[#282828] text-zinc-200 rounded-xl text-xs font-medium transition-colors"
                >
                  View Details
                </Link>

                {session.episode_id && (
                  <Link
                    href={`/episodes/${session.episode_id}`}
                    className="px-3.5 py-2 bg-[#6e56f8] hover:bg-[#5b45e0] text-white rounded-xl text-xs font-medium transition-colors shadow-sm"
                  >
                    Episode Assets
                  </Link>
                )}

                {deletingSessionId === session.id ? (
                  <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-xl">
                    <span className="text-[11px] text-red-400 font-medium">Confirm?</span>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="px-2 py-1 bg-red-600 text-white rounded-lg text-[11px] font-semibold hover:bg-red-500 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeletingSessionId(null)}
                      className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded-lg text-[11px] font-medium hover:bg-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                    title="Delete session"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


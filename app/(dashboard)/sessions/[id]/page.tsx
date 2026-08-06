'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/components/providers/AuthProvider';

interface Session {
  id: string;
  guest_token: string;
  state: string;
  recording_started_at: string | null;
  created_at: string;
}

interface Episode {
  id: string;
  title: string | null;
  state: string;
  created_at: string;
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.id as string;
  const [session, setSession] = useState<Session | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchSessionDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/sessions/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          router.push('/sessions');
          return;
        }

        const data = await response.json();
        setSession(data.session);

        const episodesResponse = await fetch('/api/episodes', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (episodesResponse.ok) {
          const episodesData = await episodesResponse.json();
          const associatedEpisode = episodesData.episodes.find(
            (ep: Episode & { session_id: string }) => ep.session_id === sessionId
          );
          if (associatedEpisode) {
            setEpisode(associatedEpisode);
          }
        }
      } catch (error) {
        console.error('Error fetching session details:', error);
        router.push('/sessions');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId, user, router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStateBadgeColor = (state: string) => {
    switch (state) {
      case 'idle':
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
      case 'recording':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'uploading':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'completed':
      case 'ready':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-zinc-400 text-sm">
        Loading session details...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const guestInviteUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${session.guest_token}` : '';

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      <div className="hidden"><Navbar /></div>
      <div>
        <button
          onClick={() => router.push('/sessions')}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 mb-3 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Sessions</span>
        </button>
        <h1 className="text-3xl font-bold text-white tracking-tight">Session Details</h1>
      </div>

      {/* Session Information */}
      <div className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white">Session Information</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-[#121212] border border-[#282828] rounded-xl space-y-1">
            <dt className="text-zinc-500 font-semibold uppercase tracking-wider">Session ID</dt>
            <dd className="text-white font-mono text-xs">{session.id}</dd>
          </div>
          <div className="p-3 bg-[#121212] border border-[#282828] rounded-xl space-y-1">
            <dt className="text-zinc-500 font-semibold uppercase tracking-wider">Status</dt>
            <dd className="mt-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider ${getStateBadgeColor(session.state)}`}>
                {session.state === 'completed' ? 'Completed' : session.state}
              </span>
            </dd>
          </div>
          <div className="p-3 bg-[#121212] border border-[#282828] rounded-xl space-y-1">
            <dt className="text-zinc-500 font-semibold uppercase tracking-wider">Created At</dt>
            <dd className="text-white">{formatDate(session.created_at)}</dd>
          </div>
          {session.recording_started_at && (
            <div className="p-3 bg-[#121212] border border-[#282828] rounded-xl space-y-1">
              <dt className="text-zinc-500 font-semibold uppercase tracking-wider">Recording Started</dt>
              <dd className="text-white">{formatDate(session.recording_started_at)}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Guest Invitation Link Box */}
      <div className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white">Guest Invitation Link</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={guestInviteUrl}
            className="flex-1 px-4 py-2.5 bg-[#121212] border border-[#282828] rounded-xl text-white font-mono text-xs focus:outline-none"
          />
          <button
            onClick={() => {
              if (guestInviteUrl) {
                navigator.clipboard.writeText(guestInviteUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            }}
            className="px-4 py-2.5 bg-[#6e56f8] hover:bg-[#5b45e0] text-white font-medium rounded-xl transition-all text-xs shadow-lg shadow-[#6e56f8]/20 shrink-0"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={() => {}}
            className="p-2.5 bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-medium"
            title="Send via email"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-zinc-400">
          Share this link with guests to allow them to join the recording session. Copy the link or send it via email.
        </p>
      </div>

      {/* Associated Episode Box */}
      <div className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white">Associated Episode</h2>
        {episode ? (
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-white">
                {episode.title || `Episode ${episode.id.slice(0, 8)}`}
              </h3>
              <p className="text-xs text-zinc-400">
                Created: {formatDate(episode.created_at)}
              </p>
            </div>
            <Link
              href={`/episodes/${episode.id}`}
              className="px-4 py-2 bg-[#6e56f8] hover:bg-[#5b45e0] text-white font-medium rounded-xl text-xs transition-colors shadow-lg shadow-[#6e56f8]/20"
            >
              View Episode
            </Link>
          </div>
        ) : (
          <p className="text-xs text-zinc-400">No episode has been created from this session yet.</p>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-[#1a1a1a] border border-[#282828] rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white">Session Timeline</h2>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-2 h-2 bg-[#6e56f8] rounded-full mt-1.5"></div>
            <div className="ml-3">
              <p className="text-xs font-semibold text-white">Session Created</p>
              <p className="text-xs text-zinc-500">{formatDate(session.created_at)}</p>
            </div>
          </div>
          {session.recording_started_at && (
            <div className="flex items-start">
              <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-1.5"></div>
              <div className="ml-3">
                <p className="text-xs font-semibold text-white">Recording Started</p>
                <p className="text-xs text-zinc-500">{formatDate(session.recording_started_at)}</p>
              </div>
            </div>
          )}
          {episode && (
            <div className="flex items-start">
              <div className="flex-shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-1.5"></div>
              <div className="ml-3">
                <p className="text-xs font-semibold text-white">Episode Created</p>
                <p className="text-xs text-zinc-500">{formatDate(episode.created_at)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



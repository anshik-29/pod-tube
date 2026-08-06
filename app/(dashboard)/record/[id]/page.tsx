'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { VideoCall } from '@/components/recording/VideoCall';
import { BrowserCheck } from '@/components/recording/BrowserCheck';
import { useAuth } from '@/components/providers/AuthProvider';

export default function RecordPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.id as string;
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    episodeId?: string;
  }>({ type: null, message: '' });
  const [isBrowserCompatible, setIsBrowserCompatible] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchSession = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/sessions/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          router.push('/dashboard');
          return;
        }

        const data = await response.json();
        setSession(data.session);
      } catch (error) {
        console.error('Error fetching session:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId, user, router]);

  // Listen for recording upload events
  useEffect(() => {
    const handleRecordingUploaded = (event: CustomEvent) => {
      const { episodeId } = event.detail;
      setUploadStatus({
        type: 'success',
        message: 'Recording uploaded successfully! Processing has started.',
        episodeId,
      });
    };

    const handleUploadError = (event: CustomEvent) => {
      const { error } = event.detail;
      setUploadStatus({
        type: 'error',
        message: `Upload failed: ${error}`,
      });
    };

    window.addEventListener('recording-uploaded', handleRecordingUploaded as EventListener);
    window.addEventListener('recording-upload-error', handleUploadError as EventListener);

    return () => {
      window.removeEventListener('recording-uploaded', handleRecordingUploaded as EventListener);
      window.removeEventListener('recording-upload-error', handleUploadError as EventListener);
    };
  }, []);

  const handleRecordingStateChange = async (isRecording: boolean) => {
    if (!session) return;

    try {
      const token = localStorage.getItem('token');
      const recordingStartedAt = isRecording ? new Date().toISOString() : undefined;

      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          state: isRecording ? 'recording' : 'uploading',
          recording_started_at: recordingStartedAt,
        }),
      });
    } catch (error) {
      console.error('Error updating session state:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#09090B] overflow-hidden text-zinc-100 flex flex-col z-50">
      <BrowserCheck onCheckComplete={setIsBrowserCompatible} />

      {/* Floating Success/Error Toast Notifications */}
      {uploadStatus.type === 'success' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[60] max-w-lg w-[calc(100%-32px)] bg-[#121215]/95 backdrop-blur-xl border border-emerald-500/30 text-emerald-300 px-5 py-3.5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-xs text-emerald-200">Recording Uploaded Successfully!</p>
              <p className="text-xs text-zinc-400 mt-0.5">{uploadStatus.message}</p>
              {uploadStatus.episodeId && (
                <div className="mt-2.5 flex items-center gap-2">
                  <Link
                    href={`/episodes/${uploadStatus.episodeId}`}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-xs transition-colors"
                  >
                    View Episode
                  </Link>
                  <Link
                    href="/episodes"
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium text-xs transition-colors"
                  >
                    All Episodes
                  </Link>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setUploadStatus({ type: null, message: '' })}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {uploadStatus.type === 'error' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[60] max-w-lg w-[calc(100%-32px)] bg-[#121215]/95 backdrop-blur-xl border border-red-500/30 text-red-300 px-5 py-3.5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-xs text-red-200">Upload Failed</p>
              <p className="text-xs text-zinc-400 mt-0.5">{uploadStatus.message}</p>
            </div>
          </div>
          <button
            onClick={() => setUploadStatus({ type: null, message: '' })}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex-1 w-full h-full relative">
        <VideoCall
          sessionId={sessionId}
          isHost={true}
          onRecordingStateChange={handleRecordingStateChange}
          guestToken={session?.guest_token}
        />
      </div>
    </div>
  );
}

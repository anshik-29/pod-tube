'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { VideoCall } from '@/components/recording/VideoCall';

export default function GuestRecordPage() {
  const params = useParams();
  const token = params.token as string;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/sessions/guest/${token}`);
        if (!response.ok) {
          throw new Error('Session not found');
        }

        const data = await response.json();
        setSessionId(data.session.id);
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchSession();
    } else {
      setLoading(false);
    }
  }, [token]);

  if (loading || !sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-lg">Loading recording studio...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#09090B] overflow-hidden text-zinc-100 flex flex-col z-50">
      <VideoCall sessionId={sessionId} isHost={false} guestToken={token} />
    </div>
  );
}

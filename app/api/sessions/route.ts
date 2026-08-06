import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { createSession } from '@/lib/db/queries/sessions';
import { randomBytes } from 'crypto';

function generateGuestToken(): string {
  return randomBytes(32).toString('hex');
}

export const POST = withAuth(async (req) => {
  try {
    const hostId = req.userId!;
    const guestToken = generateGuestToken();

    const session = await createSession(hostId, guestToken);

    return NextResponse.json({
      session: {
        id: session.id,
        guest_token: session.guest_token,
        state: session.state,
        created_at: session.created_at,
      },
    });
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (req) => {
  try {
    const hostId = req.userId!;
    const { getSessionsByHostId } = await import('@/lib/db/queries/sessions');
    const { getEpisodesByHostId } = await import('@/lib/db/queries/episodes');
    
    const sessions = await getSessionsByHostId(hostId);
    const episodes = await getEpisodesByHostId(hostId);

    // Map episodes to sessions for better display
    const sessionsWithEpisodes = sessions.map(session => {
      const episode = episodes.find(ep => ep.session_id === session.id);
      return {
        ...session,
        episode_title: episode?.title || null,
        episode_id: episode?.id || null,
      };
    });

    // Only show sessions that have episodes
    // Sessions without episodes are considered stale/incomplete and should be hidden
    const filteredSessions = sessionsWithEpisodes.filter(session => {
      return !!session.episode_id; // Only keep sessions with episodes
    });

    return NextResponse.json({ sessions: filteredSessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

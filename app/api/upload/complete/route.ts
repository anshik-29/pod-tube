import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getUploadsBySessionId } from '@/lib/db/queries/uploads';
import { getSessionById, updateSessionState } from '@/lib/db/queries/sessions';
import { getEpisodeBySessionId } from '@/lib/db/queries/episodes';
import { queueProcessing } from '@/lib/processing/processor';

export const POST = withAuth(async (req) => {
  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    // Verify session exists and user owns it
    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.host_id !== req.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check uploads - only host upload is required (guest is optional)
    const uploads = await getUploadsBySessionId(sessionId);
    const hasHostUpload = uploads.some((u) => u.participant_type === 'host' && u.status === 'completed');
    const hasGuestUpload = uploads.some((u) => u.participant_type === 'guest' && u.status === 'completed');
    
    // All existing uploads must be complete (if guest started uploading, it must finish)
    const allComplete = uploads.every((u) => u.status === 'completed');

    if (!hasHostUpload) {
      return NextResponse.json(
        { error: 'Host upload is required' },
        { status: 400 }
      );
    }

    // If guest upload exists but isn't complete, wait for it
    if (hasGuestUpload && !allComplete) {
      return NextResponse.json(
        { error: 'Guest upload in progress. Please wait for it to complete.' },
        { status: 400 }
      );
    }

    // Get existing episode for this session if it exists
    const existingEpisode = await getEpisodeBySessionId(sessionId);
    const episodeId = existingEpisode ? existingEpisode.id : sessionId;

    // Update session state to processing
    // Preserve recording_started_at if it exists, otherwise use current time as fallback
    const recordingStartedAt = session.recording_started_at || new Date();
    await updateSessionState(sessionId, 'processing', recordingStartedAt);

    return NextResponse.json({
      episodeId,
      message: 'Upload complete',
    });
  } catch (error) {
    console.error('Complete upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

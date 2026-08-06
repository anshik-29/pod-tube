import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getSessionById, updateSessionState } from '@/lib/db/queries/sessions';
import { verifyChunkIntegrity, getSessionChunks } from '@/lib/db/queries/chunks';
import { recordParticipantTimeline, getUploadsBySessionId } from '@/lib/db/queries/uploads';
import { getEpisodesByHostId, createEpisode, getEpisodeBySessionId } from '@/lib/db/queries/episodes';
import { createProcessingJobIfAbsent } from '@/lib/db/queries/processing-jobs';

/**
 * POST /api/upload/finalize
 *
 * Lightweight orchestration endpoint for recording completion.
 * Performs chunk integrity verification, stores recording & timeline metadata,
 * determines if all required participants have completed uploading, and
 * idempotently creates exactly ONE ProcessingJob using createProcessingJobIfAbsent().
 *
 * Body: { sessionId, participantType, totalChunks, recordingDuration?, recordingStartedAt?, recordingEndedAt? }
 * Response: HTTP 202 Accepted { processingJobId?, status, episodeId }
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const {
      sessionId,
      participantType,
      totalChunks,
      recordingDuration,
      recordingStartedAt,
      recordingEndedAt,
    } = body;

    if (!sessionId || !participantType || !totalChunks) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, participantType, totalChunks' },
        { status: 400 }
      );
    }

    // 1. Verify session exists
    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify ownership for host
    if (participantType === 'host' && session.host_id !== req.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Verify chunk integrity (no gaps, all completed)
    const integrity = await verifyChunkIntegrity(
      sessionId,
      participantType as 'host' | 'guest',
      totalChunks
    );

    if (!integrity.valid) {
      return NextResponse.json(
        {
          error: 'Chunk integrity check failed. Cannot finalize recording.',
          missingIndices: integrity.missingIndices,
          failedIndices: integrity.failedIndices,
          totalExpected: totalChunks,
          totalFound: integrity.totalFound,
        },
        { status: 400 }
      );
    }

    // 3. Mark participant upload as completed & record timeline in DB
    await recordParticipantTimeline(
      sessionId,
      participantType as 'host' | 'guest',
      totalChunks,
      recordingDuration,
      recordingStartedAt,
      recordingEndedAt
    );

    // 4. Find existing episode or create a new episode for this session atomically
    let episode = await getEpisodeBySessionId(sessionId);

    if (!episode) {
      episode = await createEpisode(sessionId, session.host_id);
    }

    // 5. Evaluate if ALL required participant uploads are completed
    const uploads = await getUploadsBySessionId(sessionId);
    const hostUpload = uploads.find((u) => u.participant_type === 'host' && u.status === 'completed');

    // Check if guest participated (guest upload record exists or guest chunks uploaded)
    const guestChunks = await getSessionChunks(sessionId, 'guest');
    const guestUpload = uploads.find((u) => u.participant_type === 'guest');
    const guestParticipated = (guestUpload !== undefined) || (guestChunks.length > 0);

    const isGuestComplete = guestUpload ? guestUpload.status === 'completed' : false;

    // All participants complete if:
    // - Host upload is completed
    // - AND IF a guest participated, guest upload is also completed
    const allParticipantsComplete = hostUpload !== undefined && (!guestParticipated || isGuestComplete);

    if (!allParticipantsComplete) {
      return NextResponse.json(
        {
          status: 'waiting_for_participants',
          message: 'Participant upload finalized. Waiting for remaining participant uploads to complete.',
          episodeId: episode.id,
        },
        { status: 202 }
      );
    }

    // 6. Update session state to processing
    const sessionStart = recordingStartedAt ? new Date(recordingStartedAt) : session.recording_started_at || new Date();
    await updateSessionState(sessionId, 'processing', sessionStart);

    // 7. Idempotently create or retrieve existing ProcessingJob
    const job = await createProcessingJobIfAbsent(episode.id);

    return NextResponse.json(
      {
        processingJobId: job.id,
        status: job.status,
        episodeId: episode.id,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Finalize upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

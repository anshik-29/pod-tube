import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { updateChunkStatus } from '@/lib/db/queries/chunks';
import { getDbPool } from '@/lib/db/client';

/**
 * POST /api/upload/chunk-confirm
 * 
 * Debug mode: Logs exact input parameters, queries DB rows for session, and logs updateChunkStatus return value.
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { sessionId, participantType, chunkIndex, etag, sizeBytes } = body;

    console.log('[DEBUG chunk-confirm] Input parameters:', {
      sessionId,
      sessionIdType: typeof sessionId,
      participantType,
      participantTypeType: typeof participantType,
      chunkIndex,
      chunkIndexType: typeof chunkIndex,
      etag,
      sizeBytes,
    });

    if (!sessionId || !participantType || chunkIndex === undefined || chunkIndex === null) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Immediately before updateChunkStatus(), execute SELECT
    const pool = getDbPool();
    const debugRows = await pool.query(
      'SELECT session_id, participant_type, chunk_index, status FROM recording_chunks WHERE session_id = $1',
      [sessionId]
    );

    console.log('[DEBUG chunk-confirm] Existing DB rows for session:', debugRows.rows);
    console.log('[DEBUG chunk-confirm] Exact values passed into updateChunkStatus:', {
      sessionId,
      participantType,
      chunkIndex,
      status: 'completed',
      attempts: undefined,
      etag: etag || null,
    });

    const updated = await updateChunkStatus(
      sessionId,
      participantType as 'host' | 'guest',
      chunkIndex,
      'completed',
      undefined,
      etag || null
    );

    console.log('[DEBUG chunk-confirm] updateChunkStatus return value:', updated);

    if (!updated) {
      return NextResponse.json(
        { error: 'Chunk record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      chunkIndex,
      status: 'completed',
    });
  } catch (error) {
    console.error('[chunk-confirm] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

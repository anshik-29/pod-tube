import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getStorageProvider } from '@/lib/storage';
import { getSessionById } from '@/lib/db/queries/sessions';
import { recordChunkMetadata } from '@/lib/db/queries/chunks';

/**
 * POST /api/upload/presigned-url
 * 
 * Generates a presigned upload URL for a recording chunk.
 * For R2/S3 storage: returns a presigned PUT URL for direct client-to-cloud upload.
 * For local storage: returns the server chunk upload endpoint URL as fallback.
 * 
 * Body: { sessionId, participantType, chunkIndex, sizeBytes }
 * Returns: { uploadUrl, storageKey, chunkIndex, method }
 */
export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const { sessionId, participantType, chunkIndex, sizeBytes } = body;

    console.log('[DEBUG presigned-url] Input parameters:', {
      sessionId,
      sessionIdType: typeof sessionId,
      participantType,
      participantTypeType: typeof participantType,
      chunkIndex,
      chunkIndexType: typeof chunkIndex,
    });

    // Verify session exists
    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify ownership for host uploads
    if (participantType === 'host' && session.host_id !== req.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const storageKey = `sessions/${sessionId}/${participantType}/chunks/${chunkIndex}.webm`;
    const storage = getStorageProvider();

    let uploadUrl: string;
    let method: 'PUT' | 'POST';

    // If storage provider supports presigned uploads (R2/S3), use direct upload
    if (storage.getPresignedUploadUrl) {
      uploadUrl = await storage.getPresignedUploadUrl(storageKey, 3600);
      method = 'PUT';
    } else {
      // Fallback: client uploads via server-side chunk endpoint
      uploadUrl = '/api/upload/chunk';
      method = 'POST';
    }

    // Pre-register chunk metadata in database
    await recordChunkMetadata(
      sessionId,
      participantType as 'host' | 'guest',
      chunkIndex,
      storageKey,
      sizeBytes || 0,
      'pending',
      0,
      null
    );

    return NextResponse.json({
      uploadUrl,
      storageKey,
      chunkIndex,
      method,
    });
  } catch (error) {
    console.error('[presigned-url] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

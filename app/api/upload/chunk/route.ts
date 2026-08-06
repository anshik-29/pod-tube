import { NextRequest, NextResponse } from 'next/server';
import { getStorageProvider } from '@/lib/storage';
import { getSessionById } from '@/lib/db/queries/sessions';
import { recordChunkMetadata } from '@/lib/db/queries/chunks';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const chunk = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;
    const participantType = formData.get('participantType') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);

    if (!chunk || !sessionId || !participantType || isNaN(chunkIndex)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify session exists
    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Save chunk to storage
    const storage = getStorageProvider();
    const chunkReference = `sessions/${sessionId}/${participantType}/chunks/${chunkIndex}.webm`;
    const arrayBuffer = await chunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await storage.save(chunkReference, buffer);

    // Record chunk metadata in database with status = 'completed'
    await recordChunkMetadata(
      sessionId,
      participantType as 'host' | 'guest',
      chunkIndex,
      chunkReference,
      buffer.length,
      'completed'
    );

    return NextResponse.json({
      chunkIndex,
      totalChunks,
      received: true,
    });
  } catch (error) {
    console.error('Chunk upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

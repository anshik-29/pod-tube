import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getStorageProvider } from '@/lib/storage';
import { createUpload, updateUploadStatus } from '@/lib/db/queries/uploads';
import { getSessionById } from '@/lib/db/queries/sessions';

export const POST = withAuth(async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;
    const participantType = formData.get('participantType') as 'host' | 'guest';

    if (!file || !sessionId || !participantType) {
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

    // Check ownership (host only for now, guests will be handled differently)
    if (participantType === 'host' && session.host_id !== req.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Generate file reference with timestamp for uniqueness
    const fileExtension = file.name.split('.').pop() || 'webm';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format: 2024-01-15T14-30-45
    const fileReference = `sessions/${sessionId}/${participantType}/recording-${timestamp}.${fileExtension}`;

    // Save file
    const storage = getStorageProvider();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await storage.save(fileReference, buffer);

    // Create upload record
    const upload = await createUpload(sessionId, participantType, fileReference);
    await updateUploadStatus(upload.id, 'completed');

    return NextResponse.json({
      upload: {
        id: upload.id,
        file_reference: upload.file_reference,
        status: upload.status,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

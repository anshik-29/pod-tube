import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getParams } from '@/lib/auth/route-helpers';
import { getEpisodeById } from '@/lib/db/queries/episodes';
import { getStorageProvider } from '@/lib/storage';

export const GET = withAuth(async (req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) => {
  try {
    const params = await getParams<{ id: string }>(context);
    const episode = await getEpisodeById(params.id);

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    // Check ownership
    if (episode.host_id !== req.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (episode.state !== 'ready' || !episode.file_references) {
      return NextResponse.json(
        { error: 'Episode not ready for download' },
        { status: 400 }
      );
    }

    const type = req.nextUrl.searchParams.get('type') || 'video';
    const fileReference = episode.file_references[type];

    if (!fileReference) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const storage = getStorageProvider();
    const mediaUrl = await storage.getUrl(fileReference);

    // If Cloudflare R2 presigned download URL is available, redirect directly
    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
      return NextResponse.redirect(mediaUrl, 302);
    }

    const fileBuffer = await storage.read(fileReference);
    const contentType = type === 'video' ? 'video/mp4' : 'audio/mpeg';
    const filename = type === 'video' ? 'episode.mp4' : 'episode.mp3';

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(fileBuffer);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Download episode error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

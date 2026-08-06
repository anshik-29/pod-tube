import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getParams } from '@/lib/auth/route-helpers';
import { getEpisodeById } from '@/lib/db/queries/episodes';
import { getStorageProvider } from '@/lib/storage';

// Preview endpoint - serves video inline for playback (not as download)
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
        { error: 'Episode not ready for preview' },
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

    // If Cloudflare R2 presigned or public URL is returned, redirect directly for fast CDN playback
    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
      return NextResponse.redirect(mediaUrl, 302);
    }

    const fileBuffer = await storage.read(fileReference);
    const contentType = type === 'video' ? 'video/mp4' : 'audio/mpeg';

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(fileBuffer);

    // Serve inline for preview (not as download)
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('Preview episode error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

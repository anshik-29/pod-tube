import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getParams } from '@/lib/auth/route-helpers';
import { getEpisodeById, updateEpisodeDescription } from '@/lib/db/queries/episodes';

export const PUT = withAuth(async (req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) => {
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

    const body = await req.json();
    const { description } = body;

    if (typeof description !== 'string' && description !== null) {
      return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
    }

    const updatedEpisode = await updateEpisodeDescription(params.id, description || '');

    return NextResponse.json({ success: true, episode: updatedEpisode });
  } catch (error) {
    console.error('Update episode description error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

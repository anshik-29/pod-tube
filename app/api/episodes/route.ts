import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getEpisodesByHostId, EpisodeState } from '@/lib/db/queries/episodes';

export const GET = withAuth(async (req) => {
  try {
    const hostId = req.userId!;
    const { searchParams } = new URL(req.url);
    
    // Extract filter parameters
    const search = searchParams.get('search') || undefined;
    const state = searchParams.get('state') as EpisodeState | null;
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;

    const episodes = await getEpisodesByHostId(hostId, {
      search,
      state: state || undefined,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({ episodes });
  } catch (error) {
    console.error('Get episodes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

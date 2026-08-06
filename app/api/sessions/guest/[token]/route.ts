import { NextRequest, NextResponse } from 'next/server';
import { getParams } from '@/lib/auth/route-helpers';
import { getSessionByGuestToken } from '@/lib/db/queries/sessions';
import { signToken } from '@/lib/auth/jwt';

export async function GET(
  req: NextRequest,
  context?: { params?: Promise<{ token: string }> | { token: string } }
) {
  try {
    const params = await getParams<{ token: string }>(context);
    const session = await getSessionByGuestToken(params.token);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Generate JWT token for guest upload API authorization
    const guestAuthToken = signToken({
      userId: `guest_${session.id}`,
      email: `guest@session.${session.id}`,
    });

    return NextResponse.json({
      session: {
        id: session.id,
        state: session.state,
      },
      token: guestAuthToken,
    });
  } catch (error) {
    console.error('Get guest session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

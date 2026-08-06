import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getParams } from '@/lib/auth/route-helpers';
import { getSessionById, deleteSession, updateSessionState } from '@/lib/db/queries/sessions';
import { z } from 'zod';

export const GET = withAuth(async (req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) => {
  try {
    const params = await getParams<{ id: string }>(context);
    const session = await getSessionById(params.id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check ownership
    if (session.host_id !== req.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        guest_token: session.guest_token,
        state: session.state,
        recording_started_at: session.recording_started_at,
        created_at: session.created_at,
      },
    });
  } catch (error) {
    console.error('Get session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

const updateSessionSchema = z.object({
  state: z.enum(['idle', 'recording', 'uploading', 'processing', 'ready', 'failed']).optional(),
  recording_started_at: z.string().optional(),
});

export const PATCH = withAuth(async (req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) => {
  try {
    const params = await getParams<{ id: string }>(context);
    const session = await getSessionById(params.id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check ownership
    if (session.host_id !== req.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const validated = updateSessionSchema.parse(body);

    // Update session state
    const recordingStartedAt = validated.recording_started_at 
      ? new Date(validated.recording_started_at) 
      : undefined;

    const updatedSession = await updateSessionState(
      params.id,
      validated.state || session.state,
      recordingStartedAt
    );

    return NextResponse.json({
      session: {
        id: updatedSession.id,
        guest_token: updatedSession.guest_token,
        state: updatedSession.state,
        recording_started_at: updatedSession.recording_started_at,
        created_at: updatedSession.created_at,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Update session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) => {
  try {
    const params = await getParams<{ id: string }>(context);
    const session = await getSessionById(params.id);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check ownership
    if (session.host_id !== req.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await deleteSession(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

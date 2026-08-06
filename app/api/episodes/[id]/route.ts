import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getParams } from '@/lib/auth/route-helpers';
import { getEpisodeById, updateEpisodeState, updateEpisodeTrimSettings, updateEpisodeTitle, updateEpisodeDescription } from '@/lib/db/queries/episodes';
import { deleteSession } from '@/lib/db/queries/sessions';
import { deleteEpisodeWithStorageCleanup } from '@/lib/cleanup/storage';
import { queueProcessing } from '@/lib/processing/processor';
import { getProcessingJobByEpisodeId, updateProcessingJobStatus } from '@/lib/db/queries/processing-jobs';
import { z } from 'zod';

const processSchema = z.object({
  trimStart: z.number().optional(),
  trimEnd: z.number().optional(),
  quality: z.enum(['low', 'medium', 'high']).optional(),
});

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

    // Get processing job status if episode is processing
    let processingJob = null;
    if (episode.state === 'processing') {
      processingJob = await getProcessingJobByEpisodeId(params.id);
    }

    return NextResponse.json({ 
      episode,
      processingJob: processingJob ? {
        status: processingJob.status,
        error_message: processingJob.error_message,
        progress: processingJob.progress,
        created_at: processingJob.created_at,
        updated_at: processingJob.updated_at,
      } : null
    });
  } catch (error) {
    console.error('Get episode error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) => {
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

    // Delete referenced storage objects from Cloudflare R2 first, then delete database record
    await deleteEpisodeWithStorageCleanup(params.id);

    // Delete associated session
    await deleteSession(episode.session_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete episode error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) => {
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
    const { trimStart, trimEnd, quality } = processSchema.parse(body);

    // Save trim settings (including quality)
    await updateEpisodeTrimSettings(params.id, trimStart, trimEnd, quality);

    // Check if there's a processing job
    const processingJob = await getProcessingJobByEpisodeId(params.id);
    
    // If episode is already ready, we need to re-process with new trim settings
    // If episode is still processing, check if job is stuck
    if (episode.state === 'ready') {
      // Re-process with new trim settings
      await updateEpisodeState(params.id, 'processing');
      await queueProcessing(params.id);
    } else if (episode.state === 'processing') {
      // Check if job is stuck (pending or failed)
      if (!processingJob || processingJob.status === 'pending' || processingJob.status === 'failed') {
        // Job is stuck or missing, create a new one
        if (processingJob && processingJob.status === 'failed') {
          console.log(`Retrying failed job for episode ${params.id}`);
        }
        await queueProcessing(params.id);
      } else {
        // Job is processing, trim settings will be used on next attempt
        // For now, just save the settings
      }
    } else {
      // Episode is in initial processing state, queue it
      await queueProcessing(params.id);
    }

    return NextResponse.json({ success: true, message: 'Trim settings saved and processing queued' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Process episode error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// PUT endpoint to update episode title
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
    const { title } = body;

    if (typeof title !== 'string' && title !== null) {
      return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
    }

    const updatedEpisode = await updateEpisodeTitle(params.id, title || '');

    return NextResponse.json({ success: true, episode: updatedEpisode });
  } catch (error) {
    console.error('Update episode title error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// PATCH endpoint to manually retry processing for stuck episodes
export const PATCH = withAuth(async (req: AuthenticatedRequest, context?: { params?: Promise<{ id: string }> | { id: string } }) => {
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
    const action = body.action;

    if (action === 'retry') {
      // Check for existing processing job
      const processingJob = await getProcessingJobByEpisodeId(params.id);
      
      // If job exists and is failed or stuck, reset it
      if (processingJob && (processingJob.status === 'failed' || processingJob.status === 'processing')) {
        await updateProcessingJobStatus(processingJob.id, 'pending', null);
      }
      
      // Ensure episode is in processing state
      if (episode.state !== 'processing') {
        await updateEpisodeState(params.id, 'processing');
      }
      
      // Queue a new processing job (or reuse existing if it was reset)
      if (!processingJob || processingJob.status === 'failed') {
        await queueProcessing(params.id);
      }

      return NextResponse.json({ success: true, message: 'Processing retried' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Retry processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

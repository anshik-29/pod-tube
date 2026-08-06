/**
 * Simple in-memory job queue executor
 * Job state is persisted in PostgreSQL
 */

import { getPendingProcessingJobs, updateProcessingJobStatus } from '@/lib/db/queries/processing-jobs';
import { processEpisode } from './processor';

let isProcessing = false;

export async function startJobProcessor(): Promise<void> {
  if (isProcessing) {
    return;
  }

  isProcessing = true;
  processJobs();
}

async function processJobs(): Promise<void> {
  try {
    const pendingJobs = await getPendingProcessingJobs();

    // Process jobs sequentially (FFmpeg already uses all CPU cores, parallel would compete)
    // But we can process them faster with optimized settings
    for (const job of pendingJobs) {
      try {
        await updateProcessingJobStatus(job.id, 'processing');
        // Get episode to retrieve trim settings
        const { getEpisodeById } = await import('@/lib/db/queries/episodes');
        const episode = await getEpisodeById(job.episode_id);
        const trimOptions = episode?.trim_settings || {};
        
        // Progress callback to update job progress
        const onProgress = async (progress: number) => {
          await updateProcessingJobStatus(job.id, 'processing', null, progress);
        };
        
        await processEpisode(job.episode_id, trimOptions, onProgress);
        await updateProcessingJobStatus(job.id, 'completed', null, 100);
      } catch (error: any) {
        console.error(`Job ${job.id} failed:`, error);
        await updateProcessingJobStatus(job.id, 'failed', error.message);
      }
    }
  } catch (error) {
    console.error('Job processor error:', error);
  } finally {
    // Poll for new jobs every 3 seconds (reduced from 5 for faster response)
    setTimeout(() => {
      processJobs();
    }, 3000);
  }
}

export function stopJobProcessor(): void {
  isProcessing = false;
}

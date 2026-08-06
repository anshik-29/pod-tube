import { exec } from 'child_process';
import { promisify } from 'util';
import {
  claimNextPendingProcessingJob,
  updateProcessingJobStatus,
  ProcessingJob,
} from '../db/queries/processing-jobs';
import { processJob } from './process-job';

const execAsync = promisify(exec);

export interface ProcessingWorkerOptions {
  /** Polling interval in milliseconds (default: 3000ms) */
  pollIntervalMs?: number;
}

/**
 * Verify that FFmpeg is installed and accessible in the system environment.
 * Fails fast if FFmpeg is not found.
 */
export async function verifyFFmpegExists(): Promise<boolean> {
  try {
    const ffmpegBin = process.env.FFMPEG_PATH ? `"${process.env.FFMPEG_PATH}"` : 'ffmpeg';
    const { stdout } = await execAsync(`${ffmpegBin} -version`);
    const versionLine = stdout.split('\n')[0];
    console.log(`[Worker] ✓ FFmpeg verified: ${versionLine.trim()}`);
    return true;
  } catch (error) {
    console.error('[Worker] ✗ FFmpeg not found.');
    console.error('[Worker] Please install FFmpeg before starting the processing worker.');
    return false;
  }
}

export class ProcessingWorker {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private pollIntervalMs: number;
  private isPolling = false;

  constructor(options: ProcessingWorkerOptions = {}) {
    this.pollIntervalMs = options.pollIntervalMs ?? 3000;
  }

  /**
   * Start the processing worker polling loop.
   * Verifies FFmpeg availability first; fails fast if FFmpeg is not found.
   */
  public async start(): Promise<boolean> {
    if (this.isRunning) {
      console.log('[Worker] ProcessingWorker is already running.');
      return true;
    }

    const ffmpegAvailable = await verifyFFmpegExists();
    if (!ffmpegAvailable) {
      console.error('[Worker] Aborting worker start due to missing FFmpeg dependency.');
      return false;
    }

    this.isRunning = true;
    console.log(`[Worker] Worker started (polling every ${this.pollIntervalMs}ms)`);
    this.scheduleNextPoll(0);
    return true;
  }

  /**
   * Stop the processing worker loop gracefully.
   */
  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('[Worker] Worker stopped');
  }

  /**
   * Poll for and execute pending jobs sequentially.
   */
  public async poll(): Promise<void> {
    if (this.isPolling || !this.isRunning) return;
    this.isPolling = true;

    try {
      // 1. Atomically claim the next pending job (pending -> processing)
      const job = await claimNextPendingProcessingJob();

      if (job) {
        // 2. Log lifecycle: Job claimed & Job started
        console.log(`[Worker] Job claimed: ${job.id} (episode: ${job.episode_id})`);
        console.log(`[Worker] Job started: ${job.id}`);

        try {
          // 3. Execute job media processing pipeline
          await processJob(job);

          // 4. Update status: processing -> completed
          await updateProcessingJobStatus(job.id, 'completed', null, 100);
          console.log(`[Worker] Job completed: ${job.id}`);
        } catch (error: any) {
          // 5. Update status: processing -> failed with error message
          const errorMessage = error?.message || 'Unknown processing error';
          await updateProcessingJobStatus(job.id, 'failed', errorMessage);
          console.error(`[Worker] Job failed: ${job.id} - Error: ${errorMessage}`);
        }

        // Immediately check if there are more pending jobs
        this.isPolling = false;
        if (this.isRunning) {
          setImmediate(() => this.poll());
        }
        return;
      }
    } catch (error: any) {
      console.error(`[Worker] Error during poll cycle:`, error?.message || error);
    } finally {
      this.isPolling = false;
      if (this.isRunning) {
        this.scheduleNextPoll(this.pollIntervalMs);
      }
    }
  }

  private scheduleNextPoll(delayMs: number): void {
    if (!this.isRunning) return;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => this.poll(), delayMs);
  }
}

// Global worker instance for singleton usage
let globalWorker: ProcessingWorker | null = null;

export async function startProcessingWorker(
  options?: ProcessingWorkerOptions
): Promise<ProcessingWorker | null> {
  if (!globalWorker) {
    globalWorker = new ProcessingWorker(options);
  }
  const started = await globalWorker.start();
  if (!started) {
    globalWorker = null;
    return null;
  }
  return globalWorker;
}

export function stopProcessingWorker(): void {
  if (globalWorker) {
    globalWorker.stop();
    globalWorker = null;
  }
}

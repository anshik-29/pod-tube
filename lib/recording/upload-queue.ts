/**
 * ChunkUploadQueue - Lightweight browser upload queue with configurable concurrency and retry logic.
 *
 * Uploads chunks in the background without blocking MediaRecorder.
 * Automatically triggers a completion callback when all enqueued chunks are uploaded successfully.
 * If any chunk permanently fails after all retries, completion is aborted and a failure callback is invoked.
 */

export interface ChunkTask {
  chunkIndex: number;
  blob: Blob;
  attempts: number;
}

export interface ChunkUploadQueueOptions {
  /** Session ID for this recording */
  sessionId: string;
  /** 'host' or 'guest' */
  participantType: 'host' | 'guest';
  /** Max parallel uploads (default: 3) */
  concurrency?: number;
  /** Max retry attempts per chunk (default: 3) */
  maxRetries?: number;
  /** Backoff delay in ms between retries (default: 1000) */
  retryDelayMs?: number;
  /** JWT auth token for API calls */
  authToken: string;
  /** Called when a chunk upload completes */
  onChunkUploaded?: (chunkIndex: number, totalPending: number) => void;
  /** Called when a chunk fails after all retries */
  onChunkFailed?: (chunkIndex: number, error: Error) => void;
  /** Called when ALL enqueued chunks have been uploaded successfully and recording has stopped */
  onAllUploadsComplete?: (totalChunks: number) => void;
  /** Called when one or more chunks permanently fail after all retries */
  onUploadsFailed?: (failedCount: number, totalChunks: number) => void;
  /** Called with upload progress stats */
  onProgress?: (stats: { uploaded: number; pending: number; failed: number; total: number }) => void;
}

export class ChunkUploadQueue {
  private queue: ChunkTask[] = [];
  private activeUploads = 0;
  private concurrency: number;
  private maxRetries: number;
  private retryDelayMs: number;
  private sessionId: string;
  private participantType: string;
  private authToken: string;

  private uploadedCount = 0;
  private failedCount = 0;
  private totalEnqueued = 0;
  private recordingStopped = false;
  private destroyed = false;

  private onChunkUploaded?: (chunkIndex: number, totalPending: number) => void;
  private onChunkFailed?: (chunkIndex: number, error: Error) => void;
  private onAllUploadsComplete?: (totalChunks: number) => void;
  private onUploadsFailed?: (failedCount: number, totalChunks: number) => void;
  private onProgress?: (stats: { uploaded: number; pending: number; failed: number; total: number }) => void;

  constructor(options: ChunkUploadQueueOptions) {
    this.sessionId = options.sessionId;
    this.participantType = options.participantType;
    this.concurrency = options.concurrency ?? 3;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
    this.authToken = options.authToken;
    this.onChunkUploaded = options.onChunkUploaded;
    this.onChunkFailed = options.onChunkFailed;
    this.onAllUploadsComplete = options.onAllUploadsComplete;
    this.onUploadsFailed = options.onUploadsFailed;
    this.onProgress = options.onProgress;
  }

  /**
   * Enqueue a chunk for background upload. Never blocks.
   * The blob reference is released after successful upload.
   */
  enqueue(chunkIndex: number, blob: Blob): void {
    if (this.destroyed) return;

    this.totalEnqueued++;
    this.queue.push({ chunkIndex, blob, attempts: 0 });
    this.processQueue();
  }

  /**
   * Signal that recording has stopped and no more chunks will be enqueued.
   * When all pending uploads finish, onAllUploadsComplete or onUploadsFailed is called automatically.
   */
  signalRecordingStopped(): void {
    this.recordingStopped = true;
    this.checkCompletion();
  }

  /**
   * Get current stats
   */
  getStats(): { uploaded: number; pending: number; failed: number; total: number; active: number } {
    return {
      uploaded: this.uploadedCount,
      pending: this.queue.length,
      failed: this.failedCount,
      total: this.totalEnqueued,
      active: this.activeUploads,
    };
  }

  /**
   * Destroy the queue and release all blob references
   */
  destroy(): void {
    this.destroyed = true;
    this.queue = [];
  }

  // --- Internal ---

  private processQueue(): void {
    while (this.activeUploads < this.concurrency && this.queue.length > 0 && !this.destroyed) {
      const task = this.queue.shift()!;
      this.activeUploads++;
      this.uploadChunk(task);
    }
  }

  private async uploadChunk(task: ChunkTask): Promise<void> {
    try {
      // Step 1: Get presigned URL from server
      const presignedRes = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          participantType: this.participantType,
          chunkIndex: task.chunkIndex,
          sizeBytes: task.blob.size,
        }),
      });

      if (!presignedRes.ok) {
        throw new Error(`Presigned URL request failed: HTTP ${presignedRes.status}`);
      }

      const { uploadUrl, method, storageKey } = await presignedRes.json();

      // Step 2: Upload chunk to storage
      let uploadRes: Response;
      let etag: string | null = null;

      if (method === 'PUT') {
        // Direct-to-R2/S3 presigned PUT
        uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: task.blob,
          headers: {
            'Content-Type': 'video/webm',
          },
        });
        etag = uploadRes.headers.get('etag') || null;
      } else {
        // Fallback: Upload via server chunk endpoint
        const formData = new FormData();
        formData.append('file', task.blob, `chunk-${task.chunkIndex}.webm`);
        formData.append('sessionId', this.sessionId);
        formData.append('participantType', this.participantType);
        formData.append('chunkIndex', String(task.chunkIndex));

        uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
          body: formData,
        });
      }

      if (!uploadRes.ok) {
        throw new Error(`Upload failed with HTTP ${uploadRes.status}`);
      }

      // Step 3: Confirm chunk upload in database
      const confirmRes = await fetch('/api/upload/chunk-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          participantType: this.participantType,
          chunkIndex: task.chunkIndex,
          etag,
          sizeBytes: task.blob.size,
        }),
      });

      if (!confirmRes.ok) {
        throw new Error(`Chunk confirm failed with HTTP ${confirmRes.status}`);
      }

      // Success - release blob reference
      this.uploadedCount++;
      this.activeUploads--;
      this.emitProgress();
      this.onChunkUploaded?.(task.chunkIndex, this.queue.length);

    } catch (error) {
      task.attempts++;
      this.activeUploads--;

      if (task.attempts < this.maxRetries) {
        // Re-enqueue with delay
        setTimeout(() => {
          if (!this.destroyed) {
            this.queue.push(task);
            this.processQueue();
          }
        }, this.retryDelayMs * Math.pow(2, task.attempts - 1));
      } else {
        // Permanently failed after all retries
        console.error(`[UploadQueue] Chunk ${task.chunkIndex} permanently failed after ${this.maxRetries} retries:`, error);
        this.failedCount++;
        this.emitProgress();
        this.onChunkFailed?.(task.chunkIndex, error as Error);
      }
    }

    // Continue processing queue
    this.processQueue();
    this.checkCompletion();
  }

  private emitProgress(): void {
    this.onProgress?.({
      uploaded: this.uploadedCount,
      pending: this.queue.length + this.activeUploads,
      failed: this.failedCount,
      total: this.totalEnqueued,
    });
  }

  private checkCompletion(): void {
    if (
      this.recordingStopped &&
      this.queue.length === 0 &&
      this.activeUploads === 0 &&
      !this.destroyed
    ) {
      if (this.failedCount > 0) {
        console.error(`[UploadQueue] Aborting completion trigger: ${this.failedCount}/${this.totalEnqueued} chunks failed.`);
        this.onUploadsFailed?.(this.failedCount, this.totalEnqueued);
      } else {
        this.onAllUploadsComplete?.(this.totalEnqueued);
      }
    }
  }
}

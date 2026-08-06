import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { getStorageProvider } from '../storage';
import { updateEpisodeState } from '../db/queries/episodes';
import { updateSessionState } from '../db/queries/sessions';
import { MergeStageResult } from './merge-stage';

export interface UploadStageResult {
  storageKey: string;
  fileReferences: {
    video: string;
    fileSizeBytes: number;
    durationMs: number;
    width: number;
    height: number;
  };
}

/**
 * uploadStage
 *
 * Uploads the merged episode.mp4 file to Cloudflare R2 / StorageProvider,
 * updates the Episode record to state = 'ready' with media file references & resolution metadata,
 * and marks the Session state = 'ready'.
 */
export async function uploadStage(
  episodeId: string,
  sessionId: string,
  mergeResult: MergeStageResult
): Promise<UploadStageResult> {
  const storage = getStorageProvider();
  const storageKey = `episodes/${episodeId}/episode.mp4`;

  console.log(`[UploadStage] Uploading final merged recording ${mergeResult.outputFile} -> R2 key: ${storageKey}`);

  // Create stream for efficient file upload without memory buffering
  const readStream = createReadStream(mergeResult.outputFile);
  await storage.save(storageKey, readStream);

  console.log(`[UploadStage] Upload to Cloudflare R2 completed: ${storageKey}`);

  const fileReferences = {
    video: storageKey,
    fileSizeBytes: mergeResult.fileSizeBytes,
    durationMs: mergeResult.durationMs,
    width: mergeResult.width,
    height: mergeResult.height,
  };

  // 1. Update Episode record state = 'ready' with file_references
  await updateEpisodeState(episodeId, 'ready', fileReferences as any);
  console.log(`[UploadStage] Updated Episode ${episodeId} state -> ready`);

  // 2. Update Session record state = 'ready'
  await updateSessionState(sessionId, 'ready');
  console.log(`[UploadStage] Updated Session ${sessionId} state -> ready`);

  return {
    storageKey,
    fileReferences,
  };
}

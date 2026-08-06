import { ProcessingJob } from '../db/queries/processing-jobs';
import { downloadChunksStage } from './download-chunks';
import { concatStage, ConcatStageResult } from './concat-chunks';
import { resolveSessionTimeline, SessionTimeline } from './timeline';
import { mergeStage, MergeStageResult } from './merge-stage';
import { uploadStage, UploadStageResult } from './upload-stage';
import { cleanupStage, cleanupR2ChunksStage } from './cleanup-stage';

export interface ProcessJobPipelineResult {
  concatResult: ConcatStageResult;
  timeline: SessionTimeline;
  mergeResult: MergeStageResult;
  uploadResult: UploadStageResult;
}

/**
 * processJob
 *
 * Executes the complete end-to-end background worker processing pipeline for a claimed ProcessingJob:
 * 1. Download Stage: Streams R2 WebM chunks to local working directory organized by participant.
 * 2. Concat Stage: Stream copy concatenates chunks per participant into continuous host.webm & guest.webm files.
 * 3. Timeline Stage: Resolves exact recording timeline timestamps and computes participantOffsetMs relative to timelineStart.
 * 4. Merge Stage: Merges host & guest tracks using FFmpeg side-by-side layout with timeline synchronization -> episode.mp4.
 * 5. Upload Stage: Uploads episode.mp4 to Cloudflare R2 and updates Episode & Session DB records to 'ready'.
 * 6. R2 Chunk Cleanup Stage: Deletes original recording chunk objects from Cloudflare R2 and removes recording_chunks DB records.
 * 7. Directory Cleanup Stage: Removes temporary working directory files ONLY after verified success.
 */
export async function processJob(job: ProcessingJob): Promise<ProcessJobPipelineResult> {
  console.log(`[Worker:processJob] Starting end-to-end processing pipeline for job ${job.id} (episode: ${job.episode_id})`);

  // Step 1: Execute chunk download stage
  const downloadResult = await downloadChunksStage(job);

  // Step 2: Execute FFmpeg concat stage (per-participant stream copy)
  const concatResult = await concatStage(downloadResult);

  // Step 3: Resolve participant timeline & compute synchronization offsets
  const timeline = await resolveSessionTimeline(downloadResult.sessionId);

  // Step 4: Execute timeline-aware participant merge stage (side-by-side -> episode.mp4)
  const mergeResult = await mergeStage(concatResult, timeline);

  // Step 5: Upload final episode.mp4 to Cloudflare R2 & update DB records
  const uploadResult = await uploadStage(job.episode_id, downloadResult.sessionId, mergeResult);

  // Step 6: Delete original WebM chunk objects from Cloudflare R2 and remove recording_chunks database records
  await cleanupR2ChunksStage(downloadResult.sessionId);

  // Step 7: Cleanup temporary working directory ONLY after successful upload, DB updates, and R2 chunk cleanup
  await cleanupStage(downloadResult.workingDirectory);

  console.log(`[Worker:processJob] Pipeline completed successfully for job ${job.id}. Storage Key: ${uploadResult.storageKey}`);

  return {
    concatResult,
    timeline,
    mergeResult,
    uploadResult,
  };
}

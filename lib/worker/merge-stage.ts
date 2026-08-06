import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ConcatStageResult } from './concat-chunks';
import { SessionTimeline } from './timeline';

const execAsync = promisify(exec);

export interface MergeStageResult {
  outputFile: string;
  durationMs: number;
  width: number;
  height: number;
  fileSizeBytes: number;
}

function getFFmpegBin(): string {
  return process.env.FFMPEG_PATH ? `"${process.env.FFMPEG_PATH}"` : 'ffmpeg';
}

function getFFprobeBin(): string {
  if (process.env.FFPROBE_PATH) {
    return `"${process.env.FFPROBE_PATH}"`;
  }
  if (process.env.FFMPEG_PATH) {
    return `"${process.env.FFMPEG_PATH.replace(/ffmpeg\.exe$/i, 'ffprobe.exe')}"`;
  }
  return 'ffprobe';
}

/**
 * Extract video dimensions and duration using ffprobe
 */
async function probeMedia(filePath: string): Promise<{ width: number; height: number; durationMs: number; fileSizeBytes: number }> {
  const stat = await fs.stat(filePath);
  const normalizedPath = filePath.replace(/\\/g, '/');
  const ffprobeBin = getFFprobeBin();

  try {
    const { stdout } = await execAsync(
      `${ffprobeBin} -v error -select_streams v:0 -show_entries stream=width,height,duration -show_entries format=duration -of json "${normalizedPath}"`
    );
    const info = JSON.parse(stdout);
    const videoStream = info.streams?.[0];
    const durationSec = parseFloat(info.format?.duration || videoStream?.duration || '0');

    return {
      width: videoStream?.width || 1280,
      height: videoStream?.height || 720,
      durationMs: Math.round(durationSec * 1000),
      fileSizeBytes: stat.size,
    };
  } catch (err) {
    console.warn(`[MergeStage] ffprobe execution fallback for ${filePath}:`, err);
    return {
      width: 1280,
      height: 720,
      durationMs: 0,
      fileSizeBytes: stat.size,
    };
  }
}

/**
 * mergeStage
 *
 * Merges participant recordings into a synchronized episode.mp4 using FFmpeg.
 * - Single Participant: Transcodes WebM to MP4 with H.264/AAC/yuv420p.
 * - Dual Participant (Host + Guest): Side-by-side hstack layout with timeline synchronization.
 *   - Video delay applied via tpad (start_duration) / setpts.
 *   - Audio delay applied via adelay filter (initial silence).
 *   - Audio tracks mixed using amix (duration=longest).
 */
export async function mergeStage(
  concatResult: ConcatStageResult,
  timeline: SessionTimeline
): Promise<MergeStageResult> {
  const { workingDirectory, jobId } = concatResult;
  const hostData = concatResult.participants.host;
  const guestData = concatResult.participants.guest;

  const hostTimeline = timeline.participants.host;
  const guestTimeline = timeline.participants.guest;

  const outputFile = path.join(workingDirectory, 'episode.mp4');
  const normalizedOutputFile = outputFile.replace(/\\/g, '/');
  const ffmpegBin = getFFmpegBin();

  console.log(`[MergeStage] Starting participant merge stage for job ${jobId}`);

  // Case 1: Single Participant (Host only or Guest only)
  if (!hostData || !guestData) {
    const singleData = hostData || guestData;
    const singleTimeline = hostTimeline || guestTimeline;

    if (!singleData) {
      throw new Error(`[MergeStage] No participant audio/video output files found for job ${jobId}`);
    }

    const inputPath = singleData.outputFile.replace(/\\/g, '/');
    const offsetMs = singleTimeline?.offsetMs || 0;
    const offsetSec = (offsetMs / 1000).toFixed(3);

    let command: string;

    if (offsetMs > 0) {
      // Single participant with start delay offset
      const filterGraph = `[0:v]tpad=start_duration=${offsetSec}:start_mode=add,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1[v];[0:a]adelay=${offsetMs}|${offsetMs},aformat=sample_rates=44100:channel_layouts=stereo[a]`;
      command = `${ffmpegBin} -y -i "${inputPath}" -filter_complex "${filterGraph}" -map "[v]" -map "[a]" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k "${normalizedOutputFile}"`;
    } else {
      // Direct transcode single participant
      command = `${ffmpegBin} -y -i "${inputPath}" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k "${normalizedOutputFile}"`;
    }

    console.log(`[MergeStage] Executing single-participant FFmpeg command: ${command}`);

    try {
      const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
      if (stdout) console.log(`[MergeStage] FFmpeg stdout:`, stdout.trim());
    } catch (error: any) {
      console.error(`[MergeStage] FFmpeg single-participant merge failed:`, error?.stderr || error?.message);
      throw new Error(`FFmpeg merge failed for ${outputFile}: ${error?.message || error}`);
    }

    const metadata = await probeMedia(outputFile);
    console.log(`[MergeStage] Single participant merge completed -> ${outputFile} (${(metadata.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB, ${metadata.durationMs}ms)`);
    return {
      outputFile,
      ...metadata,
    };
  }

  // Case 2: Dual Participant (Host + Guest) - Side-by-Side Sync Layout
  const hostInputPath = hostData.outputFile.replace(/\\/g, '/');
  const guestInputPath = guestData.outputFile.replace(/\\/g, '/');

  const hostOffsetMs = hostTimeline?.offsetMs || 0;
  const guestOffsetMs = guestTimeline?.offsetMs || 0;

  const hostOffsetSec = (hostOffsetMs / 1000).toFixed(3);
  const guestOffsetSec = (guestOffsetMs / 1000).toFixed(3);

  // Build Host Video & Audio Filters
  let hostVideoFilter = `scale=640:720:force_original_aspect_ratio=decrease,pad=640:720:(ow-iw)/2:(oh-ih)/2,setsar=1`;
  if (hostOffsetMs > 0) {
    hostVideoFilter = `tpad=start_duration=${hostOffsetSec}:start_mode=add,` + hostVideoFilter;
  }

  let hostAudioFilter = `aformat=sample_rates=44100:channel_layouts=stereo`;
  if (hostOffsetMs > 0) {
    hostAudioFilter = `adelay=${hostOffsetMs}|${hostOffsetMs},` + hostAudioFilter;
  }

  // Build Guest Video & Audio Filters
  let guestVideoFilter = `scale=640:720:force_original_aspect_ratio=decrease,pad=640:720:(ow-iw)/2:(oh-ih)/2,setsar=1`;
  if (guestOffsetMs > 0) {
    guestVideoFilter = `tpad=start_duration=${guestOffsetSec}:start_mode=add,` + guestVideoFilter;
  }

  let guestAudioFilter = `aformat=sample_rates=44100:channel_layouts=stereo`;
  if (guestOffsetMs > 0) {
    guestAudioFilter = `adelay=${guestOffsetMs}|${guestOffsetMs},` + guestAudioFilter;
  }

  // Combine into FFmpeg Filter Graph
  const filterGraph = [
    `[0:v]${hostVideoFilter}[v0]`,
    `[0:a]${hostAudioFilter}[a0]`,
    `[1:v]${guestVideoFilter}[v1]`,
    `[1:a]${guestAudioFilter}[a1]`,
    `[v0][v1]hstack=inputs=2[v]`,
    `[a0][a1]amix=inputs=2:duration=longest:dropout_transition=2[a]`,
  ].join(';');

  const command = `${ffmpegBin} -y -i "${hostInputPath}" -i "${guestInputPath}" -filter_complex "${filterGraph}" -map "[v]" -map "[a]" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k "${normalizedOutputFile}"`;

  console.log(`[MergeStage] Executing dual-participant synchronized merge:`);
  console.log(`[MergeStage]   Host offset: ${hostOffsetMs}ms, Guest offset: ${guestOffsetMs}ms`);
  console.log(`[MergeStage]   Command: ${command}`);

  try {
    const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
    if (stdout) console.log(`[MergeStage] FFmpeg stdout:`, stdout.trim());
  } catch (error: any) {
    console.error(`[MergeStage] FFmpeg dual-participant merge failed:`, error?.stderr || error?.message);
    throw new Error(`FFmpeg merge failed for ${outputFile}: ${error?.message || error}`);
  }

  const metadata = await probeMedia(outputFile);
  console.log(`[MergeStage] Dual-participant merge complete -> ${outputFile} (${metadata.width}x${metadata.height}, ${(metadata.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB, ${metadata.durationMs}ms)`);

  return {
    outputFile,
    ...metadata,
  };
}

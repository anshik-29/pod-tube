import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { JobDownloadResult, ParticipantDownloadResult } from './download-chunks';

const execAsync = promisify(exec);

export interface ParticipantConcatOutput {
  participantType: 'host' | 'guest';
  outputFile: string;
  concatListFile: string;
  sizeBytes: number;
}

export interface ConcatStageResult {
  jobId: string;
  episodeId: string;
  sessionId: string;
  workingDirectory: string;
  participants: {
    host?: ParticipantConcatOutput;
    guest?: ParticipantConcatOutput;
  };
}

/**
 * Execute FFmpeg concat demuxer command using stream copy (-c copy).
 * Throws immediately if FFmpeg returns a non-zero exit code.
 */
async function runFFmpegConcat(
  concatListPath: string,
  outputPath: string
): Promise<void> {
  // Normalize paths to forward slashes for FFmpeg compatibility across Windows and Linux
  const normalizedConcatList = concatListPath.replace(/\\/g, '/');
  const normalizedOutput = outputPath.replace(/\\/g, '/');

  const ffmpegBin = process.env.FFMPEG_PATH ? `"${process.env.FFMPEG_PATH}"` : 'ffmpeg';
  const command = `${ffmpegBin} -y -f concat -safe 0 -i "${normalizedConcatList}" -c copy "${normalizedOutput}"`;

  console.log(`[ConcatStage] Running FFmpeg command: ${command}`);

  try {
    const { stdout, stderr } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
    if (stdout) console.log(`[ConcatStage] FFmpeg stdout:`, stdout.trim());
  } catch (error: any) {
    console.error(`[ConcatStage] FFmpeg concat failed for ${normalizedConcatList}:`, error?.stderr || error?.message);
    throw new Error(`FFmpeg concat failed for ${outputPath}: ${error?.message || error}`);
  }
}

/**
 * concatStage
 *
 * Concatenates each participant's downloaded WebM chunks into a single continuous WebM file.
 * Uses FFmpeg concat demuxer with stream copy (-c copy) for zero re-encoding CPU overhead.
 * Host and guest are concatenated independently.
 */
export async function concatStage(downloadResult: JobDownloadResult): Promise<ConcatStageResult> {
  const { workingDirectory, jobId, episodeId, sessionId, participants } = downloadResult;

  console.log(`[ConcatStage] Starting chunk concatenation for job ${jobId} in ${workingDirectory}`);

  const concatParticipants: ConcatStageResult['participants'] = {};

  // Process host and guest independently
  for (const participantType of ['host', 'guest'] as const) {
    const participantData: ParticipantDownloadResult | undefined = participants[participantType];

    if (!participantData || participantData.chunks.length === 0) {
      continue;
    }

    // Sort chunks explicitly by chunk index ASC
    const sortedChunks = [...participantData.chunks].sort((a, b) => a.index - b.index);

    // 1. Generate concat text file list (e.g. host_chunks.txt)
    const concatListFilename = `${participantType}_chunks.txt`;
    const concatListPath = path.join(workingDirectory, concatListFilename);

    // Format lines: file '/absolute/path/to/chunk.webm'
    const listLines = sortedChunks.map((chunk) => {
      const normalizedPath = chunk.localPath.replace(/\\/g, '/');
      return `file '${normalizedPath}'`;
    });

    const concatListContent = listLines.join('\n');
    await fs.writeFile(concatListPath, concatListContent, 'utf-8');

    console.log(`[ConcatStage] Created concat list file ${concatListPath} with ${sortedChunks.length} chunk(s)`);

    // 2. Output file path (e.g. host.webm or guest.webm)
    const outputFile = path.join(workingDirectory, `${participantType}.webm`);

    // 3. Execute FFmpeg concat demuxer (-c copy)
    await runFFmpegConcat(concatListPath, outputFile);

    // Verify output file was created and get size
    const stat = await fs.stat(outputFile);
    console.log(`[ConcatStage] Concatenated ${participantType} -> ${outputFile} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);

    concatParticipants[participantType] = {
      participantType,
      outputFile,
      concatListFile: concatListPath,
      sizeBytes: stat.size,
    };
  }

  return {
    jobId,
    episodeId,
    sessionId,
    workingDirectory,
    participants: concatParticipants,
  };
}

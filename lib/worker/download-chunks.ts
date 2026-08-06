import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import os from 'os';
import { ProcessingJob } from '../db/queries/processing-jobs';
import { getEpisodeById } from '../db/queries/episodes';
import { getSessionById } from '../db/queries/sessions';
import { getAllSessionChunks, RecordingChunk } from '../db/queries/chunks';
import { getStorageProvider } from '../storage';

export interface DownloadedChunkInfo {
  index: number;
  storageKey: string;
  localPath: string;
  sizeBytes: number;
}

export interface ParticipantDownloadResult {
  participantType: 'host' | 'guest';
  directory: string;
  chunks: DownloadedChunkInfo[];
  totalSizeBytes: number;
}

export interface JobDownloadResult {
  jobId: string;
  episodeId: string;
  sessionId: string;
  workingDirectory: string;
  participants: {
    host?: ParticipantDownloadResult;
    guest?: ParticipantDownloadResult;
  };
  totalDownloadedChunks: number;
  totalSizeBytes: number;
}

/**
 * Stream chunk data from StorageProvider to a local destination file.
 * Isolates memory consumption so large files do not buffer into V8 heap.
 */
async function downloadChunkToFile(
  storageKey: string,
  destPath: string
): Promise<number> {
  const storage = getStorageProvider();
  await fs.mkdir(path.dirname(destPath), { recursive: true });

  try {
    const readStream = await storage.getStream(storageKey);
    const writeStream = createWriteStream(destPath);
    await pipeline(readStream, writeStream);
  } catch (streamError) {
    // Fallback: If streaming is unsupported, use buffer read
    const buffer = await storage.read(storageKey);
    await fs.writeFile(destPath, buffer);
  }

  const stat = await fs.stat(destPath);
  return stat.size;
}

/**
 * downloadChunksStage
 *
 * Downloads all uploaded chunks for a ProcessingJob from Cloudflare R2 / storage
 * into a temporary working directory organized by participant.
 *
 * Directory structure:
 * <os.tmpdir()>/podnow/<jobId>/
 * ├── host/
 * │   ├── chunk_0000.webm
 * │   └── chunk_0001.webm
 * └── guest/
 *     ├── chunk_0000.webm
 *     └── chunk_0001.webm
 */
export async function downloadChunksStage(job: ProcessingJob): Promise<JobDownloadResult> {
  // 1. Resolve Episode & Session
  const episode = await getEpisodeById(job.episode_id);
  if (!episode) {
    throw new Error(`Episode not found: ${job.episode_id}`);
  }

  const session = await getSessionById(episode.session_id);
  if (!session) {
    throw new Error(`Session not found for episode ${job.episode_id}`);
  }

  // 2. Fetch recording chunks ordered by chunk_index ASC
  const chunks = await getAllSessionChunks(session.id);
  const completedChunks = chunks.filter((c) => c.status === 'completed');

  if (completedChunks.length === 0) {
    throw new Error(`No completed chunks found for session ${session.id}`);
  }

  // 3. Create working directory structure
  const baseTempDir = process.env.TMPDIR || os.tmpdir();
  const workingDirectory = path.join(baseTempDir, 'podnow', job.id);
  await fs.mkdir(workingDirectory, { recursive: true });

  console.log(`[DownloadStage] Created working directory: ${workingDirectory}`);

  // 4. Group chunks by participant
  const groupedChunks = new Map<string, RecordingChunk[]>();
  for (const chunk of completedChunks) {
    const list = groupedChunks.get(chunk.participant_type) || [];
    list.push(chunk);
    groupedChunks.set(chunk.participant_type, list);
  }

  const participantsResult: JobDownloadResult['participants'] = {};
  let totalDownloadedChunks = 0;
  let totalSizeBytes = 0;

  // 5. Download chunks per participant preserving chunk_index order
  for (const [participantType, participantChunks] of groupedChunks.entries()) {
    // Sort explicitly by chunk_index ASC to guarantee order
    participantChunks.sort((a, b) => a.chunk_index - b.chunk_index);

    const participantDir = path.join(workingDirectory, participantType);
    await fs.mkdir(participantDir, { recursive: true });

    const downloadedChunks: DownloadedChunkInfo[] = [];
    let participantSizeBytes = 0;

    for (const chunk of participantChunks) {
      // Pad chunk index for filesystem sorting compatibility (e.g. chunk_0000.webm)
      const paddedIndex = String(chunk.chunk_index).padStart(4, '0');
      const filename = `chunk_${paddedIndex}.webm`;
      const destPath = path.join(participantDir, filename);

      console.log(`[DownloadStage] Downloading ${chunk.storage_key} -> ${destPath}`);
      const downloadedBytes = await downloadChunkToFile(chunk.storage_key, destPath);

      downloadedChunks.push({
        index: chunk.chunk_index,
        storageKey: chunk.storage_key,
        localPath: destPath,
        sizeBytes: downloadedBytes,
      });

      participantSizeBytes += downloadedBytes;
      totalDownloadedChunks++;
    }

    const typeKey = participantType as 'host' | 'guest';
    participantsResult[typeKey] = {
      participantType: typeKey,
      directory: participantDir,
      chunks: downloadedChunks,
      totalSizeBytes: participantSizeBytes,
    };

    totalSizeBytes += participantSizeBytes;
  }

  console.log(`[DownloadStage] Download completed: ${totalDownloadedChunks} chunk(s), ${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB total.`);

  // 6. Return metadata object for FFmpeg stage
  return {
    jobId: job.id,
    episodeId: episode.id,
    sessionId: session.id,
    workingDirectory,
    participants: participantsResult,
    totalDownloadedChunks,
    totalSizeBytes,
  };
}

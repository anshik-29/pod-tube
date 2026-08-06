/**
 * FFmpeg processing pipeline
 */

import ffmpeg from 'fluent-ffmpeg';
import { getStorageProvider } from '@/lib/storage';
import { getEpisodeById, updateEpisodeState } from '@/lib/db/queries/episodes';
import { getSessionById } from '@/lib/db/queries/sessions';
import { getUploadsBySessionId } from '@/lib/db/queries/uploads';
import { createProcessingJob } from '@/lib/db/queries/processing-jobs';
import path from 'path';
import fs from 'fs/promises';
import { tmpdir } from 'os';

// Configure FFmpeg path if provided via environment variable
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
} else if (process.env.FFMPEG_BIN_PATH) {
  // Alternative env var name
  ffmpeg.setFfmpegPath(process.env.FFMPEG_BIN_PATH);
}

export interface ProcessingOptions {
  trimStart?: number; // seconds
  trimEnd?: number; // seconds
  quality?: 'low' | 'medium' | 'high'; // video quality preset
}

export interface ProgressCallback {
  (progress: number): void;
}

export async function processEpisode(
  episodeId: string,
  options: ProcessingOptions = {},
  onProgress?: ProgressCallback
): Promise<void> {
  const episode = await getEpisodeById(episodeId);
  if (!episode) {
    throw new Error('Episode not found');
  }

  const session = await getSessionById(episode.session_id);
  if (!session) {
    throw new Error('Session not found');
  }

  if (!session.recording_started_at) {
    throw new Error('Session missing recording_started_at timestamp');
  }

  // Get uploads
  const uploads = await getUploadsBySessionId(episode.session_id);
  const hostUpload = uploads.find((u) => u.participant_type === 'host' && u.status === 'completed');
  const guestUpload = uploads.find((u) => u.participant_type === 'guest' && u.status === 'completed');

  if (!hostUpload) {
    throw new Error('Host upload not found');
  }

  const storage = getStorageProvider();

  // Download files to temp directory
  // Use /tmp if available, otherwise use OS temp dir
  const baseTempDir = process.env.TMPDIR || tmpdir();
  const tempDir = path.join(baseTempDir, `episode-${episodeId}`);
  
  // Ensure temp directory exists and is writable
  try {
    await fs.mkdir(tempDir, { recursive: true });
    // Verify directory was created and is writable by trying to write a test file
    const testFile = path.join(tempDir, '.test-write');
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    console.log(`[Processing] Created and verified writable temp directory: ${tempDir}`);
  } catch (error) {
    console.error(`[Processing] Failed to create/write to temp directory: ${tempDir}`, error);
    console.error(`[Processing] Base temp dir: ${baseTempDir}`);
    console.error(`[Processing] Temp dir permissions check failed`);
    throw new Error(`Failed to create writable temp directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  try {
    // Verify host upload file exists before processing
    const hostFileExists = await storage.exists(hostUpload.file_reference);
    if (!hostFileExists) {
      console.error(`[Processing] Host upload file not found: ${hostUpload.file_reference}`);
      console.error(`[Processing] Upload ID: ${hostUpload.id}, Status: ${hostUpload.status}`);
      throw new Error(`Host upload file not found: ${hostUpload.file_reference}. Upload may not have completed successfully.`);
    }
    console.log(`[Processing] Host upload file found: ${hostUpload.file_reference}`);

    const hostFile = path.join(tempDir, 'host.webm');
    const hostBuffer = await storage.read(hostUpload.file_reference);
    await fs.writeFile(hostFile, hostBuffer);
    console.log(`[Processing] Downloaded host file: ${hostFile}`);

    let guestFile: string | null = null;
    if (guestUpload) {
      // Verify guest upload file exists
      const guestFileExists = await storage.exists(guestUpload.file_reference);
      if (!guestFileExists) {
        console.error(`[Processing] Guest upload file not found: ${guestUpload.file_reference}`);
        console.error(`[Processing] Upload ID: ${guestUpload.id}, Status: ${guestUpload.status}`);
        throw new Error(`Guest upload file not found: ${guestUpload.file_reference}. Upload may not have completed successfully.`);
      }
      console.log(`[Processing] Guest upload file found: ${guestUpload.file_reference}`);

      guestFile = path.join(tempDir, 'guest.webm');
      const guestBuffer = await storage.read(guestUpload.file_reference);
      await fs.writeFile(guestFile, guestBuffer);
      console.log(`[Processing] Downloaded guest file: ${guestFile}`);
    }

    // Process with FFmpeg
    const outputFile = path.join(tempDir, 'output.mp4');
    const audioFile = path.join(tempDir, 'output.mp3');

    // Verify output directory is writable before processing
    try {
      await fs.access(tempDir, fs.constants.W_OK);
      console.log(`[Processing] Starting FFmpeg processing. Output: ${outputFile}`);
    } catch (error) {
      throw new Error(`Temp directory is not writable: ${tempDir}`);
    }

    await mergeAndTrim(hostFile, guestFile, outputFile, audioFile, options, session.recording_started_at, onProgress);
    console.log(`[Processing] FFmpeg processing completed. Output files created.`);

    // Upload processed files
    const outputBuffer = await fs.readFile(outputFile);
    const audioBuffer = await fs.readFile(audioFile);

    const videoReference = `episodes/${episodeId}/video.mp4`;
    const audioReference = `episodes/${episodeId}/audio.mp3`;

    await storage.save(videoReference, outputBuffer);
    await storage.save(audioReference, audioBuffer);

    // Update episode
    await updateEpisodeState(episodeId, 'ready', {
      video: videoReference,
      audio: audioReference,
    });

    // Cleanup raw recording files after successful processing
    // These are no longer needed once the episode is processed
    try {
      console.log(`[Processing] Cleaning up raw recording files for session: ${session.id}`);
      const uploads = await getUploadsBySessionId(session.id);
      for (const upload of uploads) {
        if (upload.file_reference && upload.status === 'completed') {
          try {
            const exists = await storage.exists(upload.file_reference);
            if (exists) {
              await storage.delete(upload.file_reference);
              console.log(`[Processing] Deleted raw recording: ${upload.file_reference}`);
            }
          } catch (error) {
            // Log but don't fail - cleanup errors shouldn't break processing
            console.warn(`[Processing] Failed to delete raw recording ${upload.file_reference}:`, error);
          }
        }
      }
    } catch (error) {
      // Log but don't fail - cleanup errors shouldn't break processing
      console.warn(`[Processing] Error during raw file cleanup:`, error);
    }
  } finally {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temp directory:', error);
    }
  }
}

// Extract audio directly from source files (faster than re-encoding from MP4)
async function extractAudioDirectly(
  hostFile: string,
  guestFile: string | null,
  audioFile: string,
  options: ProcessingOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    let command: ffmpeg.FfmpegCommand;

    if (guestFile) {
      // Merge audio from both sources
      command = ffmpeg()
        .input(hostFile)
        .input(guestFile)
        .complexFilter('[0:a][1:a]amix=inputs=2:duration=longest[a]')
        .outputOptions(['-map [a]']);
    } else {
      command = ffmpeg(hostFile);
    }

    // Apply trimming to audio
    if (options.trimStart) {
      command = command.seekInput(options.trimStart);
    }

    if (options.trimEnd) {
      const duration = options.trimEnd - (options.trimStart || 0);
      command = command.duration(duration);
    }

    command
      .output(audioFile)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate(192) // Good quality, fast encoding
      .audioChannels(2) // Stereo
      .audioFrequency(44100) // Standard sample rate
      .addOption('-threads', '0') // Use all CPU cores
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
}

async function mergeAndTrim(
  hostFile: string,
  guestFile: string | null,
  outputFile: string,
  audioFile: string,
  options: ProcessingOptions,
  recordingStartedAt: Date,
  onProgress?: ProgressCallback
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    // Verify output directory exists and is writable before starting
    const outputDir = path.dirname(outputFile);
    try {
      await fs.access(outputDir, fs.constants.W_OK);
      console.log(`[FFmpeg] Output directory verified: ${outputDir}`);
    } catch (error) {
      const errorMsg = `Output directory is not writable: ${outputDir}. Error: ${error instanceof Error ? error.message : 'Unknown'}`;
      console.error(`[FFmpeg] ${errorMsg}`);
      reject(new Error(errorMsg));
      return;
    }

    let command: ffmpeg.FfmpegCommand;
    let totalDuration: number | null = null;

    // First, get the duration of the source file
    const probeCommand = ffmpeg(hostFile);
    probeCommand.ffprobe((err, metadata) => {
      if (err) {
        console.warn('Could not probe video duration:', err);
        totalDuration = null;
      } else {
        totalDuration = metadata.format.duration || null;
      }
    });

    if (guestFile) {
      // Merge host and guest tracks
      command = ffmpeg()
        .input(hostFile)
        .input(guestFile)
        .complexFilter([
          '[0:a][1:a]amix=inputs=2:duration=longest[a]',
          '[0:v][1:v]hstack[v]',
        ])
        .outputOptions(['-map [a]', '-map [v]']);
    } else {
      command = ffmpeg(hostFile);
    }

    // Apply trimming
    if (options.trimStart) {
      command = command.seekInput(options.trimStart);
    }

    if (options.trimEnd) {
      const duration = options.trimEnd - (options.trimStart || 0);
      command = command.duration(duration);
      totalDuration = duration;
    }

    // Determine quality settings
    const quality = options.quality || 'medium';
    const qualitySettings = {
      low: { crf: '28', preset: 'ultrafast', videoBitrate: '1M' },
      medium: { crf: '23', preset: 'veryfast', videoBitrate: '2M' },
      high: { crf: '18', preset: 'fast', videoBitrate: '4M' },
    };
    const settings = qualitySettings[quality];

    // Output video with quality-based settings
    // Log the output file path for debugging
    console.log(`[FFmpeg] Output file path: ${outputFile}`);
    console.log(`[FFmpeg] Output directory: ${path.dirname(outputFile)}`);
    
    command
      .output(outputFile)
      .videoCodec('libx264')
      .audioCodec('aac')
      .addOption('-preset', settings.preset)
      .addOption('-crf', settings.crf)
      .addOption('-b:v', settings.videoBitrate) // Use addOption to avoid fluent-ffmpeg's bitrate conversion
      // Use multiple threads for encoding
      .addOption('-threads', '0') // 0 = use all available CPU cores
      // Optimize for faster encoding
      .addOption('-movflags', '+faststart') // Enable fast start for web playback
      .addOption('-y') // Overwrite output file if it exists
      .on('start', (commandLine) => {
        console.log(`[FFmpeg] Starting encoding: ${commandLine}`);
        console.log(`[FFmpeg] Output will be written to: ${outputFile}`);
      })
      .on('progress', (progress) => {
        if (onProgress && totalDuration && progress.timemark) {
          // Parse time mark (format: HH:MM:SS.mmm)
          const timeParts = progress.timemark.split(':');
          const seconds = parseFloat(timeParts[0]) * 3600 + 
                        parseFloat(timeParts[1]) * 60 + 
                        parseFloat(timeParts[2]);
          const percentage = Math.min(95, Math.round((seconds / totalDuration) * 100)); // Cap at 95% for video, audio will complete it
          onProgress(percentage);
        }
      })
      .on('end', () => {
        // Video encoding complete, now extract audio (this is the remaining ~5%)
        if (onProgress) {
          onProgress(95); // Video is done, audio extraction is quick
        }
        // Extract audio directly from source files (faster than re-encoding from MP4)
        extractAudioDirectly(hostFile, guestFile, audioFile, options)
          .then(() => {
            if (onProgress) {
              onProgress(100);
            }
            resolve();
          })
          .catch(reject);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('[FFmpeg] Error during video encoding:', err);
        console.error('[FFmpeg] stdout:', stdout);
        console.error('[FFmpeg] stderr:', stderr);
        console.error('[FFmpeg] Output file path:', outputFile);
        console.error('[FFmpeg] Output directory:', path.dirname(outputFile));
        reject(err);
      })
      .run();
  });
}

export async function queueProcessing(episodeId: string): Promise<void> {
  await createProcessingJob(episodeId);
}

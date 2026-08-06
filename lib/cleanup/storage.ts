/**
 * Storage cleanup utilities
 * Handles deletion of old episodes and raw recordings
 */

import { getStorageProvider } from '@/lib/storage';
import { getEpisodeById, deleteEpisode } from '@/lib/db/queries/episodes';
import { getUploadsBySessionId } from '@/lib/db/queries/uploads';

export interface CleanupStats {
  episodesDeleted: number;
  filesDeleted: number;
  errors: number;
  totalSpaceFreed: number; // in bytes (approximate)
}

/**
 * Safely delete an episode and its referenced media files from storage (Cloudflare R2).
 * 
 * Requirement:
 * 1. Load episode from database.
 * 2. Read stored file reference(s).
 * 3. Delete every referenced object using StorageProvider.delete().
 * 4. Only after successful storage deletion, delete the episode database record.
 * 
 * If storage deletion fails:
 * - Do NOT delete the database row.
 * - Throw an error to prevent orphaned files or inconsistent state.
 */
export async function deleteEpisodeWithStorageCleanup(episodeId: string): Promise<void> {
  const episode = await getEpisodeById(episodeId);
  if (!episode) {
    throw new Error('Episode not found');
  }

  const storage = getStorageProvider();
  const keysToDelete = new Set<string>();

  // Extract all file references from episode record
  if (episode.file_references) {
    for (const [key, val] of Object.entries(episode.file_references)) {
      if (typeof val === 'string' && val.trim().length > 0 && val.includes('/')) {
        keysToDelete.add(val);
      }
    }
  }

  // Always check standard key pattern: episodes/<episodeId>/episode.mp4
  keysToDelete.add(`episodes/${episodeId}/episode.mp4`);

  console.log(`[Episode Delete] Deleting storage keys for episode ${episodeId}:`, Array.from(keysToDelete));

  // Step 3: Delete every referenced object using StorageProvider.delete()
  for (const storageKey of keysToDelete) {
    try {
      const exists = await storage.exists(storageKey);
      if (exists) {
        await storage.delete(storageKey);
        console.log(`[Episode Delete] Successfully deleted storage object: ${storageKey}`);
      }
    } catch (error: any) {
      console.error(`[Episode Delete] Failed to delete storage object ${storageKey}:`, error);
      throw new Error(`Storage deletion failed for ${storageKey}: ${error?.message || error}`);
    }
  }

  // Step 4: Only after successful storage deletion, delete the episode database record
  await deleteEpisode(episodeId);
  console.log(`[Episode Delete] Successfully deleted database record for episode ${episodeId}`);
}

/**
 * Delete raw recording files for a session
 * This is called after processing completes
 */
export async function cleanupRawRecordings(sessionId: string): Promise<number> {
  const storage = getStorageProvider();
  const uploads = await getUploadsBySessionId(sessionId);
  let deletedCount = 0;

  for (const upload of uploads) {
    if (upload.file_reference && upload.status === 'completed') {
      try {
        const exists = await storage.exists(upload.file_reference);
        if (exists) {
          await storage.delete(upload.file_reference);
          deletedCount++;
          console.log(`[Cleanup] Deleted raw recording: ${upload.file_reference}`);
        }
      } catch (error) {
        console.warn(`[Cleanup] Failed to delete raw recording ${upload.file_reference}:`, error);
      }
    }
  }

  return deletedCount;
}

/**
 * Clean up episodes older than the retention period
 * @param retentionDays Number of days to keep episodes (default: 7)
 * @returns Cleanup statistics
 */
export async function cleanupOldEpisodes(retentionDays: number = 7): Promise<CleanupStats> {
  const stats: CleanupStats = {
    episodesDeleted: 0,
    filesDeleted: 0,
    errors: 0,
    totalSpaceFreed: 0,
  };

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  console.log(`[Cleanup] Starting cleanup of episodes older than ${retentionDays} days (before ${cutoffDate.toISOString()})`);

  try {
    const allEpisodes = await getAllEpisodes();
    
    for (const episode of allEpisodes) {
      if (episode.state === 'ready' && episode.created_at < cutoffDate) {
        try {
          await deleteEpisodeWithStorageCleanup(episode.id);
          stats.episodesDeleted++;
          console.log(`[Cleanup] Deleted episode: ${episode.id} (created: ${episode.created_at})`);
        } catch (error) {
          console.error(`[Cleanup] Error deleting episode ${episode.id}:`, error);
          stats.errors++;
        }
      }
    }
  } catch (error) {
    console.error('[Cleanup] Error during episode cleanup:', error);
    stats.errors++;
  }

  console.log(`[Cleanup] Completed: ${stats.episodesDeleted} episodes deleted, ${stats.errors} errors`);
  return stats;
}

/**
 * Get all episodes (helper function)
 */
async function getAllEpisodes() {
  const { getDbPool } = await import('@/lib/db/client');
  const pool = getDbPool();
  const result = await pool.query(
    'SELECT * FROM episodes WHERE state = $1 ORDER BY created_at',
    ['ready']
  );
  return result.rows;
}

/**
 * Clean up failed or stuck processing jobs
 * Removes episodes that have been in 'processing' state for too long
 */
export async function cleanupStuckEpisodes(maxProcessingHours: number = 24): Promise<CleanupStats> {
  const stats: CleanupStats = {
    episodesDeleted: 0,
    filesDeleted: 0,
    errors: 0,
    totalSpaceFreed: 0,
  };

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - maxProcessingHours);

  console.log(`[Cleanup] Cleaning up episodes stuck in processing for more than ${maxProcessingHours} hours`);

  try {
    const { getDbPool } = await import('@/lib/db/client');
    const pool = getDbPool();
    const result = await pool.query(
      `SELECT e.* FROM episodes e
       LEFT JOIN processing_jobs pj ON e.id = pj.episode_id
       WHERE e.state = 'processing' 
       AND e.created_at < $1
       AND (pj.status = 'failed' OR pj.status IS NULL OR pj.created_at < $1)`,
      [cutoffDate]
    );

    for (const episode of result.rows) {
      try {
        await deleteEpisodeWithStorageCleanup(episode.id);
        stats.episodesDeleted++;
        console.log(`[Cleanup] Deleted stuck episode: ${episode.id}`);
      } catch (error) {
        console.error(`[Cleanup] Error deleting stuck episode ${episode.id}:`, error);
        stats.errors++;
      }
    }
  } catch (error) {
    console.error('[Cleanup] Error during stuck episode cleanup:', error);
    stats.errors++;
  }

  return stats;
}

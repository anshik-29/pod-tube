import fs from 'fs/promises';
import { getStorageProvider } from '../storage';
import { getAllSessionChunks, deleteSessionChunks } from '../db/queries/chunks';

/**
 * cleanupR2ChunksStage
 *
 * Deletes original recording chunk objects from Cloudflare R2 object storage and
 * removes database records from recording_chunks AFTER final episode upload and database state update.
 *
 * Requirements:
 * 1. Query all recording_chunks for the session.
 * 2. Delete every chunk object through existing StorageProvider.delete().
 * 3. Only after all chunk deletions succeed, remove recording_chunks database records.
 *
 * If final upload fails, this stage is not invoked, leaving chunks available for retry.
 */
export async function cleanupR2ChunksStage(sessionId: string): Promise<void> {
  console.log(`[CleanupStage] Querying R2 recording chunks for session: ${sessionId}`);

  const storage = getStorageProvider();
  const chunks = await getAllSessionChunks(sessionId);

  console.log(`[CleanupStage] Found ${chunks.length} recording chunk(s) to delete from Cloudflare R2.`);

  // 1 & 2. Delete every chunk object through StorageProvider.delete()
  for (const chunk of chunks) {
    if (chunk.storage_key) {
      try {
        const exists = await storage.exists(chunk.storage_key);
        if (exists) {
          await storage.delete(chunk.storage_key);
          console.log(`[CleanupStage] Deleted R2 chunk object: ${chunk.storage_key}`);
        } else {
          console.log(`[CleanupStage] R2 chunk object already removed or missing: ${chunk.storage_key}`);
        }
      } catch (error: any) {
        console.error(`[CleanupStage] Error deleting R2 chunk object ${chunk.storage_key}:`, error?.message || error);
        throw new Error(`Failed to delete R2 chunk object ${chunk.storage_key}: ${error?.message || error}`);
      }
    }
  }

  // 3. Only after ALL chunk deletions succeed, remove recording_chunks database records
  const deletedCount = await deleteSessionChunks(sessionId);
  console.log(`[CleanupStage] Removed ${deletedCount} database record(s) from recording_chunks for session: ${sessionId}`);
}

/**
 * cleanupStage
 *
 * Removes the temporary working directory (/tmp/podnow/<jobId>) after
 * successful upload, database state update, and R2 chunk cleanup.
 *
 * Cleanup is only invoked upon verified success. If an error occurs prior
 * to cleanup, temporary files remain untouched for debugging or retry.
 */
export async function cleanupStage(workingDirectory: string): Promise<void> {
  console.log(`[CleanupStage] Cleaning up temporary working directory: ${workingDirectory}`);

  try {
    await fs.rm(workingDirectory, { recursive: true, force: true });
    console.log(`[CleanupStage] Successfully removed working directory: ${workingDirectory}`);
  } catch (error: any) {
    console.warn(`[CleanupStage] Failed to cleanup working directory ${workingDirectory}:`, error?.message || error);
  }
}

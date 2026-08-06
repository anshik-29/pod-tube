import { getDbPool } from '../client';

export type ProcessingJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ProcessingJob {
  id: string;
  episode_id: string;
  status: ProcessingJobStatus;
  error_message: string | null;
  progress: number | null;
  created_at: Date;
  updated_at: Date;
}

export async function createProcessingJob(episodeId: string): Promise<ProcessingJob> {
  const pool = getDbPool();
  const result = await pool.query<ProcessingJob>(
    'INSERT INTO processing_jobs (episode_id, status) VALUES ($1, $2) RETURNING *',
    [episodeId, 'pending']
  );
  return result.rows[0];
}

/**
 * Idempotently create a ProcessingJob for an episode.
 * If a processing job already exists with status 'pending', 'processing', or 'completed',
 * returns the existing job. Otherwise, creates exactly one new processing job.
 */
export async function createProcessingJobIfAbsent(episodeId: string): Promise<ProcessingJob> {
  const pool = getDbPool();

  // 1. Check if an active/existing processing job already exists for this episode
  const existing = await pool.query<ProcessingJob>(
    `SELECT * FROM processing_jobs 
     WHERE episode_id = $1 AND status IN ('pending', 'processing', 'completed') 
     ORDER BY created_at DESC LIMIT 1`,
    [episodeId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  // 2. If no active job exists, insert a new pending job
  try {
    const result = await pool.query<ProcessingJob>(
      `INSERT INTO processing_jobs (episode_id, status) 
       VALUES ($1, 'pending') 
       RETURNING *`,
      [episodeId]
    );
    return result.rows[0];
  } catch (err) {
    // In case of concurrent insertion, fetch the existing active job
    const refetch = await pool.query<ProcessingJob>(
      `SELECT * FROM processing_jobs 
       WHERE episode_id = $1 AND status IN ('pending', 'processing', 'completed') 
       ORDER BY created_at DESC LIMIT 1`,
      [episodeId]
    );
    if (refetch.rows.length > 0) {
      return refetch.rows[0];
    }
    throw err;
  }
}

export async function getProcessingJobById(id: string): Promise<ProcessingJob | null> {
  const pool = getDbPool();
  const result = await pool.query<ProcessingJob>(
    'SELECT * FROM processing_jobs WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function getProcessingJobByEpisodeId(episodeId: string): Promise<ProcessingJob | null> {
  const pool = getDbPool();
  const result = await pool.query<ProcessingJob>(
    'SELECT * FROM processing_jobs WHERE episode_id = $1 ORDER BY created_at DESC LIMIT 1',
    [episodeId]
  );
  return result.rows[0] || null;
}

export async function updateProcessingJobStatus(
  id: string,
  status: ProcessingJobStatus,
  errorMessage?: string | null,
  progress?: number | null
): Promise<ProcessingJob> {
  const pool = getDbPool();
  const result = await pool.query<ProcessingJob>(
    'UPDATE processing_jobs SET status = $1, error_message = $2, progress = COALESCE($3, progress), updated_at = NOW() WHERE id = $4 RETURNING *',
    [status, errorMessage || null, progress !== undefined ? progress : null, id]
  );
  return result.rows[0];
}

export async function getPendingProcessingJobs(): Promise<ProcessingJob[]> {
  const pool = getDbPool();
  const result = await pool.query<ProcessingJob>(
    'SELECT * FROM processing_jobs WHERE status = $1 ORDER BY created_at',
    ['pending']
  );
  return result.rows;
}

export async function getFailedProcessingJobs(): Promise<ProcessingJob[]> {
  const pool = getDbPool();
  const result = await pool.query<ProcessingJob>(
    'SELECT * FROM processing_jobs WHERE status = $1 ORDER BY created_at',
    ['failed']
  );
  return result.rows;
}

/**
 * Atomically claim the next pending processing job using FOR UPDATE SKIP LOCKED.
 * Automatically transitions status from 'pending' to 'processing' and returns the claimed job.
 * Ensures concurrent workers cannot claim or process the same job.
 */
export async function claimNextPendingProcessingJob(): Promise<ProcessingJob | null> {
  const pool = getDbPool();
  const sql = `
    UPDATE processing_jobs
    SET status = 'processing', updated_at = NOW()
    WHERE id = (
      SELECT id FROM processing_jobs
      WHERE status = 'pending'
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *;
  `;
  const result = await pool.query<ProcessingJob>(sql);
  return result.rows[0] || null;
}


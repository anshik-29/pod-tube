import { getDbPool } from '../client';

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

export type ParticipantType = 'host' | 'guest';

export interface Upload {
  id: string;
  session_id: string;
  participant_type: ParticipantType;
  file_reference: string;
  status: UploadStatus;
  progress: number;
  total_chunks: number | null;
  recording_duration: number | null;
  recording_started_at: Date | null;
  recording_ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Ensure uploads table contains timeline columns
 */
async function ensureUploadColumns(): Promise<void> {
  try {
    const pool = getDbPool();
    await pool.query(`
      ALTER TABLE uploads ADD COLUMN IF NOT EXISTS total_chunks INTEGER;
      ALTER TABLE uploads ADD COLUMN IF NOT EXISTS recording_duration INTEGER;
      ALTER TABLE uploads ADD COLUMN IF NOT EXISTS recording_started_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE uploads ADD COLUMN IF NOT EXISTS recording_ended_at TIMESTAMP WITH TIME ZONE;
    `);
  } catch (err) {
    // Non-critical if columns exist
  }
}

export async function createUpload(
  sessionId: string,
  participantType: ParticipantType,
  fileReference: string
): Promise<Upload> {
  await ensureUploadColumns();
  const pool = getDbPool();
  const result = await pool.query<Upload>(
    'INSERT INTO uploads (session_id, participant_type, file_reference, status) VALUES ($1, $2, $3, $4) RETURNING *',
    [sessionId, participantType, fileReference, 'pending']
  );
  return result.rows[0];
}

export async function getUploadById(id: string): Promise<Upload | null> {
  await ensureUploadColumns();
  const pool = getDbPool();
  const result = await pool.query<Upload>(
    'SELECT * FROM uploads WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function updateUploadStatus(
  id: string,
  status: UploadStatus,
  progress?: number
): Promise<Upload> {
  await ensureUploadColumns();
  const pool = getDbPool();
  let query: string;
  let params: any[];

  if (progress !== undefined) {
    query = 'UPDATE uploads SET status = $1, progress = $2, updated_at = NOW() WHERE id = $3 RETURNING *';
    params = [status, progress, id];
  } else {
    query = 'UPDATE uploads SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
    params = [status, id];
  }

  const result = await pool.query<Upload>(query, params);
  return result.rows[0];
}

export async function getUploadsBySessionId(sessionId: string): Promise<Upload[]> {
  await ensureUploadColumns();
  const pool = getDbPool();
  const result = await pool.query<Upload>(
    'SELECT * FROM uploads WHERE session_id = $1 ORDER BY created_at',
    [sessionId]
  );
  return result.rows;
}

/**
 * Record participant timeline timestamps (recording_started_at and recording_ended_at)
 * in the uploads table for synchronization.
 */
export async function recordParticipantTimeline(
  sessionId: string,
  participantType: ParticipantType,
  totalChunks: number,
  recordingDuration?: number,
  recordingStartedAt?: Date | string,
  recordingEndedAt?: Date | string
): Promise<Upload> {
  await ensureUploadColumns();
  const pool = getDbPool();
  const fileRef = `sessions/${sessionId}/${participantType}/recording.webm`;
  const startDate = recordingStartedAt ? new Date(recordingStartedAt) : null;
  const endDate = recordingEndedAt ? new Date(recordingEndedAt) : null;

  const existing = await pool.query<Upload>(
    'SELECT * FROM uploads WHERE session_id = $1 AND participant_type = $2 LIMIT 1',
    [sessionId, participantType]
  );

  if (existing.rows.length > 0) {
    const updated = await pool.query<Upload>(
      `UPDATE uploads 
       SET total_chunks = $1,
           recording_duration = $2,
           recording_started_at = COALESCE($3, recording_started_at),
           recording_ended_at = COALESCE($4, recording_ended_at),
           status = 'completed',
           updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [totalChunks, recordingDuration || null, startDate, endDate, existing.rows[0].id]
    );
    return updated.rows[0];
  } else {
    const created = await pool.query<Upload>(
      `INSERT INTO uploads (session_id, participant_type, file_reference, status, total_chunks, recording_duration, recording_started_at, recording_ended_at)
       VALUES ($1, $2, $3, 'completed', $4, $5, $6, $7) RETURNING *`,
      [sessionId, participantType, fileRef, totalChunks, recordingDuration || null, startDate, endDate]
    );
    return created.rows[0];
  }
}

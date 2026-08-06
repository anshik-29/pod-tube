import { getDbPool } from '../client';

export type EpisodeState = 'processing' | 'ready' | 'failed';

export interface Episode {
  id: string;
  session_id: string;
  host_id: string;
  title: string | null;
  description: string | null;
  state: EpisodeState;
  file_references: Record<string, string> | null;
  trim_settings: { trimStart?: number; trimEnd?: number; quality?: 'low' | 'medium' | 'high' } | null;
  created_at: Date;
}

let constraintInitialized = false;

/**
 * Ensures duplicate episodes per session are cleaned up and a UNIQUE constraint
 * on (session_id) exists in PostgreSQL.
 */
async function ensureUniqueEpisodeSessionIdConstraint(): Promise<void> {
  if (constraintInitialized) return;
  const pool = getDbPool();
  try {
    // 1. Detect and safely remove duplicate processing_jobs and episodes for the same session_id,
    // keeping the earliest created episode (MIN created_at, MIN id).
    await pool.query(`
      DELETE FROM processing_jobs
      WHERE episode_id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at ASC, id ASC) as row_num
          FROM episodes
        ) duplicates
        WHERE duplicates.row_num > 1
      );
    `);

    await pool.query(`
      DELETE FROM episodes
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at ASC, id ASC) as row_num
          FROM episodes
        ) duplicates
        WHERE duplicates.row_num > 1
      );
    `);

    // 2. Create UNIQUE index/constraint on (session_id)
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_episodes_unique_session_id ON episodes(session_id);
    `);

    constraintInitialized = true;
  } catch (err) {
    // Non-critical if index already exists
  }
}

/**
 * Get an episode directly by session_id
 */
export async function getEpisodeBySessionId(sessionId: string): Promise<Episode | null> {
  await ensureUniqueEpisodeSessionIdConstraint();
  const pool = getDbPool();
  const result = await pool.query<Episode>(
    'SELECT * FROM episodes WHERE session_id = $1 ORDER BY created_at ASC LIMIT 1',
    [sessionId]
  );
  return result.rows[0] || null;
}

/**
 * Atomically create or retrieve an episode for a session using ON CONFLICT (session_id).
 */
export async function createEpisode(
  sessionId: string,
  hostId: string,
  title?: string
): Promise<Episode> {
  await ensureUniqueEpisodeSessionIdConstraint();
  const pool = getDbPool();

  try {
    const result = await pool.query<Episode>(
      `INSERT INTO episodes (session_id, host_id, title, state) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (session_id) 
       DO UPDATE SET host_id = EXCLUDED.host_id 
       RETURNING *`,
      [sessionId, hostId, title || null, 'processing']
    );
    return result.rows[0];
  } catch (error) {
    const existing = await pool.query<Episode>(
      'SELECT * FROM episodes WHERE session_id = $1 ORDER BY created_at ASC LIMIT 1',
      [sessionId]
    );
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }
    throw error;
  }
}

export async function getEpisodeById(id: string): Promise<Episode | null> {
  const pool = getDbPool();
  const result = await pool.query<Episode>(
    'SELECT * FROM episodes WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function updateEpisodeState(
  id: string,
  state: EpisodeState,
  fileReferences?: Record<string, string>
): Promise<Episode> {
  const pool = getDbPool();
  let query: string;
  let params: any[];

  if (fileReferences) {
    query = 'UPDATE episodes SET state = $1, file_references = $2 WHERE id = $3 RETURNING *';
    params = [state, JSON.stringify(fileReferences), id];
  } else {
    query = 'UPDATE episodes SET state = $1 WHERE id = $2 RETURNING *';
    params = [state, id];
  }

  const result = await pool.query<Episode>(query, params);
  return result.rows[0];
}

export async function updateEpisodeTrimSettings(
  id: string,
  trimStart?: number,
  trimEnd?: number,
  quality?: 'low' | 'medium' | 'high'
): Promise<Episode> {
  const pool = getDbPool();
  const trimSettings = { trimStart, trimEnd, quality };
  const result = await pool.query<Episode>(
    'UPDATE episodes SET trim_settings = $1 WHERE id = $2 RETURNING *',
    [JSON.stringify(trimSettings), id]
  );
  return result.rows[0];
}

export async function getEpisodesByHostId(
  hostId: string,
  options?: {
    search?: string;
    state?: EpisodeState;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<Episode[]> {
  const pool = getDbPool();
  let query = 'SELECT * FROM episodes WHERE host_id = $1';
  const params: any[] = [hostId];
  let paramIndex = 2;

  // Add search filter (title)
  if (options?.search) {
    query += ` AND (title ILIKE $${paramIndex} OR id::text ILIKE $${paramIndex})`;
    params.push(`%${options.search}%`);
    paramIndex++;
  }

  // Add state filter
  if (options?.state) {
    query += ` AND state = $${paramIndex}`;
    params.push(options.state);
    paramIndex++;
  }

  // Add date filters
  if (options?.dateFrom) {
    query += ` AND created_at >= $${paramIndex}`;
    params.push(options.dateFrom);
    paramIndex++;
  }

  if (options?.dateTo) {
    query += ` AND created_at <= $${paramIndex}`;
    params.push(options.dateTo);
    paramIndex++;
  }

  query += ' ORDER BY created_at DESC';

  const result = await pool.query<Episode>(query, params);
  return result.rows;
}

export async function updateEpisodeTitle(id: string, title: string): Promise<Episode> {
  const pool = getDbPool();
  const result = await pool.query<Episode>(
    'UPDATE episodes SET title = $1 WHERE id = $2 RETURNING *',
    [title || null, id]
  );
  return result.rows[0];
}

export async function updateEpisodeDescription(id: string, description: string): Promise<Episode> {
  const pool = getDbPool();
  const result = await pool.query<Episode>(
    'UPDATE episodes SET description = $1 WHERE id = $2 RETURNING *',
    [description || null, id]
  );
  return result.rows[0];
}

export async function deleteEpisode(id: string): Promise<void> {
  const pool = getDbPool();
  await pool.query('DELETE FROM episodes WHERE id = $1', [id]);
}

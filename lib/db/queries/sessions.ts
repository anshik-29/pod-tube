import { getDbPool } from '../client';

export type SessionState = 'idle' | 'recording' | 'uploading' | 'processing' | 'ready' | 'failed';

export interface Session {
  id: string;
  host_id: string;
  guest_token: string;
  state: SessionState;
  recording_started_at: Date | null;
  total_chunks?: number | null;
  recording_duration?: number | null;
  created_at: Date;
  updated_at: Date;
}

export async function createSession(hostId: string, guestToken: string): Promise<Session> {
  const pool = getDbPool();
  const result = await pool.query<Session>(
    'INSERT INTO sessions (host_id, guest_token, state) VALUES ($1, $2, $3) RETURNING *',
    [hostId, guestToken, 'idle']
  );
  return result.rows[0];
}

export async function getSessionById(id: string): Promise<Session | null> {
  const pool = getDbPool();
  const result = await pool.query<Session>(
    'SELECT * FROM sessions WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function getSessionByGuestToken(guestToken: string): Promise<Session | null> {
  const pool = getDbPool();
  const result = await pool.query<Session>(
    'SELECT * FROM sessions WHERE guest_token = $1',
    [guestToken]
  );
  return result.rows[0] || null;
}

export async function updateSessionState(
  id: string,
  state: SessionState,
  recordingStartedAt?: Date
): Promise<Session> {
  const pool = getDbPool();
  let query: string;
  let params: any[];

  if (recordingStartedAt) {
    query = 'UPDATE sessions SET state = $1, recording_started_at = $2, updated_at = NOW() WHERE id = $3 RETURNING *';
    params = [state, recordingStartedAt, id];
  } else {
    query = 'UPDATE sessions SET state = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
    params = [state, id];
  }

  const result = await pool.query<Session>(query, params);
  return result.rows[0];
}

export async function getSessionsByHostId(hostId: string): Promise<Session[]> {
  const pool = getDbPool();
  const result = await pool.query<Session>(
    'SELECT * FROM sessions WHERE host_id = $1 ORDER BY created_at DESC',
    [hostId]
  );
  return result.rows;
}

export async function deleteSession(id: string): Promise<void> {
  const pool = getDbPool();
  await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
}

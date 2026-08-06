import { getUploadsBySessionId } from '../db/queries/uploads';
import { getSessionById } from '../db/queries/sessions';

export interface ParticipantTimeline {
  participantType: 'host' | 'guest';
  recordingStartedAt: Date;
  recordingEndedAt: Date;
  offsetMs: number;
  durationMs: number;
}

export interface SessionTimeline {
  sessionId: string;
  timelineStart: Date;
  sessionStartTime: Date;
  participants: {
    host?: ParticipantTimeline;
    guest?: ParticipantTimeline;
  };
}

/**
 * resolveSessionTimeline
 *
 * Resolves participant timeline metadata from database records.
 * Calculates timelineStart as the absolute minimum recordingStartedAt across ALL participants
 * (whether host or guest started recording first).
 *
 * Computes:
 * - timelineStart = min(recordingStartedAt across all participants)
 * - participantOffsetMs = participantRecordingStartedAt - timelineStart
 * - durationMs = participantRecordingEndedAt - participantRecordingStartedAt
 */
export async function resolveSessionTimeline(sessionId: string): Promise<SessionTimeline> {
  const uploads = await getUploadsBySessionId(sessionId);
  const session = await getSessionById(sessionId);

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const rawTimelines: { [key in 'host' | 'guest']?: { startedAt: Date; endedAt: Date } } = {};

  // Extract timeline timestamps recorded per participant in uploads table
  for (const upload of uploads) {
    const pType = upload.participant_type as 'host' | 'guest';
    const startedAt = upload.recording_started_at
      ? new Date(upload.recording_started_at)
      : upload.created_at;

    const endedAt = upload.recording_ended_at
      ? new Date(upload.recording_ended_at)
      : new Date(startedAt.getTime() + (upload.recording_duration || 0) * 1000);

    rawTimelines[pType] = { startedAt, endedAt };
  }

  // Fallback: If host upload record is missing, use session recording_started_at
  if (!rawTimelines.host && (session.recording_started_at || session.created_at)) {
    const hostStart = session.recording_started_at ? new Date(session.recording_started_at) : new Date(session.created_at);
    const hostEnd = new Date(hostStart.getTime() + (session.recording_duration || 0) * 1000);
    rawTimelines.host = { startedAt: hostStart, endedAt: hostEnd };
  }

  // 1. Calculate timelineStart = min(recordingStartedAt across all participants)
  let timelineStart: Date | null = null;
  for (const info of Object.values(rawTimelines)) {
    if (info && (!timelineStart || info.startedAt.getTime() < timelineStart.getTime())) {
      timelineStart = info.startedAt;
    }
  }

  if (!timelineStart) {
    timelineStart = session.recording_started_at ? new Date(session.recording_started_at) : new Date(session.created_at);
  }

  // 2. Compute participantOffset = participantRecordingStartedAt - timelineStart
  const resultParticipants: SessionTimeline['participants'] = {};

  for (const [typeStr, info] of Object.entries(rawTimelines)) {
    if (!info) continue;
    const pType = typeStr as 'host' | 'guest';

    const offsetMs = Math.max(0, info.startedAt.getTime() - timelineStart.getTime());
    const durationMs = Math.max(0, info.endedAt.getTime() - info.startedAt.getTime());

    resultParticipants[pType] = {
      participantType: pType,
      recordingStartedAt: info.startedAt,
      recordingEndedAt: info.endedAt,
      offsetMs,
      durationMs,
    };
  }

  console.log(`[Timeline] Resolved timeline for session ${sessionId}:`);
  console.log(`[Timeline]   timelineStart: ${timelineStart.toISOString()}`);
  if (resultParticipants.host) {
    console.log(`[Timeline]   Host offsetMs: ${resultParticipants.host.offsetMs} ms (duration: ${resultParticipants.host.durationMs} ms)`);
  }
  if (resultParticipants.guest) {
    console.log(`[Timeline]   Guest offsetMs: ${resultParticipants.guest.offsetMs} ms (duration: ${resultParticipants.guest.durationMs} ms)`);
  }

  return {
    sessionId,
    timelineStart,
    sessionStartTime: timelineStart,
    participants: resultParticipants,
  };
}

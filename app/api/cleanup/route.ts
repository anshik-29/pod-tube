/**
 * Cleanup API endpoint
 * Handles cleanup of old episodes and storage files
 * Can be called manually or via cron job
 */

import { NextRequest, NextResponse } from 'next/server';
import { cleanupOldEpisodes, cleanupStuckEpisodes } from '@/lib/cleanup/storage';

export async function POST(req: NextRequest) {
  try {
    // Optional: Add authentication for manual cleanup
    // For now, allow unauthenticated (you can add auth later)
    const body = await req.json().catch(() => ({}));
    const { retentionDays, cleanupStuck } = body;

    // Get retention period from env or request (default: 7 days)
    const retentionPeriod = retentionDays || parseInt(process.env.EPISODE_RETENTION_DAYS || '7', 10);
    const shouldCleanupStuck = cleanupStuck !== false; // Default to true

    console.log(`[Cleanup API] Starting cleanup with retention: ${retentionPeriod} days`);

    const results: any = {};

    // Clean up old episodes
    try {
      results.oldEpisodes = await cleanupOldEpisodes(retentionPeriod);
    } catch (error) {
      console.error('[Cleanup API] Error cleaning old episodes:', error);
      results.oldEpisodes = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Clean up stuck episodes (optional)
    if (shouldCleanupStuck) {
      try {
        const maxProcessingHours = parseInt(process.env.MAX_PROCESSING_HOURS || '24', 10);
        results.stuckEpisodes = await cleanupStuckEpisodes(maxProcessingHours);
      } catch (error) {
        console.error('[Cleanup API] Error cleaning stuck episodes:', error);
        results.stuckEpisodes = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cleanup API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for status/health check
export async function GET() {
  return NextResponse.json({
    message: 'Cleanup API is available',
    retentionDays: parseInt(process.env.EPISODE_RETENTION_DAYS || '7', 10),
    maxProcessingHours: parseInt(process.env.MAX_PROCESSING_HOURS || '24', 10),
  });
}

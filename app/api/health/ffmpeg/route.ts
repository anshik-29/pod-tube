import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const ffmpegBin = process.env.FFMPEG_PATH ? `"${process.env.FFMPEG_PATH}"` : 'ffmpeg';

    // Get ffmpeg version
    let version: string;
    try {
      const { stdout } = await execAsync(`${ffmpegBin} -version`);
      version = stdout.split('\n')[0];
    } catch (error) {
      return NextResponse.json(
        {
          installed: false,
          path: process.env.FFMPEG_PATH || 'ffmpeg',
          error: 'FFmpeg binary not found or version check failed',
        },
        { status: 500 }
      );
    }

    console.log('[FFmpeg Health Check] FFmpeg is installed and working');
    console.log('[FFmpeg Health Check] Path:', process.env.FFMPEG_PATH || 'ffmpeg');
    console.log('[FFmpeg Health Check] Version:', version);

    return NextResponse.json({
      installed: true,
      path: process.env.FFMPEG_PATH || 'ffmpeg',
      version: version,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[FFmpeg Health Check] Error:', errorMessage);

    return NextResponse.json(
      {
        installed: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

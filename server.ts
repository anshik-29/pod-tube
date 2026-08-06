import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import path from 'path';
import { initializeSocketIO, getSocketIO } from './lib/websocket/server';
import { startProcessingWorker, stopProcessingWorker } from './lib/worker/processing-worker';
import { closeDbPool } from './lib/db/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : (process.env.HOSTNAME || '0.0.0.0');
const listenHost = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

/**
 * Validate required environment variables at production startup
 */
function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return;

  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'STORAGE_TYPE',
    'NEXT_PUBLIC_APP_URL',
  ];

  const storageType = (process.env.STORAGE_TYPE || '').toLowerCase();
  if (storageType === 'r2' || storageType === 's3') {
    const hasAccountId = !!(process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID);
    if (!hasAccountId) requiredVars.push('R2_ACCOUNT_ID');
    if (!process.env.R2_ACCESS_KEY_ID && !process.env.AWS_ACCESS_KEY_ID) requiredVars.push('R2_ACCESS_KEY_ID');
    if (!process.env.R2_SECRET_ACCESS_KEY && !process.env.AWS_SECRET_ACCESS_KEY) requiredVars.push('R2_SECRET_ACCESS_KEY');
    if (!process.env.R2_BUCKET_NAME && !process.env.AWS_S3_BUCKET) requiredVars.push('R2_BUCKET_NAME');
  }

  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`[Env Error] CRITICAL: Missing required environment variable(s) for production deployment: ${missing.join(', ')}`);
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
}

// Check FFmpeg availability on startup
async function checkFFmpeg() {
  try {
    const ffmpegBin = process.env.FFMPEG_PATH ? `"${process.env.FFMPEG_PATH}"` : 'ffmpeg';
    const { stdout: version } = await execAsync(`${ffmpegBin} -version`);
    const versionLine = version.split('\n')[0];
    console.log('[FFmpeg] ✓ FFmpeg is installed and available');
    console.log(`[FFmpeg] ${versionLine.trim()}`);
  } catch (error) {
    console.warn('[FFmpeg] ⚠️  FFmpeg is not installed or not in PATH.');
    console.warn('[FFmpeg] Video merging feature requires FFmpeg.');
  }
}

// 1. Environment validation
validateEnv();

const app = next({ dev, hostname, port, dir: path.resolve(__dirname) });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Check FFmpeg status on startup
  await checkFFmpeg();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.io
  initializeSocketIO(httpServer);

  // Start background processing worker
  startProcessingWorker().catch((err) => {
    console.error('[Worker] Failed to start ProcessingWorker:', err);
  });

  let isShuttingDown = false;

  /**
   * Railway Signal Handling & Graceful Shutdown
   * 1. Stop HTTP server
   * 2. Close Socket.IO
   * 3. Stop processing worker (finish current job if active)
   * 4. Close database connection pool
   */
  async function gracefulShutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[Server] ${signal} received. Initiating graceful shutdown...`);

    httpServer.close(() => {
      console.log('[Server] HTTP server closed.');
    });

    try {
      const io = getSocketIO();
      if (io) {
        io.close();
        console.log('[Server] Socket.IO server closed.');
      }
    } catch (err) {
      console.error('[Server] Error closing Socket.IO:', err);
    }

    try {
      stopProcessingWorker();
      console.log('[Server] ProcessingWorker stopped.');
    } catch (err) {
      console.error('[Server] Error stopping ProcessingWorker:', err);
    }

    try {
      await closeDbPool();
      console.log('[Server] Database connection pool closed.');
    } catch (err) {
      console.error('[Server] Error closing database pool:', err);
    }

    console.log('[Server] Graceful shutdown complete. Exiting.');
    process.exit(0);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, listenHost, () => {
      console.log(`> Ready on http://${listenHost}:${port} (hostname: ${hostname})`);
      console.log(`> Socket.io server initialized`);
      console.log(`> ProcessingWorker initialized and polling DB`);
    });
});

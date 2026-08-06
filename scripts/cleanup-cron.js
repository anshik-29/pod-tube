/**
 * Cleanup Cron Job Script
 * 
 * This script can be run manually or via cron to trigger cleanup
 * 
 * Usage:
 *   node scripts/cleanup-cron.js
 * 
 * Or add to crontab:
 *   0 2 * * * cd /path/to/app && node scripts/cleanup-cron.js >> /var/log/cleanup.log 2>&1
 */

const http = require('http');
const https = require('https');

// Get configuration from environment
// Default to localhost for development, but should be set to domain in production
const cleanupUrl = process.env.CLEANUP_URL || 'http://localhost:3000/api/cleanup';
const retentionDays = parseInt(process.env.EPISODE_RETENTION_DAYS || '7', 10);
const maxProcessingHours = parseInt(process.env.MAX_PROCESSING_HOURS || '24', 10);

// Determine if URL is HTTPS
const isHttps = cleanupUrl.startsWith('https://');
const httpModule = isHttps ? https : http;

// Parse URL
const url = new URL(cleanupUrl);

async function runCleanup() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      retentionDays,
      cleanupStuck: true,
    });

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = httpModule.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(data);
            console.log(`[Cleanup Cron] Success:`, JSON.stringify(result, null, 2));
            resolve(result);
          } catch (error) {
            console.log(`[Cleanup Cron] Success (non-JSON response):`, data);
            resolve(data);
          }
        } else {
          const error = new Error(`Cleanup failed with status ${res.statusCode}: ${data}`);
          console.error(`[Cleanup Cron] Error:`, error.message);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`[Cleanup Cron] Request error:`, error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Run cleanup
console.log(`[Cleanup Cron] Starting cleanup at ${new Date().toISOString()}`);
console.log(`[Cleanup Cron] URL: ${cleanupUrl}`);
console.log(`[Cleanup Cron] Retention: ${retentionDays} days`);
console.log(`[Cleanup Cron] Max processing hours: ${maxProcessingHours}`);

runCleanup()
  .then(() => {
    console.log(`[Cleanup Cron] Completed successfully at ${new Date().toISOString()}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`[Cleanup Cron] Failed:`, error);
    process.exit(1);
  });

# Storage Cleanup Guide

This document explains how the automatic storage cleanup system works and how to configure it.

> **See `STORAGE_ESTIMATES.md` for S3 storage cost estimates and file size calculations.**

## Overview

The cleanup system automatically manages storage space by:

1. **Deleting raw recordings** after processing completes (immediate)
2. **Deleting old episodes** after a retention period (configurable)
3. **Cleaning up stuck processing jobs** that have failed

## How It Works

### 1. Automatic Raw File Cleanup

When an episode finishes processing successfully, the system automatically deletes the raw `.webm` recording files. These files are no longer needed once the processed MP4/MP3 files are created.

**Location:** `lib/processing/processor.ts` - runs automatically after processing

### 2. Retention-Based Cleanup

Processed episodes are kept for a configurable number of days (default: 7 days), then automatically deleted.

**Configuration:**
- Set `EPISODE_RETENTION_DAYS` environment variable
- Default: `7` days
- Set to `0` to disable (not recommended)

### 3. Stuck Processing Cleanup

Episodes that have been stuck in "processing" state for too long are automatically cleaned up.

**Configuration:**
- Set `MAX_PROCESSING_HOURS` environment variable
- Default: `24` hours

## Environment Variables

Add these to your `.env` file:

```bash
# Cleanup Configuration
EPISODE_RETENTION_DAYS=7      # Days to keep processed episodes
MAX_PROCESSING_HOURS=24       # Hours before cleaning up stuck episodes
```

## Manual Cleanup

You can trigger cleanup manually via the API endpoint:

```bash
# Clean up old episodes
curl -X POST http://localhost:3000/api/cleanup \
  -H "Content-Type: application/json" \
  -d '{"retentionDays": 7, "cleanupStuck": true}'
```

Or check cleanup status:

```bash
curl http://localhost:3000/api/cleanup
```

## Scheduled Cleanup (Cron Job)

For production, set up a cron job to run cleanup automatically. A cleanup script is included at `scripts/cleanup-cron.js`.

### Option 1: Using the Included Node.js Script (Recommended)

The script `scripts/cleanup-cron.js` is already set up and uses environment variables.

**Add to crontab (`crontab -e`):**

```bash
# Run cleanup daily at 2 AM
0 2 * * * cd /path/to/app && node scripts/cleanup-cron.js >> /var/log/cleanup.log 2>&1
```

**Or with environment variables:**

```bash
# Run cleanup daily at 2 AM with custom settings
0 2 * * * cd /path/to/app && EPISODE_RETENTION_DAYS=7 CLEANUP_URL=http://localhost:3000/api/cleanup node scripts/cleanup-cron.js >> /var/log/cleanup.log 2>&1
```

### Option 2: Using curl (Simple)

Add to your crontab (`crontab -e`):

```bash
# Run cleanup daily at 2 AM
0 2 * * * curl -X POST http://localhost:3000/api/cleanup -H "Content-Type: application/json" -d '{"retentionDays": 7, "cleanupStuck": true}' >> /var/log/cleanup.log 2>&1
```

**For production with authentication (if you add auth later):**

```bash
0 2 * * * curl -X POST https://yourdomain.com/api/cleanup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_TOKEN" \
  -d '{"retentionDays": 7, "cleanupStuck": true}' \
  >> /var/log/cleanup.log 2>&1
```

### Option 3: Using Coolify/Docker Cron

If using Coolify or Docker, you can add a cron service:

**Option A: Using the Node.js script in a container**

```yaml
# docker-compose.yml
services:
  cleanup:
    build: .
    command: >
      sh -c "while true; do
        node scripts/cleanup-cron.js;
        sleep 86400;
      done"
    environment:
      - CLEANUP_URL=http://app:3000/api/cleanup
      - EPISODE_RETENTION_DAYS=7
      - MAX_PROCESSING_HOURS=24
    restart: unless-stopped
    depends_on:
      - app
```

**Option B: Using curl in a separate container**

```yaml
# docker-compose.yml
services:
  cleanup:
    image: curlimages/curl:latest
    command: >
      sh -c "while true; do
        curl -X POST http://app:3000/api/cleanup
        -H 'Content-Type: application/json'
        -d '{\"retentionDays\": 7, \"cleanupStuck\": true}';
        sleep 86400;
      done"
    restart: unless-stopped
    depends_on:
      - app
```

### Option 4: Systemd Timer (Linux)

Create `/etc/systemd/system/cleanup.service`:

```ini
[Unit]
Description=PodNow Cleanup Job
After=network.target

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/app
Environment="EPISODE_RETENTION_DAYS=7"
Environment="CLEANUP_URL=http://localhost:3000/api/cleanup"
ExecStart=/usr/bin/node scripts/cleanup-cron.js
```

Create `/etc/systemd/system/cleanup.timer`:

```ini
[Unit]
Description=Run PodNow Cleanup Daily
Requires=cleanup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl enable cleanup.timer
sudo systemctl start cleanup.timer
sudo systemctl status cleanup.timer
```

## Storage Structure

Files are stored in the following structure:

```
/app/storage/
├── sessions/              # Raw recordings (deleted after processing)
│   └── {sessionId}/
│       ├── host/
│       └── guest/
└── episodes/              # Processed files (deleted after retention period)
    └── {episodeId}/
        ├── video.mp4
        └── audio.mp3
```

## Monitoring

Check cleanup logs in your application logs:

```bash
# Look for cleanup messages
grep "Cleanup" /var/log/app.log

# Or in Docker
docker logs your-container | grep Cleanup
```

## Best Practices

1. **Set appropriate retention period**: Balance user needs with storage costs
   - 7 days: Good for testing/development
   - 30 days: Better for production
   - 0 days: Not recommended (users may lose files)

2. **Monitor storage usage**: Regularly check disk space
   ```bash
   du -sh /app/storage
   ```

3. **Backup important episodes**: Before cleanup runs, ensure important episodes are backed up

4. **Test cleanup**: Run manual cleanup first to verify it works correctly

5. **Set up alerts**: Monitor disk space and cleanup failures

## Troubleshooting

### Cleanup not running

1. Check environment variables are set correctly
2. Verify API endpoint is accessible: `curl http://localhost:3000/api/cleanup`
3. Check application logs for errors

### Episodes not being deleted

1. Verify `EPISODE_RETENTION_DAYS` is set correctly
2. Check episode `created_at` dates in database
3. Ensure episodes are in 'ready' state (not 'processing')

### Storage still filling up

1. Check if raw recordings are being deleted (should happen automatically)
2. Verify cleanup cron job is running
3. Check for stuck processing jobs
4. Manually trigger cleanup to see what's happening

## Future: S3 Integration

When you configure S3 storage, the cleanup system will work the same way, but files will be moved to S3 instead of being deleted. This will be implemented in a future update.

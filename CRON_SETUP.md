# Quick Cron Job Setup Guide

## Quick Start

### 1. Test the cleanup script manually

```bash
# From your project directory
node scripts/cleanup-cron.js

# Or using npm
npm run cleanup
```

### 2. Set up daily cron job

**Edit crontab:**
```bash
crontab -e
```

**Add this line (runs daily at 2 AM):**
```bash
0 2 * * * cd /path/to/your/app && node scripts/cleanup-cron.js >> /var/log/podnow-cleanup.log 2>&1
```

**Replace `/path/to/your/app` with your actual project path.**

### 3. Verify cron job is set up

```bash
# List your cron jobs
crontab -l

# Check if cron service is running (Linux)
sudo systemctl status cron

# View cleanup logs
tail -f /var/log/podnow-cleanup.log
```

## Environment Variables

The script uses these environment variables (set in your `.env` file or crontab):

```bash
EPISODE_RETENTION_DAYS=7          # Days to keep episodes (default: 7)
MAX_PROCESSING_HOURS=24           # Hours before cleaning stuck jobs (default: 24)
CLEANUP_URL=https://yourdomain.com/api/cleanup  # Cleanup API URL (use your domain in production)
```

**Important:** For production, set `CLEANUP_URL` to your actual domain (e.g., `https://podnow.bytesbyblinken.com/api/cleanup`), not `localhost`.

## For Coolify/Docker Deployments

If you're using Coolify or Docker, you have two options:

### Option A: Add to your main container

Add a cron service to your `docker-compose.yml` or Coolify configuration:

```yaml
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
    restart: unless-stopped
```

### Option B: Use Coolify's scheduled tasks

In Coolify, you can set up a scheduled task that calls your cleanup endpoint:

1. Go to your application settings
2. Add a scheduled task
3. Set schedule: `0 2 * * *` (daily at 2 AM)
4. Command: Use one of these options:

**Option 1: Use your domain (recommended for production):**
```bash
curl -X POST https://yourdomain.com/api/cleanup -H "Content-Type: application/json" -d '{"retentionDays": 7, "cleanupStuck": true}'
```

**Option 2: Use internal container name (if task runs in same network):**
```bash
curl -X POST http://your-app-name:3000/api/cleanup -H "Content-Type: application/json" -d '{"retentionDays": 7, "cleanupStuck": true}'
```

**Option 3: Use localhost (only if task runs inside the app container):**
```bash
curl -X POST http://localhost:3000/api/cleanup -H "Content-Type: application/json" -d '{"retentionDays": 7, "cleanupStuck": true}'
```

**Note:** Replace `yourdomain.com` with your actual domain, or `your-app-name` with your Coolify app's container name.

## Testing

### Test cleanup API endpoint

```bash
# Check if endpoint is accessible
curl http://localhost:3000/api/cleanup

# Run cleanup manually
curl -X POST http://localhost:3000/api/cleanup \
  -H "Content-Type: application/json" \
  -d '{"retentionDays": 7, "cleanupStuck": true}'
```

### Test cron script

```bash
# Run script directly
node scripts/cleanup-cron.js

# Check exit code (0 = success)
echo $?
```

## Troubleshooting

### Cron job not running

1. **Check cron service:**
   ```bash
   sudo systemctl status cron  # Linux
   sudo service cron status     # Some Linux distros
   ```

2. **Check cron logs:**
   ```bash
   # Ubuntu/Debian
   grep CRON /var/log/syslog
   
   # CentOS/RHEL
   grep CRON /var/log/cron
   ```

3. **Verify script path:**
   - Use absolute paths in crontab
   - Ensure Node.js is in PATH or use full path: `/usr/bin/node`

4. **Check permissions:**
   - Script must be executable: `chmod +x scripts/cleanup-cron.js`
   - User running cron must have access to the directory

### Script fails with connection error

1. **Check if app is running:**
   ```bash
   curl http://localhost:3000/api/cleanup
   ```

2. **Update CLEANUP_URL:**
   - **For production:** Use your domain (e.g., `https://yourdomain.com/api/cleanup`) - **Recommended**
   - **For Docker/Coolify:** Use container name (e.g., `http://your-app-name:3000/api/cleanup`)
   - **For localhost:** Only if running inside the same container (e.g., `http://localhost:3000/api/cleanup`)

3. **Check firewall/network:**
   - Ensure port 3000 is accessible
   - Check if app is bound to `0.0.0.0` not just `localhost`

### No files being deleted

1. **Check retention period:**
   - Episodes must be older than `EPISODE_RETENTION_DAYS`
   - Check episode `created_at` dates in database

2. **Verify episodes are in 'ready' state:**
   - Only 'ready' episodes are cleaned up
   - Stuck 'processing' episodes are handled separately

3. **Check storage permissions:**
   - App must have write/delete permissions on storage directory

## Monitoring

### View cleanup logs

```bash
# If logging to file
tail -f /var/log/podnow-cleanup.log

# If logging to syslog
grep cleanup /var/log/syslog
```

### Check cleanup results

The cleanup API returns statistics:

```json
{
  "success": true,
  "results": {
    "oldEpisodes": {
      "episodesDeleted": 5,
      "filesDeleted": 10,
      "errors": 0
    },
    "stuckEpisodes": {
      "episodesDeleted": 1,
      "filesDeleted": 2,
      "errors": 0
    }
  }
}
```

## Best Practices

1. **Run during low-traffic hours:** 2 AM is a good default
2. **Monitor logs:** Check logs after first few runs
3. **Start with longer retention:** Test with 30 days, then reduce to 7
4. **Backup before cleanup:** Ensure important episodes are backed up
5. **Set up alerts:** Monitor disk space and cleanup failures

## Schedule Examples

```bash
# Daily at 2 AM (recommended)
0 2 * * * cd /path/to/app && node scripts/cleanup-cron.js >> /var/log/cleanup.log 2>&1

# Every 12 hours
0 */12 * * * cd /path/to/app && node scripts/cleanup-cron.js >> /var/log/cleanup.log 2>&1

# Weekly on Sunday at 3 AM
0 3 * * 0 cd /path/to/app && node scripts/cleanup-cron.js >> /var/log/cleanup.log 2>&1
```

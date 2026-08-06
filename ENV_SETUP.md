# Environment Variables Setup Guide

This guide explains each environment variable and how to set them up.

## Required Variables

### 1. JWT_SECRET (Required)
**What it is:** A secret key used to sign and verify authentication tokens (JWTs).

**How to generate:**
```bash
# Option 1: Use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Use OpenSSL
openssl rand -hex 32

# Option 3: Use an online generator
# Visit: https://generate-secret.vercel.app/32
```

**Example:**
```
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

**Important:** 
- Use a long, random string (at least 32 characters)
- Keep it secret - never commit it to version control
- Use different secrets for development and production

---

### 2. TURN Server Variables (Optional but Recommended)

**What they are:** TURN (Traversal Using Relays around NAT) server credentials for WebRTC. These help video calls work when users are behind firewalls or NATs.

**Options:**

#### Option A: Use a Free TURN Service (Easiest for Testing)
- **Twilio STUN/TURN**: Free tier available
- **Cloudflare**: Free TURN service
- **Xirsys**: Free tier available

#### Option B: Self-Hosted TURN Server (Production)
Install and configure coturn (open-source TURN server):

```bash
# Ubuntu/Debian
sudo apt-get install coturn

# Configure in /etc/turnserver.conf
listening-port=3478
realm=your-domain.com
user=username:password
```

**Example values:**
```
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_SERVER_USERNAME=your-username
TURN_SERVER_PASSWORD=your-password
```

**For Development/Testing:**
You can leave these empty initially. The app will use Google's free STUN server, which works for many cases but may fail with strict firewalls:
```
# Leave empty or comment out - app will use STUN only
# TURN_SERVER_URL=
# TURN_SERVER_USERNAME=
# TURN_SERVER_PASSWORD=
```

**Note:** Without a TURN server, WebRTC may not work if both users are behind restrictive firewalls/NATs.

---

### 3. Storage Variables (Required)

#### STORAGE_TYPE
**What it is:** The type of storage backend to use.

**Options:**
- `local` - Store files on the local filesystem (default, good for development)
- `s3` - Use S3-compatible storage (not implemented in v1, but ready for future)

**Example:**
```
STORAGE_TYPE=local
```

#### STORAGE_LOCAL_DIR
**What it is:** Directory where uploaded files will be stored (only used when `STORAGE_TYPE=local`).

**Example:**
```
STORAGE_LOCAL_DIR=./uploads
```

**Important:**
- Make sure the directory exists or the app can create it
- This directory will contain video/audio files, so ensure you have enough disk space
- Add this directory to `.gitignore` (already done)

---

### 4. Cleanup Variables (Optional)

#### EPISODE_RETENTION_DAYS
**What it is:** Number of days to keep processed episodes before automatic deletion.

**Default:** `7` days

**Example:**
```
EPISODE_RETENTION_DAYS=7
```

**Important:**
- Episodes older than this will be automatically deleted
- Raw recording files are deleted immediately after processing
- Set to `0` to disable automatic deletion (not recommended for production)

#### MAX_PROCESSING_HOURS
**What it is:** Maximum hours an episode can be stuck in 'processing' state before cleanup.

**Default:** `24` hours

**Example:**
```
MAX_PROCESSING_HOURS=24
```

**Important:**
- Episodes stuck in processing longer than this will be cleaned up
- Helps prevent storage buildup from failed processing jobs

---

## Complete .env Example

```bash
# Database (you already have this)
DATABASE_URL=postgres://user:password@host:5432/database

# Authentication (REQUIRED - generate a random secret)
JWT_SECRET=your-generated-secret-key-here-minimum-32-characters

# TURN Server (OPTIONAL - can leave empty for development)
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_SERVER_USERNAME=your-username
TURN_SERVER_PASSWORD=your-password

# Storage (REQUIRED)
STORAGE_TYPE=local
STORAGE_LOCAL_DIR=./uploads

# Cleanup (OPTIONAL - defaults shown)
EPISODE_RETENTION_DAYS=7  # Delete episodes older than this many days
MAX_PROCESSING_HOURS=24   # Delete episodes stuck in processing longer than this
```

---

## Quick Setup Steps

1. **Generate JWT_SECRET:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the output to your `.env` file.

2. **Set Storage (easiest):**
   ```
   STORAGE_TYPE=local
   STORAGE_LOCAL_DIR=./uploads
   ```

3. **TURN Server (optional for now):**
   - Leave empty for development/testing
   - Set up later if you need it for production

4. **Test your setup:**
   ```bash
   npm run dev
   ```

---

## Troubleshooting

**"JWT_SECRET environment variable is not set"**
- Make sure you've added `JWT_SECRET=...` to your `.env` file
- Restart your development server after adding it

**WebRTC not connecting:**
- Try setting up a TURN server
- Check browser console for WebRTC errors
- Ensure both users have camera/microphone permissions

**Storage errors:**
- Make sure `STORAGE_LOCAL_DIR` directory exists or can be created
- Check disk space
- Verify write permissions

**"Cannot find ffmpeg" error:**
- FFmpeg must be installed on your system
- See FFmpeg Installation section below
- If FFmpeg is installed but not in PATH, set `FFMPEG_PATH` in your `.env` file

---

## FFmpeg Installation

FFmpeg is required for video processing. If you encounter "Cannot find ffmpeg" errors, follow these steps:

### Windows Installation

1. **Download FFmpeg:**
   - Visit https://www.gyan.dev/ffmpeg/builds/
   - Download the "ffmpeg-release-essentials.zip" file
   - Extract it to a folder (e.g., `C:\ffmpeg`)

2. **Add to PATH (Option 1 - Recommended):**
   - Open System Properties → Environment Variables
   - Edit the "Path" variable in System variables
   - Add `C:\ffmpeg\bin` to the path
   - Restart your terminal/IDE

3. **Or Set FFMPEG_PATH (Option 2):**
   - Add to your `.env` file: `FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe`
   - Use the full path to `ffmpeg.exe` (not just the directory)

4. **Verify:**
   ```powershell
   ffmpeg -version
   ```

### macOS Installation

```bash
brew install ffmpeg
```

### Linux Installation

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**CentOS/RHEL:**
```bash
sudo yum install ffmpeg
```

**Verify:**
```bash
ffmpeg -version
```

---

## Summary

This document covers all environment variables needed for PodNow. Make sure to set up at least the required variables before running the application. **FFmpeg must be installed and accessible** for video processing to work.

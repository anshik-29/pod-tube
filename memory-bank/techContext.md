# Technical Context

## Tech Stack
- **Frontend**: Next.js App Router with React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: PostgreSQL (pg)
- **Real-time**: Socket.io (WebSocket with polling fallback)
- **Storage**: Storage abstraction (local filesystem v1, S3-ready)
- **Processing**: FFmpeg (fluent-ffmpeg)
- **Auth**: JWT with bcrypt password hashing
- **WebRTC**: Peer-to-peer with self-hosted TURN server

## Key Libraries
- pg: PostgreSQL client
- socket.io: WebSocket server/client
- bcrypt: Password hashing
- jsonwebtoken: JWT tokens
- fluent-ffmpeg: Video processing
- zod: Validation

## Environment Variables
- DATABASE_URL: PostgreSQL connection string
- JWT_SECRET: Secret for JWT signing
- TURN_SERVER_URL: TURN server URL
- TURN_SERVER_USERNAME: TURN server username
- TURN_SERVER_PASSWORD: TURN server password
- STORAGE_TYPE: 'local' for v1, 's3' for cloud storage (future)
- STORAGE_LOCAL_DIR: Local upload directory (default: ./uploads)
- EPISODE_RETENTION_DAYS: Days to keep processed episodes before deletion (default: 7)
- MAX_PROCESSING_HOURS: Hours before cleaning up stuck processing jobs (default: 24)
- CLEANUP_URL: URL for cleanup API endpoint (default: http://localhost:3000/api/cleanup)
- FFMPEG_PATH: Path to FFmpeg executable (local Windows dev only, not needed in Docker/Nixpacks)

## Storage System
- **Current**: Local filesystem storage (`/app/storage` in production)
- **Future**: S3-compatible cloud storage (storage abstraction layer ready)
- **Cleanup**: Automatic deletion of raw recordings after processing
- **Retention**: Configurable episode retention period (default: 7 days)
- **Cron Job**: Automated daily cleanup via `/api/cleanup` endpoint
- **File Sizes**: ~1 GB per episode (medium quality, 1 hour recording)
- **S3 Costs**: ~$0.023/GB/month (estimated $1.15/month for 50 episodes)

## Cleanup System
- **Automatic**: Raw recording files deleted immediately after processing
- **Scheduled**: Old episodes deleted daily via cron job
- **API Endpoint**: `/api/cleanup` for manual and scheduled cleanup
- **Script**: `scripts/cleanup-cron.js` for cron job execution
- **Documentation**: CLEANUP.md, CRON_SETUP.md, STORAGE_ESTIMATES.md

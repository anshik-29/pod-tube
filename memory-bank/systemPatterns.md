# System Patterns

## Storage Cleanup Pattern
- Raw recording files are automatically deleted after processing completes
- Processed episodes are kept for a configurable retention period (EPISODE_RETENTION_DAYS)
- Cleanup runs via cron job calling `/api/cleanup` endpoint
- Cleanup utilities in `lib/cleanup/storage.ts` handle file deletion and database cleanup
- Storage abstraction allows seamless transition to S3 without code changes

## Architecture Patterns
- **Storage Abstraction**: StorageProvider interface allows swapping storage backends
- **State Persistence**: All critical state in PostgreSQL, not in-memory
- **Job Queue**: Database-persisted jobs, in-memory queue is executor only
- **WebSocket Usage**: Real-time UI sync only; core state is server-driven

## Data Patterns
- Logical file references in database (not absolute paths)
- All sessions/episodes owned by host_id
- recording_started_at timestamp for track synchronization
- Processing jobs survive server restarts

## Safety Patterns
- Never auto-delete raw uploaded media until export succeeds
- Jobs can be retried after server restart
- Upload failures allow resuming/retrying
- Processing failures have clear error messages with retry options

## Security Patterns
- All API routes use `withAuth` middleware for authentication
- JWT tokens stored in localStorage (consider httpOnly cookies for production)
- Password hashing with bcrypt (10 rounds)
- Protected routes use `ProtectedRoute` component wrapper
- **User isolation enforced**: All endpoints verify ownership (episode.host_id, session.host_id)
- **Database queries scoped**: getEpisodesByHostId(), getSessionsByHostId() filter by user
- **Password reset**: Token-based system with expiration (requires email service for production)

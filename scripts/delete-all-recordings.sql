-- Delete All Recording Data from PodNow Database
-- This script deletes all sessions, episodes, uploads, and processing jobs
-- Users are preserved (only recording data is deleted)
--
-- WARNING: This will permanently delete all recording data!
-- Make sure you have backups if needed.
--
-- Run this in pgAdmin or your PostgreSQL client

BEGIN;

-- Delete all processing jobs (will be auto-deleted by CASCADE, but explicit for clarity)
DELETE FROM processing_jobs;

-- Delete all episodes (will cascade delete processing_jobs)
DELETE FROM episodes;

-- Delete all uploads (will be auto-deleted by CASCADE, but explicit for clarity)
DELETE FROM uploads;

-- Delete all sessions (will cascade delete episodes and uploads)
DELETE FROM sessions;

-- Verify deletion (should return 0 rows)
SELECT 
    (SELECT COUNT(*) FROM sessions) as sessions_count,
    (SELECT COUNT(*) FROM episodes) as episodes_count,
    (SELECT COUNT(*) FROM uploads) as uploads_count,
    (SELECT COUNT(*) FROM processing_jobs) as processing_jobs_count;

COMMIT;

-- Alternative: If you want to delete everything including users, uncomment below:
-- BEGIN;
-- DELETE FROM processing_jobs;
-- DELETE FROM episodes;
-- DELETE FROM uploads;
-- DELETE FROM sessions;
-- DELETE FROM users;  -- This will delete all users too!
-- COMMIT;

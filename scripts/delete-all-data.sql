-- Delete ALL Data from PodNow Database (Including Users)
-- This script deletes everything: users, sessions, episodes, uploads, and processing jobs
--
-- WARNING: This will permanently delete ALL data including user accounts!
-- Make sure you have backups if needed.
--
-- Run this in pgAdmin or your PostgreSQL client

BEGIN;

-- Delete in order to respect foreign key constraints
DELETE FROM processing_jobs;
DELETE FROM episodes;
DELETE FROM uploads;
DELETE FROM sessions;
DELETE FROM users;

-- Verify deletion (should return 0 rows)
SELECT 
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM sessions) as sessions_count,
    (SELECT COUNT(*) FROM episodes) as episodes_count,
    (SELECT COUNT(*) FROM uploads) as uploads_count,
    (SELECT COUNT(*) FROM processing_jobs) as processing_jobs_count;

COMMIT;

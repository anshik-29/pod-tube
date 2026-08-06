-- Add progress column to processing_jobs table
ALTER TABLE processing_jobs ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
    
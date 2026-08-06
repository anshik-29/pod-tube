-- Add description column to episodes table
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS description TEXT;

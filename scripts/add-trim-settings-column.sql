-- Migration: Add trim_settings column to episodes table
-- Run this in your PostgreSQL database (e.g., via pgAdmin)

ALTER TABLE episodes 
ADD COLUMN IF NOT EXISTS trim_settings JSONB;

-- Migration: Add password reset columns to users table
-- Run this in your PostgreSQL database (e.g., via pgAdmin)

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(password_reset_token);

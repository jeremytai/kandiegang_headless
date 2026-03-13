-- Migration: Add is_archived column to profiles
-- NULL  = auto-determine (based on login activity + join date)
-- TRUE  = manually archived (always show in archive regardless of activity)
-- FALSE = manually de-archived (always show as active regardless of inactivity)
-- Created: 2026-03-02

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN public.profiles.is_archived IS 'NULL=auto, TRUE=manually archived, FALSE=manually de-archived (overrides auto)';

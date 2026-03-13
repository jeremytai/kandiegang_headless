-- Migration: Add is_team column to profiles
-- is_team flags members who are part of the Kandie Gang team (distinct from guides)
-- Created: 2026-03-02

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_team BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_team IS 'True if this member is part of the Kandie Gang team';

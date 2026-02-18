-- Migration: Add missing analytics/newsletter/engagement columns to profiles
-- These columns are referenced by the analytics-data API and admin merge logic
-- Created: 2026-02-18

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS alternate_emails        TEXT[],
  ADD COLUMN IF NOT EXISTS newsletter_status       TEXT,
  ADD COLUMN IF NOT EXISTS newsletter_source       TEXT,
  ADD COLUMN IF NOT EXISTS engagement_score        NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS last_engagement         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_count             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_email_open         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_email_click        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_page_view          TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.alternate_emails  IS 'Additional emails associated with this account (from profile merges)';
COMMENT ON COLUMN public.profiles.newsletter_status IS 'Newsletter subscription status (e.g. subscribed, unsubscribed)';
COMMENT ON COLUMN public.profiles.newsletter_source IS 'How the member subscribed to the newsletter';
COMMENT ON COLUMN public.profiles.engagement_score  IS 'Composite engagement score for retention analytics';
COMMENT ON COLUMN public.profiles.last_engagement   IS 'Timestamp of the most recent engagement activity';
COMMENT ON COLUMN public.profiles.email_count       IS 'Total number of emails sent to this member';
COMMENT ON COLUMN public.profiles.last_email_open   IS 'Timestamp of the most recent email open';
COMMENT ON COLUMN public.profiles.last_email_click  IS 'Timestamp of the most recent email click';
COMMENT ON COLUMN public.profiles.last_page_view    IS 'Timestamp of the most recent page view tracked';

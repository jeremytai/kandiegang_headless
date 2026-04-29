-- Add FLINTA self-attestation field for event registrations.
-- This supports analytics without inferring gender from names.

ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS flinta_attested BOOLEAN;

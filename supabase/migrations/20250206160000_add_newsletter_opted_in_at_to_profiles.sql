-- Newsletter (Substack/Mailchimp) opt-in date. Set by sync script when CSV includes a date column.
-- Supports Mailchimp export (e.g. OPTIN_TIME) and Substack export; display in user profile.

alter table public.profiles
  add column if not exists newsletter_opted_in_at date;

comment on column public.profiles.newsletter_opted_in_at is 'Date the user opted in to the newsletter (from Substack/Mailchimp CSV sync).';

# Supabase

## Applying migrations

**Option A – Supabase Dashboard**

1. Open your project → **SQL Editor**.
2. Paste the contents of `migrations/20250205000000_create_profiles_table.sql`.
3. Run it.

**Option B – Supabase CLI**

From the project root, with the CLI [installed](https://supabase.com/docs/guides/cli) and linked to your project:

```bash
supabase db push
```

## What this migration does

- Creates a `membership_source_type` enum: `wordpress`, `supabase`, `unknown`.
- Creates `public.profiles` with columns: `id` (PK, references `auth.users`), `email`, `display_name`, `wp_user_id`, `is_member`, `membership_source`.
- Enables RLS so users can only read/update their own row.
- Adds a trigger so new signups get a profile row with `id`, `email`, and `display_name` from `auth.users`.

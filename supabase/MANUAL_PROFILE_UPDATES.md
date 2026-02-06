# Manual profile updates in Supabase

Use this when you want to set someone as a member or edit profile data directly in Supabase (e.g. linking an account from the “old system”).

---

## What information can be gleaned from a user in Supabase?

The app gets user-related data from two places:

### 1. Auth user (`auth.users` → `user` in code)

From **Supabase Auth** (the session), the app uses:

| Field | Description |
|-------|-------------|
| `user.id` | UUID; same as `profiles.id`. |
| `user.email` | Email they signed in with. |
| `user.user_metadata` | Optional sign-up data (e.g. `display_name` from sign-up); the DB trigger copies this into `profiles.display_name`. |

Supabase also stores (and you can read in Dashboard → Authentication → Users): `created_at`, `last_sign_in_at`, `phone`, `email_confirmed_at`, `app_metadata`, etc. The app does not currently read those in the frontend.

### 2. Profile (`public.profiles` → `profile` in code)

The app loads the row in **`profiles`** where `profiles.id = user.id` and exposes this shape (see `Profile` in `context/AuthContext.tsx`):

| Field | Type | Used in the app |
|-------|------|------------------|
| `id` | uuid | Same as auth user. |
| `email` | text | Shown in account/members UI. |
| `display_name` | text | “Welcome back, {display_name}”, account panel. |
| `wp_user_id` | integer | Legacy WordPress link; not shown in UI. |
| `is_member` | boolean | Drives “Active” vs “no membership” on `/members`. |
| `membership_source` | enum | `wordpress` \| `supabase` \| `unknown`; shown on members page. |
| `membership_plans` | text[] | Plan names; e.g. Cycling Club + Guide plan. Drives “Kandie Gang Cycling Member” / “Kandie Gang Guide” pills. |
| `is_guide` | boolean | Kandie Gang Guide flag (manual or synced from WordPress role). Combined with plan names for display. |
| `is_substack_subscriber` | boolean | Set by sync script from Substack/Mailchimp CSV; shown as “Newsletter · Subscriber” on members page and account panel. |
| `newsletter_opted_in_at` | date | Opt-in date from CSV (when available); shown as “since [date]” in profile. |
| `member_since` | date | Available for future UI. |
| `membership_expiration` | date | Available for future UI. |

Additional columns exist in the **table** (from migrations) but are **not** currently mapped in the app’s `Profile` type or used in the UI: `first_name`, `last_name`, `billing_address_1`, `billing_city`, `billing_postcode`, `billing_country`, `billing_phone`, `paying_customer`. You can add these to `AuthContext` and use them in the app if needed.

**Summary:** Today the app “gleans” from Supabase: **identity** (id, email), **display name**, **membership status** (is_member, source, plans, dates), and **WordPress link** (wp_user_id). Billing/name fields are in the DB but not yet exposed in the frontend.

## Important: set `membership_source` to `supabase`

When you set `is_member = true` (or change other membership fields) in the dashboard or via SQL, **also set `membership_source = 'supabase'`**.  
The app only trusts Supabase as the source of truth when `membership_source` is `'supabase'`; otherwise it may overwrite your changes with data from WordPress.

---

## Option 1: Supabase Dashboard (Table Editor)

1. Open your project in [Supabase Dashboard](https://supabase.com/dashboard) → **Table Editor**.
2. Select the **`profiles`** table.
3. Find the row by **email** or by **id** (the UUID that matches `auth.users.id`).
   - To see auth users: **Authentication** → **Users**; the **User UID** is the same as `profiles.id`.
4. Edit the row:
   - **is_member** → set to `true`.
   - **membership_source** → set to `supabase`.
   - Optionally: **display_name**, **member_since**, **membership_expiration**, **membership_plans** (array, e.g. `{"Kandie Gang Cycling Club Membership"}`), **is_guide** (true for Kandie Gang Guides).
5. Save.

---

## Option 2: SQL Editor

1. In Supabase Dashboard go to **SQL Editor** → **New query**.

### Update by email

```sql
update public.profiles
set
  is_member = true,
  membership_source = 'supabase'
where email = 'their-email@example.com';
```

### Update by user id (UUID from Authentication → Users)

```sql
update public.profiles
set
  is_member = true,
  membership_source = 'supabase'
where id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
```

### Full example: member + optional fields

```sql
update public.profiles
set
  is_member = true,
  membership_source = 'supabase',
  display_name = 'Rider Name',
  member_since = '2025-01-01',
  membership_expiration = '2026-01-01',
  membership_plans = array['Kandie Gang Cycling Club Membership']
where email = 'their-email@example.com';
```

Run the query (**Run** or Cmd/Ctrl+Enter). The user can then click **Refresh membership status** on `/members` (or reload the page) to see the update.

---

## Relevant `profiles` columns

| Column                 | Type      | Notes |
|------------------------|-----------|--------|
| id                     | uuid (PK) | Same as `auth.users.id`. |
| email                  | text      | Shown in app; can be synced from auth. |
| display_name           | text      | “Welcome back, {display_name}”. |
| wp_user_id             | integer   | Legacy WordPress user ID. |
| is_member              | boolean   | Drives “Active” vs “no membership” on `/members`. |
| membership_source      | enum      | `wordpress` \| `supabase` \| `unknown`. Use `supabase` for manual grants. |
| membership_plans       | text[]    | e.g. `{"Kandie Gang Cycling Club Membership"}`. |
| member_since           | date      | YYYY-MM-DD. |
| membership_expiration  | date      | YYYY-MM-DD. |
| first_name, last_name  | text      | From WooCommerce if synced. |
| billing_*              | text      | Address/phone if needed. |
| paying_customer        | boolean   | From WooCommerce if synced. |

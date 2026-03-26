-- When a user signs in via Discord OAuth, Supabase may create a second auth.users row
-- (and a second profiles row) if the email wasn't already linked. This function finds
-- any other profile with the same email that has richer data (is_guide, membership, etc.)
-- and copies those fields into the current profile — only upgrading, never downgrading.
--
-- Called from the frontend on every login; is a no-op when there is nothing to merge.

create or replace function public.merge_profile_by_email(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_email text;
  v_source record;
begin
  -- Resolve the email for this auth user
  select email into v_email
  from auth.users
  where id = p_user_id;

  if v_email is null then
    return;
  end if;

  -- Find the richest other profile that shares the same email
  select p.*
  into v_source
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(v_email)
    and p.id != p_user_id
    and (
      p.is_guide = true
      or p.is_member = true
      or p.wp_user_id is not null
    )
  order by p.is_guide desc, p.is_member desc
  limit 1;

  if not found then
    return;
  end if;

  -- Merge: only upgrade fields, never downgrade
  update public.profiles
  set
    is_guide               = greatest(is_guide, v_source.is_guide),
    is_member              = greatest(is_member, v_source.is_member),
    wp_user_id             = coalesce(wp_user_id, v_source.wp_user_id),
    membership_source      = coalesce(membership_source, v_source.membership_source),
    membership_plans       = case
                               when membership_plans is null or membership_plans = '{}'
                               then v_source.membership_plans
                               else membership_plans
                             end,
    member_since           = coalesce(member_since, v_source.member_since),
    membership_expiration  = coalesce(membership_expiration, v_source.membership_expiration),
    is_substack_subscriber = greatest(is_substack_subscriber, v_source.is_substack_subscriber),
    newsletter_opted_in_at = coalesce(newsletter_opted_in_at, v_source.newsletter_opted_in_at)
  where id = p_user_id;
end;
$$;

-- Any authenticated user may call this for their own account
grant execute on function public.merge_profile_by_email(uuid) to authenticated;

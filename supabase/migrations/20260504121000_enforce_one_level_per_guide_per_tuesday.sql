-- Ensure each guide can hold only one level claim per Tuesday ride date.
-- This replaces the earlier uniqueness that allowed multiple level claims per date.

with ranked as (
  select
    id,
    row_number() over (
      partition by plan_id, ride_date, guide_profile_id
      order by created_at asc, id asc
    ) as rn
  from public.guide_ride_assignments
)
delete from public.guide_ride_assignments g
using ranked r
where g.id = r.id
  and r.rn > 1;

drop index if exists guide_ride_assignments_unique_claim;

create unique index if not exists guide_ride_assignments_unique_guide_day
  on public.guide_ride_assignments (plan_id, ride_date, guide_profile_id);

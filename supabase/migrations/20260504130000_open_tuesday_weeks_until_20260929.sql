-- Open Tuesday social-ride planning weeks through 2026-09-29.
-- Safe to run multiple times because week_start_date is unique and we upsert.

insert into public.guide_ride_plans (
  week_start_date,
  status,
  notes
)
select
  d::date as week_start_date,
  'draft' as status,
  'Auto-opened Tuesday social-ride planning window (through 2026-09-29)' as notes
from generate_series('2026-05-12'::date, '2026-09-29'::date, interval '7 day') as d
on conflict (week_start_date)
do update set
  status = excluded.status;

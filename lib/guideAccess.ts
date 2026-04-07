/**
 * Guide-only UI and /guide/analytics access: Supabase flag and/or WooCommerce plan names.
 * Keep in sync with server checks (e.g. analytics-data) when updating rules.
 */
export function isGuideProfile(
  p: { is_guide?: boolean | null; membership_plans?: string[] | null } | null | undefined
): boolean {
  if (!p) return false;
  if (p.is_guide === true) return true;
  if (!Array.isArray(p.membership_plans)) return false;
  return p.membership_plans.some((name) => name.toLowerCase().includes('guide'));
}

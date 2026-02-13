/**
 * shipping.ts
 * Shipping rules: thresholds, rates, and product-specific rules (e.g. no shipping for Club Membership).
 */

/** Product slug for Kandie Gang Club Membership – digital product, no shipping. */
export const CLUB_MEMBERSHIP_SLUG = 'kandie-gang-cycling-club-membership';

export function isClubMembershipOnly<T extends { productSlug: string }>(items: T[]): boolean {
  return items.length > 0 && items.every((i) => i.productSlug === CLUB_MEMBERSHIP_SLUG);
}

/**
 * products.ts
 * Product and variant type definitions and utility functions.
 */

export interface ProductVariant {
  label: string;
  pricePublic: number;
  priceMember?: number;
  stripePriceIdPublic: string;
  stripePriceIdMember?: string;
  sku?: string;
  inventory: number;
}

export interface ShopProduct {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
      altText?: string;
    };
  };
  productFields: {
    inventory?: number;
    sku?: string;
    variants?: ProductVariant[];
    membersOnly: boolean;
    inStock: boolean;
  };
}

/**
 * Get price for a specific variant or simple product.
 */
export function getProductPrice(
  product: ShopProduct,
  isMember: boolean,
  variantIndex?: number
): number {
  const variants = product.productFields.variants;
  if (variants?.length) {
    const idx = variantIndex != null && variantIndex >= 0 ? variantIndex : 0;
    const variant = variants[idx];
    if (variant) {
      if (isMember && variant.priceMember != null) {
        return variant.priceMember;
      }
      return variant.pricePublic ?? 0;
    }
  }
  return 0;
}

/**
 * Get Stripe Price ID for checkout.
 */
export function getStripePriceId(
  product: ShopProduct,
  isMember: boolean,
  variantIndex?: number
): string {
  const variants = product.productFields.variants;
  if (variants?.length) {
    const idx = variantIndex != null && variantIndex >= 0 ? variantIndex : 0;
    const variant = variants[idx];
    if (variant) {
      if (isMember && variant.stripePriceIdMember) {
        return variant.stripePriceIdMember;
      }
      return variant.stripePriceIdPublic ?? '';
    }
  }
  return '';
}

/**
 * Check if product/variant is available for purchase.
 * Uses inventory directly - inStock is computed from inventory in WordPress.
 */
export function canPurchase(
  product: ShopProduct,
  isMember: boolean,
  variantIndex?: number
): boolean {
  // Check members-only restriction first
  if (product.productFields.membersOnly && !isMember) {
    return false;
  }

  // Check variant inventory
  const variants = product.productFields.variants;
  if (variants?.length) {
    const idx = variantIndex != null && variantIndex >= 0 ? variantIndex : -1;
    if (idx >= 0) {
      return (variants[idx]?.inventory ?? 0) > 0;
    }
    // No variant selected (e.g. shop listing): in stock if any variant has inventory
    return variants.some((v) => (v.inventory ?? 0) > 0);
  }

  // Fallback to product-level inventory
  return (product.productFields.inventory ?? 0) > 0;
}

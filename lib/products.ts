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
    hasVariants: boolean;
    // Simple product fields
    pricePublic?: number;
    priceMember?: number;
    stripePriceIdPublic?: string;
    stripePriceIdMember?: string;
    inventory?: number;
    sku?: string;
    // Variant product fields
    variants?: ProductVariant[];
    // Common fields
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
  if (product.productFields.hasVariants && product.productFields.variants?.length) {
    const idx = variantIndex != null && variantIndex >= 0 ? variantIndex : -1;
    const variant = idx >= 0 ? product.productFields.variants?.[idx] : undefined;
    if (variant) {
      if (isMember && variant.priceMember != null) {
        return variant.priceMember;
      }
      return variant.pricePublic ?? 0;
    }
  }
  
  if (isMember && product.productFields.priceMember != null) {
    return product.productFields.priceMember;
  }
  return product.productFields.pricePublic ?? 0;
}

/**
 * Get Stripe Price ID for checkout.
 */
export function getStripePriceId(
  product: ShopProduct,
  isMember: boolean,
  variantIndex?: number
): string {
  if (product.productFields.hasVariants && product.productFields.variants?.length) {
    const idx = variantIndex != null && variantIndex >= 0 ? variantIndex : -1;
    const variant = idx >= 0 ? product.productFields.variants?.[idx] : undefined;
    if (variant) {
      if (isMember && variant.stripePriceIdMember) {
        return variant.stripePriceIdMember;
      }
      return variant.stripePriceIdPublic ?? '';
    }
  }
  
  if (isMember && product.productFields.stripePriceIdMember) {
    return product.productFields.stripePriceIdMember;
  }
  return product.productFields.stripePriceIdPublic ?? '';
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
  
  // For products with variants, check variant inventory directly
  if (product.productFields.hasVariants && product.productFields.variants?.length) {
    const idx = variantIndex != null && variantIndex >= 0 ? variantIndex : -1;
    const variant = idx >= 0 ? product.productFields.variants?.[idx] : undefined;
    if (!variant) {
      return false; // No variant selected or variant doesn't exist
    }
    // Check variant inventory directly
    return variant.inventory > 0;
  }
  
  // For simple products without variants, check product-level inventory directly
  // inStock is computed from inventory in WordPress, so we check inventory here too
  return (product.productFields.inventory ?? 0) > 0;
}

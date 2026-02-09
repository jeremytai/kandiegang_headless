
/**
 * lib/wordpress.ts
 * A type-safe bridge for interacting with a Headless WordPress backend via GraphQL.
 * Optimized for performance and clean architecture.
 */

import { STORY_BLOCKS_QUERY } from './graphql/storyBlocks';
import type { StoryBlocksData } from './storyGalleries';

// WordPress GraphQL endpoint from environment variable
// Falls back to demo endpoint if not configured
const WP_GRAPHQL_URL = import.meta.env.VITE_WP_GRAPHQL_URL || 'https://wp-origin.kandiegang.com/graphql';

// Only rewrite media URLs when a CDN base is explicitly set (e.g. public S3 or CloudFront).
const MEDIA_CDN_BASE = (import.meta.env.VITE_MEDIA_CDN_URL as string | undefined)?.replace(/\/$/, '');

/** Matches kandiegang.com origin (http(s), optional www) for replacement with CDN. */
const KANDIEGANG_ORIGIN = /^https?:\/\/(www\.)?kandiegang\.com/;

/**
 * Normalizes media URLs so images load correctly.
 * When VITE_MEDIA_CDN_URL is set: any kandiegang.com URL is rewritten to the CDN base (e.g. S3).
 * Already-CDN URLs are left unchanged. No path rewriting (e.g. 8-digit folder); if CDN returns 403, use the WordPress fallback (e.g. GalleryGrid onError).
 */
export function transformMediaUrl(url: string, _referenceImageUrl?: string): string {
  if (!url) return url;

  // Check if URL is already on S3 or another external CDN - don't modify these
  // Matches: *.s3.*.amazonaws.com, *.cloudfront.net, *.cdn.*, etc.
  // Extract domain part and check for CDN indicators
  const domainMatch = url.match(/^https?:\/\/([^\/]+)/);
  const domain = domainMatch ? domainMatch[1] : '';
  const isExternalCDN = /\.(s3\.|cloudfront\.|cdn\.|amazonaws\.com)/i.test(domain);
  
  // Strip WordPress image sizes (-1024x768, -300x200, etc.) to use original
  // Only do this for WordPress URLs, not external CDN URLs where the size suffix might be part of the actual filename
  const originalUrl = isExternalCDN ? url : url.replace(/-(\d+x\d+)\.(jpg|jpeg|png|gif|webp)$/i, '.$2');

  if (!MEDIA_CDN_BASE) return originalUrl;
  if (originalUrl.includes(MEDIA_CDN_BASE)) return originalUrl;

  if (KANDIEGANG_ORIGIN.test(originalUrl)) {
    return originalUrl.replace(KANDIEGANG_ORIGIN, MEDIA_CDN_BASE);
  }

  return originalUrl;
}

export interface WPPost {
  id: string;
  title: string;
  content?: string;
  excerpt: string;
  date: string;
  uri: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
      altText?: string;
    };
  };
  categories?: {
    nodes: Array<{
      name: string;
    }>;
  };
  author?: {
    node: {
      name: string;
    };
  };
}

export interface WPPage {
  id: string;
  title: string;
  content: string;
  date: string;
  uri: string;
  slug: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
    };
  };
}

export interface WPCategory {
  name: string;
  slug: string;
}

/** Relay-style pageInfo for cursor-based pagination of posts. */
export interface WPPostsPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

// Simple in-memory cache for WordPress queries
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Executes a GraphQL query against the WordPress endpoint.
 * Includes retry logic, caching, and comprehensive error handling.
 */
export async function wpQuery<T>(
  query: string, 
  variables = {},
  options: { 
    useCache?: boolean;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<T> {
  const { useCache = true, retries = 2, retryDelay = 1000 } = options;
  
  // Create cache key from query and variables
  const cacheKey = useCache ? `${query}:${JSON.stringify(variables)}` : null;
  
  // Check cache
  if (cacheKey && queryCache.has(cacheKey)) {
    const cached = queryCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as T;
    }
    queryCache.delete(cacheKey);
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(WP_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json: GraphQLResponse<T> = await response.json();

      if (json.errors) {
        const errorMessages = json.errors.map(e => e.message).join(', ');
        console.error('[WordPress] GraphQL Errors:', json.errors);
        console.error('[WordPress] Full error details:', JSON.stringify(json.errors, null, 2));
        if (import.meta.env.DEV) {
          console.error('[WordPress] Query that failed:', query);
          console.error('[WordPress] Variables:', variables);
        }
        throw new Error(`GraphQL Error: ${errorMessages}`);
      }
      
      if (import.meta.env.DEV && json.data) {
        console.log('[WordPress] Query successful');
      }

      if (!json.data) {
        throw new Error('No data returned from GraphQL response');
      }

      // Cache successful response
      if (cacheKey && json.data) {
        queryCache.set(cacheKey, {
          data: json.data,
          timestamp: Date.now(),
        });
      }

      return json.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on GraphQL errors (client errors)
      if (lastError.message.includes('GraphQL Error')) {
        throw lastError;
      }

      // Retry on network errors
      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        console.warn(`WordPress query failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${retries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  // All retries exhausted
  console.error('WordPress Fetch Error (all retries exhausted):', lastError);
  throw lastError || new Error('Failed to fetch from WordPress after retries');
}

/**
 * Optimized query to fetch posts for the Journal/Stories page.
 * Supports cursor-based pagination via optional $after.
 * Efficiency Analysis:
 * - Only requests specific nodes (avoiding edges when not needed).
 * - Filters for minimal metadata (Title, Excerpt, Date, Category).
 * - Requests optimized image source URLs and pageInfo for load-more.
 */
export const GET_POSTS_QUERY = `
  query GetPosts($first: Int!, $after: String) {
    posts(first: $first, after: $after, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        id
        title
        content
        excerpt
        date
        uri
        featuredImage {
          node {
            sourceUrl
          }
        }
        categories {
          nodes {
            name
          }
        }
        author {
          node {
            name
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/** Response shape for GET_POSTS_QUERY (used when category query is unavailable). */
export type GetPostsResponse = {
  posts: { nodes: WPPost[]; pageInfo: WPPostsPageInfo };
};

/**
 * Fetches posts from a category by slug (e.g. "social-rides").
 * Used for the Stories page when stories are sourced from a single category.
 * Supports cursor-based pagination via optional $after.
 */
export const GET_CATEGORY_POSTS_QUERY = `
  query GetCategoryPosts($categoryId: ID!, $first: Int!, $after: String) {
    category(id: $categoryId, idType: SLUG) {
      id
      name
      posts(first: $first, after: $after) {
        nodes {
          id
          title
          excerpt
          date
          uri
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
          categories {
            nodes {
              name
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

/** Response shape for GET_CATEGORY_POSTS_QUERY. */
export type CategoryPostsResponse = {
  category: {
    id: string;
    name: string;
    posts: {
      nodes: WPPost[];
      pageInfo: WPPostsPageInfo;
    };
  } | null;
};

/**
 * Fetches posts for a category by slug with optional cursor pagination.
 * @param categorySlug - Category slug (e.g. "social-rides")
 * @param first - Number of posts to fetch
 * @param after - Cursor for next page (null for first page)
 * @returns Posts nodes and pageInfo, or null if category not found
 */
export async function getCategoryPosts(
  categorySlug: string,
  first: number,
  after?: string | null
): Promise<{ nodes: WPPost[]; pageInfo: WPPostsPageInfo } | null> {
  const data = await wpQuery<CategoryPostsResponse>(
    GET_CATEGORY_POSTS_QUERY,
    { categoryId: categorySlug, first, after: after ?? null },
    { useCache: true }
  );
  if (!data.category?.posts) return null;
  return {
    nodes: data.category.posts.nodes,
    pageInfo: data.category.posts.pageInfo,
  };
}

/**
 * Query to fetch categories from WordPress (for filtering, nav, etc.).
 */
export const GET_CATEGORIES_QUERY = `
  query GetCategories($first: Int!) {
    categories(first: $first, where: { hideEmpty: true }) {
      nodes {
        name
        slug
      }
    }
  }
`;

/**
 * Query to fetch a single post by slug or ID.
 */
export const GET_POST_QUERY = `
  query GetPost($id: ID!, $idType: PostIdType!) {
    post(id: $id, idType: $idType) {
      id
      title
      content
      excerpt
      date
      uri
      featuredImage {
        node {
          sourceUrl
        }
      }
      categories {
        nodes {
          name
        }
      }
      author {
        node {
          name
        }
      }
    }
  }
`;

/**
 * Query to fetch a single page by slug.
 */
export const GET_PAGE_QUERY = `
  query GetPage($id: ID!, $idType: PageIdType!) {
    page(id: $id, idType: $idType) {
      id
      title
      content
      date
      uri
      slug
      featuredImage {
        node {
          sourceUrl
        }
      }
    }
  }
`;

/**
 * Query to fetch multiple pages.
 */
export const GET_PAGES_QUERY = `
  query GetPages($first: Int!) {
    pages(first: $first, where: { orderby: { field: DATE, order: DESC } }) {
      nodes {
        id
        title
        content
        date
        uri
        slug
        featuredImage {
          node {
            sourceUrl
          }
        }
      }
    }
  }
`;

/**
 * Helper function to fetch a page by slug.
 * @param slug - The page slug (e.g., "about", "community")
 * @returns The page data or null if not found
 */
export async function getPageBySlug(slug: string): Promise<WPPage | null> {
  try {
    const data = await wpQuery<{ page: WPPage | null }>(
      GET_PAGE_QUERY,
      { id: slug, idType: 'SLUG' },
      { useCache: true }
    );
    return data.page;
  } catch (error) {
    console.error(`Failed to fetch page with slug "${slug}":`, error);
    return null;
  }
}

/**
 * Helper function to fetch a post by slug.
 * @param slug - The post slug
 * @returns The post data or null if not found
 */
export async function getPostBySlug(slug: string): Promise<WPPost | null> {
  try {
    const data = await wpQuery<{ post: WPPost | null }>(
      GET_POST_QUERY,
      { id: slug, idType: 'SLUG' },
      { useCache: true }
    );
    return data.post;
  } catch (error) {
    console.error(`Failed to fetch post with slug "${slug}":`, error);
    return null;
  }
}

/**
 * Fetches a post by slug with editor blocks and media items for block-based rendering.
 * Use with normalizeBlocks() and StoryBlocksRenderer.
 * @param slug - The post slug
 * @returns Story blocks data (post + mediaItems) or null if not found / query unsupported
 */
export async function getStoryBlocks(slug: string): Promise<StoryBlocksData | null> {
  try {
    const data = await wpQuery<StoryBlocksData>(STORY_BLOCKS_QUERY, { slug }, { useCache: true });
    return data;
  } catch (error) {
    console.warn(`Failed to fetch story blocks for slug "${slug}":`, error);
    return null;
  }
}

/**
 * Fetches categories from WordPress for filtering and navigation.
 * @param first - Max number of categories to return (default 100)
 * @returns List of categories (name, slug)
 */
export async function getCategories(first = 100): Promise<WPCategory[]> {
  try {
    const data = await wpQuery<{ categories: { nodes: WPCategory[] } }>(
      GET_CATEGORIES_QUERY,
      { first },
      { useCache: true }
    );
    return data.categories?.nodes ?? [];
  } catch (error) {
    console.warn('Failed to fetch categories:', error);
    return [];
  }
}

/**
 * Clear the WordPress query cache.
 * Useful for manual cache invalidation.
 */
export function clearWPCache(): void {
  queryCache.clear();
}

/**
 * Editor block types for products (similar to stories).
 */
export type ProductEditorBlock =
  | { name: string; attributes?: { content?: string } } // CoreParagraph
  | { name: string; attributes?: { id: string | number; url?: string; alt?: string; caption?: string; width?: number; height?: number } } // CoreImage
  | { name: string; attributes?: { ids: (string | number)[]; columns?: number } }; // CoreGallery

/** Variant shape used after normalization (built from flat ACF fields). */
export interface WPProductVariantShape {
  label: string;
  pricePublic: number;
  priceMember?: number;
  stripePriceIdPublic: string;
  stripePriceIdMember?: string;
  sku?: string;
  inventory: number;
}

/** Raw productFields from GraphQL (flat variant fields; no nested variants array). */
export type FlatProductFields = Record<string, unknown>;

/**
 * Build variants array from flat ACF productFields (variant1Label, variant1PricePublic, ...).
 * Only slots with a non-empty label are included.
 */
export function buildVariantsFromProductFields(pf: FlatProductFields | null | undefined): WPProductVariantShape[] {
  if (!pf || typeof pf !== 'object') return [];
  const variants: WPProductVariantShape[] = [];
  for (let i = 1; i <= 10; i++) {
    const label = pf[`variant${i}Label`];
    if (label == null || String(label).trim() === '') continue;
    const pricePublic = pf[`variant${i}PricePublic`];
    const priceMember = pf[`variant${i}PriceMember`];
    const stripePriceIdPublic = pf[`variant${i}StripePriceIdPublic`];
    const stripePriceIdMember = pf[`variant${i}StripePriceIdMember`];
    const sku = pf[`variant${i}Sku`];
    const inventory = pf[`variant${i}Inventory`];
    variants.push({
      label: String(label),
      pricePublic: typeof pricePublic === 'number' ? pricePublic : Number(pricePublic) || 0,
      priceMember: priceMember != null && priceMember !== '' ? Number(priceMember) : undefined,
      stripePriceIdPublic: stripePriceIdPublic != null ? String(stripePriceIdPublic) : '',
      stripePriceIdMember: stripePriceIdMember != null && stripePriceIdMember !== '' ? String(stripePriceIdMember) : undefined,
      sku: sku != null && sku !== '' ? String(sku) : undefined,
      inventory: typeof inventory === 'number' ? inventory : Number(inventory) || 0,
    });
  }
  return variants;
}

/**
 * Normalize productFields from flat ACF variant fields to include a variants array.
 * Use after fetching so the rest of the app can keep using productFields.variants.
 */
export function normalizeProductFields(pf: FlatProductFields | null | undefined): WPProduct['productFields'] {
  if (!pf) return undefined;
  const variants = buildVariantsFromProductFields(pf);
  return {
    ...pf,
    variants: variants.length > 0 ? variants : undefined,
  } as WPProduct['productFields'];
}

/**
 * Product interface for shop products.
 * productFields.variants is populated by normalizeProductFields() from flat ACF fields after fetch.
 */
export interface WPProduct {
  id: string;
  title: string;
  slug?: string;
  uri?: string;
  content?: string;
  excerpt?: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
      altText?: string;
    };
  };
  editorBlocks?: ProductEditorBlock[];
  productFields?: {
    parentProduct?: {
      edges?: Array<{
        node?: {
          id: string;
        };
      }>;
    };
    variantLabel?: string;
    hasVariants?: boolean;
    pricePublic?: string;
    priceMember?: string;
    stripePriceIdPublic?: string;
    stripePriceIdMember?: string;
    membersOnly?: boolean;
    sku?: string;
    inventory?: number;
    inStock?: boolean;
    variants?: WPProductVariantShape[];
  };
}

/**
 * Response shape for GET_PRODUCTS_QUERY.
 */
export type GetProductsResponse = {
  shopProducts: {
    nodes: WPProduct[];
  };
};

/**
 * Query to fetch shop products.
 * Uses flat ACF variant fields (variant1Label, variant1PricePublic, ...); variants array is built client-side via buildVariantsFromProductFields.
 */
export const GET_PRODUCTS_QUERY = `
  query GetShopProducts {
    shopProducts {
      nodes {
        id
        title
        slug
        content
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        productFields {
          hasVariants
          pricePublic
          priceMember
          stripePriceIdPublic
          stripePriceIdMember
          sku
          inventory
          inStock
          membersOnly
          ... on ProductFields {
            variant1Label
            variant1PricePublic
            variant1PriceMember
            variant1StripePriceIdPublic
            variant1StripePriceIdMember
            variant1Sku
            variant1Inventory
            variant2Label
            variant2PricePublic
            variant2PriceMember
            variant2StripePriceIdPublic
            variant2StripePriceIdMember
            variant2Sku
            variant2Inventory
            variant3Label
            variant3PricePublic
            variant3PriceMember
            variant3StripePriceIdPublic
            variant3StripePriceIdMember
            variant3Sku
            variant3Inventory
            variant4Label
            variant4PricePublic
            variant4PriceMember
            variant4StripePriceIdPublic
            variant4StripePriceIdMember
            variant4Sku
            variant4Inventory
            variant5Label
            variant5PricePublic
            variant5PriceMember
            variant5StripePriceIdPublic
            variant5StripePriceIdMember
            variant5Sku
            variant5Inventory
            variant6Label
            variant6PricePublic
            variant6PriceMember
            variant6StripePriceIdPublic
            variant6StripePriceIdMember
            variant6Sku
            variant6Inventory
            variant7Label
            variant7PricePublic
            variant7PriceMember
            variant7StripePriceIdPublic
            variant7StripePriceIdMember
            variant7Sku
            variant7Inventory
            variant8Label
            variant8PricePublic
            variant8PriceMember
            variant8StripePriceIdPublic
            variant8StripePriceIdMember
            variant8Sku
            variant8Inventory
            variant9Label
            variant9PricePublic
            variant9PriceMember
            variant9StripePriceIdPublic
            variant9StripePriceIdMember
            variant9Sku
            variant9Inventory
            variant10Label
            variant10PricePublic
            variant10PriceMember
            variant10StripePriceIdPublic
            variant10StripePriceIdMember
            variant10Sku
            variant10Inventory
          }
        }
      }
    }
  }
`;

/**
 * Query to fetch a single product by slug.
 * Uses SLUG as idType (matching the updated GraphQL schema).
 * Includes editorBlocks for Gallery block support and mediaItems for image resolution.
 */
export const GET_PRODUCT_QUERY = `
  query GetShopProduct($id: ID!) {
    shopProduct(id: $id, idType: SLUG) {
      id
      databaseId
      slug
      title
      content
      excerpt
      featuredImage {
        node {
          sourceUrl
          altText
        }
      }
      editorBlocks {
        name
        ... on CoreParagraph {
          attributes { content }
        }
        ... on CoreImage {
          attributes {
            id
            url
            alt
            caption
            width
            height
          }
        }
        ... on CoreGallery {
          attributes { ids columns }
        }
      }
      productFields {
        hasVariants
        pricePublic
        priceMember
        stripePriceIdPublic
        stripePriceIdMember
        sku
        inventory
        inStock
        membersOnly
        ... on ProductFields {
          variant1Label
          variant1PricePublic
          variant1PriceMember
          variant1StripePriceIdPublic
          variant1StripePriceIdMember
          variant1Sku
          variant1Inventory
          variant2Label
          variant2PricePublic
          variant2PriceMember
          variant2StripePriceIdPublic
          variant2StripePriceIdMember
          variant2Sku
          variant2Inventory
          variant3Label
          variant3PricePublic
          variant3PriceMember
          variant3StripePriceIdPublic
          variant3StripePriceIdMember
          variant3Sku
          variant3Inventory
          variant4Label
          variant4PricePublic
          variant4PriceMember
          variant4StripePriceIdPublic
          variant4StripePriceIdMember
          variant4Sku
          variant4Inventory
          variant5Label
          variant5PricePublic
          variant5PriceMember
          variant5StripePriceIdPublic
          variant5StripePriceIdMember
          variant5Sku
          variant5Inventory
          variant6Label
          variant6PricePublic
          variant6PriceMember
          variant6StripePriceIdPublic
          variant6StripePriceIdMember
          variant6Sku
          variant6Inventory
          variant7Label
          variant7PricePublic
          variant7PriceMember
          variant7StripePriceIdPublic
          variant7StripePriceIdMember
          variant7Sku
          variant7Inventory
          variant8Label
          variant8PricePublic
          variant8PriceMember
          variant8StripePriceIdPublic
          variant8StripePriceIdMember
          variant8Sku
          variant8Inventory
          variant9Label
          variant9PricePublic
          variant9PriceMember
          variant9StripePriceIdPublic
          variant9StripePriceIdMember
          variant9Sku
          variant9Inventory
          variant10Label
          variant10PricePublic
          variant10PriceMember
          variant10StripePriceIdPublic
          variant10StripePriceIdMember
          variant10Sku
          variant10Inventory
        }
      }
    }
    mediaItems(first: 200) {
      nodes {
        id
        sourceUrl
        altText
        caption
        mediaDetails { width height }
      }
    }
  }
`;

/**
 * Query to fetch variant products (siblings) that share the same parent product.
 * Used to display variant options like "Black", "Gradient", etc.
 * Note: This queries by parentProduct ID - products that have this ID as their parent.
 */
export const GET_PRODUCT_VARIANTS_QUERY = `
  query GetProductVariants($parentId: ID!) {
    shopProducts(where: { parent: $parentId }) {
      nodes {
        id
        title
        slug
        uri
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        productFields {
          variantLabel
          pricePublic
          priceMember
          stripePriceIdPublic
          stripePriceIdMember
          inStock
          sku
        }
      }
    }
  }
`;

/**
 * Alternative: Query all products and filter client-side if the above doesn't work.
 * This is a fallback if the parent filter doesn't work in your GraphQL schema.
 */
export const GET_ALL_PRODUCTS_FOR_VARIANTS_QUERY = `
  query GetAllProductsForVariants {
    shopProducts(first: 1000) {
      nodes {
        id
        title
        slug
        uri
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        productFields {
          parentProduct {
            edges {
              node {
                id
              }
            }
          }
          variantLabel
          pricePublic
          priceMember
          stripePriceIdPublic
          stripePriceIdMember
          inStock
          sku
        }
      }
    }
  }
`;

/**
 * Alternative query using shopProducts with where filter (fallback).
 * Includes editorBlocks for Gallery block support.
 */
export const GET_PRODUCT_BY_SLUG_QUERY = `
  query GetProductBySlug($slug: String!) {
    shopProducts(where: { name: $slug }) {
      nodes {
        id
        title
        slug
        uri
        content
        excerpt
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        editorBlocks {
          name
          ... on CoreParagraph {
            attributes { content }
          }
          ... on CoreImage {
            attributes {
              id
              url
              alt
              caption
              width
              height
            }
          }
          ... on CoreGallery {
            attributes { ids columns }
          }
        }
        productFields {
          parentProduct {
            edges {
              node {
                id
              }
            }
          }
          variantLabel
          hasVariants
          pricePublic
          priceMember
          stripePriceIdPublic
          stripePriceIdMember
          membersOnly
          sku
          inventory
          inStock
          ... on ProductFields {
            variant1Label
            variant1PricePublic
            variant1PriceMember
            variant1StripePriceIdPublic
            variant1StripePriceIdMember
            variant1Sku
            variant1Inventory
            variant2Label
            variant2PricePublic
            variant2PriceMember
            variant2StripePriceIdPublic
            variant2StripePriceIdMember
            variant2Sku
            variant2Inventory
            variant3Label
            variant3PricePublic
            variant3PriceMember
            variant3StripePriceIdPublic
            variant3StripePriceIdMember
            variant3Sku
            variant3Inventory
            variant4Label
            variant4PricePublic
            variant4PriceMember
            variant4StripePriceIdPublic
            variant4StripePriceIdMember
            variant4Sku
            variant4Inventory
            variant5Label
            variant5PricePublic
            variant5PriceMember
            variant5StripePriceIdPublic
            variant5StripePriceIdMember
            variant5Sku
            variant5Inventory
            variant6Label
            variant6PricePublic
            variant6PriceMember
            variant6StripePriceIdPublic
            variant6StripePriceIdMember
            variant6Sku
            variant6Inventory
            variant7Label
            variant7PricePublic
            variant7PriceMember
            variant7StripePriceIdPublic
            variant7StripePriceIdMember
            variant7Sku
            variant7Inventory
            variant8Label
            variant8PricePublic
            variant8PriceMember
            variant8StripePriceIdPublic
            variant8StripePriceIdMember
            variant8Sku
            variant8Inventory
            variant9Label
            variant9PricePublic
            variant9PriceMember
            variant9StripePriceIdPublic
            variant9StripePriceIdMember
            variant9Sku
            variant9Inventory
            variant10Label
            variant10PricePublic
            variant10PriceMember
            variant10StripePriceIdPublic
            variant10StripePriceIdMember
            variant10Sku
            variant10Inventory
          }
        }
      }
    }
    mediaItems(first: 200) {
      nodes {
        id
        sourceUrl
        altText
        caption
        mediaDetails { width height }
      }
    }
  }
`;

/**
 * Product variant interface (for sibling products).
 */
export interface WPProductVariant {
  id: string;
  title: string;
  slug: string;
  uri?: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
      altText?: string;
    };
  };
  productFields?: {
    variantLabel?: string;
    pricePublic?: string;
    priceMember?: string;
    stripePriceIdPublic?: string;
    stripePriceIdMember?: string;
    inStock?: boolean;
    sku?: string;
  };
}

/**
 * Product variation interface.
 */
export interface WPProductVariation {
  id: string;
  name: string;
  sku?: string;
  stockQuantity?: number;
  stockStatus?: string;
  attributes?: {
    nodes: Array<{
      id: string;
      name: string;
      value: string;
    }>;
  };
  price?: string;
}

/**
 * Product attribute interface.
 */
export interface WPProductAttribute {
  id: string;
  name: string;
  options: string[];
  variation: boolean;
}

/**
 * Extended product interface with full details.
 * Note: galleryImages field removed as it doesn't exist on ShopProduct type.
 * Use featuredImage or query media items separately if needed.
 */
export interface WPProductDetail extends WPProduct {
  databaseId?: number;
}

/**
 * Media item node shape (from product queries).
 */
export interface ProductMediaItemNode {
  id: string;
  sourceUrl: string;
  altText?: string;
  caption?: string;
  mediaDetails?: {
    width?: number;
    height?: number;
  };
}

/**
 * Response shape for GET_PRODUCT_QUERY.
 */
export type GetProductResponse = {
  shopProduct: WPProductDetail | null;
  mediaItems?: {
    nodes: ProductMediaItemNode[];
  };
};

/**
 * Response shape for GET_PRODUCT_BY_SLUG_QUERY.
 */
export type GetProductBySlugResponse = {
  shopProducts: {
    nodes: WPProductDetail[];
  };
  mediaItems?: {
    nodes: ProductMediaItemNode[];
  };
};

/**
 * Helper function to extract images from product editorBlocks (Gallery blocks and Image blocks).
 * Similar to how stories handle galleries, but returns a flat array of images.
 * @param editorBlocks - Array of editor blocks from the product
 * @param mediaItems - Array of media items to resolve gallery IDs
 * @param referenceImageUrl - Optional featured image URL for path resolution
 * @returns Array of image objects with id, sourceUrl, and altText
 */
export function extractProductImagesFromBlocks(
  editorBlocks?: ProductEditorBlock[],
  mediaItems?: ProductMediaItemNode[],
  referenceImageUrl?: string
): Array<{ id: string; sourceUrl: string; altText?: string }> {
  if (!editorBlocks || editorBlocks.length === 0) return [];

  const images: Array<{ id: string; sourceUrl: string; altText?: string }> = [];
  
  // Build media map for resolving gallery IDs
  const mediaMap = mediaItems
    ? Object.fromEntries(
        mediaItems.map((m) => [
          m.id,
          {
            sourceUrl: transformMediaUrl(m.sourceUrl, referenceImageUrl),
            altText: m.altText,
          },
        ])
      )
    : {};

  for (const block of editorBlocks) {
    // Handle Gallery blocks
    if (block.name === 'core/gallery' && block.attributes && 'ids' in block.attributes) {
      const ids = block.attributes.ids || [];
      ids.forEach((id) => {
        const media = mediaMap[String(id)];
        if (media) {
          images.push({
            id: `gallery-${id}`,
            sourceUrl: media.sourceUrl,
            altText: media.altText,
          });
        }
      });
      continue;
    }

    // Handle individual Image blocks
    if (block.name === 'core/image' && block.attributes && 'id' in block.attributes) {
      const attrs = block.attributes;
      // Try to resolve via mediaMap first
      const media = mediaMap[String(attrs.id)];
      if (media) {
        images.push({
          id: `image-${attrs.id}`,
          sourceUrl: media.sourceUrl,
          altText: media.altText || attrs.alt,
        });
      } else if (attrs.url) {
        // Fallback to direct URL if not in mediaMap
        images.push({
          id: `image-${attrs.id}`,
          sourceUrl: transformMediaUrl(attrs.url, referenceImageUrl),
          altText: attrs.alt,
        });
      }
      continue;
    }
  }

  return images;
}

/**
 * Helper function to fetch a product by slug.
 * Uses shopProduct to match the shopProducts pattern.
 * Note: If your GraphQL schema uses 'product' instead of 'shopProduct', 
 * update GET_PRODUCT_QUERY to use 'product' instead.
 * @param slug - The product slug
 * @returns The product data with mediaItems or null if not found
 */
export async function getProductBySlug(slug: string): Promise<(WPProductDetail & { mediaItems?: ProductMediaItemNode[] }) | null> {
  if (import.meta.env.DEV) {
    console.log('[Product] Fetching product with slug:', slug);
  }

  // Try shopProduct query first
  try {
    const data = await wpQuery<GetProductResponse>(
      GET_PRODUCT_QUERY,
      { id: slug, idType: 'SLUG' },
      { useCache: true }
    );
    if (data.shopProduct) {
      if (import.meta.env.DEV) {
        console.log('[Product] ✓ Found via shopProduct query:', slug);
      }
      return {
        ...data.shopProduct,
        productFields: normalizeProductFields(data.shopProduct.productFields as FlatProductFields) ?? data.shopProduct.productFields,
        mediaItems: data.mediaItems?.nodes,
      };
    } else {
      if (import.meta.env.DEV) {
        console.warn('[Product] shopProduct query returned null for slug:', slug);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (import.meta.env.DEV) {
      console.warn('[Product] shopProduct query failed:', errorMsg);
      console.warn('[Product] Full error:', error);
    }
  }

  // Fallback: try shopProducts with where filter (using slug field)
  try {
    const fallbackData = await wpQuery<GetProductBySlugResponse>(
      GET_PRODUCT_BY_SLUG_QUERY,
      { slug },
      { useCache: true }
    );
    if (fallbackData.shopProducts?.nodes?.length > 0) {
      const node = fallbackData.shopProducts.nodes[0];
      if (import.meta.env.DEV) {
        console.log('[Product] ✓ Found via shopProducts filter query:', slug);
      }
      return {
        ...node,
        productFields: normalizeProductFields(node.productFields as FlatProductFields) ?? node.productFields,
        mediaItems: fallbackData.mediaItems?.nodes,
      };
    } else {
      if (import.meta.env.DEV) {
        console.warn('[Product] shopProducts filter query returned no results for slug:', slug);
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (import.meta.env.DEV) {
      console.warn('[Product] shopProducts filter query also failed:', errorMsg);
      console.warn('[Product] Full error:', error);
    }
  }

  // Fallback 3: fetch all products and find by slug (same query as shop list)
  try {
    const listData = await wpQuery<GetProductsResponse>(GET_PRODUCTS_QUERY, {}, { useCache: true });
    const nodes = listData.shopProducts?.nodes ?? [];
    const slugLower = slug.toLowerCase();
    const match = nodes.find(
      (p) =>
        (p.slug && p.slug.toLowerCase() === slugLower) ||
        (p.uri && p.uri.replace(/^\/+|\/+$/g, '').toLowerCase().endsWith(slugLower))
    );
    if (match) {
      if (import.meta.env.DEV) {
        console.log('[Product] ✓ Found via products list fallback:', slug);
      }
      return {
        ...match,
        productFields: normalizeProductFields(match.productFields as FlatProductFields) ?? match.productFields,
      } as WPProductDetail & { mediaItems?: ProductMediaItemNode[] };
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Product] List fallback failed:', error);
    }
  }

  console.error(`[Product] ✗ Failed to fetch product with slug "${slug}" - all methods failed`);
  return null;
}

/**
 * Fetch variant products (siblings) for a given parent product ID.
 * Variants are products that share the same parent product.
 * @param parentId - The parent product ID
 * @returns Array of variant products or empty array if none found
 */
export async function getProductVariants(parentId: string): Promise<WPProductVariant[]> {
  try {
    // Try the direct query first
    try {
      const data = await wpQuery<{ shopProducts: { nodes: WPProductVariant[] } }>(
        GET_PRODUCT_VARIANTS_QUERY,
        { parentId },
        { useCache: true }
      );
      if (data.shopProducts?.nodes && data.shopProducts.nodes.length > 0) {
        return data.shopProducts.nodes;
      }
    } catch (queryError) {
      console.warn('Direct variant query failed, trying fallback:', queryError);
    }

    // Fallback: Fetch all products and filter client-side
    type VariantNode = WPProductVariant & { productFields?: { parentProduct?: { edges?: Array<{ node?: { id: string } }> } } };
    const allData = await wpQuery<{ shopProducts: { nodes: Array<VariantNode> } }>(
      GET_ALL_PRODUCTS_FOR_VARIANTS_QUERY,
      {},
      { useCache: true }
    );

    // Filter products that have this parentId
    const variants = (allData.shopProducts?.nodes || []).filter((product) => {
      const productParentId = product.productFields?.parentProduct?.edges?.[0]?.node?.id;
      return productParentId === parentId;
    });

    return variants.map(({ productFields, ...rest }) => rest as WPProductVariant);
  } catch (error) {
    console.error('Failed to fetch product variants:', error);
    return [];
  }
}

/**
 * Lightweight membership status as seen from WordPress.
 * This is intentionally minimal and defensive so the frontend degrades gracefully
 * if the underlying schema changes.
 */
export type WordpressMembershipStatus = {
  isMember: boolean;
  membershipSource: 'wordpress' | 'supabase' | 'unknown';
  roles?: string[];
};

const GET_MEMBERSHIP_STATUS_QUERY = `
  query GetMembershipStatus($email: String!, $id: ID, $idType: UserNodeIdTypeEnum) {
    user(id: $id, idType: $idType) @include(if: $id) {
      id
      email
      roles {
        nodes {
          name
          slug
        }
      }
    }
    userByEmail(email: $email) {
      id
      email
      roles {
        nodes {
          name
          slug
        }
      }
    }
  }
`;

type MembershipStatusResponse = {
  user: {
    roles?: { nodes?: Array<{ name: string; slug: string }> };
  } | null;
  userByEmail: {
    roles?: { nodes?: Array<{ name: string; slug: string }> };
  } | null;
};

/**
 * Fetches membership status from WordPress given an email or WP user id.
 * This is a best-effort helper: if anything fails, it returns "not a member"
 * rather than throwing, so the frontend can still rely on Supabase flags.
 */
export async function fetchMembershipStatus(
  emailOrWpId: string | number
): Promise<WordpressMembershipStatus> {
  const email =
    typeof emailOrWpId === 'string' && emailOrWpId.includes('@') ? emailOrWpId : '';

  try {
    const data = await wpQuery<MembershipStatusResponse>(
      GET_MEMBERSHIP_STATUS_QUERY,
      {
        email,
        id: typeof emailOrWpId === 'number' ? String(emailOrWpId) : null,
        idType: typeof emailOrWpId === 'number' ? 'DATABASE_ID' : null,
      },
      { useCache: false }
    );

    const roles =
      data.user?.roles?.nodes ??
      data.userByEmail?.roles?.nodes ??
      [];

    const roleSlugs = roles.map((role) => role.slug);

    // Heuristic: treat specific roles as "member". Adjust as needed in WordPress.
    const MEMBER_ROLE_SLUGS = ['kandiegang_member', 'member', 'subscriber'];
    const isMember = roleSlugs.some((slug) => MEMBER_ROLE_SLUGS.includes(slug));

    return {
      isMember,
      membershipSource: 'wordpress',
      roles: roleSlugs,
    };
  } catch (error) {
    console.warn('Failed to fetch membership status from WordPress:', error);
    return {
      isMember: false,
      membershipSource: 'unknown',
    };
  }
}

/**
 * Types for KandieEvents (rides and workshops)
 */

export interface RideGuide {
  title: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
    };
  };
}

export interface RideLevel {
  routeUrl?: string;
  gpxFile?: {
    node: {
      mediaItemUrl: string;
    };
  };
  guides?: {
    nodes: RideGuide[];
  };
}

export interface EventDetailsMetadata {
  primaryType: string; // 'Workshop', 'Social Ride', 'Road Event', etc.
  eventDate: string; // ISO date string
  description: string;
  workshopCapacity?: number;
  workshopStartTime?: string;
  rideCategory?: string;
  level1?: RideLevel;
  level2?: RideLevel;
  level2plus?: RideLevel;
  level3?: RideLevel;
  isFlintaOnly?: boolean;
  publicReleaseDate?: string;
  meetingPoint?: {
    name?: string;
    street?: string;
    city?: string;
  };
}

export interface WPRideEvent {
  databaseId: string;
  title: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
    };
  };
  eventDetails?: EventDetailsMetadata;
}

export interface GetKandieEventsResponse {
  rideEvents: {
    nodes: WPRideEvent[];
  };
}

/**
 * Helper function to fetch events from WordPress.
 * @param first - Number of events to fetch (default 20)
 * @returns Array of ride events or null if query fails
 */
export async function getKandieEvents(first: number = 20): Promise<WPRideEvent[] | null> {
  try {
    const { GET_KANDIE_EVENTS_QUERY } = await import('./graphql/communityEvents');
    const data = await wpQuery<GetKandieEventsResponse>(
      GET_KANDIE_EVENTS_QUERY,
      { first },
      { useCache: true }
    );
    
    if (import.meta.env.DEV) {
      console.log('[Community] Raw WordPress response:', data);
      if (data.rideEvents?.nodes?.[0]) {
        console.log('[Community] First event data:', data.rideEvents.nodes[0]);
        console.log('[Community] First event featuredImage:', data.rideEvents.nodes[0].featuredImage);
      }
    }
    
    return data.rideEvents?.nodes ?? null;
  } catch (error) {
    console.error('[Community] Failed to fetch events from WordPress:', error);
    return null;
  }
}

/**
 * Helper function to fetch a single event by slug.
 * @param slug - The event slug (e.g., 'kandie-gang-bike-repair-workshop')
 * @returns The event data or null if not found
 */
export async function getKandieEventBySlug(slug: string): Promise<WPRideEvent | null> {
  try {
    const { GET_KANDIE_EVENT_QUERY } = await import('./graphql/communityEvents');
    const data = await wpQuery<{ rideEvent: WPRideEvent | null }>(
      GET_KANDIE_EVENT_QUERY,
      { slug },
      { useCache: true }
    );
    
    if (import.meta.env.DEV) {
      console.log('[Event] Fetched event:', data.rideEvent);
    }
    
    return data.rideEvent ?? null;
  } catch (error) {
    console.error(`[Event] Failed to fetch event with slug "${slug}":`, error);
    return null;
  }
}

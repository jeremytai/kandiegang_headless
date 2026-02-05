
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

  // Strip WordPress image sizes (-1024x768, -300x200, etc.) to use original
  const originalUrl = url.replace(/-(\d+x\d+)\.(jpg|jpeg|png|gif|webp)$/i, '.$2');

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
        console.error('GraphQL Errors:', json.errors);
        throw new Error(`GraphQL Error: ${errorMessages}`);
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

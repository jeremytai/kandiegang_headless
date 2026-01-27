
/**
 * lib/wordpress.ts
 * A type-safe bridge for interacting with a Headless WordPress backend via GraphQL.
 * Optimized for performance and clean architecture.
 */

// WordPress GraphQL endpoint from environment variable
// Falls back to demo endpoint if not configured
const WP_GRAPHQL_URL = import.meta.env.VITE_WP_GRAPHQL_URL || 'https://demo.wp-graphql.org/graphql';

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
 * Efficiency Analysis: 
 * - Only requests specific nodes (avoiding edges/cursors when possible for simple lists).
 * - Filters for minimal metadata (Title, Excerpt, Date, Category).
 * - Requests optimized image source URLs.
 */
export const GET_POSTS_QUERY = `
  query GetPosts($first: Int!) {
    posts(first: $first, where: { orderby: { field: DATE, order: DESC } }) {
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
        categories(first: 1) {
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
 * Clear the WordPress query cache.
 * Useful for manual cache invalidation.
 */
export function clearWPCache(): void {
  queryCache.clear();
}

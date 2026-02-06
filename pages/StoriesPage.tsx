
/**
 * StoriesPage.tsx
 * An editorial journal/blog page for the Kandie Gang brand.
 * Refactored to fetch live data from a Headless WordPress bridge via GraphQL.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import {
  getCategoryPosts,
  wpQuery,
  GET_POSTS_QUERY,
  GetPostsResponse,
  WPPost,
  WPPostsPageInfo,
  getCategories,
  WPCategory,
  clearWPCache,
  transformMediaUrl,
} from '../lib/wordpress';
import { AnimatedHeadline } from '../components/AnimatedHeadline';
import { usePageMeta } from '../hooks/usePageMeta';

const STORIES_CATEGORY_SLUG = 'social-rides';
const POSTS_FIRST = 24;

export const StoriesPage: React.FC = () => {
  const [posts, setPosts] = useState<WPPost[]>([]);
  const [pageInfo, setPageInfo] = useState<WPPostsPageInfo | null>(null);
  const [categories, setCategories] = useState<WPCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = async (append = false, invalidateCache = false) => {
    if (invalidateCache) clearWPCache();
    if (!append) {
      setLoading(true);
      setError(null);
    }
    const after = append ? pageInfo?.endCursor ?? null : null;
    try {
      let result: { nodes: WPPost[]; pageInfo: WPPostsPageInfo } | null = null;
      let categoriesData: WPCategory[] | null = null;

      try {
        result = await getCategoryPosts(STORIES_CATEGORY_SLUG, POSTS_FIRST, after);
        if (import.meta.env.DEV && result) {
          console.log('[Stories] Loaded from category "%s": %d posts', STORIES_CATEGORY_SLUG, result.nodes.length);
        }
      } catch (categoryErr) {
        if (import.meta.env.DEV) {
          console.warn('[Stories] Category query failed, falling back to all posts:', categoryErr);
        }
      }

      if (!result && !append) {
        try {
          const postsData = await wpQuery<GetPostsResponse>(
            GET_POSTS_QUERY,
            { first: POSTS_FIRST, after },
            { useCache: !append }
          );
          result = {
            nodes: postsData.posts.nodes,
            pageInfo: postsData.posts.pageInfo,
          };
          if (import.meta.env.DEV && result) {
            console.log('[Stories] Loaded from all posts: %d posts', result.nodes.length);
          }
        } catch (postsErr) {
          if (import.meta.env.DEV) {
            console.error('[Stories] WordPress fetch failed:', postsErr);
          }
          throw postsErr;
        }
      }

      if (!append) {
        categoriesData = await getCategories().catch(() => []);
      }

      if (!result) {
        if (!append) {
          setError("No posts found in WordPress");
          setPosts(FALLBACK_STORIES);
          setPageInfo({ hasNextPage: false, endCursor: null });
          setCategories(deriveCategoriesFromPosts(FALLBACK_STORIES));
        }
      } else {
        const { nodes, pageInfo: nextPageInfo } = result;
        if (!append && nodes.length === 0) {
          setError("No posts found in WordPress");
          setPosts(FALLBACK_STORIES);
          setPageInfo({ hasNextPage: false, endCursor: null });
          setCategories(deriveCategoriesFromPosts(FALLBACK_STORIES));
        } else if (append) {
          setPosts((prev) => [...prev, ...nodes]);
          setPageInfo(nextPageInfo);
        } else {
          setPosts(nodes);
          setPageInfo(nextPageInfo);
          if (categoriesData && categoriesData.length > 0) {
            setCategories(categoriesData);
          } else {
            setCategories(deriveCategoriesFromPosts(nodes));
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (!append) {
        console.warn("Falling back to mock data due to connection error:", errorMessage);
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
          setError("Unable to connect to WordPress. Check WordPress URL and CORS. Showing archived content.");
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
          setError("WordPress access denied. Check URL and CORS. Showing archived content.");
        } else if (errorMessage.includes('GraphQL Error')) {
          setError("WordPress configuration error. Showing archived content.");
        } else {
          setError("Archive access only. Live connection pending.");
        }
        setPosts(FALLBACK_STORIES);
        setPageInfo({ hasNextPage: false, endCursor: null });
        setCategories(deriveCategoriesFromPosts(FALLBACK_STORIES));
      }
    } finally {
      if (append) {
        setLoadMoreLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  const loadMore = () => {
    if (!pageInfo?.hasNextPage || loadMoreLoading) return;
    setLoadMoreLoading(true);
    fetchStories(true);
  };

  usePageMeta(
    'Stories | Kandie Gang',
    "Since our start in 2021, we've had some epic shared experiences. Here are some of our most memorable stories."
  );

  useEffect(() => {
    fetchStories();
  }, []);

  const filteredPosts = useMemo(() => {
    if (!selectedCategory) return posts;
    return posts.filter((post) =>
      post.categories?.nodes?.some((c) => c.name === selectedCategory)
    );
  }, [posts, selectedCategory]);

  return (
    <div className="bg-primary-breath min-h-screen pt-32 md:pt-40 pb-40 selection:bg-[#f9f100] selection:text-black">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-16 md:mb-24 relative">
          <AnimatedHeadline
            text="Stories"
            as="h1"
            className="text-5xl md:text-8xl lg:text-[8.5vw] font-heading-thin tracking-normal leading-[0.85] text-secondary-purple-rain text-balance inline-flex flex-wrap items-center justify-center gap-x-[0.15em] mb-8"
          />
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-2xl text-primary-ink max-w-2xl font-light tracking-tight text-balance"
            >
              Since our start in 2021, we've had has some epic shared experiences. Here are some of our most memorable stories.
            </motion.p>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs font-bold text-amber-600 bg-amber-50 px-5 py-2.5 rounded-full border border-amber-100 flex items-center gap-2 shadow-sm w-fit"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-40 flex flex-col items-center justify-center space-y-6"
            >
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-slate-200" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
                </div>
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">Syncing Bridge</p>
            </motion.div>
          ) : (
            <motion.div 
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Category filter - hidden for now */}
              {false && categories.length > 0 && (
                <nav className="mb-10 md:mb-14 flex flex-wrap items-center gap-2" aria-label="Filter by category">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-colors ${
                      selectedCategory === null
                        ? 'bg-secondary-purple-rain text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      type="button"
                      onClick={() => setSelectedCategory(cat.name)}
                      className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest transition-colors ${
                        selectedCategory === cat.name
                          ? 'bg-secondary-purple-rain text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </nav>
              )}

              {/* 4-column story grid */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
                {filteredPosts.map((story, i) => {
                  const slug = story.uri?.replace(/^\/+|\/+$/g, '').split('/').pop() ?? '';
                  const storyHref = slug ? `/story/${slug}` : '/stories';
                  return (
                    <Link key={story.id} to={storyHref} className="block">
                      <motion.article
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.05, 0.3) }}
                        className="group cursor-pointer flex flex-col"
                      >
                        <div className="overflow-hidden rounded-xl aspect-[4/3] bg-slate-100 mb-4">
                          <img
                            src={
                              story.featuredImage?.node?.sourceUrl
                                ? transformMediaUrl(story.featuredImage.node.sourceUrl)
                                : 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?q=80&w=800'
                            }
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            alt=""
                            loading="lazy"
                          />
                        </div>
                        <h2
                          className="text-xl md:text-2xl font-light tracking-normal text-slate-900 leading-tight mb-2 line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: story.title }}
                        />
                        <div
                          className="text-slate-500 font-light text-sm md:text-base leading-relaxed line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: story.excerpt }}
                        />
                      </motion.article>
                    </Link>
                  );
                })}
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && (
          <div className="mt-24 md:mt-48 flex flex-col items-center gap-4">
            {pageInfo?.hasNextPage && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadMoreLoading}
                className="px-8 md:px-10 py-4 md:py-5 rounded-full border-2 border-secondary-purple-rain text-secondary-purple-rain font-bold hover:bg-secondary-purple-rain hover:text-white transition-all duration-300 flex items-center gap-3 active:scale-95 shadow-sm text-sm md:text-base disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loadMoreLoading ? (
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                ) : null}
                {loadMoreLoading ? 'Loading…' : 'Load more'}
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchStories(false, true)}
              className="px-8 md:px-10 py-4 md:py-5 rounded-full border-2 border-slate-100 text-slate-900 font-bold hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300 flex items-center gap-3 active:scale-95 shadow-sm text-sm md:text-base"
            >
              <RefreshCw className="w-4 h-4 md:w-5 md:h-5" /> Sync Updates
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

function deriveCategoriesFromPosts(posts: WPPost[]): WPCategory[] {
  const seen = new Set<string>();
  const result: WPCategory[] = [];
  for (const post of posts) {
    for (const node of post.categories?.nodes ?? []) {
      if (node.name && !seen.has(node.name)) {
        seen.add(node.name);
        result.push({
          name: node.name,
          slug: node.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        });
      }
    }
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

const FALLBACK_STORIES: WPPost[] = [
  {
    id: "fb-1",
    title: "Kandie Gang Season Opener – 2025",
    excerpt: "With a new year comes a new start location for our Kandie Gang Tuesday Social Rides.",
    date: "2025-04-08T12:00:00.000Z",
    uri: "/story/kandie-gang-season-opener-2025",
    categories: { nodes: [{ name: "Social Rides" }] },
    featuredImage: { node: { sourceUrl: "https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/04/08130624/250401_kandiegang_seasonopener_2025-28-scaled.jpg?q=80&w=1200" } }
  },
  {
    id: "fb-2",
    title: "Human Rides No. 1 \– It's a Love Story",
    excerpt: "We believe, and know, the bicycle can be used as a vehicle for change.",
    date: "2025-08-03T12:00:00.000Z",
    uri: "/story/human-rides-no-1-its-a-love-story",
    categories: { nodes: [{ name: "Social Rides" }] },
    featuredImage: { node: { sourceUrl: "https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2024/07/10205323/240707_humanrides-75-scaled.jpg?q=80&w=800" } }
  },
  {
    id: "fb-3",
    title: "Karfreitag Gravel",
    excerpt: "On my bike (yes, my Yeti Arc X) I threw on a Brooks B13 saddle with carbon rails. For longish rides like these, I’d rather sacrifice weight for comfort and comfortable it was.",
    date: new Date().toISOString(),
    uri: "/story/karfreitag-gravel",
    categories: { nodes: [{ name: "Social Rides" }] },
    featuredImage: { node: { sourceUrl: "https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2023/04/11230009/230407_kandiegang_karfreitag_gravel-27-scaled.jpg?q=80&w=800" } }
  }
];
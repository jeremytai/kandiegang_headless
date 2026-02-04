/**
 * StoryPage.tsx
 * Single story/post page. Fetches post by slug from WordPress and renders
 * Headline, excerpt, and date above ExpandingHero (hero image), then content.
 * Route: /story/:slug (e.g. /story/kandie-gang-season-opener-2025)
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft } from 'lucide-react';
import { getPostBySlug, getStoryBlocks, WPPost } from '../lib/wordpress';
import { buildMediaMap, normalizeBlocks } from '../lib/storyGalleries';
import type { NormalizedBlock } from '../lib/storyGalleries';
import { ExpandingHero } from '../components/ExpandingHero';
import { AnimatedHeadline } from '../components/AnimatedHeadline';
import { StoryBlocksRenderer } from '../components/StoryBlocksRenderer';
import { usePageMeta } from '../hooks/usePageMeta';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

/** Demo post for /story/kandie-gang-season-opener-2025 when WordPress has no data (e.g. demo endpoint). */
const DEMO_POST_SLUG = 'kandie-gang-season-opener-2025';
const DEMO_POST: WPPost = {
  id: 'demo-1',
  title: 'Kandie Gang Season Opener – 2025',
  excerpt: '<p>With a new year comes a new start location for our Kandie Gang Tuesday Social Rides.</p>',
  date: '2025-04-08T12:00:00.000Z',
  uri: `/story/${DEMO_POST_SLUG}`,
  featuredImage: {
    node: {
      sourceUrl:
        'https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/04/08130624/250401_kandiegang_seasonopener_2025-28-scaled.jpg?q=80&w=1200',
    },
  },
  content: `<p>What an amazing start to the road season</p>
<p>This year, we have moved the start of our Tuesday Social Rides from St. Pauli to Ballindamm. Those that have been with us for the past four years know that Wohlwillstraße, and more specifically, the Kandie Shop has been our base for the majority of the social rides.</p>
<p>As one of the defining elements in the first year of the Kandie Gang, Kerstin opened up the Kandie Shop to us, allowing us to leave things like jackets and backpacks at the shop when we went on tours. Upon our return, we would hang out and have a cold drink and chat afterward.</p>
<p>Last year, that changed when Kerstin Rose lost ownership of the Kandie Shop, making it no longer possible to use the Kandie Shop as a base for our rides. Kerstin also decided to step away from the Kandie Gang for good in September 2024 (the first time being the end of 2021 when she spent a good portion of her time in Spain).</p>`,
};

export const StoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<WPPost | null>(null);
  const [normalizedBlocks, setNormalizedBlocks] = useState<NormalizedBlock[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError('Missing story slug');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNormalizedBlocks(null);

    async function load() {
      try {
        const blocksData = await getStoryBlocks(slug);
        if (cancelled) return;
        if (blocksData?.post && blocksData.post.editorBlocks?.length) {
          const referenceImageUrl = blocksData.post.featuredImage?.node?.sourceUrl;
          const mediaMap = buildMediaMap(
            blocksData.mediaItems?.nodes ?? [],
            referenceImageUrl
          );
          const normalized = normalizeBlocks(blocksData.post.editorBlocks, mediaMap);
          setNormalizedBlocks(normalized);
          setPost({
            id: `blocks-${slug}`,
            title: blocksData.post.title,
            excerpt: blocksData.post.excerpt ?? '',
            date: blocksData.post.date ?? '',
            uri: blocksData.post.uri ?? `/story/${slug}`,
            featuredImage: blocksData.post.featuredImage,
          });
          return;
        }
        const fallbackPost = await getPostBySlug(slug);
        if (cancelled) return;
        if (fallbackPost) {
          setPost(fallbackPost);
        } else if (slug === DEMO_POST_SLUG) {
          setPost(DEMO_POST);
        } else {
          setPost(null);
          setError('Story not found');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch story:', err);
          const fallbackPost = await getPostBySlug(slug).catch(() => null);
          if (!cancelled) {
            if (fallbackPost) setPost(fallbackPost);
            else if (slug === DEMO_POST_SLUG) setPost(DEMO_POST);
            else setError('Failed to load story');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  usePageMeta(
    post ? `${stripHtml(post.title)} | Kandie Gang` : 'Story | Kandie Gang',
    post ? stripHtml(post.excerpt) : null,
    post?.featuredImage?.node?.sourceUrl ?? null
  );

  if (!slug) {
    return (
      <div className="min-h-screen pt-32 md:pt-40 pb-40 flex items-center justify-center">
        <p className="text-slate-500">Invalid story URL.</p>
      </div>
    );
  }

  return (
    <div className="bg-primary-breath min-h-screen selection:bg-[#f9f100] selection:text-black">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen pt-32 md:pt-40 pb-40 flex flex-col items-center justify-center space-y-6"
          >
            <Loader2 className="w-12 h-12 animate-spin text-slate-300" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              Loading story
            </p>
          </motion.div>
        ) : error || !post ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen pt-32 md:pt-40 pb-40 flex flex-col items-center justify-center"
          >
            <p className="text-slate-500 mb-6">{error ?? 'Story not found.'}</p>
            <Link
              to="/stories"
              className="inline-flex items-center gap-2 text-secondary-purple-rain font-bold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Stories
            </Link>
          </motion.div>
        ) : (
          <motion.article
            key={post.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <section className="px-6 pt-32 md:pt-40 pb-12 md:pb-16 text-center">
              <div className="max-w-3xl mx-auto grid grid-cols-12 gap-4">
                <AnimatedHeadline
                  as="h1"
                  text={stripHtml(post.title)}
                  lineHeight={1.35}
                  className="col-span-12 text-5xl md:text-8xl lg:text-[8.5vw] font-heading-thin tracking-normal text-secondary-purple-rain mb-4 md:mb-6 text-balance inline-block w-full text-center"
                />
                {post.excerpt && (
                  <div
                    className="col-span-12 col-start-1 md:col-span-8 md:col-start-3 text-lg md:text-xl text-slate-600 leading-normal [&_p]:mb-3 [&_p:last-child]:mb-0"
                    dangerouslySetInnerHTML={{ __html: post.excerpt }}
                  />
                )}
                <div className="col-span-12 mt-6 flex justify-center">
                  <time
                    dateTime={post.date}
                    className="inline-block w-fit rounded-full bg-secondary-purple-rain px-2 py-1 text-xs font-light text-white"
                  >
                    {new Date(post.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                </div>
              </div>
            </section>

            <ExpandingHero
              imageUrl={post.featuredImage?.node?.sourceUrl}
              imageAlt={stripHtml(post.title)}
            />

            <div className="max-w-4xl mx-auto px-6 pb-40">
              <div className="sticky top-0 z-10 -mx-6 px-6 pt-6 pb-2 bg-primary-breath/90 backdrop-blur-sm">
                <Link
                  to="/stories"
                  className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Stories
                </Link>
              </div>

              {normalizedBlocks && normalizedBlocks.length > 0 ? (
                <StoryBlocksRenderer
                  blocks={normalizedBlocks}
                  className="prose prose-lg max-w-none"
                />
              ) : (
                post.content && (
                  <div
                    className="prose prose-lg max-w-none text-slate-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                )
              )}
            </div>
          </motion.article>
        )}
      </AnimatePresence>
    </div>
  );
};

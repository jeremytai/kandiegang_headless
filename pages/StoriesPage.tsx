
/**
 * StoriesPage.tsx
 * An editorial journal/blog page for the Kandie Gang brand.
 * Refactored to fetch live data from a Headless WordPress bridge via GraphQL.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { wpQuery, GET_POSTS_QUERY, WPPost } from '../lib/wordpress';

export const StoriesPage: React.FC = () => {
  const [posts, setPosts] = useState<WPPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await wpQuery<{ posts: { nodes: WPPost[] } }>(
        GET_POSTS_QUERY, 
        { first: 6 },
        { useCache: true }
      );
      if (data.posts.nodes.length === 0) {
        setError("No posts found in WordPress");
        setPosts(FALLBACK_STORIES);
      } else {
        setPosts(data.posts.nodes);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.warn("Falling back to mock data due to connection error:", errorMessage);
      
      // Provide more specific error messages
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError("Unable to connect to WordPress. Showing archived content.");
      } else if (errorMessage.includes('GraphQL Error')) {
        setError("WordPress configuration error. Showing archived content.");
      } else {
        setError("Archive access only. Live connection pending.");
      }
      
      setPosts(FALLBACK_STORIES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  const featuredStory = posts[0];
  const otherStories = posts.slice(1);

  return (
    <div className="bg-white min-h-screen pt-32 md:pt-40 pb-40 selection:bg-[#f9f100] selection:text-black">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-16 md:mb-24 relative">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-[9vw] font-bold tracking-tighter text-slate-900 leading-[0.85] mb-8"
          >
            Journal.
          </motion.h1>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-2xl text-slate-500 max-w-2xl font-light tracking-tight text-balance"
            >
              Syncing thoughts from the Kandie Gang editorial bridge. High-performance Headless WordPress architecture.
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
              {/* Featured Story */}
              {featuredStory && (
                <section className="mb-24 md:mb-32">
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="group cursor-pointer grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center"
                  >
                    <div className="lg:col-span-7 overflow-hidden rounded-xl aspect-[16/10] bg-slate-100 relative shadow-2xl shadow-black/5">
                      <img 
                        src={featuredStory.featuredImage?.node.sourceUrl || "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1200"} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                        alt={featuredStory.title} 
                        loading="lazy"
                      />
                      <div className="absolute top-6 left-6 md:top-10 md:left-10">
                        <span className="bg-[#f9f100] text-black px-4 md:px-5 py-2 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest shadow-2xl border border-black/5">Editorial Choice</span>
                      </div>
                    </div>
                    <div className="lg:col-span-5 space-y-4 md:space-y-8">
                      <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.4em] text-slate-400">
                        {featuredStory.categories?.nodes[0]?.name || "Uncategorized"}
                      </span>
                      <h2 
                        className="text-4xl md:text-6xl font-bold tracking-tighter text-slate-900 leading-[0.95]"
                        dangerouslySetInnerHTML={{ __html: featuredStory.title }}
                      />
                      <div 
                        className="text-base md:text-xl text-slate-500 font-light leading-relaxed line-clamp-3 tracking-tight"
                        dangerouslySetInnerHTML={{ __html: featuredStory.excerpt }}
                      />
                      <div className="flex items-center gap-4 text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-300">
                        <span>{new Date(featuredStory.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <button className="flex items-center gap-3 font-bold text-slate-900 group-hover:translate-x-3 transition-transform text-base md:text-lg">
                        Read full insight <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                </section>
              )}

              {/* Grid Stories */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-x-12 md:gap-x-16 gap-y-16 md:gap-y-32">
                {otherStories.map((story, i) => (
                  <motion.div 
                    key={story.id}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group cursor-pointer flex flex-col"
                  >
                    <div className="overflow-hidden rounded-xl aspect-video bg-slate-100 mb-6 md:mb-10 shadow-lg group-hover:shadow-xl transition-shadow duration-500">
                      <img 
                        src={story.featuredImage?.node.sourceUrl || "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?q=80&w=800"} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                        alt={story.title} 
                        loading="lazy"
                      />
                    </div>
                    <div className="space-y-3 md:space-y-5">
                      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.4em] text-slate-300">
                        {story.categories?.nodes[0]?.name || "Community"}
                      </span>
                      <h3 
                        className="text-2xl md:text-4xl font-bold tracking-tighter text-slate-900 leading-tight"
                        dangerouslySetInnerHTML={{ __html: story.title }}
                      />
                      <div 
                        className="text-slate-500 font-light leading-relaxed line-clamp-2 text-base md:text-lg tracking-tight"
                        dangerouslySetInnerHTML={{ __html: story.excerpt }}
                      />
                      <div className="flex items-center gap-4 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 pt-2 md:pt-4">
                        <span>{new Date(story.date).toLocaleDateString()}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                        <span>BRIDGE SYNCED</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && (
          <div className="mt-24 md:mt-48 flex justify-center">
            <button 
              onClick={fetchStories}
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

const FALLBACK_STORIES: WPPost[] = [
  {
    id: "fb-1",
    title: "Embodied AI in the Modern Home",
    excerpt: "Exploring the boundary between utility and aesthetic in the living room.",
    date: new Date().toISOString(),
    uri: "/journal/embodied-ai",
    categories: { nodes: [{ name: "Technology" }] },
    featuredImage: { node: { sourceUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1200" } }
  },
  {
    id: "fb-2",
    title: "The Architecture of Trust",
    excerpt: "How soft-touch mechanics change the way humans perceive robotics.",
    date: new Date().toISOString(),
    uri: "/journal/trust",
    categories: { nodes: [{ name: "Design" }] },
    featuredImage: { node: { sourceUrl: "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?q=80&w=800" } }
  },
  {
    id: "fb-3",
    title: "Series B & The Path Forward",
    excerpt: "Expanding the Kandie Gang footprint from Hamburg to San Francisco.",
    date: new Date().toISOString(),
    uri: "/journal/series-b",
    categories: { nodes: [{ name: "Company" }] },
    featuredImage: { node: { sourceUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=800" } }
  }
];
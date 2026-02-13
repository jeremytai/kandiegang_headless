/**
 * ShopPage.tsx
 * Shop page for Kandie Gang products.
 * Uses the same layout structure as StoriesPage.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import {
  wpQuery,
  GET_PRODUCTS_QUERY,
  GetProductsResponse,
  WPProduct,
  clearWPCache,
  transformMediaUrl,
  normalizeProductFields,
} from '../../lib/wordpress';
import { canPurchase, ShopProduct } from '../../lib/products';
import { AnimatedHeadline } from '../../components/visual/AnimatedHeadline';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useAuth } from '../../context/AuthContext';

export const ShopPage: React.FC = () => {
  const [products, setProducts] = useState<WPProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  usePageMeta(
    'Shop | Kandie Gang',
    'Exclusive Kandie Gang products including limited edition apparel and accessories because we believe in the power of collectivism and standing out from the crowd.'
  );

  const fetchProducts = async (invalidateCache = false) => {
    if (invalidateCache) clearWPCache();
    setLoading(true);
    setError(null);

    try {
      const data = await wpQuery<GetProductsResponse>(
        GET_PRODUCTS_QUERY,
        {},
        { useCache: !invalidateCache }
      );

      if (import.meta.env.DEV && data) {
        console.log('[Shop] Response data:', data);
        console.log('[Shop] Loaded products: %d items', data.shopProducts?.nodes?.length ?? 0);
        if (data.shopProducts?.nodes?.length === 0) {
          console.warn('[Shop] Query returned empty nodes array');
        }
      }

      if (data.shopProducts?.nodes && data.shopProducts.nodes.length > 0) {
        setProducts(
          data.shopProducts.nodes.map((p) => ({
            ...p,
            productFields: normalizeProductFields(p.productFields) ?? p.productFields,
          }))
        );
      } else {
        const errorMsg = data.shopProducts ? 'No products found' : 'Invalid response structure';
        console.warn('[Shop]', errorMsg, data);
        setError(errorMsg);
        setProducts([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.warn('Failed to fetch products:', errorMessage);

      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Unable to connect to WordPress. Check WordPress URL and CORS.');
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        setError('WordPress access denied. Check URL and CORS.');
      } else if (errorMessage.includes('GraphQL Error')) {
        setError('WordPress configuration error.');
      } else {
        setError('Unable to load products at this time.');
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const shopProducts = products.filter((p) => !(p.productFields?.membersOnly ?? false));

  return (
    <div className="bg-white min-h-screen pt-32 md:pt-40 pb-40 selection:bg-[#f9f100] selection:text-black">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-16 md:mb-24 relative">
          <AnimatedHeadline
            text="Shop"
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
              Kandie Gang product drops.
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
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">
                Loading Products
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* 3-column product grid: 1 col mobile, 2 col sm, 3 col lg+ — only non–member-only products */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                {shopProducts.length > 0 ? (
                  shopProducts.map((product, i) => {
                    const isMember = !!user;
                    const displayPrice =
                      isMember && product.productFields?.priceMember
                        ? product.productFields.priceMember
                        : product.productFields?.pricePublic;

                    // Convert to ShopProduct format for canPurchase
                    const shopProduct: ShopProduct = {
                      id: product.id,
                      title: product.title,
                      content: product.content || '',
                      excerpt: product.excerpt || '',
                      featuredImage: product.featuredImage,
                      productFields: {
                        hasVariants: product.productFields?.hasVariants ?? false,
                        pricePublic: product.productFields?.pricePublic
                          ? parseFloat(product.productFields.pricePublic)
                          : undefined,
                        priceMember: product.productFields?.priceMember
                          ? parseFloat(product.productFields.priceMember)
                          : undefined,
                        stripePriceIdPublic: product.productFields?.stripePriceIdPublic,
                        stripePriceIdMember: product.productFields?.stripePriceIdMember,
                        inventory: product.productFields?.inventory,
                        sku: product.productFields?.sku,
                        variants: product.productFields?.variants?.map((v) => ({
                          label: v.label,
                          pricePublic: v.pricePublic,
                          priceMember: v.priceMember,
                          stripePriceIdPublic: v.stripePriceIdPublic,
                          stripePriceIdMember: v.stripePriceIdMember,
                          sku: v.sku,
                          inventory: v.inventory,
                        })),
                        membersOnly: false,
                        inStock: product.productFields?.inStock ?? true,
                      },
                    };

                    const isInStock = canPurchase(shopProduct, isMember);
                    const productSlug = product.slug || '';
                    const productHref = productSlug ? `/shop/${productSlug}` : '#';

                    return (
                      <Link key={product.id} to={productHref} className="block">
                        <motion.article
                          initial={{ opacity: 0, y: 24 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.05, 0.3) }}
                          className="group cursor-pointer flex flex-col"
                        >
                          <div className="overflow-hidden rounded-xl aspect-[3/4] bg-slate-100 mb-4 relative">
                            <img
                              src={
                                product.featuredImage?.node?.sourceUrl
                                  ? transformMediaUrl(product.featuredImage.node.sourceUrl)
                                  : 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?q=80&w=800'
                              }
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              alt={product.featuredImage?.node?.altText || product.title}
                              loading="lazy"
                            />
                            {!isInStock && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="text-white font-bold uppercase tracking-widest text-xs">
                                  Out of Stock
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h2
                              className="text-lg md:text-xl font-gtplanar font-bold tracking-normal text-secondary-purple-rain leading-tight line-clamp-2 flex-1"
                              dangerouslySetInnerHTML={{ __html: product.title }}
                            />
                          </div>
                          {displayPrice && (
                            <p className="text-secondary-purple-rain font-gtplanar font-medium text-base md:text-lg mt-4 mb-8">
                              € {displayPrice}
                              {isMember &&
                                product.productFields?.priceMember &&
                                product.productFields?.pricePublic && (
                                  <span className="text-slate-500 text-sm font-normal ml-2 line-through">
                                    {product.productFields.pricePublic}
                                  </span>
                                )}
                            </p>
                          )}
                          <div className="flex items-center justify-between w-full py-3 px-4 rounded-lg bg-secondary-purple-rain text-white group-hover:border-slate-600 group-hover:bg-slate-200 transition-colors mb-10">
                            <span className="font-medium text-white text-sm tracking-normal">
                              Buy
                            </span>
                            <ArrowRight className="w-4 h-4 text-white shrink-0" />
                          </div>
                        </motion.article>
                      </Link>
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <p className="text-slate-400 text-lg">No products available at this time.</p>
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && (
          <div className="mt-24 md:mt-48 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => fetchProducts(true)}
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

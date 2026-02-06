/**
 * ProductPage.tsx
 * Single product detail page with scroll-driven image gallery.
 * Uses the same hero layout as KandieGangCyclingClubPage.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft } from 'lucide-react';
import { getProductBySlug, transformMediaUrl, extractProductImagesFromBlocks } from '../lib/wordpress';
import { AnimatedHeadline } from '../components/AnimatedHeadline';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAuth } from '../context/AuthContext';
import { CheckoutButton } from '../components/CheckoutButton';

/**
 * Extract image URLs from HTML content.
 * Returns array of { id, sourceUrl, altText } objects.
 * Transforms URLs using transformMediaUrl to ensure they load correctly.
 */
function extractImagesFromContent(content?: string): Array<{ id: string; sourceUrl: string; altText?: string }> {
  if (!content) return [];
  
  const images: Array<{ id: string; sourceUrl: string; altText?: string }> = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const imgTags = doc.querySelectorAll('img');
  
  imgTags.forEach((img, index) => {
    const src = img.getAttribute('src');
    if (src) {
      // Transform the URL to ensure it loads correctly (handles CDN, etc.)
      const transformedUrl = transformMediaUrl(src);
      images.push({
        id: `content-img-${index}`,
        sourceUrl: transformedUrl,
        altText: img.getAttribute('alt') || undefined,
      });
    }
  });
  
  return images;
}

/**
 * Remove images from HTML content so they don't display in the product description.
 * Images should only appear in the left gallery/thumbnails.
 */
function removeImagesFromContent(content?: string): string {
  if (!content) return '';
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const imgTags = doc.querySelectorAll('img');
  
  // Remove all img tags and their parent containers (if they're in figure/picture tags)
  imgTags.forEach((img) => {
    const parent = img.parentElement;
    // If parent is a figure or picture tag, remove the entire parent
    if (parent && (parent.tagName === 'FIGURE' || parent.tagName === 'PICTURE')) {
      parent.remove();
    } else {
      // Otherwise, just remove the img tag itself
      img.remove();
    }
  });
  
  return doc.body.innerHTML;
}

export const ProductPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<Awaited<ReturnType<typeof getProductBySlug>>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [stickyOffset, setStickyOffset] = useState<number | null>(null);
  const mobileCarouselRef = useRef<HTMLDivElement>(null);
  const imageScrollRefs = useRef<(HTMLDivElement | null)[]>([]);
  const heroThumbnailsRef = useRef<HTMLDivElement>(null);
  const heroRightColRef = useRef<HTMLDivElement>(null);

  // Get product images (featured image + gallery blocks + fallback to HTML content)
  const productImages = useMemo(() => {
    if (!product) return [];
    
    const images: Array<{ id: string; sourceUrl: string; altText?: string }> = [];
    
    // Add featured image first
    if (product.featuredImage?.node?.sourceUrl) {
      images.push({
        id: 'featured',
        sourceUrl: product.featuredImage.node.sourceUrl,
        altText: product.featuredImage.node.altText,
      });
    }
    
    // Priority 1: Extract images from Gallery blocks (if available)
    if (product.editorBlocks && product.editorBlocks.length > 0) {
      const referenceImageUrl = product.featuredImage?.node?.sourceUrl;
      const galleryImages = extractProductImagesFromBlocks(
        product.editorBlocks,
        product.mediaItems,
        referenceImageUrl
      );
      if (galleryImages.length > 0) {
        images.push(...galleryImages);
        return images; // Use gallery blocks, skip HTML parsing
      }
    }
    
    // Priority 2: Fallback to extracting images from HTML content (backward compatibility)
    const contentImages = extractImagesFromContent(product.content);
    images.push(...contentImages);
    
    return images;
  }, [product]);

  usePageMeta(
    product ? `${product.title} | Shop | Kandie Gang` : 'Product | Shop | Kandie Gang',
    product ? `Shop ${product.title} - Exclusive Kandie Gang products` : 'Product details'
  );

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError('Missing product slug');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const productData = await getProductBySlug(slug);
        if (cancelled) return;
        if (productData) {
          setProduct(productData);
        } else {
          setError('Product not found');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch product:', err);
          setError('Failed to load product');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Sync active thumbnail with visible image (desktop only, IntersectionObserver)
  useEffect(() => {
    if (window.innerWidth < 1024 || productImages.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = imageScrollRefs.current.findIndex((ref) => ref === entry.target);
            if (index !== -1) setActiveImageIndex(index);
          }
        });
      },
      { threshold: 0.5, rootMargin: '-20% 0px -20% 0px' }
    );
    imageScrollRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, [productImages.length]);

  // Handle sticky/fixed behavior for thumbnails and right column
  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth < 1024 || productImages.length === 0) return;

    // Calculate sticky end threshold based on image count
    const IMAGE_HEIGHT = 800; // Approximate height per image
    const STICKY_END_THRESHOLD = productImages.length * IMAGE_HEIGHT - window.innerHeight;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY >= STICKY_END_THRESHOLD) {
        setStickyOffset(STICKY_END_THRESHOLD);
      } else {
        setStickyOffset(null); // fixed mode
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [productImages.length]);

  const scrollToHeroImage = (index: number) => {
    const target = imageScrollRefs.current[index];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Apply hero sticky absolute top
  useEffect(() => {
    const thumb = heroThumbnailsRef.current;
    const right = heroRightColRef.current;
    const top = stickyOffset !== null ? `${stickyOffset}px` : '';
    if (thumb) thumb.style.top = top;
    if (right) right.style.top = top;
  }, [stickyOffset]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
          <Loader2 className="w-12 h-12 animate-spin text-slate-400" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Product</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen pt-32 md:pt-40 pb-40 flex flex-col items-center justify-center bg-primary-breath">
        <p className="text-slate-500 mb-6">{error || 'Product not found'}</p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-secondary-purple-rain font-bold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Shop
        </Link>
      </div>
    );
  }

  const isMember = !!user;
  const isMembersOnly = product.productFields?.membersOnly ?? false;
  const displayPrice = isMember && product.productFields?.priceMember
    ? product.productFields.priceMember
    : product.productFields?.pricePublic;
  const isInStock = product.productFields?.inStock ?? true;
  const variantLabel = product.productFields?.variantLabel;

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Hero — scroll-driven image gallery with sticky thumbnails & right column */}
      <section className="relative">
        {/* Desktop layout */}
        {productImages.length > 0 && (
          <div className="hidden lg:flex">
            {/* Left column — scrolling images */}
            <div className="w-1/2 p-3">
              <div className="flex flex-col gap-3">
                {productImages.map((img, i) => (
                  <div
                    key={img.id}
                    ref={(el) => {
                      imageScrollRefs.current[i] = el;
                    }}
                    className="aspect-[3/4] w-full overflow-hidden rounded-lg"
                  >
                    <img
                      alt={img.altText || product.title}
                      draggable="false"
                      loading={i === 0 ? undefined : 'lazy'}
                      width={1920}
                      height={2400}
                      src={transformMediaUrl(img.sourceUrl)}
                      className="h-full w-full object-cover object-center transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right column — placeholder to maintain layout */}
            <div className="w-1/2" />
          </div>
        )}

        {/* Fixed/Absolute thumbnails (desktop only) */}
        {productImages.length > 0 && (
          <div
            ref={heroThumbnailsRef}
            className={`pointer-events-none hidden lg:flex h-screen items-center pl-6 z-20 ${
              stickyOffset === null ? 'fixed top-0 left-0' : 'absolute left-0'
            }`}
          >
            <div className="pointer-events-auto flex flex-col gap-3">
              {productImages.map((img, i) => (
                <button
                  key={img.id}
                  type="button"
                  aria-label={`Go to image ${i + 1}`}
                  aria-current={activeImageIndex === i}
                  onClick={() => scrollToHeroImage(i)}
                  className={`aspect-[3/4] w-9 cursor-pointer overflow-hidden rounded-md outline-2 outline-offset-3 transition-[outline,ring] ${
                    activeImageIndex === i
                      ? 'outline-secondary-current'
                      : 'ring-1 ring-secondary-current/20 outline-transparent'
                  } focus-visible:ring-2 focus-visible:ring-secondary-current/80`}
                >
                  <img
                    alt={img.altText || product.title}
                    draggable="false"
                    loading="lazy"
                    width={1920}
                    height={2400}
                    src={transformMediaUrl(img.sourceUrl)}
                    className="h-full w-full object-cover object-center transition-transform duration-300 hover:scale-[1.15]"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fixed/Absolute right column content (desktop only) */}
        <div
          ref={heroRightColRef}
          className={`hidden lg:flex items-center justify-center h-screen w-1/2 z-10 ${
            stickyOffset === null ? 'fixed top-0 right-0' : 'absolute right-0'
          }`}
        >
          <div className="flex w-full flex-col items-center justify-center gap-12 text-center px-6">
            {/* Headlines */}
            <div className="flex flex-col items-center">
              <span className="mb-3 block w-fit rounded-full bg-secondary-purple-rain px-4 py-2 text-sm font-light text-white font-body tracking-tight">
                {isMembersOnly ? 'Members Only' : 'Shop'}
              </span>
              <AnimatedHeadline
                as="h1"
                text={product.title}
                className="font-heading text-secondary-purple-rain text-5xl md:text-4xl lg:text-5xl xl:text-6xl font-thin tracking-normal"
                lineHeight={1.25}
                fullWidth
              />
              {variantLabel && (
                <p className="mt-2 text-secondary-purple-rain/70 text-sm font-medium">
                  {variantLabel}
                </p>
              )}
            </div>

            {/* Price */}
            {displayPrice && (
              <div className="text-secondary-purple-rain">
                <p className="text-3xl md:text-4xl font-medium mb-2">
                  {displayPrice}
                  {isMember && product.productFields?.priceMember && product.productFields?.pricePublic && (
                    <span className="text-xl font-normal ml-3 text-secondary-purple-rain/60 line-through">
                      {product.productFields.pricePublic}
                    </span>
                  )}
                </p>
                {!isInStock && (
                  <p className="text-sm font-medium text-red-600 uppercase tracking-widest">Out of Stock</p>
                )}
                {isMembersOnly && !isMember && (
                  <p className="text-sm font-medium text-secondary-purple-rain/70 uppercase tracking-widest mt-2">
                    Members Only Product
                  </p>
                )}
              </div>
            )}

            {/* Checkout Button */}
            {isInStock && !(isMembersOnly && !isMember) && (
              <CheckoutButton
                priceId={
                  isMember && product.productFields?.stripePriceIdMember
                    ? product.productFields.stripePriceIdMember
                    : product.productFields?.stripePriceIdPublic || ''
                }
                productId={product.id}
                productTitle={product.title}
                productSlug={product.slug}
                disabled={!product.productFields?.stripePriceIdPublic && !product.productFields?.stripePriceIdMember}
              />
            )}

            {/* Body text */}
            {product.content && (
              <div
                className="max-w-[44ch] text-secondary-purple-rain text-base md:text-lg lg:text-xl prose prose-lg prose-purple"
                dangerouslySetInnerHTML={{ __html: removeImagesFromContent(product.content) }}
              />
            )}

            {/* SKU */}
            {product.productFields?.sku && (
              <div className="text-secondary-purple-rain/60 text-sm">
                SKU: {product.productFields.sku}
              </div>
            )}
          </div>
        </div>

        {/* Mobile layout */}
        <div className="flex flex-col lg:hidden">
          <div className="m-auto flex w-full flex-col items-center justify-center gap-6 pt-[var(--header-height,5rem)] text-center lg:gap-12 lg:pt-0">
            {/* Headlines */}
            <div className="flex flex-col items-center px-4 max-lg:py-12 lg:px-6">
              <span className="mb-3 block w-fit rounded-full bg-secondary-purple-rain px-4 py-2 text-sm font-light text-white font-body tracking-tight">
                {isMembersOnly ? 'Members Only' : 'Shop'}
              </span>
              <AnimatedHeadline
                as="h1"
                text={product.title}
                className="font-heading text-secondary-purple-rain text-5xl md:text-4xl lg:text-5xl xl:text-6xl font-normal tracking-tight"
                lineHeight={1.25}
                fullWidth
              />
              {variantLabel && (
                <p className="mt-2 text-secondary-purple-rain/70 text-sm font-medium">
                  {variantLabel}
                </p>
              )}
            </div>

            {/* Mobile: horizontal image carousel */}
            {productImages.length > 0 && (
              <>
                <div className="w-screen overflow-hidden lg:hidden">
                  <div
                    ref={mobileCarouselRef}
                    className="no-scrollbar flex snap-x snap-mandatory scroll-p-4 flex-row gap-2 overflow-x-auto px-4"
                    onScroll={() => {
                      const el = mobileCarouselRef.current;
                      if (!el) return;
                      const slideWidth = el.children[0]?.clientWidth || 0;
                      const gap = 8;
                      const index = Math.round(el.scrollLeft / (slideWidth + gap));
                      setActiveImageIndex(Math.min(Math.max(0, index), productImages.length - 1));
                    }}
                  >
                    {productImages.map((img, i) => (
                      <div
                        key={img.id}
                        className="aspect-[3/4] flex-none snap-center overflow-hidden rounded-lg max-lg:w-[calc(100vw-(var(--spacing,1rem)*8))]"
                      >
                        <img
                          alt={img.altText || product.title}
                          draggable="false"
                          loading={i === 0 ? undefined : 'lazy'}
                          width={1920}
                          height={2400}
                          src={transformMediaUrl(img.sourceUrl)}
                          className="h-full w-full object-cover object-center transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mobile: thumbnail indicators */}
                <div className="w-fit py-4 lg:hidden">
                  <div className="flex h-full justify-center gap-3">
                    {productImages.map((img, i) => (
                      <button
                        key={img.id}
                        type="button"
                        aria-label={`Go to image ${i + 1}`}
                        aria-current={activeImageIndex === i}
                        onClick={() => {
                          setActiveImageIndex(i);
                          const el = mobileCarouselRef.current;
                          if (el && el.children[i]) {
                            el.children[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                          }
                        }}
                        className={`aspect-[3/4] w-7 cursor-pointer overflow-hidden rounded-md outline-2 outline-offset-3 transition-[outline,ring] ${
                          activeImageIndex === i
                            ? 'outline-secondary-current'
                            : 'ring-1 ring-secondary-current/20 outline-transparent'
                        } focus-visible:ring-2 focus-visible:ring-secondary-current/80`}
                      >
                        <img
                          alt={img.altText || product.title}
                          draggable="false"
                          loading="lazy"
                          width={1920}
                          height={2400}
                          src={transformMediaUrl(img.sourceUrl)}
                          className="h-full w-full object-cover object-center transition-transform duration-300 hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Price */}
            {displayPrice && (
              <div className="text-secondary-purple-rain px-4">
                <p className="text-3xl md:text-4xl font-medium mb-2">
                  {displayPrice}
                  {isMember && product.productFields?.priceMember && product.productFields?.pricePublic && (
                    <span className="text-xl font-normal ml-3 text-secondary-purple-rain/60 line-through">
                      {product.productFields.pricePublic}
                    </span>
                  )}
                </p>
                {!isInStock && (
                  <p className="text-sm font-medium text-red-600 uppercase tracking-widest">Out of Stock</p>
                )}
                {isMembersOnly && !isMember && (
                  <p className="text-sm font-medium text-secondary-purple-rain/70 uppercase tracking-widest mt-2">
                    Members Only Product
                  </p>
                )}
              </div>
            )}

            {/* Checkout Button */}
            {isInStock && !(isMembersOnly && !isMember) && (
              <div className="px-4 w-full">
                <CheckoutButton
                  priceId={
                    isMember && product.productFields?.stripePriceIdMember
                      ? product.productFields.stripePriceIdMember
                      : product.productFields?.stripePriceIdPublic || ''
                  }
                  productId={product.id}
                  productTitle={product.title}
                  productSlug={product.slug}
                  disabled={!product.productFields?.stripePriceIdPublic && !product.productFields?.stripePriceIdMember}
                  className="w-full"
                />
              </div>
            )}

            {/* Body text */}
            {product.content && (
              <div
                className="max-w-[44ch] px-4 text-secondary-current text-base md:text-lg lg:px-8 lg:text-xl prose prose-lg"
                dangerouslySetInnerHTML={{ __html: removeImagesFromContent(product.content) }}
              />
            )}

            {/* SKU */}
            {product.productFields?.sku && (
              <div className="text-secondary-purple-rain/60 text-sm px-4">
                SKU: {product.productFields.sku}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Back to shop link */}
      <div className="sticky top-0 z-10 -mx-6 px-6 pt-6 pb-2 bg-white/90 backdrop-blur-sm lg:hidden">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Shop
        </Link>
      </div>
      {/* Desktop back to shop link */}
      <div className="hidden lg:block fixed top-0 left-0 z-50 p-6">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Shop
        </Link>
      </div>
    </div>
  );
};

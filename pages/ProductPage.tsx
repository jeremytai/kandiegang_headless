/**
 * ProductPage.tsx
 * Single product detail page with scroll-driven image gallery.
 * Uses the same hero layout as KandieGangCyclingClubPage.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, ChevronDown } from 'lucide-react';
import { getProductBySlug, transformMediaUrl, extractProductImagesFromBlocks } from '../lib/wordpress';
import { getProductPrice, getStripePriceId, canPurchase, ProductVariant, ShopProduct } from '../lib/products';
import { AnimatedHeadline } from '../components/AnimatedHeadline';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAuth } from '../context/AuthContext';
import { CheckoutButton } from '../components/CheckoutButton';
import { ProductVariantSelector } from '../components/ProductVariantSelector';

/** FAQ-style accordion for product details (body + SKU). */
function ProductDetailsAccordion({
  bodyHtml,
  sku,
  variant,
}: {
  bodyHtml: string;
  sku?: string | null;
  variant: 'desktop' | 'mobile';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const hasContent = !!bodyHtml || !!sku;
  if (!hasContent) return null;

  // Mobile padding is applied by the parent wrapper in ProductPage so Details aligns with the button
  const paddingClass = variant === 'mobile' ? '' : '';
  const textColorClass = variant === 'desktop' ? 'text-secondary-purple-rain' : 'text-secondary-current';

  return (
    <div className={`flex w-full flex-col items-start self-start text-left border-t border-b border-slate-200 pt-2 pb-2 mt-[56px] ${paddingClass}`}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between text-left group"
      >
        <span className={`text-sm font-medium uppercase tracking-widest ${textColorClass} group-hover:opacity-80`}>
          Details
        </span>
        <span
          className={`inline-flex shrink-0 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
        >
          <ChevronDown className={`h-5 w-5 opacity-60 ${variant === 'desktop' ? 'text-secondary-purple-rain' : 'text-secondary-current'}`} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div className={`pt-4 pb-2 ${textColorClass} text-xs md:text-sm prose prose-sm max-w-[44ch]`}>
              {bodyHtml && (
                <div
                  className={variant === 'desktop' ? 'prose-purple' : ''}
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              )}
              {sku && (
                <div className="text-secondary-purple-rain/60 text-sm pt-4">
                  SKU: {sku}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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

/** Extract the first paragraph from HTML content for display under the headline. */
function getFirstParagraph(content?: string): string {
  if (!content) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const firstP = doc.body.querySelector('p');
  return firstP ? firstP.outerHTML : '';
}

/** Return HTML content with the first paragraph removed (so we don't duplicate it under the headline). */
function getContentWithoutFirstParagraph(content?: string): string {
  if (!content) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const firstP = doc.body.querySelector('p');
  if (firstP) firstP.remove();
  return doc.body.innerHTML.trim();
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
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(-1);
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

    const slugToFetch = slug;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedVariantIndex(-1);

    async function load() {
      try {
        const productData = await getProductBySlug(slugToFetch);
        if (cancelled) return;
        if (productData) {
          setProduct(productData);
          // Start with no variant selected (user must choose a size)
          setSelectedVariantIndex(-1);
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
  const hasVariants = product.productFields?.hasVariants ?? false;
  const variants = product.productFields?.variants ?? [];
  const variantIndex = hasVariants ? selectedVariantIndex : undefined;
  
  // Convert product to ShopProduct format for helper functions
  const shopProduct: ShopProduct = {
    id: product.id,
    title: product.title,
    content: product.content ?? '',
    excerpt: product.excerpt ?? '',
    featuredImage: product.featuredImage,
    productFields: {
      hasVariants,
      pricePublic: product.productFields?.pricePublic ? parseFloat(product.productFields.pricePublic) : undefined,
      priceMember: product.productFields?.priceMember ? parseFloat(product.productFields.priceMember) : undefined,
      stripePriceIdPublic: product.productFields?.stripePriceIdPublic,
      stripePriceIdMember: product.productFields?.stripePriceIdMember,
      inventory: product.productFields?.inventory,
      sku: product.productFields?.sku,
      variants: variants.map(v => ({
        label: v.label,
        pricePublic: v.pricePublic,
        priceMember: v.priceMember,
        stripePriceIdPublic: v.stripePriceIdPublic,
        stripePriceIdMember: v.stripePriceIdMember,
        sku: v.sku,
        inventory: v.inventory,
      })),
      membersOnly: product.productFields?.membersOnly ?? false,
      inStock: product.productFields?.inStock ?? true,
    },
  };
  
  // Calculate pricing using helper functions
  const displayPrice = getProductPrice(shopProduct, isMember, variantIndex);
  const stripePriceId = getStripePriceId(shopProduct, isMember, variantIndex);
  const canPurchaseProduct = canPurchase(shopProduct, isMember, variantIndex);
  
  // Calculate public price and discount status for display
  let publicPrice = displayPrice;
  let hasDiscount = false;
  
  if (hasVariants && selectedVariantIndex >= 0 && variants[selectedVariantIndex]) {
    const variant = variants[selectedVariantIndex];
    publicPrice = variant.pricePublic;
    hasDiscount = isMember && !!variant.priceMember;
  } else {
    publicPrice = shopProduct.productFields.pricePublic ?? 0;
    hasDiscount = isMember && !!shopProduct.productFields.priceMember;
  }
  
  const variantLabel = hasVariants && selectedVariantIndex >= 0 && variants[selectedVariantIndex]
    ? variants[selectedVariantIndex].label
    : product.productFields?.variantLabel;

  const rawTitle = (product.title ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  const productSlug = (product.slug ?? '').toLowerCase();
  const hideTitleAndSizeLabel =
    /Cycling Socks/i.test(rawTitle) ||
    (/Love Story/i.test(rawTitle) && /Socks?/i.test(rawTitle)) ||
    /love-story.*socks|cycling-socks|socks.*love-story/i.test(productSlug);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Hero — scroll-driven image gallery with sticky thumbnails & right column */}
      <section className="relative">
        {/* Desktop layout */}
        {productImages.length > 0 && (
          <div className="hidden lg:flex">
            {/* Left column — scrolling images */}
            <div className="min-w-0 flex-1 p-3">
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
            <div className="w-[492px] shrink-0" />
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
          className={`hidden lg:flex items-start justify-center h-screen w-[492px] shrink-0 z-10 pt-[var(--header-height,5rem)] ${
            stickyOffset === null ? 'fixed top-0 right-0' : 'absolute right-0'
          }`}
        >
          <div className="flex w-full max-h-[calc(100vh-var(--header-height,5rem))] flex-col items-center justify-center gap-8 text-center px-6 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:hidden">
            {/* Headlines — left-aligned to match first paragraph */}
            <div className="flex w-full max-w-[44ch] flex-col items-start self-start pt-[100px] text-left">
              {shopProduct.productFields.membersOnly && (
                <span className="mb-4 block w-fit rounded-full bg-secondary-purple-rain px-4 py-2 text-sm font-light text-white font-body tracking-tight">
                  Members Only
                </span>
              )}
              <AnimatedHeadline
                as="h1"
                text={product.title}
                className="font-heading text-secondary-purple-rain text-2xl lg:text-3xl xl:text-4xl font-thin tracking-normal w-full !text-left"
                lineHeight={1.25}
                fullWidth
              />
              {/* Price — under headline, before first paragraph */}
              {displayPrice > 0 && (
                <div className="py-2 text-secondary-purple-rain">
                  {hasDiscount ? (
                    <div>
                      <p className="text-base md:text-lg font-medium mb-1.5">
                        <span className="text-green-600">€{displayPrice.toFixed(2)}</span>
                        <span className="text-sm font-normal ml-2 text-secondary-purple-rain/60 line-through">
                          €{publicPrice.toFixed(2)}
                        </span>
                      </p>
                      <p className="text-xs text-green-600 font-medium uppercase tracking-widest mb-1.5">
                        Member Discount!
                      </p>
                    </div>
                  ) : (
                    <p className="text-base md:text-lg font-medium mb-1.5">
                      €{displayPrice.toFixed(2)}
                    </p>
                  )}
                  {!canPurchaseProduct && (hasVariants ? selectedVariantIndex >= 0 : true) && (
                    <p className="text-xs font-medium text-red-600 uppercase tracking-widest mt-1.5">Out of Stock</p>
                  )}
                  {shopProduct.productFields.membersOnly && !isMember && (
                    <p className="text-xs font-medium text-secondary-purple-rain/70 uppercase tracking-widest mt-1.5">
                      Members Only Product
                    </p>
                  )}
                </div>
              )}
              {product.content && getFirstParagraph(product.content) && (
                <div
                  className="max-w-[44ch] mt-4 text-left text-secondary-purple-rain text-xs md:text-sm prose prose-sm prose-purple prose-p:my-0"
                  dangerouslySetInnerHTML={{ __html: removeImagesFromContent(getFirstParagraph(product.content)) }}
                />
              )}
            </div>

            {/* Variant Selector + Add to Cart + Details — tight gap to accordion */}
            <div className="flex w-full flex-col items-start self-start gap-1">
              <div className="flex w-full flex-col items-start self-start gap-4">
                {hasVariants && variants.length > 1 && (
                  <ProductVariantSelector
                    variants={variants}
                    selectedVariantIndex={selectedVariantIndex}
                    onVariantChange={setSelectedVariantIndex}
                    hideLabel={false}
                  />
                )}
                <CheckoutButton
                  size="sm"
                  priceId={stripePriceId ?? ''}
                  productId={product.id}
                  productTitle={product.title}
                  productSlug={product.slug ?? ''}
                  disabled={!stripePriceId || !canPurchaseProduct}
                />
              </div>
              <ProductDetailsAccordion
                bodyHtml={product.content && getContentWithoutFirstParagraph(product.content) ? removeImagesFromContent(getContentWithoutFirstParagraph(product.content)) : ''}
                sku={product.productFields?.sku}
                variant="desktop"
              />
            </div>
          </div>
        </div>

        {/* Mobile layout — order: images, thumbnails, headline, price, first paragraph, variant, add to cart, details */}
        <div className="flex flex-col lg:hidden">
          <div className="m-auto flex flex-col items-center justify-center gap-6 pt-[var(--header-height,5rem)] text-center lg:gap-12 lg:pt-0">
            {/* 1. Mobile: images carousel */}
            {productImages.length > 0 && (
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
            )}

            {/* 2. Mobile: thumbnails */}
            {productImages.length > 0 && (
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
            )}

            {/* 3. Headline */}
            <div className="flex w-full max-w-[44ch] flex-col items-start self-start px-4 py-4 text-left lg:px-6">
              {shopProduct.productFields.membersOnly && (
                <span className="mb-3 block w-fit rounded-full bg-secondary-purple-rain px-4 py-2 text-sm font-light text-white font-body tracking-tight">
                  Members Only
                </span>
              )}
              <AnimatedHeadline
                as="h1"
                text={product.title}
                className="font-heading text-secondary-purple-rain text-4xl md:text-3xl lg:text-4xl xl:text-5xl font-normal tracking-tight !text-left"
                lineHeight={1.25}
                fullWidth
              />
            </div>

            {/* 4. Price */}
            {displayPrice > 0 && (
              <div className="w-full px-4 mb-2 text-secondary-purple-rain text-left self-start">
                {hasDiscount ? (
                  <div>
                    <p className="text-base md:text-lg font-medium mb-1.5">
                      <span className="text-green-600">€{displayPrice.toFixed(2)}</span>
                      <span className="text-sm font-normal ml-2 text-secondary-purple-rain/60 line-through">
                        €{publicPrice.toFixed(2)}
                      </span>
                    </p>
                    <p className="text-xs text-green-600 font-medium uppercase tracking-widest mb-1.5">
                      Member Discount!
                    </p>
                  </div>
                ) : (
                  <p className="text-base md:text-lg font-medium mb-1.5">
                    €{displayPrice.toFixed(2)}
                  </p>
                )}
                {!canPurchaseProduct && (hasVariants ? selectedVariantIndex >= 0 : true) && (
                  <p className="text-xs font-medium text-red-600 uppercase tracking-widest mt-1.5">Out of Stock</p>
                )}
                {shopProduct.productFields.membersOnly && !isMember && (
                  <p className="text-xs font-medium text-secondary-purple-rain/70 uppercase tracking-widest mt-1.5">
                    Members Only Product
                  </p>
                )}
              </div>
            )}

            {/* 5. First paragraph */}
            {product.content && getFirstParagraph(product.content) && (
              <div
                className="max-w-[44ch] w-full px-4 text-left text-secondary-current text-xs md:text-sm prose prose-sm prose-p:my-0 self-start"
                dangerouslySetInnerHTML={{ __html: removeImagesFromContent(getFirstParagraph(product.content)) }}
              />
            )}

            {/* 6. Variant overview (Size label) + 7. Variant pills + 8. Add to cart */}
            <div className="flex w-full flex-col items-start gap-4 px-4">
              {hasVariants && variants.length > 1 && (
                <ProductVariantSelector
                  variants={variants}
                  selectedVariantIndex={selectedVariantIndex}
                  onVariantChange={setSelectedVariantIndex}
                  hideLabel={false}
                />
              )}
              <CheckoutButton
                size="sm"
                priceId={stripePriceId ?? ''}
                productId={product.id}
                productTitle={product.title}
                productSlug={product.slug ?? ''}
                disabled={!stripePriceId || !canPurchaseProduct}
                className="w-full self-start"
              />
            </div>

            {/* 9. Product details accordion — same horizontal margins as button (px-4) */}
            <div className="w-full px-4">
              <ProductDetailsAccordion
                bodyHtml={product.content && getContentWithoutFirstParagraph(product.content) ? removeImagesFromContent(getContentWithoutFirstParagraph(product.content)) : ''}
                sku={product.productFields?.sku}
                variant="mobile"
              />
            </div>
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

/**
 * GalleryGrid.tsx
 * CSS grid of images with lazy loading and lightbox.
 * Used by StoryBlocksRenderer for story galleries (matches Stories/GalleryGrid pattern).
 */

import React, { useCallback, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import type { NormalizedImage } from '../lib/storyGalleries';

const DEFAULT_COLUMNS = 3;

export interface GalleryGridProps {
  images: NormalizedImage[];
  columns?: number;
  className?: string;
}

/** Resolve display URL: use CDN url; if CDN failed for this image, use original WordPress URL. */
function getDisplayUrl(img: NormalizedImage, fallbackIds: Set<string>): string {
  if (fallbackIds.has(img.id) && img.sourceUrl) return img.sourceUrl;
  return img.url;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({
  images,
  columns = DEFAULT_COLUMNS,
  className = '',
}) => {
  // Debug logging
  console.log('🖼️ Gallery images:', images.map((img) => ({
    id: img.id,
    url: img.url,
    sourceUrl: img.sourceUrl,
  })));

  const [isOpen, setIsOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [cdnFailedIds, setCdnFailedIds] = useState<Set<string>>(new Set());

  const handleImageError = useCallback((img: NormalizedImage) => {
    if (!img.sourceUrl) return;
    setCdnFailedIds((prev) => new Set(prev).add(img.id));
  }, []);

  const slides = images.map((img) => ({
    src: getDisplayUrl(img, cdnFailedIds),
    alt: img.alt,
  }));

  if (images.length === 0) return null;

  const colCount = Math.max(1, Math.min(columns, 6));
  
  // Use custom gallery-grid classes with !important to override any conflicting styles
  const gridColsClass = `gallery-grid-cols-${colCount}`;
  
  return (
    <div className={`mb-8 w-full ${className}`.trim()}>
      <div className={`gallery-grid ${gridColsClass}`}>
        {images.map((img, idx) => (
          <div
            key={img.id}
            className="relative cursor-pointer focus-within:ring-2 focus-within:ring-secondary-purple-rain focus-within:ring-offset-2 rounded overflow-hidden min-w-0"
            tabIndex={0}
            role="button"
            onClick={() => {
              setPhotoIndex(idx);
              setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setPhotoIndex(idx);
                setIsOpen(true);
              }
            }}
          >
            <img
              src={getDisplayUrl(img, cdnFailedIds)}
              alt={img.alt || ''}
              width={img.width}
              height={img.height}
              loading="lazy"
              className="w-full h-auto block transition-[filter] duration-300 ease-out hover:blur-[10px]"
              onError={() => handleImageError(img)}
            />
            {img.caption && (
              <p className="text-center mt-1.5 text-sm text-slate-500">{img.caption}</p>
            )}
          </div>
        ))}
      </div>

      {isOpen && (
        <Lightbox
          open={isOpen}
          close={() => setIsOpen(false)}
          index={photoIndex}
          slides={slides}
          on={{
            view: ({ index }) => setPhotoIndex(index),
          }}
        />
      )}
    </div>
  );
};

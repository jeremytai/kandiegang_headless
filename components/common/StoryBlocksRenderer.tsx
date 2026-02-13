/**
 * StoryBlocksRenderer.tsx
 * Renders normalized story blocks (paragraphs and galleries) from WordPress editor blocks.
 * Matches the Stories / GalleryGrid pattern: paragraph (dangerouslySetInnerHTML) and gallery (grid + lightbox).
 */

import React from 'react';
import type { NormalizedBlock } from '../lib/storyGalleries';
import { GalleryGrid } from './GalleryGrid';

export interface StoryBlocksRendererProps {
  blocks: NormalizedBlock[];
  /** Optional class for the container (e.g. prose). */
  className?: string;
}

export const StoryBlocksRenderer: React.FC<StoryBlocksRendererProps> = ({
  blocks,
  className = '',
}) => {
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.type === 'paragraph') {
          if (!block.content.trim()) return <React.Fragment key={i} />;
          return (
            <p
              key={i}
              className="mb-4 last:mb-0 text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          );
        }
        if (block.type === 'gallery') {
          return <GalleryGrid key={i} images={block.images} columns={block.columns ?? 3} />;
        }
        return null;
      })}
    </div>
  );
};

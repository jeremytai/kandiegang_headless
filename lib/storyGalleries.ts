/**
 * lib/storyGalleries.ts
 * Normalizes WordPress editor blocks (CoreParagraph, CoreImage, CoreGallery) into
 * a flat list of blocks for rendering. Use with the result of STORY_BLOCKS_QUERY.
 */

import { transformMediaUrl } from './wordpress';

/** Attributes from CoreParagraph block. */
export interface CoreParagraphAttributes {
  content?: string;
}

/** Attributes from CoreImage block (GraphQL fragment). */
export interface CoreImageAttributes {
  id: string | number;
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

/** Attributes from CoreGallery block (GraphQL fragment). */
export interface CoreGalleryAttributes {
  ids: (string | number)[];
  columns?: number;
}

/** Raw editor block as returned by StoryBlocks query. */
export type StoryEditorBlock =
  | { name: string; attributes?: CoreParagraphAttributes }
  | { name: string; attributes?: CoreImageAttributes }
  | { name: string; attributes?: CoreGalleryAttributes };

/** Normalized image shape used in gallery items. */
export interface NormalizedImage {
  id: string;
  url: string;
  alt: string;
  caption: string;
  width?: number;
  height?: number;
}

/** Normalized block: paragraph. */
export interface NormalizedParagraphBlock {
  type: 'paragraph';
  content: string;
}

/** Normalized block: gallery (standalone images or core/gallery). */
export interface NormalizedGalleryBlock {
  type: 'gallery';
  images: NormalizedImage[];
  columns?: number;
}

export type NormalizedBlock = NormalizedParagraphBlock | NormalizedGalleryBlock;

/** MediaItem node shape (from StoryBlocks mediaItems). */
export interface MediaItemNode {
  id: string;
  sourceUrl: string;
  altText?: string;
  caption?: string;
  mediaDetails?: {
    width?: number;
    height?: number;
  };
}

/**
 * Builds a map of attachment id -> NormalizedImage from mediaItems.nodes.
 * Pass the result as the second argument to normalizeBlocks when resolving core/gallery ids.
 * referenceImageUrl: optional post featured image URL; used to fix gallery paths that lack the 8-digit upload folder so they match the working path (e.g. S3 .../2025/11/10165246/filename.jpg).
 */
export function buildMediaMap(
  mediaItems: MediaItemNode[],
  referenceImageUrl?: string
): Record<string, NormalizedImage> {
  return Object.fromEntries(
    mediaItems.map((m) => [
      m.id,
      {
        id: m.id,
        url: transformMediaUrl(m.sourceUrl, referenceImageUrl),
        alt: m.altText ?? '',
        caption: m.caption ?? '',
        width: m.mediaDetails?.width,
        height: m.mediaDetails?.height,
      },
    ])
  );
}

/**
 * Normalizes editor blocks into a list of renderable blocks.
 * - core/paragraph -> { type: 'paragraph', content }
 * - Consecutive core/image blocks -> one { type: 'gallery', images }
 * - core/gallery -> { type: 'gallery', images } (resolved via mediaMap)
 * - Any other block flushes the current image buffer.
 */
export function normalizeBlocks(
  editorBlocks: StoryEditorBlock[],
  mediaMap: Record<string, NormalizedImage> = {}
): NormalizedBlock[] {
  const output: NormalizedBlock[] = [];
  let imageBuffer: NormalizedImage[] = [];

  const flushImages = (): void => {
    if (imageBuffer.length === 0) return;
    output.push({ type: 'gallery', images: imageBuffer, columns: 3 });
    imageBuffer = [];
  };

  for (const block of editorBlocks) {
    if (block.name === 'core/paragraph') {
      flushImages();
      const content = block.attributes && 'content' in block.attributes
        ? (block.attributes.content ?? '')
        : '';
      output.push({ type: 'paragraph', content });
      continue;
    }

    if (block.name === 'core/image' && block.attributes && 'id' in block.attributes) {
      const resolved = mediaMap[String(block.attributes.id)];
      if (resolved) {
        imageBuffer.push(resolved);
      } else if ('url' in block.attributes && block.attributes.url) {
        imageBuffer.push({
          id: String(block.attributes.id),
          url: transformMediaUrl(block.attributes.url),
          alt: block.attributes.alt ?? '',
          caption: block.attributes.caption ?? '',
          width: block.attributes.width,
          height: block.attributes.height,
        });
      }
      continue;
    }

    if (block.name === 'core/gallery' && block.attributes && 'ids' in block.attributes && block.attributes.ids?.length) {
      flushImages();
      const images = block.attributes.ids
        .map((id) => mediaMap[String(id)])
        .filter((m): m is NormalizedImage => Boolean(m));
      const columns = block.attributes.columns ?? 3;
      if (images.length > 0) output.push({ type: 'gallery', images, columns });
      continue;
    }

    flushImages();
  }

  flushImages();
  return output;
}

/** Response shape for STORY_BLOCKS_QUERY. */
export interface StoryBlocksData {
  post: {
    title: string;
    excerpt?: string;
    date?: string;
    uri?: string;
    featuredImage?: {
      node: {
        sourceUrl: string;
        altText?: string;
      };
    };
    editorBlocks: StoryEditorBlock[];
  } | null;
  mediaItems: {
    nodes: MediaItemNode[];
  };
}

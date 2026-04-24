/**
 * WordPress "Photo Gallery" category: stories in this category are only for
 * logged-in cycling club members or guides (see StoryPage + edge OG middleware).
 */
export const PHOTO_GALLERY_CATEGORY_SLUG = 'photo-gallery';

export function postHasPhotoGalleryCategory(
  post:
    | {
        categories?: { nodes: Array<{ slug?: string | null; name?: string | null }> } | null;
      }
    | null
    | undefined
): boolean {
  const nodes = post?.categories?.nodes ?? [];
  return nodes.some(
    (c) =>
      (typeof c.slug === 'string' && c.slug === PHOTO_GALLERY_CATEGORY_SLUG) ||
      (typeof c.name === 'string' && c.name.trim().toLowerCase() === 'photo gallery')
  );
}

/**
 * Helpers for build-optimized WebP images.
 * Build script (after vite build) converts dist/images/ to WebP + responsive widths.
 * In dev, public/ has originals (.jpg) so we use those; in prod we use .webp.
 */

export const IMAGE_WIDTHS = [400, 800, 1200] as const;

const isDev = import.meta.env.DEV;

/** Default src for an image. Use width for responsive variant (e.g. 400 for small avatars). In dev uses .jpg. */
export function imageSrc(basePath: string, width?: number): string {
  if (isDev) {
    return `${basePath}.jpg`;
  }
  if (width != null && (width === 400 || width === 800 || width === 1200)) {
    return `${basePath}-${width}w.webp`;
  }
  return `${basePath}.webp`;
}

/** srcset for responsive images. Empty in dev (only .jpg exists). */
export function imageSrcSet(basePath: string): string {
  if (isDev) return '';
  return IMAGE_WIDTHS.map((w) => `${basePath}-${w}w.webp ${w}w`).join(', ');
}

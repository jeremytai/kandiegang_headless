/**
 * Fetches ride guide featured images from WordPress and rotates through a shuffled list.
 */
import { useEffect, useMemo, useState } from 'react';
import { getRideGuides, transformMediaUrl } from '../lib/wordpress';

const PLACEHOLDER_IMAGE = '/images/guides/jeremy.jpg';
export const HOMEPAGE_GUIDE_ROTATE_MS = 3000;

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function useHomepageGuideImageRotation() {
  const [imageIndex, setImageIndex] = useState(0);
  const [guideImages, setGuideImages] = useState<string[]>([]);
  const shuffledImages = useMemo(
    () => (guideImages.length ? shuffle(guideImages) : []),
    [guideImages]
  );

  useEffect(() => {
    let cancelled = false;
    const fetchGuides = async () => {
      try {
        const wpGuides = await getRideGuides();
        if (cancelled) return;
        const images = wpGuides
          .map((g) =>
            g.featuredImage?.node?.sourceUrl
              ? transformMediaUrl(g.featuredImage.node.sourceUrl)
              : null
          )
          .filter((url): url is string => url !== null);
        setGuideImages(images.length ? images : [PLACEHOLDER_IMAGE]);
      } catch {
        setGuideImages([PLACEHOLDER_IMAGE]);
      }
    };
    fetchGuides();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (shuffledImages.length <= 1) return;
    const id = setInterval(() => {
      setImageIndex((i) => (i + 1) % shuffledImages.length);
    }, HOMEPAGE_GUIDE_ROTATE_MS);
    return () => clearInterval(id);
  }, [shuffledImages.length]);

  const currentImage =
    shuffledImages.length > 0
      ? shuffledImages[imageIndex % shuffledImages.length]
      : PLACEHOLDER_IMAGE;

  const guidesReady = guideImages.length > 0;

  return { currentImage, imageIndex, shuffledImages, guidesReady };
}

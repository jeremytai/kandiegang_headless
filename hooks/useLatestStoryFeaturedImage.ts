/**
 * Featured image URL for the newest story (same ordering as /stories).
 */
import { useEffect, useState } from 'react';
import { getStoriesPosts, transformMediaUrl } from '../lib/wordpress';

/** Static panel art when WP has no image or the request fails. */
export const STORIES_PANEL_FALLBACK_IMAGE =
  'https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2026/02/05074948/prettigoodride-scaled.jpg';

export function useLatestStoryFeaturedImage() {
  const [url, setUrl] = useState(STORIES_PANEL_FALLBACK_IMAGE);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const result = await getStoriesPosts(1);
        if (cancelled || !result?.nodes?.length) return;
        const src = result.nodes[0].featuredImage?.node?.sourceUrl;
        if (src) setUrl(transformMediaUrl(src));
      } catch {
        /* keep fallback */
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return url;
}

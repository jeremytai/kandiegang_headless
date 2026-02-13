import { useEffect } from 'react';

const DEFAULT_TITLE = 'Kandie Gang Cycling Club';
const DEFAULT_DESCRIPTION = 'Kandie Gang Cycling Club – community rides and stories.';

/**
 * Sets document title and meta description (and optional Open Graph tags) for the current page.
 * Restores default title and description on unmount so other routes are unaffected.
 */
export function usePageMeta(
  title: string,
  description?: string | null,
  ogImage?: string | null
): void {
  useEffect(() => {
    const descMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDescription = descMeta?.getAttribute('content') ?? '';

    document.title = title;
    if (description) {
      if (descMeta) {
        descMeta.setAttribute('content', description);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = description;
        document.head.appendChild(meta);
      }
    }

    const ogTags = [
      { property: 'og:title', content: title },
      ...(description ? [{ property: 'og:description', content: description }] : []),
      ...(ogImage ? [{ property: 'og:image', content: ogImage }] : []),
    ] as Array<{ property: string; content: string }>;

    const createdOg: HTMLMetaElement[] = [];
    for (const { property, content } of ogTags) {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
        createdOg.push(el);
      }
      el.setAttribute('content', content);
    }

    return () => {
      document.title = DEFAULT_TITLE;
      if (descMeta) {
        descMeta.setAttribute('content', prevDescription || DEFAULT_DESCRIPTION);
      }
      for (const el of createdOg) {
        el.remove();
      }
    };
  }, [title, description, ogImage]);
}

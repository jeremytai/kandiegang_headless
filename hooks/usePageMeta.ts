import { useEffect } from 'react';

type MetaPropertySnapshot = {
  el: HTMLMetaElement;
  prev: string | null;
  created: boolean;
};

/**
 * Sets document title, meta description, Open Graph, and Twitter Card tags.
 * When `pageUrl` is set, also updates og:url, twitter:url, and link[rel=canonical]
 * so link previews (Slack, iMessage, social) match event/story detail pages.
 * Restores previous head state on unmount.
 */
export function usePageMeta(
  title: string,
  description?: string | null,
  ogImage?: string | null,
  pageUrl?: string | null
): void {
  useEffect(() => {
    const propertySnapshots: MetaPropertySnapshot[] = [];

    function touchMetaProperty(property: string, value: string) {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      let created = false;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
        created = true;
      }
      const prev = el.getAttribute('content');
      el.setAttribute('content', value);
      propertySnapshots.push({ el, prev, created });
    }

    const prevTitle = document.title;
    document.title = title;

    const descMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDescContent = descMeta ? descMeta.getAttribute('content') : null;
    let createdDescMeta: HTMLMetaElement | null = null;

    if (description) {
      if (descMeta) {
        descMeta.setAttribute('content', description);
      } else {
        const m = document.createElement('meta');
        m.setAttribute('name', 'description');
        m.setAttribute('content', description);
        document.head.appendChild(m);
        createdDescMeta = m;
      }
    }

    touchMetaProperty('og:title', title);
    if (description) touchMetaProperty('og:description', description);
    if (ogImage) touchMetaProperty('og:image', ogImage);
    if (pageUrl) {
      touchMetaProperty('og:url', pageUrl);
      touchMetaProperty('twitter:url', pageUrl);
    }
    touchMetaProperty('twitter:title', title);
    if (description) touchMetaProperty('twitter:description', description);
    if (ogImage) {
      touchMetaProperty('twitter:image', ogImage);
      touchMetaProperty('twitter:card', 'summary_large_image');
    }

    let canonicalSnap: { el: HTMLLinkElement; prev: string | null; created: boolean } | undefined;
    if (pageUrl) {
      let le = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      const created = !le;
      if (!le) {
        le = document.createElement('link');
        le.rel = 'canonical';
        document.head.appendChild(le);
      }
      const prev = le.getAttribute('href');
      le.setAttribute('href', pageUrl);
      canonicalSnap = { el: le, prev, created };
    }

    return () => {
      document.title = prevTitle;

      if (description) {
        if (createdDescMeta) {
          createdDescMeta.remove();
        } else if (descMeta) {
          if (prevDescContent !== null) descMeta.setAttribute('content', prevDescContent);
          else descMeta.removeAttribute('content');
        }
      }

      for (const { el, prev, created } of propertySnapshots.reverse()) {
        if (created) el.remove();
        else if (prev !== null) el.setAttribute('content', prev);
        else el.removeAttribute('content');
      }

      if (canonicalSnap) {
        if (canonicalSnap.created) canonicalSnap.el.remove();
        else if (canonicalSnap.prev !== null) canonicalSnap.el.setAttribute('href', canonicalSnap.prev);
        else canonicalSnap.el.removeAttribute('href');
      }
    };
  }, [title, description, ogImage, pageUrl]);
}

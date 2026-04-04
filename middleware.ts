/**
 * Vercel Edge Middleware: for link-preview bots hitting /event/... or /story/:slug,
 * return HTML with Open Graph / Twitter meta from WordPress. The SPA still sets meta
 * in the browser via usePageMeta, but crawlers often do not run JS and would otherwise
 * only see index.html defaults.
 */
import { next } from '@vercel/functions';

const DEFAULT_OG_IMAGE =
  'https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2026/02/22071119/kandiegang_fb_opengraph.jpg';

const DEFAULT_DESCRIPTION =
  "Join Hamburg's most vibrant and inclusive cycling community. Group rides, events, and a safe space for FLINTA* and BIPOC cyclists.";

const EVENT_OG_QUERY = `
  query GetKandieEventOg($slug: ID!) {
    rideEvent(id: $slug, idType: SLUG) {
      title
      excerpt
      featuredImage {
        node {
          sourceUrl
        }
      }
      eventDetails {
        description
      }
    }
  }
`;

const STORY_OG_QUERY = `
  query GetStoryOg($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      title
      excerpt
      featuredImage {
        node {
          sourceUrl
        }
      }
      content
    }
  }
`;

export const config = {
  matcher: ['/event/:path*', '/story/:path*'],
};

type OgPayload = {
  title: string;
  description: string;
  image: string;
};

function getGraphqlUrl(): string | undefined {
  return process.env.WP_GRAPHQL_URL || process.env.VITE_WP_GRAPHQL_URL;
}

function normalizeMediaUrl(url: string): string {
  if (!url) return url;
  const domainMatch = url.match(/^https?:\/\/([^/]+)/);
  const domain = domainMatch ? domainMatch[1] : '';
  const isExternalCDN = /\.(s3\.|cloudfront\.|cdn\.|amazonaws\.com)/i.test(domain);
  const originalUrl = isExternalCDN
    ? url
    : url.replace(/-(\d+x\d+)\.(jpg|jpeg|png|gif|webp)$/i, '.$2');

  const mediaCdn = process.env.VITE_MEDIA_CDN_URL?.replace(/\/$/, '');
  if (!mediaCdn) return originalUrl;
  if (originalUrl.includes(mediaCdn)) return originalUrl;
  const kandie = /^https?:\/\/(www\.)?kandiegang\.com/;
  if (kandie.test(originalUrl)) {
    return originalUrl.replace(kandie, mediaCdn);
  }
  return originalUrl;
}

function isLinkPreviewBot(ua: string): boolean {
  const u = ua.toLowerCase();
  const bots = [
    'facebookexternalhit',
    'facebot',
    'twitterbot',
    'linkedinbot',
    'slackbot',
    'slack-imgproxy',
    'whatsapp',
    'telegrambot',
    'discordbot',
    'pinterestbot',
    'pinterest/',
    'applebot',
    'embedly',
    'iframely',
    'vkshare',
    'outbrain',
    'bitlybot',
    'skypeuripreview',
    'googlebot',
    'bingpreview',
    'bingbot',
    'duckduckbot',
    'yandex',
    'redditbot',
    'mastodon',
  ];
  return bots.some((b) => u.includes(b));
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

async function fetchEventOg(slug: string): Promise<OgPayload | null> {
  const endpoint = getGraphqlUrl();
  if (!endpoint) return null;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: EVENT_OG_QUERY,
      variables: { slug },
    }),
  });

  if (!res.ok) return null;

  const json = (await res.json()) as {
    errors?: unknown[];
    data?: {
      rideEvent?: {
        title?: string;
        excerpt?: string;
        featuredImage?: { node?: { sourceUrl?: string } };
        eventDetails?: { description?: string };
      };
    };
  };

  if (json.errors?.length) return null;

  const ev = json.data?.rideEvent;
  if (!ev?.title) return null;

  const excerpt = ev.excerpt?.trim();
  const descFirstLine = ev.eventDetails?.description?.split('\n')[0]?.trim() ?? '';
  const rawDesc = excerpt || descFirstLine || '';
  const description = truncate(
    stripHtml(rawDesc) || DEFAULT_DESCRIPTION,
    300
  );

  const imageRaw = ev.featuredImage?.node?.sourceUrl;
  const image = imageRaw ? normalizeMediaUrl(imageRaw) : DEFAULT_OG_IMAGE;

  return {
    title: `${ev.title} | Kandie Gang`,
    description,
    image,
  };
}

async function fetchStoryOg(slug: string): Promise<OgPayload | null> {
  const endpoint = getGraphqlUrl();
  if (!endpoint) return null;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: STORY_OG_QUERY,
      variables: { slug },
    }),
  });

  if (!res.ok) return null;

  const json = (await res.json()) as {
    errors?: unknown[];
    data?: {
      post?: {
        title?: string;
        excerpt?: string;
        content?: string;
        featuredImage?: { node?: { sourceUrl?: string } };
      };
    };
  };

  if (json.errors?.length) return null;

  const post = json.data?.post;
  if (!post?.title) return null;

  const excerptHtml = post.excerpt?.trim() ?? '';
  const fromExcerpt = stripHtml(excerptHtml);
  const fromContent = post.content
    ? stripHtml(post.content).replace(/\s+/g, ' ').trim()
    : '';
  const rawDesc = fromExcerpt || fromContent || '';
  const description = truncate(rawDesc || DEFAULT_DESCRIPTION, 300);

  const imageRaw = post.featuredImage?.node?.sourceUrl;
  const image = imageRaw ? normalizeMediaUrl(imageRaw) : DEFAULT_OG_IMAGE;

  return {
    title: `${post.title} | Kandie Gang`,
    description,
    image,
  };
}

function buildOgHtml(canonicalUrl: string, og: OgPayload): string {
  const title = escapeHtmlAttr(og.title);
  const description = escapeHtmlAttr(og.description);
  const image = escapeHtmlAttr(og.image);
  const url = escapeHtmlAttr(canonicalUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="Kandie Gang Cycling Club">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="en_US">
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${url}">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${description}">
  <meta property="twitter:image" content="${image}">
</head>
<body>
  <p><a href="${url}">${title}</a></p>
</body>
</html>`;
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  const parts = pathname.split('/').filter(Boolean);
  const ua = request.headers.get('user-agent') ?? '';

  if (parts[0] === 'story' && parts.length === 2) {
    const slug = parts[1];
    if (!slug || !isLinkPreviewBot(ua)) {
      return next();
    }

    const canonicalUrl = `${url.origin}${pathname}`;

    let og: OgPayload | null = null;
    try {
      og = await fetchStoryOg(slug);
    } catch {
      og = null;
    }

    if (!og) {
      og = {
        title: 'Story | Kandie Gang',
        description: DEFAULT_DESCRIPTION,
        image: DEFAULT_OG_IMAGE,
      };
    }

    const html = buildOgHtml(canonicalUrl, og);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      },
    });
  }

  if (parts[0] !== 'event') {
    return next();
  }
  if (parts[1] === 'cancel' || parts.length !== 5) {
    return next();
  }

  const slug = parts[4];
  if (!slug) {
    return next();
  }

  if (!isLinkPreviewBot(ua)) {
    return next();
  }

  const canonicalUrl = `${url.origin}${pathname}`;

  let og: OgPayload | null = null;
  try {
    og = await fetchEventOg(slug);
  } catch {
    og = null;
  }

  if (!og) {
    og = {
      title: 'Event | Kandie Gang',
      description: DEFAULT_DESCRIPTION,
      image: DEFAULT_OG_IMAGE,
    };
  }

  const html = buildOgHtml(canonicalUrl, og);
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  });
}

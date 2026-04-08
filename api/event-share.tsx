/**
 * Edge: PNG share card for events (Instagram-style 1080×1440), aligned with brand Figma template.
 * GET /api/event-share?slug=my-event-slug
 *
 * Fonts: public/fonts/ivy-ora/IvyOraDispLight.ttf + public/fonts/gt-planar/GTPlanarRegular.ttf
 * (IvyOra Disp Lt + GTPlanar). Falls back to .woff/.woff2 if TTF missing; CDN fallback if render fails.
 */
import { ImageResponse } from '@vercel/og';
import { formatShareDateTimeLine } from '../lib/eventShareFormat.js';

export const config = {
  runtime: 'edge',
};

const WIDTH = 1080;
const HEIGHT = 1440;

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style?: 'normal' | 'italic';
};

type FontSet = {
  headlineFamily: string;
  bodyFamily: string;
  headlineWeight: 400 | 700;
  defs: OgFont[];
};

const WP_GRAPHQL_URL =
  process.env.VITE_WP_GRAPHQL_URL ||
  process.env.WP_GRAPHQL_URL ||
  'https://wp-origin.kandiegang.com/graphql';

const GET_EVENT_SHARE_QUERY = `
  query GetKandieEventShare($slug: ID!) {
    rideEvent(id: $slug, idType: SLUG) {
      title
      featuredImage {
        node {
          sourceUrl
        }
      }
      eventDetails {
        eventDate
        rideTime
        workshopStartTime
      }
    }
  }
`;

/** Matches public/fonts/fonts.css family names; primary files are TTF. */
const IVY_ORA_PATHS = [
  '/fonts/ivy-ora/IvyOraDispLight.ttf',
  '/fonts/ivy-ora/IvyOraDispLight.woff',
  '/fonts/ivy-ora/IvyOraDispLight.woff2',
];
const GT_PLANAR_PATHS = [
  '/fonts/gt-planar/GTPlanarRegular.ttf',
  '/fonts/gt-planar/GTPlanarRegular.woff',
  '/fonts/gt-planar/GTPlanarRegular.woff2',
];

/** Cycling club SVG logo — fetch from origin, encode as data URI for Satori */
async function loadLogoDataUri(origin: string): Promise<string> {
  try {
    const res = await fetch(`${origin}/logos/kandiegang_cyclingclub_logo_breath.svg`);
    if (res.ok) {
      const text = await res.text();
      const b64 = btoa(unescape(encodeURIComponent(text)));
      return `data:image/svg+xml;base64,${b64}`;
    }
  } catch {
    // fall through to PNG fallback
  }
  // PNG fallback: logo_blush.png (cream-coloured, transparent bg)
  return `${origin}/logos/logo_blush.png`;
}

function transformMediaUrlServer(url: string): string {
  if (!url) return url;
  const MEDIA_CDN_BASE = (process.env.VITE_MEDIA_CDN_URL || '').replace(/\/$/, '');
  const originalUrl = url.replace(/-(\d+x\d+)\.(jpg|jpeg|png|gif|webp)$/i, '.$2');
  if (!MEDIA_CDN_BASE) return originalUrl;
  if (originalUrl.includes(MEDIA_CDN_BASE)) return originalUrl;
  if (/^https?:\/\/(www\.)?kandiegang\.com/.test(originalUrl)) {
    return originalUrl.replace(/^https?:\/\/(www\.)?kandiegang\.com/, MEDIA_CDN_BASE);
  }
  return originalUrl;
}

async function fetchRideEvent(slug: string) {
  const res = await fetch(WP_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GET_EVENT_SHARE_QUERY, variables: { slug } }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: {
      rideEvent?: {
        title: string;
        featuredImage?: { node?: { sourceUrl?: string } };
        eventDetails?: {
          eventDate?: string;
          rideTime?: string;
          workshopStartTime?: string;
        };
      } | null;
    };
    errors?: unknown[];
  };
  if (json.errors?.length) return null;
  return json.data?.rideEvent ?? null;
}

async function fetchFirstOkBuffer(origin: string, paths: string[]): Promise<ArrayBuffer | null> {
  for (const p of paths) {
    const res = await fetch(`${origin}${p}`);
    if (res.ok) return res.arrayBuffer();
  }
  return null;
}

/** Brand fonts from this deployment (paths under public/fonts). */
async function loadBrandFontsFromSite(request: Request): Promise<FontSet | null> {
  const origin = new URL(request.url).origin;
  const [ivyBuf, gtBuf] = await Promise.all([
    fetchFirstOkBuffer(origin, IVY_ORA_PATHS),
    fetchFirstOkBuffer(origin, GT_PLANAR_PATHS),
  ]);
  if (!ivyBuf || !gtBuf) return null;
  return {
    headlineFamily: 'IvyOra Disp Lt',
    bodyFamily: 'GTPlanar',
    headlineWeight: 400,
    defs: [
      { name: 'IvyOra Disp Lt', data: ivyBuf, weight: 400, style: 'normal' },
      { name: 'GTPlanar', data: gtBuf, weight: 400, style: 'normal' },
    ],
  };
}

/** Last resort if local fonts missing or WOFF2 cannot be parsed by Satori. */
async function loadFallbackFonts(): Promise<FontSet> {
  const [loraBuf, interBuf] = await Promise.all([
    fetch('https://cdn.jsdelivr.net/npm/@fontsource/lora@5.2.6/files/lora-latin-700-normal.woff').then(
      (r) => r.arrayBuffer()
    ),
    fetch('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.2.6/files/inter-latin-400-normal.woff').then(
      (r) => r.arrayBuffer()
    ),
  ]);
  return {
    headlineFamily: 'Lora',
    bodyFamily: 'Inter',
    headlineWeight: 700,
    defs: [
      { name: 'Lora', data: loraBuf, weight: 700, style: 'normal' },
      { name: 'Inter', data: interBuf, weight: 400, style: 'normal' },
    ],
  };
}

// Logo natural aspect ratio: 253 × 145 ≈ 1.745 : 1
const LOGO_W = 420;
const LOGO_H = Math.round(420 / (253 / 145)); // ≈ 241

function shareCardElement(args: {
  heroUrl: string | null;
  logoUrl: string;
  dateTimeLine: string;
  title: string;
  titleFontSize: number;
  headlineFont: string;
  bodyFont: string;
  headlineWeight: 400 | 700;
}) {
  const { heroUrl, logoUrl, dateTimeLine, title, titleFontSize, headlineFont, bodyFont, headlineWeight } =
    args;

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background: '#1B1F3B',
      }}
    >
      {/* Hero image full-bleed */}
      {heroUrl ? (
        <img
          src={heroUrl}
          alt=""
          width={WIDTH}
          height={HEIGHT}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: WIDTH,
            height: HEIGHT,
            objectFit: 'cover',
          }}
        />
      ) : null}

      {/* Dark vignette — heavier at top and bottom */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.10) 38%, rgba(0,0,0,0.72) 100%)',
        }}
      />

      {/* Content layer */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          alignItems: 'center',
          width: '100%',
          paddingTop: 72,
          paddingBottom: 0,
        }}
      >
        {/* Cycling club logo — no pill, transparent bg, displayed at full natural ratio */}
        <img
          src={logoUrl}
          alt="Kandie Gang Cycling Club"
          width={LOGO_W}
          height={LOGO_H}
          style={{ objectFit: 'contain' }}
        />

        <div style={{ flex: 1 }} />

        {/* Bottom info panel */}
        <div
          style={{
            width: '100%',
            background: 'rgba(27, 31, 59, 0.88)',
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            padding: '48px 56px 64px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          {dateTimeLine ? (
            <span
              style={{
                fontSize: 30,
                color: '#F2ADAA',
                fontFamily: bodyFont,
                textAlign: 'center',
                letterSpacing: 0.5,
              }}
            >
              {dateTimeLine}
            </span>
          ) : null}
          <span
            style={{
              fontSize: titleFontSize,
              color: '#FDF9F0',
              fontFamily: headlineFont,
              fontWeight: headlineWeight,
              textAlign: 'center',
              lineHeight: 1.15,
              textTransform: 'capitalize',
              maxWidth: 940,
            }}
          >
            {title}
          </span>
          {/* Subtle URL line */}
          <span
            style={{
              fontSize: 22,
              color: 'rgba(253,249,240,0.55)',
              fontFamily: bodyFont,
              marginTop: 8,
            }}
          >
            kandiegang.com
          </span>
        </div>
      </div>
    </div>
  );
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug')?.trim();
  if (!slug) {
    return new Response('Missing slug', { status: 400 });
  }

  const event = await fetchRideEvent(slug);
  if (!event?.title) {
    return new Response('Event not found', { status: 404 });
  }

  const title = event.title;
  const rawImg = event.featuredImage?.node?.sourceUrl;
  const heroUrl = rawImg ? transformMediaUrlServer(rawImg) : null;
  const details = event.eventDetails ?? {};
  const eventDate = details.eventDate || '';
  const dateTimeLine = formatShareDateTimeLine(eventDate, details);

  const [logoUrl, brandFonts] = await Promise.all([
    loadLogoDataUri(url.origin),
    loadBrandFontsFromSite(request),
  ]);

  const titleFontSize = title.length > 48 ? 44 : title.length > 32 ? 50 : 56;
  const primary = brandFonts ?? (await loadFallbackFonts());

  const cardBase = {
    heroUrl,
    logoUrl,
    dateTimeLine,
    title,
    titleFontSize,
    headlineFont: primary.headlineFamily,
    bodyFont: primary.bodyFamily,
    headlineWeight: primary.headlineWeight,
  };

  const headers = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
  };

  try {
    return new ImageResponse(shareCardElement(cardBase), {
      width: WIDTH,
      height: HEIGHT,
      fonts: primary.defs,
      headers,
    });
  } catch (err) {
    console.error('[event-share] ImageResponse failed', err);
    if (brandFonts) {
      const fb = await loadFallbackFonts();
      return new ImageResponse(
        shareCardElement({
          ...cardBase,
          headlineFont: fb.headlineFamily,
          bodyFont: fb.bodyFamily,
          headlineWeight: fb.headlineWeight,
        }),
        { width: WIDTH, height: HEIGHT, fonts: fb.defs, headers }
      );
    }
    throw err;
  }
}

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

/** Figma “Instagram Post” (493:2919): logo frame 253×145px */
const LOGO_W = 253;
const LOGO_H = 145;

/** Inset event block width from Figma (subtract group ~784px) */
const PANEL_W = 784;

/** Black link icon ~24px, matches Figma link-01 on cream pill */
const LINK_ICON_DATA_URI =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path stroke="#1F2223" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path stroke="#1F2223" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`
  );

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

      {/* Figma: gradient from-black ~80% opacity at top, fade to clear (multiply feel) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.35) 28%, rgba(0,0,0,0.08) 48%, rgba(0,0,0,0.45) 100%)',
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
          paddingTop: 56,
          paddingBottom: 0,
        }}
      >
        <img
          src={logoUrl}
          alt="Kandie Gang Cycling Club"
          width={LOGO_W}
          height={LOGO_H}
          style={{ objectFit: 'contain' }}
        />

        <div style={{ flex: 1, minHeight: 32 }} />

        {/* Cream URL pill — above blue panel (Figma 493:2901) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: '#FDF9F0',
            border: '1px solid #FDF9F0',
            borderRadius: 20,
            height: 44,
            minWidth: 382,
            padding: '0 40px',
            marginBottom: -14,
            zIndex: 1,
            boxShadow: '0px 4px 4px 2px rgba(0,0,0,0.04)',
          }}
        >
          <img src={LINK_ICON_DATA_URI} alt="" width={24} height={24} style={{ flexShrink: 0 }} />
          <span
            style={{
              fontSize: 21,
              color: '#1F2223',
              fontFamily: bodyFont,
              textAlign: 'center',
            }}
          >
            www.kandiegang.com
          </span>
        </div>

        {/* Inset blue panel + rounded top (Figma subtract / event block) */}
        <div
          style={{
            width: PANEL_W,
            background: '#46519C',
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            padding: '52px 48px 60px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 22,
          }}
        >
          {dateTimeLine ? (
            <span
              style={{
                fontSize: 30,
                color: '#F2ADAA',
                fontFamily: bodyFont,
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              {dateTimeLine}
            </span>
          ) : null}
          <span
            style={{
              fontSize: titleFontSize,
              color: '#FFFFFF',
              fontFamily: headlineFont,
              fontWeight: headlineWeight,
              textAlign: 'center',
              lineHeight: 1.12,
              textTransform: 'capitalize',
              maxWidth: PANEL_W - 80,
            }}
          >
            {title}
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

  /** Figma headline ~76px IvyOra Light; scale down for long titles (panel max ~696px) */
  const titleFontSize =
    title.length > 52 ? 48 : title.length > 40 ? 58 : title.length > 32 ? 68 : 76;
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

# Kandie Gang Headless WordPress

A high-fidelity replication of the experimental UI and interactions from Kandie Gang, built as a headless WordPress frontend. This project focuses on high-quality animations, smooth scroll-driven effects, and a premium "mundane made magic" aesthetic, powered by a type-safe WordPress GraphQL bridge.

## ✨ Features

- **🎨 Premium UI/UX**: High-fidelity animations with Framer Motion and GSAP, scroll-driven effects, and glassmorphic design elements
- **📝 Headless WordPress**: Type-safe GraphQL integration for dynamic content management
- **🌐 Multi-Page Routing**: Landing, About, Community, Stories (Journal), Contact, and Fonts showcase pages
- **🌤️ Real-Time Weather**: Location from IP (ipapi.co, CORS-enabled), current conditions from Open-Meteo, and cycling outfit suggestions based on temp and condition
- **📱 Fully Responsive**: Mobile-first design with Tailwind CSS
- **📬 Newsletter (Substack)**: Signup modal embeds your Substack publication’s form; optional env var
- **⚡ Performance Optimized**: Build-time WebP conversion and responsive image widths (Sharp), query caching, retry logic
- **🎭 Advanced Animations**: Animated headline (split-type char reveal + color fill), spring physics, scroll progress tracking
- **🔐 Site password**: Optional full-screen gate after the preloader; unlock persists for the session (sessionStorage)

## 🚀 Tech Stack

- **React 19**: Modern functional components and hooks
- **TypeScript**: Type-safe development with full type coverage
- **Vite**: Lightning-fast build tool and dev server
- **React Router DOM 7**: Client-side routing with modern API
- **Tailwind CSS**: Utility-first styling for responsive design
- **Framer Motion**: Scroll-driven effects, spring physics, shared layout transitions
- **GSAP + SplitType**: Animated headline (character reveal, color fill: grey → signal yellow → headline color)
- **Lucide React**: Clean, consistent iconography
- **Sharp** (dev): Build-time image optimization — convert JPG/PNG to WebP and generate responsive widths (400, 800, 1200)
- **Open-Meteo + ipapi.co**: Real-time weather and geolocation for the weather status bar (no API keys; ipapi.co is CORS-enabled for browser use)
- **WordPress GraphQL**: Headless CMS integration via WPGraphQL

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- A WordPress site with WPGraphQL plugin installed (optional - demo endpoint available)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kandiegang_headless
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your configuration:
   ```env
   # WordPress GraphQL Endpoint
   VITE_WP_GRAPHQL_URL=https://your-wordpress-site.com/graphql
   
   # Substack newsletter publication URL (optional)
   # Your Substack publication base URL (e.g. https://yoursubstack.substack.com)
   VITE_SUBSTACK_PUBLICATION=https://yoursubstack.substack.com
   
   # Formspree contact form ID (optional – for /contact and Contact modal)
   VITE_FORMSPREE_CONTACT_FORM_ID=your_formspree_form_id
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## 🏗️ Project Structure

```text
kandiegang_headless/
├── components/          # Reusable UI components
│   ├── AboutHero.tsx
│   ├── AdaptationGrid.tsx
│   ├── AnimatedHeadline.tsx   # Split-type char reveal + color fill (GSAP)
│   ├── CompanySection.tsx
│   ├── ContactForm.tsx         # Formspree contact form (honeypot spam protection)
│   ├── ContactModal.tsx        # Modal with ContactForm (e.g. from About "Contact us")
│   ├── ExpandingHero.tsx
│   ├── FAQSection.tsx
│   ├── FloatingClubMemberBar.tsx
│   ├── Footer.tsx
│   ├── NewsletterSection.tsx   # Newsletter bar + Subscribe (opens NewsletterModal)
│   ├── NewsletterModal.tsx     # Substack embed signup form
│   ├── HomepageRotatingHeadline.tsx
│   ├── HorizontalRevealSection.tsx
│   ├── ImageMarquee.tsx
│   ├── Preloader.tsx
│   ├── PasswordGate.tsx      # Password gate after preloader (session unlock)
│   ├── ScrollingHeadline.tsx
│   ├── StickyBottom.tsx
│   ├── StickyTop.tsx
│   └── WeatherStatusBackground.tsx   # Weather bar: ipapi.co + Open-Meteo, outfit suggestions
├── pages/              # Page components
│   ├── AboutPage.tsx
│   ├── CommunityPage.tsx
│   ├── StoriesPage.tsx
│   └── FontsPage.tsx   # Typography showcase
├── lib/                # Utility libraries
│   ├── wordpress.ts    # WordPress GraphQL bridge
│   └── images.ts       # WebP / responsive image helpers (imageSrc, imageSrcSet)
├── hooks/              # Custom React hooks
│   └── useScrollThreshold.ts
├── scripts/
│   └── optimize-images.js   # Build: convert public/images to WebP + 400/800/1200w in dist
├── public/             # Static assets (copied to dist; images optimized at build)
│   ├── fonts/          # IvyOra Display, GTPlanar (see public/fonts/fonts.css)
│   └── images/         # Source images (JPG/PNG); build outputs WebP to dist
│       └── guides/     # Guide photos used in HomepageRotatingHeadline and CompanySection
├── App.tsx             # Main application component
├── index.tsx           # Application entry point
├── vite.config.ts      # Vite configuration
└── tsconfig.json       # TypeScript configuration
```

## 📂 Component Documentation

### Core Interactive Sections

- **`HomepageRotatingHeadline.tsx`**: Hero headline "You found us [photo]!" with `AnimatedHeadline` (char reveal + color fill) and rotating guide photos from `public/images/guides`.
- **`AnimatedHeadline.tsx`**: Reusable headline with SplitType (lines/words/chars) and GSAP: chars slide up on scroll, then color animates light grey → signal yellow → headline purple. Use `imageSrc` / `imageSrcSet` from `lib/images` for WebP and responsive widths.
- **`ExpandingHero.tsx`**: Hero section that expands from a rounded card to full-width using `clip-path` and `inset` based on scroll progress; uses responsive WebP via `lib/images`.
- **`HorizontalRevealSection.tsx`**: Horizontal scrolling gallery that pins to the screen, with a segmented navigation pill for the active section.
- **`ScrollingHeadline.tsx`**: Assembly animation where words ("Mundane made magic") fly into place as the user scrolls.
- **`CompanySection.tsx`**: "Your Guides" with TeamLink: profile images (from `public/images/guides`) spring into view and follow the cursor on hover. Guide names are derived from filenames—**first name only**, i.e. the part before the first underscore (e.g. `katrin_h.jpg` → "Katrin"; `jeremy.jpg` → "Jeremy"). Pills use secondary colors (Purple Rain, Current, Drift, Blush, Signal) with white text; on Signal (yellow) pills, text uses Current or Purple Rain for contrast. Guides are displayed in **random order** (shuffled once on mount).
- **`AboutHero.tsx`**: Immersive hero section with video background for the About page.
- **`AdaptationGrid.tsx`**: Showcases real-world autonomous tasks in a grid layout.
- **`FAQSection.tsx`**: Expandable FAQ section with smooth animations.
- **`NewsletterSection.tsx`**: Newsletter signup bar (“Get the latest in your inbox” / “Sign up to our newsletter”) with a Subscribe button; opens `NewsletterModal`.
- **`NewsletterModal.tsx`**: Centered modal that embeds your Substack publication’s signup form in an iframe when `VITE_SUBSTACK_PUBLICATION` is set. Includes a link to open the subscribe page in a new tab.

### UI Utilities

- **`StickyTop.tsx` / `StickyBottom.tsx`**: Glassmorphic floating containers that house primary navigation. They feature "scroll out" logic to disappear when the user moves deep into the page.
- **`FloatingClubMemberBar.tsx`**: A call-to-action pill visible on page load that gracefully exits as the user scrolls past the hero.
- **`Preloader.tsx`**: Loading animation that displays on initial page load.
- **`PasswordGate.tsx`**: Full-screen password gate shown after the preloader and before the site. Correct password unlocks the site; the unlock is stored in `sessionStorage` for the current tab/session so reloads skip the gate. Password is configured in the component (see [Site password](#-site-password) below).
- **`Footer.tsx`**: Site footer with navigation and links.
- **`ImageMarquee.tsx`**: Infinite scrolling image gallery.
- **`WeatherStatusBackground.tsx`**: Fixed yellow background on the landing page showing date (location timezone), location (from IP via ipapi.co), temperature and condition (Open-Meteo), and cycling outfit suggestion. Location defaults to Hamburg if IP lookup fails. No API keys required. Uses ipapi.co because it supports CORS; ip-api.com returns 403 for browser requests.

### Pages

- **`AboutPage.tsx`**: Editorial-style page with WordPress integration, featuring company vision, investor showcase, and careers CTA.
- **`CommunityPage.tsx`**: Technical deep-dive into AI and hardware technology, with WordPress content integration.
- **`StoriesPage.tsx`**: Journal/blog page that fetches posts from WordPress via GraphQL with fallback content.
- **`FontsPage.tsx`**: Comprehensive typography showcase displaying all font families, weights, styles, character sets, and usage examples.

## 🔌 Headless WordPress Integration

The project includes a robust WordPress GraphQL bridge (`lib/wordpress.ts`) with the following features:

### Features

- **Type-Safe Queries**: Full TypeScript support for WordPress data structures
- **Query Caching**: In-memory cache with 5-minute TTL for performance
- **Retry Logic**: Automatic retry with exponential backoff for network errors
- **Error Handling**: Comprehensive error handling with fallback content
- **Optimized Queries**: Efficient GraphQL queries that request only necessary data

### Usage

```typescript
import { wpQuery, getPageBySlug, getPostBySlug, GET_POSTS_QUERY } from './lib/wordpress';

// Fetch a page by slug
const page = await getPageBySlug('about');

// Fetch a post by slug
const post = await getPostBySlug('my-post');

// Custom GraphQL query
const data = await wpQuery<{ posts: { nodes: WPPost[] } }>(
  GET_POSTS_QUERY,
  { first: 10 },
  { useCache: true, retries: 2 }
);
```

### WordPress Setup

1. **Install WPGraphQL** on your WordPress site: [WPGraphQL plugin](https://www.wpgraphql.com/). Optionally add [WPGraphQL for ACF](https://www.wpgraphql.com/extensions/wpgraphql-for-acf/) if you use Advanced Custom Fields later.
2. **Set the env var**: In `.env` (copy from `.env.example`), set `VITE_WP_GRAPHQL_URL` to your GraphQL endpoint (e.g. `https://your-wordpress-site.com/graphql`). If unset, the app uses the fallback in `lib/wordpress.ts` (e.g. `https://wp-origin.kandiegang.com/graphql`).
3. **CORS**: Your WordPress site must allow your frontend origin (e.g. `http://localhost:3000`, or `https://www.kandiegang.com` in production) in CORS so the browser can call the GraphQL API. Use your host’s CORS settings or a plugin that allows the GraphQL endpoint for your origin.
4. **Validate**: Run the app and open `/stories` and a `/story/:slug`; posts should load. If you see “Unable to connect to WordPress” or “Showing archived content”, check the URL and CORS.
5. **Media CDN (optional)**: If you set `VITE_MEDIA_CDN_URL` so story images are served from S3, make the AWS bucket public. Example public image URL: `https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/11/10172203/251031_halloween_gravelo_abbett-72-scaled.jpg`

#### Stories not loading in production

If `/stories` shows “Unable to connect to WordPress” or only archived/fallback content:

1. **Set `VITE_WP_GRAPHQL_URL` in your hosting dashboard** (Vercel, Netlify, etc.). Vite bakes env vars at **build time**; add `VITE_WP_GRAPHQL_URL` with your real WordPress GraphQL URL (e.g. `https://wp-origin.kandiegang.com/graphql`), then **redeploy**.
2. **CORS**: The WordPress server must send `Access-Control-Allow-Origin` including your production origin (e.g. `https://www.kandiegang.com`). Otherwise the browser blocks the GraphQL response.
3. **Check the endpoint**: In a new tab, open your GraphQL URL; you should see a GraphQL playground or a “GraphQL” response. If the domain or path is wrong, fix `VITE_WP_GRAPHQL_URL` and redeploy.

## 📬 Newsletter (Substack)

The newsletter signup on the landing page (after the FAQ) embeds your **Substack** publication’s signup form in a modal. No backend is required.

### Substack setup

1. Create or use an existing **Substack** publication (e.g. `https://yoursubstack.substack.com`).
2. In your project root, add to `.env` or `.env.local`:
   ```env
   VITE_SUBSTACK_PUBLICATION=https://yoursubstack.substack.com
   ```
3. Restart the dev server so the new env var is picked up.

The modal embeds Substack’s signup form via iframe (`/embed`). Users can subscribe without leaving your site. A link to “Open subscribe page in new tab” is also shown. If `VITE_SUBSTACK_PUBLICATION` is not set, the modal shows instructions to set the env var.

## 📧 Contact form (Formspree)

The contact form on the **Contact** page (`/contact`) and in the **Contact modal** (opened from the About page "Contact us" button) is powered by [Formspree](https://formspree.io). No backend is required. Spam is reduced with a honeypot field (`_gotcha`); Formspree ignores submissions where the honeypot is filled.

### Contact form setup

1. Create a form at [formspree.io](https://formspree.io) and copy the form ID (the value after `/f/` in your form endpoint, e.g. `xyzabcde`).
2. In your project root, add to `.env` or `.env.local`:
   ```env
   VITE_FORMSPREE_CONTACT_FORM_ID=your_formspree_form_id
   ```
3. **Enable AJAX submissions**: This app submits the form via JavaScript (no redirect). In your [Formspree form settings](https://formspree.io/forms), either **disable reCAPTCHA** for that form, or add your own **reCAPTCHA keys** (v3). Otherwise submissions will return 403 with: *"In order to submit via AJAX, you need to set a custom key or reCAPTCHA must be disabled."*
4. Restart the dev server so the new env var is picked up.

The shared `ContactForm` component (`components/ContactForm.tsx`) is used on both the Contact page and inside `ContactModal`. If `VITE_FORMSPREE_CONTACT_FORM_ID` is not set, the form area shows instructions to set the env var. On submit errors, the form displays Formspree’s error message when available. For stronger spam protection after enabling AJAX, you can add reCAPTCHA v3 or Turnstile in your Formspree dashboard.

## 👤 Members area & Supabase profiles

The **Members area** (`/members`) and member login (StickyTop, offcanvas) use **Supabase Auth** and a **`profiles`** table. Profiles store membership status, plan names, and whether the user is a **Kandie Gang Guide**.

### What the app uses

- **Auth**: Email/password, magic link, or Discord OAuth. Session and user come from Supabase Auth.
- **Profile** (table `public.profiles`): One row per user (`profiles.id = auth.users.id`). The app reads:
  - `is_member`, `membership_source`, `membership_plans` (array, e.g. `["Kandie Gang Cycling Club Membership"]`), `member_since`, `membership_expiration`
  - **`is_guide`**: Boolean; marks the user as a Kandie Gang Guide (can be set manually or synced from WordPress role).
- **Display**: Users can be both **Kandie Gang Cycling Member** (from a plan name containing "cycling" + "member"/"membership") and **Kandie Gang Guide** (from `is_guide` or a plan name containing "guide"). The Members page and account panel show both when applicable.

### Env vars

In `.env` or your host's config, set:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon (public) key

Service role key is only for scripts (e.g. CSV sync), not the frontend.

### Syncing membership

- **WooCommerce Memberships CSV**: Run `node scripts/sync-membership-csv-to-profiles.js [path-to-memberships.csv]` to set `is_member`, `membership_plans`, `member_since`, `membership_expiration` from the export. The script aggregates multiple active plans per user (e.g. Cycling Club + Guide if both appear in the CSV). Requires `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- **WordPress bridge**: On login/refresh, the app can update `is_member` and `membership_source` from WordPress; if the user's WP role slug contains "guide", `is_guide` is set to `true` in Supabase (see `context/AuthContext.tsx`). Set `membership_source` to `supabase` when Supabase is the source of truth so the app doesn't overwrite manual changes.

### Manual profile updates

To set someone as a member or Guide in Supabase (e.g. manual grant or no CSV): use the **Table Editor** or SQL in the Supabase Dashboard. Set `is_member`, `membership_plans`, and/or **`is_guide`** as needed; when you want Supabase to be the source of truth, set **`membership_source = 'supabase'`**. Full steps and field descriptions: **`supabase/MANUAL_PROFILE_UPDATES.md`**.

### Migrations

Schema changes live in `supabase/migrations/`. Apply with `supabase db push` (CLI) or run the SQL in the Supabase Dashboard → SQL Editor. The **`is_guide`** column was added in `20250206140000_add_is_guide_to_profiles.sql`.

## 🔐 Site password

The site can be protected with a full-screen password gate. It appears **after** the preloader finishes and **before** the homepage (or any other page) is shown.

### Flow

1. **Preloader** runs (glyphs, progress, “Let’s GOOOO!”).
2. Preloader exits → **password gate** appears (same purple background, “Enter password”).
3. User enters the correct password and submits → gate fades out → site loads.
4. Unlock is stored in **sessionStorage** for the current tab: reloads in the same tab skip the gate; a new tab or new session will see preloader then gate again.

### Configuration

- The password is set in `components/PasswordGate.tsx` (constant `SITE_PASSWORD`). The current value is **`letsgo!`**.
- To change or remove the gate, edit `PasswordGate.tsx` (e.g. change the constant or remove the gate from `App.tsx`).

This is a simple client-side lock suitable for soft launch or previews; it is not a substitute for server-side access control.

### Discord notifications

You can send each contact form submission to a Discord channel using [Formspree’s Discord plugin](https://help.formspree.io/hc/en-us/articles/1500002137941-Send-Discord-notifications) (Personal, Professional, Business plans).

1. **Create a Discord webhook**
   - In Discord: right‑click your server → **Server Settings** → **Integrations** (you need server owner or integration permissions).
   - Click **Create Webhook**, choose the channel, set name/avatar (e.g. “Formspree” and [Formspree logo](https://formspree.io/static/img/logo.png)), then **Copy Webhook URL**.

2. **Connect in Formspree**
   - Open your form in the [Formspree dashboard](https://formspree.io/forms) → **Plugins** tab.
   - Click the **Discord** plugin, paste the webhook URL, and click **Connect**. Formspree will send a test message to confirm.

Submissions will appear as messages in that channel. The contact form already sends a hidden `_subject` field (“New contact form submission”), which Formspree uses to set the subject/title of the Discord message. To change the channel later, disconnect the plugin and reconnect with a different webhook.

## 🛠️ Development

### Available Scripts

- `npm run dev`: Start the development server (port 3000)
- `npm run build`: Build for production
- `npm run preview`: Preview the production build locally

### Best Practices & Implementation

1. **Scroll Progress**: Most animations use `scrollYProgress` from Framer Motion's `useScroll` hook. For best performance, use `useTransform` to map scroll values to style properties.

2. **Spring Physics**: Use `useSpring` to wrap raw scroll progress or mouse coordinates. This eliminates jitter and adds a characteristic "Kandie Gang" smoothness.

3. **Clip Path**: The `ExpandingHero` uses a dynamic `clip-path` with `inset()`. This is more performant than animating `width`/`height` and allows for complex masking.

4. **Pointer Events**: Ensure floating elements use `pointer-events-none` on the wrapper and `pointer-events-auto` on the children to avoid blocking interactions with the content beneath.

5. **WordPress Queries**: Always use the caching mechanism for WordPress queries unless you need fresh data. The cache automatically expires after 5 minutes.

6. **Error Handling**: Implement graceful fallbacks when WordPress content is unavailable. The app includes fallback content for all WordPress-dependent pages.

## 🎨 Design System

### Typography

The project uses IvyOra Display for headings and GTPlanar for body text (all normal weight; headings are not bold):

- **IvyOra Display** (`public/fonts/ivy-ora/`): Thin (`--font-heading-thin`), Light (`--font-heading-light`), Regular (`--font-heading-regular`) — used for h1–h6 and headline components
- **GTPlanar** (`public/fonts/gt-planar/`): Weights 250, 300, 400, 700 (normal/italic) — used for body text, paragraphs, and subheadlines (`--font-body`)

Fonts are loaded in `public/fonts/fonts.css`. Use CSS variables or utility classes:
- **Variables**: `var(--font-heading-thin)`, `var(--font-heading-light)`, `var(--font-heading-regular)`, `var(--font-body)`
- **Utility classes**: `.font-heading`, `.font-heading-thin`, `.font-heading-light`, `.font-heading-regular`, `.font-body`, `.font-headline`, `.font-subheadline`

Visit `/fonts` for the full typography showcase (IvyOra + GTPlanar).

### Color Palette

The design system uses a structured color palette organized into Primary and Secondary colors:

#### Primary Colors
- **Breath** (`--color-primary-breath`): `#FDF9F0` - Very light creamy off-white, ideal for backgrounds
- **Ecru** (`--color-primary-ecru`): `#F6F1E7` - Light beige, subtle background variations
- **Ink** (`--color-primary-ink`): `#1F2223` - Very dark gray, almost black, primary text color

#### Secondary Colors
- **Purple Rain** (`--color-secondary-purple-rain`): `#46519C` - Medium-dark desaturated blue-purple
- **Current** (`--color-secondary-current`): `#2A3577` - Dark deep desaturated blue
- **Blush** (`--color-secondary-blush`): `#F2ADAA` - Light soft muted pink
- **Drift** (`--color-secondary-drift`): `#09B7BB` - Vibrant bright teal/cyan
- **Signal** (`--color-secondary-signal`): `#FFF200` - Bright neon yellow, accents and highlights

#### Color Usage

Colors can be accessed via:
- **CSS Variables**: `var(--color-primary-ink)`, `var(--color-secondary-drift)`, etc.
- **Utility Classes**:
  - Background: `.bg-primary-breath`, `.bg-secondary-signal`
  - Text: `.text-primary-ink`, `.text-secondary-drift`
  - Border: `.border-primary-ecru`, `.border-secondary-purple-rain`

### Images

- **Guide photos**: Place JPG/PNG in `public/images/guides/` with filenames like `firstname_suffix.jpg` (e.g. `katrin_h.jpg`, `emma_b.jpg`). The **display name** in CompanySection is the part before the first underscore, capitalized (no underscore = whole name, e.g. `jeremy.jpg` → "Jeremy"). Used in `HomepageRotatingHeadline` (rotating avatar) and `CompanySection` (TeamLink hover, random order). Reference via `imageSrc('/images/guides/<basePath>', 400)` for small avatars or `imageSrc('/images/guides/<basePath>')` for full size.
- **Build optimization**: `npm run build` runs `scripts/optimize-images.js` after Vite: all images under `dist/images/` are converted to WebP (full + 400w, 800w, 1200w) and originals are removed. Use `lib/images.ts`: `imageSrc(basePath, width?)` and `imageSrcSet(basePath)` so dev uses `.jpg` from `public/` and production uses `.webp` from `dist/`.

### Design Principles

- **Glassmorphism**: Use `backdrop-blur-xl` combined with high-transparency backgrounds (`bg-white/80` or `bg-slate-100/50`) and subtle borders
- **Color System**: Use the structured primary/secondary color palette via CSS variables or utility classes for consistency
- **Typography**: Use IvyOra Display for headings (normal weight) and GTPlanar for body; see `index.css` and `public/fonts/fonts.css`
- **Spacing**: Generous white space (p-20+) to emphasize the premium minimalist feel
- **Animations**: Smooth, spring-based animations with consistent timing functions
- **Responsive**: Mobile-first approach with breakpoints at `md:` (768px) and `lg:` (1024px)

## 🧠 Dynamic Content

### Weather Integration

The weather status bar uses **Open-Meteo** for current conditions and **ipapi.co** for location (no API keys required). Location defaults to Hamburg if IP lookup fails. To avoid CORS (ipapi.co and ip-api.com do not allow direct browser requests), the app calls a **same-origin proxy**:

- **Development**: Vite proxies `GET /api/geolocation` to `https://ipapi.co/json/` (see `vite.config.ts`).
- **Production (Vercel)**: The serverless function `api/geolocation.ts` fetches ipapi.co and returns the JSON. Deploy with Vercel so `/api/geolocation` is available; on other hosts you may need to add a similar proxy or the bar will fall back to Hamburg.

- **Location**: Resolved from the visitor’s IP via `/api/geolocation` (proxy to ipapi.co) for lat/lon, city, and timezone.
- **Weather**: Fetched from Open-Meteo (`/v1/forecast`) for temperature and WMO weather code; codes are mapped to display labels and icons.
- **Cycling outfit suggestion**: In-app logic based on temperature and condition (e.g. rain/snow) — not from an external AI.

The bar displays: date (in the resolved timezone), location label, temperature and condition with icons, and a short outfit suggestion.

### WordPress Content

All editorial content (About, Community, Stories) can be managed through WordPress. The app fetches content dynamically and provides fallback content when WordPress is unavailable.

## 🚢 Build & Deployment

### Production Build

```bash
npm run build
```

This runs `vite build` then `scripts/optimize-images.js`: images in `public/images/` (and subdirs like `guides/`) are converted to WebP and responsive widths (400, 800, 1200) in `dist/images/`. Original JPG/PNG are not copied to `dist`. Use `imageSrc()` and `imageSrcSet()` from `lib/images` in components so dev uses `.jpg` from `public/` and production uses `.webp` from `dist/`.

### Deployment

Production deploys from the **`main`** branch. The app uses path-based routing (no hash in URLs). SPA fallback is configured so direct visits and refreshes to routes like `/story/foo` work: `vercel.json` (Vercel) and `public/_redirects` (Netlify, copied to `dist` on build) serve `index.html` for all paths.

The app can be deployed to any static hosting service:

- **Vercel**: Connect your repository and deploy automatically (uses `vercel.json` for rewrites)
- **Netlify**: Use the build command `npm run build` and publish directory `dist` (uses `_redirects` from `public/`)
- **Cloudflare Pages**: Similar setup to Netlify
- **Traditional Hosting**: Upload the `dist/` folder to your web server

### Environment Variables

Make sure to set environment variables in your hosting platform:
- `VITE_WP_GRAPHQL_URL`: Your WordPress GraphQL endpoint
- `VITE_SUPABASE_URL`: Your Supabase project URL (for Members area and auth)
- `VITE_SUPABASE_ANON_KEY`: Supabase anon (public) key
- `VITE_SUBSTACK_PUBLICATION`: (Optional) Substack publication base URL for newsletter signup embed
- `VITE_FORMSPREE_CONTACT_FORM_ID`: (Optional) Formspree form ID for the contact form (Contact page and modal)

**Vercel warning: “VITE_ exposes this value to the browser”** — Vite inlines all `VITE_*` vars into the client bundle, so they are visible in the browser. The variables above are **safe to expose**: they are public URLs and public form IDs, not secrets. You can confirm and continue in Vercel when prompted.

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For questions or issues, please contact the project maintainers.

# Kandie Gang Headless WordPress

A high-fidelity replication of the experimental UI and interactions from Kandie Gang, built as a headless WordPress frontend. This project focuses on high-quality animations, smooth scroll-driven effects, and a premium "mundane made magic" aesthetic, powered by a type-safe WordPress GraphQL bridge.

## ✨ Features

- **🎨 Premium UI/UX**: High-fidelity animations with Framer Motion, scroll-driven effects, and glassmorphic design elements
- **📝 Headless WordPress**: Type-safe GraphQL integration for dynamic content management
- **🌐 Multi-Page Routing**: Landing, About, Community, Stories (Journal), Contact, and Fonts showcase pages
- **🤖 AI-Powered Content**: Real-time weather data via Google Gemini API with search grounding
- **📱 Fully Responsive**: Mobile-first design with Tailwind CSS
- **⚡ Performance Optimized**: Query caching, retry logic, and optimized image loading
- **🎭 Advanced Animations**: Spring physics, scroll progress tracking, and shared layout transitions

## 🚀 Tech Stack

- **React 19**: Modern functional components and hooks
- **TypeScript**: Type-safe development with full type coverage
- **Vite**: Lightning-fast build tool and dev server
- **React Router DOM 7**: Client-side routing with modern API
- **Tailwind CSS**: Utility-first styling for responsive design
- **Framer Motion**: State-of-the-art animation engine for scroll-driven effects, spring physics, and shared layout transitions
- **Lucide React**: Clean, consistent iconography
- **Google Gemini API**: Real-time data fetching (e.g., weather grounding) for dynamic experiences
- **WordPress GraphQL**: Headless CMS integration via WPGraphQL

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- A WordPress site with WPGraphQL plugin installed (optional - demo endpoint available)
- Google Gemini API key (optional - for weather features)

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
   
   # Google Gemini API Key (for weather data)
   GEMINI_API_KEY=your_gemini_api_key_here
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
│   ├── CompanySection.tsx
│   ├── ExpandingHero.tsx
│   ├── FAQSection.tsx
│   ├── FloatingBetaBar.tsx
│   ├── Footer.tsx
│   ├── HeadlineSection.tsx
│   ├── HorizontalRevealSection.tsx
│   ├── ImageMarquee.tsx
│   ├── Preloader.tsx
│   ├── ScrollingHeadline.tsx
│   ├── StickyBottom.tsx
│   └── StickyTop.tsx
├── pages/              # Page components
│   ├── AboutPage.tsx
│   ├── CommunityPage.tsx
│   ├── StoriesPage.tsx
│   └── FontsPage.tsx   # Typography showcase
├── lib/                # Utility libraries
│   └── wordpress.ts    # WordPress GraphQL bridge
├── hooks/              # Custom React hooks
│   └── useScrollThreshold.ts
├── public/             # Static assets
│   └── fonts/         # Custom font files
├── App.tsx             # Main application component
├── index.tsx           # Application entry point
├── vite.config.ts      # Vite configuration
└── tsconfig.json       # TypeScript configuration
```

## 📂 Component Documentation

### Core Interactive Sections

- **`ExpandingHero.tsx`**: A hero section that expands from a rounded card to full-width using `clip-path` and `inset` properties based on scroll progress.
- **`HorizontalRevealSection.tsx`**: A horizontal scrolling gallery that pins to the screen, featuring a segmented navigation pill that highlights the active section.
- **`ScrollingHeadline.tsx`**: An assembly animation where words ("Mundane made magic") fly into place as the user scrolls.
- **`CompanySection.tsx`**: Includes the "TeamLink" interaction where profile images spring into view and follow the cursor on hover.
- **`AboutHero.tsx`**: Immersive hero section with video background for the About page.
- **`AdaptationGrid.tsx`**: Showcases real-world autonomous tasks in a grid layout.
- **`FAQSection.tsx`**: Expandable FAQ section with smooth animations.

### UI Utilities

- **`StickyTop.tsx` / `StickyBottom.tsx`**: Glassmorphic floating containers that house primary navigation. They feature "scroll out" logic to disappear when the user moves deep into the page.
- **`FloatingBetaBar.tsx`**: A call-to-action pill visible on page load that gracefully exits as the user scrolls past the hero.
- **`Preloader.tsx`**: Loading animation that displays on initial page load.
- **`Footer.tsx`**: Site footer with navigation and links.
- **`ImageMarquee.tsx`**: Infinite scrolling image gallery.

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

1. Install the [WPGraphQL plugin](https://www.wpgraphql.com/) on your WordPress site
2. Configure the GraphQL endpoint URL in your `.env` file
3. The app will automatically use the demo endpoint if no URL is provided

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

The project uses a carefully curated typography system with three custom font families:

- **GT-Pressura** (`--font-headline`): Bold (700) - Used for all headings (h1-h6)
- **GT-Pressura-Mono** (`--font-subheadline`): Regular (400) and Bold (700) - Used for subheadlines
- **Cambon** (`--font-body`): Regular (400), Italic (400), Medium (500), SemiBold (600), Bold (700) - Used for body text and paragraphs

All fonts are loaded via `@font-face` declarations in `public/fonts/fonts.css` and can be accessed through CSS variables or utility classes:
- CSS Variables: `var(--font-headline)`, `var(--font-subheadline)`, `var(--font-body)`
- Utility Classes: `.font-headline`, `.font-subheadline`, `.font-body`, `.subheadline`

Visit `/fonts` to see a comprehensive typography showcase with all weights, styles, character sets, and usage examples.

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

### Design Principles

- **Glassmorphism**: Use `backdrop-blur-xl` combined with high-transparency backgrounds (`bg-white/80` or `bg-slate-100/50`) and subtle borders
- **Color System**: Use the structured primary/secondary color palette via CSS variables or utility classes for consistency
- **Typography**: Leverage the three-font system (GT-Pressura for headlines, GT-Pressura-Mono for subheadlines, Cambon for body) with appropriate weights
- **Spacing**: Generous white space (p-20+) to emphasize the premium minimalist feel
- **Animations**: Smooth, spring-based animations with consistent timing functions
- **Responsive**: Mobile-first approach with breakpoints at `md:` (768px) and `lg:` (1024px)

## 🧠 Dynamic Content

### Weather Integration

Real-time weather data for Hamburg is fetched using the **Gemini 3 Flash** model with Google Search grounding. This demonstrates how AI can be used to inject contextually relevant, "magic" data into a mundane landing page.

The weather widget displays:
- Current date and time (Hamburg timezone)
- Location (Hamburg, Germany)
- Temperature and condition with appropriate icons

### WordPress Content

All editorial content (About, Community, Stories) can be managed through WordPress. The app fetches content dynamically and provides fallback content when WordPress is unavailable.

## 🚢 Build & Deployment

### Production Build

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Deployment

The app can be deployed to any static hosting service:

- **Vercel**: Connect your repository and deploy automatically
- **Netlify**: Use the build command `npm run build` and publish directory `dist`
- **Cloudflare Pages**: Similar setup to Netlify
- **Traditional Hosting**: Upload the `dist/` folder to your web server

### Environment Variables

Make sure to set environment variables in your hosting platform:
- `VITE_WP_GRAPHQL_URL`: Your WordPress GraphQL endpoint
- `GEMINI_API_KEY`: Your Google Gemini API key

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. For questions or issues, please contact the project maintainers.

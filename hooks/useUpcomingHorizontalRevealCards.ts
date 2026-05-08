import { useEffect, useState } from 'react';
import { getKandieEvents, transformMediaUrl, type WPRideEvent } from '../lib/wordpress';

export type HorizontalRevealCard = {
  title: string;
  desc: string;
  img: string;
  to: string;
  /** Short label for the bottom pill (e.g. "May 9th") */
  pillLabel: string;
};

function ordinalDay(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

const FALLBACK_IMG =
  'https://leckerbisschen.s3.eu-central-1.amazonaws.com/wp-content/uploads/2025/09/06220134/250923_kandiegangsocialride-20-scaled.jpg';

function mapEventToCard(event: WPRideEvent, eventDate: Date): HorizontalRevealCard {
  const slug = generateSlug(event.title);
  const yy = eventDate.getFullYear().toString().slice(2);
  const mm = (eventDate.getMonth() + 1).toString().padStart(2, '0');
  const dd = eventDate.getDate().toString().padStart(2, '0');
  const monthShort = eventDate.toLocaleDateString('en-US', { month: 'short' });
  const weekdayShort = eventDate.toLocaleDateString('en-US', { weekday: 'short' });
  const yearNum = eventDate.toLocaleDateString('en-US', { year: 'numeric' });
  const dayNum = eventDate.getDate();
  const dayOrd = ordinalDay(dayNum);
  const pillLabel = `${monthShort} ${dayOrd}`;
  const dateStr = `${weekdayShort}, ${monthShort} ${dayOrd}, ${yearNum}`;
  const rawExcerpt =
    stripHtml(event.excerpt || event.eventDetails?.description || '') ||
    (event.eventDetails?.primaryType ? String(event.eventDetails.primaryType) : '');
  const excerpt = rawExcerpt.length > 120 ? `${rawExcerpt.slice(0, 120)}…` : rawExcerpt;
  const desc = excerpt ? `${dateStr} · ${excerpt}` : dateStr;
  const imgRaw = event.featuredImage?.node?.sourceUrl;
  const img = imgRaw ? transformMediaUrl(imgRaw) : FALLBACK_IMG;

  return {
    title: event.title,
    desc,
    img,
    to: `/event/${yy}/${mm}/${dd}/${slug}`,
    pillLabel,
  };
}

/**
 * Next N upcoming ride events as cards for HorizontalRevealSection (mobile strip).
 */
export function useUpcomingHorizontalRevealCards(limit = 4): {
  cards: HorizontalRevealCard[];
  ready: boolean;
} {
  const [cards, setCards] = useState<HorizontalRevealCard[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const events = await getKandieEvents(Math.max(limit * 3, 24));
        if (!mounted) return;

        if (!events?.length) {
          setCards([]);
          setReady(true);
          return;
        }

        const now = new Date();
        const future = events
          .map((event) => {
            const eventDateStr = event.eventDetails?.eventDate;
            const eventDate = eventDateStr ? new Date(eventDateStr) : null;
            if (!eventDate || Number.isNaN(eventDate.getTime())) return null;
            return { event, eventDate };
          })
          .filter((item): item is { event: WPRideEvent; eventDate: Date } => item !== null)
          .filter(({ eventDate }) => eventDate.getTime() >= now.getTime())
          .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())
          .slice(0, limit)
          .map(({ event, eventDate }) => mapEventToCard(event, eventDate));

        setCards(future);
      } catch {
        if (mounted) setCards([]);
      } finally {
        if (mounted) setReady(true);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [limit]);

  return { cards, ready };
}

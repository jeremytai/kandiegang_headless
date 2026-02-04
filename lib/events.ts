/**
 * Event data and types for standalone event pages (e.g. UX Connect 26).
 * Content sourced from https://www.vertica.dk/en/events/ux-connect-26/
 */

export interface EventSpeaker {
  name: string;
  title: string;
  image?: string;
}

export interface EventData {
  slug: string;
  title: string;
  description: string;
  dateRange: string;
  time?: string;
  location: string;
  address?: string;
  price?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  speakers?: EventSpeaker[];
  partners?: string;
  /** Optional hero image URL */
  imageUrl?: string;
}

const uxConnect26: EventData = {
  slug: "ux-connect-26",
  title: "UX Connect 26",
  dateRange: "9–10 June 2026",
  time: "6:30 AM – 1:30 PM",
  location: "Aarhus, Denmark",
  address: "Åboulevarden 69, 8000 Aarhus",
  price:
    "€605 / DKK 4500 + VAT early bird until 27 March (€870 / DKK 6500 + VAT from 28 March onwards)",
  ctaUrl: "https://www.vertica.dk/en/events/ux-connect-26/",
  ctaLabel: "Secure your seat",
  description: `Two days of professional deep dives, networking, and honest conversations about UX and digital design.

In collaboration with Boye & Co, we are opening the doors to UX Connect in Aarhus for the fifth year in a row: a two-day conference for professionals in UX and digital design.

UX Connect is a small, focused conference designed for depth over scale. No big stages. No generic messages. Instead, you'll have the time and space for what matters most: reflection, honest dialogue, and practical sparring on real UX challenges and how we can become better at solving them together.

The conference is limited to 50 participants, and networking is an integrated part of the programme, supported by structured exercises and workshops throughout both days.

What you can expect:
• Honest conversations and close sparring you can take straight back into your day-to-day work
• Dialogue with speakers who actively take part and are available throughout the conference
• A format with no sales pitches and time to think, learn, and connect across roles and industries

In 2026, our focus is on how we, as designers, can not only improve design, but also change the way we work and the impact we create. Good design is no longer enough; it's about intentional design that drives meaningful change.`,
  speakers: [
    { name: "Alide von Bornhaupt", title: "Product Development & UX Research" },
    {
      name: "Antonia Fedder",
      title: "Designer for impact-driven brands",
    },
    {
      name: "Chris Weier",
      title: "Founder & CEO at Nordic Connective",
    },
    {
      name: "Janne Jul Jensen",
      title: "CEO and Co-Founder at Henosia",
    },
    {
      name: "Dennis Nordstrom",
      title: "Sr Product Researcher at Grundfos",
    },
    {
      name: "Jens Hofman Hansen",
      title: "UX designer and business developer at Vertica",
    },
    {
      name: "Louise Vang Jensen",
      title: "CEO at IS IT A BIRD",
    },
    {
      name: "Tey Bannerman",
      title: "AI Strategy, Product & Design Leader",
    },
    {
      name: "Thorsten Jonas",
      title: "Founder of The Sustainable UX Network",
    },
  ],
  partners:
    "In collaboration with Boye & Co — an international network operating at the intersection of strategy, technology, and design. Based in Aarhus, the organization is known for events created as a deliberate alternative to traditional conferences: thoughtful curation, well-designed learning experiences, and conversations that make a difference.",
};

const eventsBySlug: Record<string, EventData> = {
  "ux-connect-26": uxConnect26,
};

export function getEventBySlug(slug: string): EventData | undefined {
  return eventsBySlug[slug];
}

export function getAllEventSlugs(): string[] {
  return Object.keys(eventsBySlug);
}

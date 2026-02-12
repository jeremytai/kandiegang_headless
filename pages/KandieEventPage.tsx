import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import EventHeader from '../components/EventHeader';
import GuideSection from '../components/GuideSection';
import EventSidebarCard from '../components/EventSidebarCard';
import { KandieEventData, RideGuide } from '../lib/events';
import { getKandieEventBySlug, transformMediaUrl } from '../lib/wordpress';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

export const KandieEventPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<KandieEventData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!slug) return;

      try {
        const event = await getKandieEventBySlug(slug);

        if (!event) {
          console.error("Event not found for slug:", slug);
          setLoading(false);
          return;
        }

        // Transform gpxFile from { node: { mediaItemUrl } } to string
        const transformLevel = (level: any) => {
          if (!level) return undefined;
          return {
            ...level,
            gpxFile: level.gpxFile?.node?.mediaItemUrl || undefined,
          };
        };

        const transformedEvent: KandieEventData = {
          ...event,
          databaseId: event.databaseId || "0", // fallback if undefined
          eventDetails: event.eventDetails
            ? {
                ...event.eventDetails,
                level1: transformLevel(event.eventDetails.level1),
                level2: transformLevel(event.eventDetails.level2),
                level2plus: transformLevel(event.eventDetails.level2plus),
                level3: transformLevel(event.eventDetails.level3),
              }
            : undefined,
        };

        setEventData(transformedEvent);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [slug]);

  if (loading || !eventData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-secondary-purple-rain" />
      </div>
    );
  }

  const { title, featuredImage, eventDetails, excerpt } = eventData;
  const description = eventDetails?.description || '';
  const rawExcerpt = excerpt || eventDetails?.excerpt || '';
  // Normalize newlines and common bullet characters so soft line-break lists
  // (or lists using en/em dashes or bullets from WP) become proper markdown lists
  const normalizedDescription = description
    // Convert common WP HTML paragraph/line-break tags into markdown-friendly newlines
    .replace(/<br\s*\/?>(\n)?/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<\/?p>/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // normalize common non-breaking/zero-width spaces
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B\uFEFF\u2060]/g, '')
    // Convert en-dash / em-dash list markers at line-start to hyphen
    .replace(/^\s*[–—]\s+/gm, '- ')
    // Convert common bullet characters to hyphen
    .replace(/^\s*[•·]\s+/gm, '- ')
    // Convert lines starting with various bullet-like markers (including tabs/spaces) to hyphen
    .replace(/^[\s\u00A0\u200B\uFEFF\u2060]*[\*+\u2022\u00B7\u2023\-]\s+/gm, '- ')
    // Convert numbered lists using ')' or '.' to canonical numbered form (e.g., '1.' stays '1.')
    .replace(/^[\s\u00A0\u200B\uFEFF\u2060]*(\d+)[\)\.]+\s*/gm, (_m, n) => `${n}. `)
    // Ensure a blank line before list markers (hyphen, asterisk, plus, or numbered with '.' or ')')
    .replace(/([^\n])\n(?=\s*(?:[-*+]|\d+[\.\)])\s)/g, '$1\n\n')
    // Collapse excessive blank lines
    .replace(/\n{3,}/g, '\n\n');
  // Debug logs removed for production
  const intro = rawExcerpt.trim() || description.split('\n')[0].trim();

  // Gather all guides from levels
  const guides: RideGuide[] = [
    ...(eventDetails?.level1?.guides?.nodes || []),
    ...(eventDetails?.level2?.guides?.nodes || []),
    ...(eventDetails?.level2plus?.guides?.nodes || []),
    ...(eventDetails?.level3?.guides?.nodes || []),
  ];

  const paceByLevel: Record<string, string> = {
    'Level 1': '22 - 25 km/h',
    'Level 2': '25 - 28 km/h',
    'Level 2+': '28 - 30 km/h',
    'Level 3': '30 - 33 km/h',
  };
  const levelsWithGuides = [
    {
      label: 'Level 1',
      guides: (eventDetails?.level1?.guides?.nodes || []).map((guide) => guide.title),
      pace: paceByLevel['Level 1'],
      routeUrl: eventDetails?.level1?.routeUrl,
    },
    {
      label: 'Level 2',
      guides: (eventDetails?.level2?.guides?.nodes || []).map((guide) => guide.title),
      pace: paceByLevel['Level 2'],
      routeUrl: eventDetails?.level2?.routeUrl,
    },
    {
      label: 'Level 2+',
      guides: (eventDetails?.level2plus?.guides?.nodes || []).map((guide) => guide.title),
      pace: paceByLevel['Level 2+'],
      routeUrl: eventDetails?.level2plus?.routeUrl,
    },
    {
      label: 'Level 3',
      guides: (eventDetails?.level3?.guides?.nodes || []).map((guide) => guide.title),
      pace: paceByLevel['Level 3'],
      routeUrl: eventDetails?.level3?.routeUrl,
    },
  ].filter((level) => level.guides.length > 0);

  const isPublic = new Date() >= new Date(eventDetails?.publicReleaseDate || '');
  const eventDateValue = eventDetails?.eventDate || '';
  const eventDate = eventDateValue ? new Date(eventDateValue) : null;
  const eventDatePart = eventDateValue.split('T')[0];
  const eventDateForWeekday = eventDatePart ? new Date(`${eventDatePart}T12:00:00`) : null;
  const eventDateTimeMatch = eventDateValue.match(/T(\d{2}:\d{2})/);
  const timeFromEventDate = eventDateTimeMatch?.[1];
  const getOrdinal = (day: number) => {
    const mod10 = day % 10;
    const mod100 = day % 100;
    if (mod10 === 1 && mod100 !== 11) return `${day}st`;
    if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
    if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
    return `${day}th`;
  };
  const weekdayLabel = eventDateForWeekday && !Number.isNaN(eventDateForWeekday.getTime())
    ? eventDateForWeekday.toLocaleDateString([], { weekday: 'short' })
    : '';
  const monthLabel = eventDate && !Number.isNaN(eventDate.getTime())
    ? eventDate.toLocaleDateString([], { month: 'long' })
    : '';
  const dayLabel = eventDate && !Number.isNaN(eventDate.getTime())
    ? getOrdinal(eventDate.getDate())
    : '';
  const yearLabel = eventDate && !Number.isNaN(eventDate.getTime())
    ? String(eventDate.getFullYear())
    : '';
  const dateLabel = weekdayLabel && monthLabel && dayLabel && yearLabel
    ? `${weekdayLabel}, ${dayLabel} ${monthLabel}, ${yearLabel}`
    : eventDateValue;
  const timeLabel = eventDetails?.workshopStartTime?.trim()
    || timeFromEventDate;
  const meetingPoint = eventDetails?.meetingPoint;
  const locationName = meetingPoint?.name || '';
  const locationStreetCity = meetingPoint?.street && meetingPoint?.city
    ? `${meetingPoint.street}, ${meetingPoint.city}`
    : [meetingPoint?.street, meetingPoint?.city].filter(Boolean).join(' ');
  const locationLabel = [locationName, locationStreetCity].filter(Boolean).join('\n');

  return (
    <div className="bg-white min-h-screen pt-32 md:pt-40 pb-40 selection:bg-[#f9f100] selection:text-black">
      <EventHeader
        title={title}
        intro={intro}
        imageUrl={
          featuredImage?.node?.sourceUrl
            ? transformMediaUrl(featuredImage.node.sourceUrl)
            : undefined
        }
        onBack={() => navigate('/community')}
      />

      <section>
        <div className="max-w-[88rem] mx-auto px-6">
          <div className="w-full border-t border-black/10 mt-10 mb-10" />
          <div className="flex flex-col lg:flex-row lg:justify-center lg:items-start gap-20">
            {/* Main content */}
            <article className="space-y-12 order-2 lg:order-1 flex-1 min-w-0">
              <div className="prose prose-lg max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw as any, rehypeSanitize as any]}
                >
                  {normalizedDescription}
                </ReactMarkdown>
                {/* Dev debug helpers removed after verification */}
              </div>

              {/* Additional sections that mirror the Vertica layout: Guides / Speakers */}
              {guides.length > 0 && (
                <section>
                  <h2 className="text-2xl font-heading-regular text-primary-ink mb-6">Speakers & Guides</h2>
                  <GuideSection guides={guides} />
                </section>
              )}

              {/* Partners or extra info could go here */}
            </article>

            <aside className="order-1 lg:order-2 w-full lg:flex-1 min-w-0 lg:self-start lg:sticky lg:top-28 h-fit">
              <div>
                <EventSidebarCard
                  date={dateLabel}
                  time={timeLabel}
                  location={locationLabel}
                  category={eventDetails?.rideCategory}
                  type={eventDetails?.primaryType}
                  levels={levelsWithGuides}
                  isPublic={isPublic}
                  publicReleaseDate={eventDetails?.publicReleaseDate}
                />
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
};

export default KandieEventPage;

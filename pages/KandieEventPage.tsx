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
  // Normalize newlines and common bullet characters so soft line-break lists
  // (or lists using en/em dashes or bullets from WP) become proper markdown lists
  const normalizedDescription = description
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
  const intro = excerpt || description.split('\n')[0];

  // Gather all guides from levels
  const guides: RideGuide[] = [
    ...(eventDetails?.level1?.guides?.nodes || []),
    ...(eventDetails?.level2?.guides?.nodes || []),
    ...(eventDetails?.level2plus?.guides?.nodes || []),
    ...(eventDetails?.level3?.guides?.nodes || []),
  ];

  const isPublic = new Date() >= new Date(eventDetails?.publicReleaseDate || '');

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
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
            {/* Main content */}
            <article className="space-y-12 order-2 lg:order-1">
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
              {eventData?.excerpt && (
                <section>
                  <h2 className="text-2xl font-heading-regular text-primary-ink mb-4">Intro</h2>
                  <div className="prose max-w-none text-primary-ink">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw as any, rehypeSanitize as any]}
                    >
                      {eventData.excerpt}
                    </ReactMarkdown>
                  </div>
                </section>
              )}
            </article>

            {/* Sidebar: sticky event card */}
            <aside className="order-1 lg:order-2">
              <div className="lg:sticky lg:top-28">
                <EventSidebarCard
                  date={new Date(eventDetails?.eventDate || '').toLocaleDateString()}
                  time={eventDetails?.workshopStartTime}
                  location={`${eventDetails?.meetingPoint?.name || ''} ${eventDetails?.meetingPoint?.street || ''} ${eventDetails?.meetingPoint?.city || ''}`}
                  category={eventDetails?.rideCategory}
                  capacity={eventDetails?.workshopCapacity}
                  type={eventDetails?.primaryType}
                  isPublic={isPublic}
                />

                {/* Quick details below the card to match typical event pages */}
                <div className="mt-6 text-sm text-slate-600">
                  {eventDetails?.rideCategory && (
                    <div className="mb-2"><strong>Category:</strong> {eventDetails.rideCategory}</div>
                  )}
                  {eventDetails?.isFlintaOnly && (
                    <div className="mb-2 text-secondary-purple-rain font-semibold">Flinta-only event</div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
};

export default KandieEventPage;

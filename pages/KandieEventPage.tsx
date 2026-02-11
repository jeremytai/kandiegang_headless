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
    <div className="min-h-screen bg-white">
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

      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-12 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-20">
            <div className="lg:col-span-2 space-y-20">
              <div className="prose prose-lg max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {description}
                </ReactMarkdown>
              </div>

              <GuideSection guides={guides} />
            </div>

            <EventSidebarCard
              date={new Date(eventDetails?.eventDate || '').toLocaleDateString()}
              time={eventDetails?.workshopStartTime}
              location={`${eventDetails?.meetingPoint?.name || ''} ${eventDetails?.meetingPoint?.street || ''} ${eventDetails?.meetingPoint?.city || ''}`}
              category={eventDetails?.rideCategory}
              capacity={eventDetails?.workshopCapacity}
              type={eventDetails?.primaryType}
              isPublic={isPublic}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default KandieEventPage;

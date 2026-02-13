import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import EventHeader from '../../components/event/EventHeader';
import GuideSection from '../../components/sections/GuideSection';
import EventSidebarCard from '../../components/event/EventSidebarCard';
import { KandieEventData, RideGuide } from '../../lib/events';
import { getKandieEventBySlug, transformMediaUrl } from '../../lib/wordpress';
import { useAuth } from '../../context/AuthContext';
import { useMemberLoginOffcanvas } from '../../context/MemberLoginOffcanvasContext';
import {
  EVENT_SIGNUP_STORAGE_KEY,
  type EventSignupIntent,
} from '../../components/event/EventSignupPanel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

export const KandieEventPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { openEventSignup } = useMemberLoginOffcanvas();
  const [eventData, setEventData] = useState<KandieEventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoredSignup, setRestoredSignup] = useState(false);
  const [capacityCounts, setCapacityCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchEvent = async () => {
      if (!slug) return;

      try {
        const event = await getKandieEventBySlug(slug);

        if (!event) {
          console.error('Event not found for slug:', slug);
          setLoading(false);
          return;
        }

        // Transform gpxFile from { node: { id } } to string
        const transformLevel = (level: Record<string, unknown> | undefined) => {
          if (!level) return undefined;
          return {
            ...level,
            gpxFile: level.gpxFile?.node?.id || undefined,
          };
        };

        const transformedEvent: KandieEventData = {
          ...event,
          databaseId: event.databaseId || '0', // fallback if undefined
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

  useEffect(() => {
    if (!eventData?.databaseId) return;
    const controller = new AbortController();
    const loadCapacity = async () => {
      try {
        const response = await fetch(`/api/event-capacity?eventId=${eventData.databaseId}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json().catch(() => ({}))) as unknown;
        if (data && typeof data === 'object' && 'counts' in data) {
          setCapacityCounts(data.counts as Record<string, number>);
        }
      } catch {
        // Capacity is optional; ignore errors.
      }
    };
    loadCapacity();
    return () => controller.abort();
  }, [eventData?.databaseId]);

  useEffect(() => {
    if (!eventData || !user || restoredSignup) return;
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('eventSignup') !== '1') return;
    const raw = sessionStorage.getItem(EVENT_SIGNUP_STORAGE_KEY);
    if (!raw) return;
    try {
      const intent = JSON.parse(raw) as EventSignupIntent;
      if (intent.eventId === eventData.databaseId) {
        openEventSignup(intent);
      }
    } finally {
      sessionStorage.removeItem(EVENT_SIGNUP_STORAGE_KEY);
      url.searchParams.delete('eventSignup');
      window.history.replaceState(null, '', url.pathname + url.search);
      setRestoredSignup(true);
    }
  }, [eventData, user, openEventSignup, restoredSignup]);

  if (loading || !eventData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-secondary-purple-rain" />
      </div>
    );
  }

  const { title, featuredImage, eventDetails, excerpt, publicReleaseDate } = eventData;
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
    .replace(/^[\s\u00A0\u200B\uFEFF\u2060]*[*+\u2022\u00B7\u2023-]\s+/gm, '- ')
    // Convert numbered lists using ')' or '.' to canonical numbered form (e.g., '1.' stays '1.')
    .replace(/^[\s\u00A0\u200B\uFEFF\u2060]*(\d+)[).]+\s*/gm, (_m, n) => `${n}. `)
    // Ensure a blank line before list markers (hyphen, asterisk, plus, or numbered with '.' or ')')
    .replace(/([^\n])\n(?=\s*(?:[-*+]|\d+[.)])\s)/g, '$1\n\n')
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
      levelKey: 'level1',
      label: 'Level 1',
      guides: (eventDetails?.level1?.guides?.nodes || []).map((guide) => guide.title),
      pace: paceByLevel['Level 1'],
      distanceKm: eventDetails?.level1?.distanceKm ?? null,
      routeUrl: eventDetails?.level1?.routeUrl,
    },
    {
      levelKey: 'level2',
      label: 'Level 2',
      guides: (eventDetails?.level2?.guides?.nodes || []).map((guide) => guide.title),
      pace: paceByLevel['Level 2'],
      distanceKm: eventDetails?.level2?.distanceKm ?? null,
      routeUrl: eventDetails?.level2?.routeUrl,
    },
    {
      levelKey: 'level2plus',
      label: 'Level 2+',
      guides: (eventDetails?.level2plus?.guides?.nodes || []).map((guide) => guide.title),
      pace: paceByLevel['Level 2+'],
      distanceKm: eventDetails?.level2plus?.distanceKm ?? null,
      routeUrl: eventDetails?.level2plus?.routeUrl,
    },
    {
      levelKey: 'level3',
      label: 'Level 3',
      guides: (eventDetails?.level3?.guides?.nodes || []).map((guide) => guide.title),
      pace: paceByLevel['Level 3'],
      distanceKm: eventDetails?.level3?.distanceKm ?? null,
      routeUrl: eventDetails?.level3?.routeUrl,
    },
  ].filter((level) => level.guides.length > 0);
  const workshopCapacity = eventDetails?.workshopCapacity ?? null;
  const isWorkshop = Boolean(eventDetails?.primaryType?.toLowerCase().includes('workshop'));
  const workshopCount = capacityCounts.workshop ?? 0;
  const now = new Date();
  const publicRelease = publicReleaseDate ? new Date(publicReleaseDate) : null;
  const hasValidPublicRelease = Boolean(publicRelease && !Number.isNaN(publicRelease.getTime()));
  const isPublic = !hasValidPublicRelease || now >= (publicRelease as Date);
  const isMember = Boolean(profile?.is_member);
  const isFlintaOnly = Boolean(eventDetails?.isFlintaOnly);
  const dayMs = 24 * 60 * 60 * 1000;
  const memberEarlyDays = Number(import.meta.env.VITE_MEMBER_EARLY_DAYS ?? 2);
  const flintaEarlyDays = Number(import.meta.env.VITE_FLINTA_EARLY_DAYS ?? 4);
  const memberRelease = hasValidPublicRelease
    ? new Date((publicRelease as Date).getTime() - memberEarlyDays * dayMs)
    : null;
  const flintaRelease = hasValidPublicRelease
    ? new Date((publicRelease as Date).getTime() - flintaEarlyDays * dayMs)
    : null;
  const isMemberWindow = Boolean(
    memberRelease && now >= memberRelease && (!publicRelease || now < (publicRelease as Date))
  );
  const isFlintaWindow = Boolean(
    flintaRelease && now >= flintaRelease && (!memberRelease || now < (memberRelease as Date))
  );
  const canSignupNow = isPublic || isMemberWindow || isFlintaWindow;
  const requiresFlintaAttestation = isFlintaOnly || (!isPublic && !isMember);
  const allowWaitlist = canSignupNow;

  const signupLabel = !canSignupNow
    ? 'Coming Soon'
    : isPublic
      ? 'Sign Up'
      : isMember
        ? 'Member Signup'
        : 'FLINTA* Early Access';

  const signupHelper = !canSignupNow
    ? 'Early access opens soon'
    : isPublic
      ? undefined
      : isMember
        ? 'Member early access is open'
        : 'FLINTA* early access is open';

  const handleSignup = (level: { levelKey: string; label: string }) => {
    if (!eventData) return;
    const intent: EventSignupIntent = {
      eventId: eventData.databaseId,
      eventTitle: eventData.title,
      levelKey: level.levelKey,
      levelLabel: level.label,
      eventType: eventDetails?.primaryType,
      accessNote: signupHelper,
      requiresFlintaAttestation,
    };
    openEventSignup(intent);
  };

  const eventDateValue = eventDetails?.eventDate || '';
  const eventDate = eventDateValue ? new Date(eventDateValue) : null;
  const eventDatePart = eventDateValue.split('T')[0];
  const eventDateForWeekday = eventDatePart ? new Date(`${eventDatePart}T12:00:00`) : null;
  const getOrdinal = (day: number) => {
    const mod10 = day % 10;
    const mod100 = day % 100;
    if (mod10 === 1 && mod100 !== 11) return `${day}st`;
    if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
    if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
    return `${day}th`;
  };
  const weekdayLabel =
    eventDateForWeekday && !Number.isNaN(eventDateForWeekday.getTime())
      ? eventDateForWeekday.toLocaleDateString([], { weekday: 'short' })
      : '';
  const monthLabel =
    eventDate && !Number.isNaN(eventDate.getTime())
      ? eventDate.toLocaleDateString([], { month: 'long' })
      : '';
  const dayLabel =
    eventDate && !Number.isNaN(eventDate.getTime()) ? getOrdinal(eventDate.getDate()) : '';
  const yearLabel =
    eventDate && !Number.isNaN(eventDate.getTime()) ? String(eventDate.getFullYear()) : '';
  const dateLabel =
    weekdayLabel && monthLabel && dayLabel && yearLabel
      ? `${weekdayLabel}, ${dayLabel} ${monthLabel}, ${yearLabel}`
      : eventDateValue;
  const timeLabel = eventDetails?.workshopStartTime?.trim() || eventDetails?.rideTime?.trim();
  const meetingPoint = eventDetails?.meetingPoint;
  const locationName = meetingPoint?.name || '';
  const locationStreetCity =
    meetingPoint?.street && meetingPoint?.city
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
        <div className="max-w-6xl mx-auto px-6">
          <div className="w-full border-t border-black/10 mt-10 mb-10" />
          <div className="flex flex-col lg:flex-row lg:justify-center lg:items-start gap-20">
            {/* Main content */}
            <article className="space-y-12 order-2 lg:order-1 flex-1 min-w-0">
              <div className="kandieEventPage max-w-none text-slate-600 leading-relaxed [&_h1]:text-4xl [&_h1]:font-heading-thin [&_h1]:tracking-normal [&_h2]:text-3xl [&_h2]:font-heading-thin [&_h2]:tracking-normal [&_h3]:text-3xl [&_h3]:font-heading-thin [&_h3]:tracking-normal [&_h4]:text-2xl [&_h4]:font-heading-thin [&_h4]:tracking-normal [&_h5]:text-xl [&_h5]:font-heading-thin [&_h5]:tracking-normal [&_h6]:font-heading-thin [&_h6]:tracking-normal [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2">
                <style>{`
                  .kandieEventPage h1, .kandieEventPage h2, .kandieEventPage h3, .kandieEventPage h4, .kandieEventPage h5, .kandieEventPage h6 {
                    color: var(--color-secondary-purple-rain);
                  }
                `}</style>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    rehypeRaw as any,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    rehypeSanitize as any,
                  ]}
                >
                  {normalizedDescription}
                </ReactMarkdown>
                {/* Dev debug helpers removed after verification */}
              </div>

              {/* Additional sections that mirror the Vertica layout: Guides / Speakers */}
              {guides.length > 0 &&
                eventDetails?.primaryType?.toLowerCase().includes('workshop') && (
                  <section>
                    <h2 className="text-2xl font-heading-thin tracking-normal text-secondary-purple-rain mb-6">
                      Speakers
                    </h2>
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
                  levels={levelsWithGuides.map((level) => {
                    const places = level.guides.length * 7;
                    const used = capacityCounts[level.levelKey] ?? 0;
                    const spotsLeft = Math.max(places - used, 0);
                    return {
                      ...level,
                      places,
                      spotsLeft,
                      isSoldOut: spotsLeft === 0,
                    };
                  })}
                  isPublic={isPublic}
                  canSignup={canSignupNow}
                  publicReleaseDate={publicReleaseDate}
                  signupState={{
                    label: signupLabel,
                    disabled: !canSignupNow,
                    helper: signupHelper,
                    allowWaitlist,
                  }}
                  onSignup={handleSignup}
                  workshop={
                    isWorkshop && workshopCapacity
                      ? {
                          capacity: workshopCapacity,
                          spotsLeft: Math.max(workshopCapacity - workshopCount, 0),
                        }
                      : undefined
                  }
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

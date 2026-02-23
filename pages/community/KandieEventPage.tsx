import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { imageSrc } from '../../lib/images';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import EventHeader from '../../components/event/EventHeader';
import GuideSection from '../../components/sections/GuideSection';
import EventSidebarCard from '../../components/event/EventSidebarCard';
import { KandieEventData, RideGuide } from '../../lib/events';
import { getKandieEventBySlug, transformMediaUrl } from '../../lib/wordpress';
import { useAuth } from '../../context/AuthContext';
import { useMemberLoginOffcanvas } from '../../context/MemberLoginOffcanvasContext';
import { supabase } from '../../lib/supabaseClient';
import {
  EVENT_SIGNUP_STORAGE_KEY,
  type EventSignupIntent,
} from '../../components/event/EventSignupPanel';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

export const KandieEventPage: React.FC = () => {
  const { yy, mm, dd, slug } = useParams<{ yy: string; mm: string; dd: string; slug: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { openEventSignup } = useMemberLoginOffcanvas();
  const [eventData, setEventData] = useState<KandieEventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoredSignup, setRestoredSignup] = useState(false);
  const [capacityCounts, setCapacityCounts] = useState<Record<string, number>>({});
  const [registrations, setRegistrations] = useState<Record<string, { isWaitlist: boolean }>>({});
  const [participantsByLevel, setParticipantsByLevel] = useState<
    Record<
      string,
      Array<{
        first_name: string;
        last_name: string;
        user_id: string | null;
        is_waitlist: boolean;
        created_at: string;
      }>
    >
  >({});
  const [cancelledLevels, setCancelledLevels] = useState<
    Record<string, { reason: string; cancelled_at: string }>
  >({});
  const [guideCancelTarget, setGuideCancelTarget] = useState<{
    levelKey: string;
    label: string;
  } | null>(null);
  const [guideCancelReason, setGuideCancelReason] = useState('');
  const [guideCancelLoading, setGuideCancelLoading] = useState(false);
  // Fetch all participants for the event and group by ride_level
  const refreshParticipantsByLevel = useCallback(async () => {
    if (!eventData?.databaseId || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('ride_level,first_name,last_name,user_id,is_waitlist,created_at')
        .eq('event_id', Number(eventData.databaseId))
        .is('cancelled_at', null);
      console.debug('[KandieEventPage] Supabase participants query result:', { data, error });
      if (error) {
        console.warn('Participant lookup failed:', error);
        return;
      }
      const grouped: Record<
        string,
        Array<{
          first_name: string;
          last_name: string;
          user_id: string | null;
          is_waitlist: boolean;
          created_at: string;
        }>
      > = {};
      (data ?? []).forEach((row) => {
        const level =
          typeof row.ride_level === 'string' && row.ride_level.trim() ? row.ride_level : 'workshop';
        if (!grouped[level]) grouped[level] = [];
        grouped[level].push({
          first_name: row.first_name,
          last_name: row.last_name,
          user_id: row.user_id,
          is_waitlist: row.is_waitlist ?? false,
          created_at: row.created_at,
        });
      });

      // Sort each level's participants by signup time (earliest first)
      Object.keys(grouped).forEach((level) => {
        grouped[level].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      console.debug('[KandieEventPage] participantsByLevel grouped:', grouped);
      setParticipantsByLevel(grouped);
    } catch (err) {
      console.warn('Participant lookup failed:', err);
    }
  }, [eventData?.databaseId, supabase]);

  const refreshCancelledLevels = useCallback(async () => {
    if (!eventData?.databaseId || !supabase) return;
    try {
      const { data } = await supabase
        .from('ride_level_cancellations')
        .select('ride_level, reason, cancelled_at')
        .eq('event_id', Number(eventData.databaseId));
      const map: Record<string, { reason: string; cancelled_at: string }> = {};
      (data ?? []).forEach((row) => {
        map[row.ride_level] = { reason: row.reason, cancelled_at: row.cancelled_at };
      });
      setCancelledLevels(map);
    } catch (err) {
      console.warn('Cancelled levels lookup failed:', err);
    }
  }, [eventData?.databaseId, supabase]);

  const refreshCapacity = useCallback(async () => {
    if (!eventData?.databaseId) return;
    const controller = new AbortController();
    try {
      const response = await fetch(`/api/event?eventId=${eventData.databaseId}`, {
        signal: controller.signal,
      });
      if (!response.ok) return;
      const data = (await response.json().catch(() => ({}))) as unknown;
      if (data && typeof data === 'object' && 'counts' in data) {
        setCapacityCounts(data.counts as Record<string, number>);
      }
    } catch {
      // Capacity is optional; ignore errors.
    } finally {
      controller.abort();
    }
  }, [eventData?.databaseId]);

  const refreshRegistrations = useCallback(async () => {
    if (!eventData?.databaseId || !user?.id || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('ride_level,is_waitlist')
        .eq('event_id', Number(eventData.databaseId))
        .eq('user_id', user.id)
        .is('cancelled_at', null);

      if (error) {
        console.warn('Registration lookup failed:', error);
        return;
      }
      const next: Record<string, { isWaitlist: boolean }> = {};
      (data ?? []).forEach((row) => {
        const level =
          typeof row.ride_level === 'string' && row.ride_level.trim() ? row.ride_level : 'workshop';
        next[level] = { isWaitlist: Boolean(row.is_waitlist) };
      });
      setRegistrations(next);
    } catch (err) {
      console.warn('Registration lookup failed:', err);
    }
  }, [eventData?.databaseId, user?.id]);

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

        // Transform gpxFile from { node: { id } } to string, safely
        type GpxFileNode = { node?: { id?: string } };
        const transformLevel = (
          level: import('../../lib/events').RideLevel | undefined
        ): import('../../lib/events').RideLevel | undefined => {
          if (!level) return undefined;
          let gpxFileId: string | undefined = undefined;
          if (typeof level.gpxFile === 'object' && level.gpxFile !== null) {
            const node = (level.gpxFile as GpxFileNode).node;
            if (node && typeof node.id === 'string') {
              gpxFileId = node.id;
            }
          }
          return {
            ...level,
            gpxFile: gpxFileId,
          };
        };

        const transformedEvent: KandieEventData = {
          ...event,
          slug, // ensure slug is always present
          databaseId: event.databaseId || '0', // fallback if undefined
          eventDetails: event.eventDetails
            ? {
                ...event.eventDetails,
                level1: transformLevel(
                  event.eventDetails.level1 as import('../../lib/events').RideLevel
                ),
                level2: transformLevel(
                  event.eventDetails.level2 as import('../../lib/events').RideLevel
                ),
                level2plus: transformLevel(
                  event.eventDetails.level2plus as import('../../lib/events').RideLevel
                ),
                level3: transformLevel(
                  event.eventDetails.level3 as import('../../lib/events').RideLevel
                ),
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
    refreshCapacity();
  }, [eventData?.databaseId, refreshCapacity]);

  useEffect(() => {
    if (!eventData?.databaseId || !user?.id) return;
    refreshRegistrations();
  }, [eventData?.databaseId, user?.id, refreshRegistrations]);

  useEffect(() => {
    if (!eventData?.databaseId) return;
    refreshParticipantsByLevel();
  }, [eventData?.databaseId, refreshParticipantsByLevel]);

  useEffect(() => {
    if (!eventData?.databaseId) return;
    refreshCancelledLevels();
  }, [eventData?.databaseId, refreshCancelledLevels]);

  useEffect(() => {
    if (!eventData?.databaseId || typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { eventId?: string } | undefined;
      if (detail?.eventId !== eventData.databaseId) return;
      console.log('[KandieEventPage] Signup complete event received');
      refreshCapacity();
      refreshRegistrations();
      refreshParticipantsByLevel();

      // Show success toast
      toast.success('Signup successful! Spots updated.', {
        duration: 3000,
        position: 'bottom-center',
      });
    };
    window.addEventListener('kandiegang:event-signup-complete', handler);
    return () => window.removeEventListener('kandiegang:event-signup-complete', handler);
  }, [eventData?.databaseId, refreshCapacity, refreshRegistrations, refreshParticipantsByLevel]);

  useEffect(() => {
    if (!eventData || !user || restoredSignup) return;
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('eventSignup') !== '1') return;
    const raw = sessionStorage.getItem(EVENT_SIGNUP_STORAGE_KEY);
    if (!raw) return;
    const intent = JSON.parse(raw) as EventSignupIntent;
    if (intent.eventId === eventData.databaseId) {
      // Debug log

      console.log('[KandieEventPage] Restoring signup intent and opening modal', intent);
      openEventSignup(intent);
      // After opening modal, clear sessionStorage and URL param
      setTimeout(() => {
        console.log('[KandieEventPage] Clearing sessionStorage and eventSignup param');
        sessionStorage.removeItem(EVENT_SIGNUP_STORAGE_KEY);
        url.searchParams.delete('eventSignup');
        window.history.replaceState(null, '', url.pathname + url.search);
        setRestoredSignup(true);
      }, 500);
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
      guides: (eventDetails?.level1?.guides?.nodes || []).map((guide) => ({
        id: guide.databaseId,
        name: guide.title,
      })),
      pace: paceByLevel['Level 1'],
      distanceKm: eventDetails?.level1?.distanceKm ?? null,
      routeUrl: eventDetails?.level1?.routeUrl,
    },
    {
      levelKey: 'level2',
      label: 'Level 2',
      guides: (eventDetails?.level2?.guides?.nodes || []).map((guide) => ({
        id: guide.databaseId,
        name: guide.title,
      })),
      pace: paceByLevel['Level 2'],
      distanceKm: eventDetails?.level2?.distanceKm ?? null,
      routeUrl: eventDetails?.level2?.routeUrl,
    },
    {
      levelKey: 'level2plus',
      label: 'Level 2+',
      guides: (eventDetails?.level2plus?.guides?.nodes || []).map((guide) => ({
        id: guide.databaseId,
        name: guide.title,
      })),
      pace: paceByLevel['Level 2+'],
      distanceKm: eventDetails?.level2plus?.distanceKm ?? null,
      routeUrl: eventDetails?.level2plus?.routeUrl,
    },
    {
      levelKey: 'level3',
      label: 'Level 3',
      guides: (eventDetails?.level3?.guides?.nodes || []).map((guide) => ({
        id: guide.databaseId,
        name: guide.title,
      })),
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
  const guidedLevels =
    profile?.is_guide && profile?.wp_user_id
      ? levelsWithGuides.filter((level) =>
          level.guides.some((g) => String(g.id) === String(profile.wp_user_id))
        )
      : [];
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
    flintaRelease && now >= flintaRelease && (!publicRelease || now < (publicRelease as Date))
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
      eventSlug: eventData.slug,
      eventUrl: yy && mm && dd && slug ? `https://www.kandiegang.com/event/${yy}/${mm}/${dd}/${slug}` : undefined,
      eventTitle: eventData.title,
      levelKey: level.levelKey,
      levelLabel: level.label,
      eventType: eventDetails?.primaryType,
      accessNote: signupHelper,
      requiresFlintaAttestation,
    };
    openEventSignup(intent);
  };

  const handleCancelRegistration = async (levelKey: string) => {
    if (!supabase || !user?.id || !eventData?.databaseId) return;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) return;
      const response = await fetch('/api/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'cancel', eventId: eventData.databaseId, rideLevel: levelKey }),
      });
      if (!response.ok) return;
      refreshCapacity();
      refreshRegistrations();
    } catch {
      // Ignore cancel errors for now; users still have email cancel.
    }
  };

  const handleGuideCancelRide = async (levelKey: string, reason: string) => {
    if (!supabase || !eventData?.databaseId) return;
    setGuideCancelLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast.error('You must be logged in to cancel a ride.');
        return;
      }
      const response = await fetch('/api/guide-cancel-ride', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ eventId: eventData.databaseId, rideLevel: levelKey, reason }),
      });
      if (response.ok) {
        toast.success('Ride cancelled. Riders have been notified by email.');
        setGuideCancelTarget(null);
        setGuideCancelReason('');
        refreshCancelledLevels();
        refreshParticipantsByLevel();
      } else {
        const json = await response.json().catch(() => ({}));
        toast.error((json as { error?: string })?.error || 'Failed to cancel the ride.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setGuideCancelLoading(false);
    }
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
    <>
      <Toaster />
      <div className="bg-white min-h-screen pt-0 selection:bg-[#f9f100] selection:text-black">
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
                {/* Participants by guided level — visible to guides only */}
                {guidedLevels.length > 0 && (
                  <section>
                    <hr className="border-t border-black/10 mb-10" />
                    <h2 className="text-2xl font-heading-light tracking-normal text-secondary-purple-rain mb-6">
                      Your Riders
                    </h2>
                    <div className="space-y-8">
                      {guidedLevels.map((level) => {
                        const allParticipants = participantsByLevel[level.levelKey] ?? [];
                        const confirmed = allParticipants.filter((p) => !p.is_waitlist);
                        const waitlisted = allParticipants.filter((p) => p.is_waitlist);
                        const cancellation = cancelledLevels[level.levelKey];
                        return (
                          <div key={level.levelKey}>
                            <h3 className="text-lg font-medium text-primary-ink mb-3">{level.label}</h3>
                            {allParticipants.length === 0 ? (
                              <p className="text-sm text-slate-500">No riders yet.</p>
                            ) : (
                              <div className="space-y-4">
                                {confirmed.length > 0 && (
                                  <div>
                                    <p className="text-xs tracking-[0.08em] text-secondary-purple-rain mb-2">
                                      Confirmed ({confirmed.length})
                                    </p>
                                    <ul className="space-y-1">
                                      {confirmed.map((p, i) => (
                                        <li key={p.user_id || i} className="text-sm text-primary-ink">
                                          {p.first_name} {p.last_name ? p.last_name.charAt(0) + '.' : ''}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {waitlisted.length > 0 && (
                                  <div>
                                    <p className="text-xs tracking-[0.08em] text-secondary-purple-rain mb-2">
                                      Waitlist ({waitlisted.length})
                                    </p>
                                    <ul className="space-y-1">
                                      {waitlisted.map((p, i) => (
                                        <li key={p.user_id || i} className="text-sm text-slate-500">
                                          {p.first_name} {p.last_name ? p.last_name.charAt(0) + '.' : ''}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="mt-4">
                              {cancellation ? (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                                  <p className="text-sm font-medium text-red-700">Ride cancelled</p>
                                  <p className="text-sm text-red-600 mt-1">{cancellation.reason}</p>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setGuideCancelTarget({ levelKey: level.levelKey, label: level.label })
                                  }
                                  className="text-sm text-red-500 hover:text-red-700 hover:underline"
                                >
                                  Cancel this ride
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
                {/* Guide cancel ride modal */}
                {guideCancelTarget && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Cancel ride"
                    onClick={() => {
                      if (!guideCancelLoading) {
                        setGuideCancelTarget(null);
                        setGuideCancelReason('');
                      }
                    }}
                  >
                    <div
                      className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="text-lg font-semibold text-primary-ink">
                        Cancel {guideCancelTarget.label} ride?
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        This will cancel the ride for all confirmed and waitlisted riders. Everyone on
                        your list will receive an email with your reason.
                      </p>
                      <div className="mt-4">
                        <label
                          htmlFor="guide-cancel-reason"
                          className="block text-xs tracking-[0.08em] text-secondary-purple-rain mb-2"
                        >
                          Reason for cancellation
                        </label>
                        <textarea
                          id="guide-cancel-reason"
                          value={guideCancelReason}
                          onChange={(e) => setGuideCancelReason(e.target.value)}
                          placeholder="Let your riders know why (e.g., weather, personal emergency)…"
                          rows={3}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-primary-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-secondary-purple-rain/40 resize-none"
                          disabled={guideCancelLoading}
                        />
                      </div>
                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setGuideCancelTarget(null);
                            setGuideCancelReason('');
                          }}
                          disabled={guideCancelLoading}
                          className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Keep ride
                        </button>
                        <button
                          type="button"
                          disabled={guideCancelLoading || guideCancelReason.trim().length < 3}
                          onClick={() =>
                            handleGuideCancelRide(guideCancelTarget.levelKey, guideCancelReason.trim())
                          }
                          className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {guideCancelLoading ? 'Cancelling…' : 'Yes, cancel ride'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
                        isCancelledByGuide: !!cancelledLevels[level.levelKey],
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
                    registrations={registrations}
                    onCancelRegistration={handleCancelRegistration}
                    workshop={
                      isWorkshop && workshopCapacity
                        ? {
                            capacity: workshopCapacity,
                            spotsLeft: Math.max(workshopCapacity - workshopCount, 0),
                          }
                        : undefined
                    }
                    participantsByLevel={participantsByLevel}
                  />
                </div>
              </aside>
            </div>
          </div>
        </section>
        {/* Partner CTA (sits above global newsletter section) */}
        <div className="w-full px-4 md:px-6 mt-20">
          <section className="relative rounded-xl p-12 md:p-24 flex flex-col items-center text-center mb-1 overflow-hidden">
            <img
              src={imageSrc('/images/250923_kandiegangsocialride-10-2048x1539')}
              alt="Kandie Gang Social Ride"
              width={1920}
              height={1539}
              className="absolute inset-0 w-full h-full object-cover object-top z-0 kandie-img-full"
              aria-hidden
            />
            <style>{`
                .kandie-img-full {
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: 100% !important;
                }
              `}</style>
            <div className="absolute inset-0 bg-slate-900/70" aria-hidden />
            <div className="relative z-10 flex flex-col items-center">
              <h2 className="text-4xl md:text-6xl font-light tracking-normal text-white mb-8">
                Become a Kandie Gang Member
              </h2>
              <p className="text-xl text-white/90 mb-12 max-w-xl font-light">
                Early event access, product discounts, and more.
              </p>
              <Link
                to="/shop/kandie-gang-cycling-club-membership"
                className="group inline-flex flex-nowrap items-center justify-center gap-2 rounded-full border border-white bg-transparent px-6 py-4 text-sm font-medium text-secondary-blush transition-colors hover:border-secondary-blush hover:bg-secondary-blush hover:text-white active:scale-95 md:gap-2 md:text-base"
              >
                <span>Join us</span>
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary-blush/20 p-1 transition-colors group-hover:bg-white">
                  <svg
                    className="h-3 w-3 text-secondary-blush transition-colors"
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default KandieEventPage;

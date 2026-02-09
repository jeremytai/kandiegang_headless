/**
 * KandieEventPage.tsx
 * Detailed event page showing all information about a specific Kandie Gang ride or workshop.
 * Fetches event data from WordPress GraphQL by database ID.
 * Design inspired by Vertica's clean, minimal event pages.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, ArrowRight, Zap, ChevronLeft, Loader2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { getKandieEventBySlug, transformMediaUrl } from '../lib/wordpress';
import { KandieEventData, RideLevel } from '../types/events';

export const KandieEventPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState<KandieEventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!slug) {
        setError('No event slug provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const event = await getKandieEventBySlug(slug);
        if (event) {
          setEventData(event);
        } else {
          setError('Event not found');
        }
      } catch (err) {
        console.error('[Event] Error fetching event:', err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-secondary-purple-rain" />
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6">
        <p className="text-secondary-purple-rain text-lg">{error || 'Event not found'}</p>
        <button
          onClick={() => navigate('/community')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-purple-rain text-white rounded hover:opacity-80"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Community
        </button>
      </div>
    );
  }

  const { title, featuredImage, eventDetails } = eventData;
  const {
    primaryType = 'Event',
    eventDate = new Date().toISOString(),
    description = '',
    workshopCapacity,
    workshopStartTime,
    rideCategory,
    isFlintaOnly = false,
    publicReleaseDate = new Date().toISOString(),
    meetingPoint = {},
    level1,
    level2,
    level2plus,
    level3,
  } = eventDetails || {};

  const isPublicPhase = new Date() >= new Date(publicReleaseDate);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    return new Date(`2000-01-01 ${timeStr}`).toLocaleTimeString('en-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const levels: { id: string; label: string; data?: RideLevel }[] = [
    { id: '1', label: 'Level 1', data: level1 },
    { id: '2', label: 'Level 2', data: level2 },
    { id: '2plus', label: 'Level 2+', data: level2plus },
    { id: '3', label: 'Level 3', data: level3 },
  ];

  const isGroupRide = primaryType?.toLowerCase() === 'social ride' || primaryType?.toLowerCase() === 'road event';
  const hasRideLevels = levels.some(l => l.data?.guides?.nodes);

  return (
    <div className="min-h-screen bg-white text-black selection:bg-[#f9f100]">
      {/* Back Button */}
      <button
        onClick={() => navigate('/community')}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-white rounded border border-slate-300 hover:bg-slate-100 transition-colors text-sm font-medium"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      {/* HERO SECTION */}
      <section className="relative w-full h-[50vh] md:h-[60vh] bg-black overflow-hidden">
        {/* Background Image */}
        {featuredImage?.node?.sourceUrl && (
          <div className="absolute inset-0">
            <img
              src={transformMediaUrl(featuredImage.node.sourceUrl)}
              className="w-full h-full object-cover opacity-40"
              alt={title}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
          </div>
        )}

        {/* Hero Content */}
        <div className="relative h-full flex flex-col justify-center px-6 md:px-12 lg:px-16 max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-[#f9f100] text-black px-4 py-2 text-xs font-black uppercase tracking-wide rounded-full">
                {primaryType}
              </span>
              {isFlintaOnly && (
                <span className="bg-secondary-blush text-white px-4 py-2 text-xs font-black uppercase tracking-wide rounded-full">
                  FLINTA* Priority
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading-light text-white mb-6 leading-tight max-w-2xl">
              {title}
            </h1>
          </motion.div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-16 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
            {/* Left Column: Event Details & Info */}
            <div className="lg:col-span-2 space-y-12">
              {/* Event Meta Info Box */}
              <div className="border border-slate-200 rounded-lg p-8 bg-slate-50">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-secondary-purple-rain">
                      <Calendar className="w-5 h-5" />
                      <span className="text-xs font-black uppercase tracking-widest">Date</span>
                    </div>
                    <p className="text-base font-medium text-slate-900">{formatDate(eventDate)}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3 text-secondary-purple-rain">
                      <MapPin className="w-5 h-5" />
                      <span className="text-xs font-black uppercase tracking-widest">Location</span>
                    </div>
                    <p className="text-base font-medium text-slate-900">{meetingPoint?.city || 'TBA'}</p>
                    {meetingPoint?.name && <p className="text-sm text-slate-600 mt-1">{meetingPoint.name}</p>}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3 text-secondary-purple-rain">
                      <Users className="w-5 h-5" />
                      <span className="text-xs font-black uppercase tracking-widest">Capacity</span>
                    </div>
                    <p className="text-base font-medium text-slate-900">
                      {primaryType?.toLowerCase() === 'workshop'
                        ? `${workshopCapacity || 0} Spots`
                        : rideCategory?.replace(/_/g, ' ') || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-2xl md:text-3xl font-heading-light mb-6 text-secondary-purple-rain">About</h2>
                <p className="text-base md:text-lg leading-relaxed text-slate-800 whitespace-pre-wrap font-light">
                  {description}
                </p>
              </div>

              {/* Meeting Point Details */}
              {meetingPoint?.name && (
                <div className="border-l-4 border-[#f9f100] pl-6">
                  <h3 className="text-xl font-heading-light mb-4 text-secondary-purple-rain flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Meeting Point
                  </h3>
                  <p className="text-base text-slate-800 space-y-1">
                    {meetingPoint.name && <div className="font-semibold">{meetingPoint.name}</div>}
                    {meetingPoint.street && <div>{meetingPoint.street}</div>}
                    {meetingPoint.city && <div>{meetingPoint.city}</div>}
                  </p>
                </div>
              )}

              {/* Workshop Start Time */}
              {workshopStartTime && (
                <div className="border-l-4 border-[#f9f100] pl-6">
                  <h3 className="text-xl font-heading-light mb-4 text-secondary-purple-rain">Event Time</h3>
                  <p className="text-base font-semibold text-slate-900">{workshopStartTime}</p>
                </div>
              )}

              {/* Ride Levels Section */}
              {isGroupRide && hasRideLevels && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-heading-light mb-8 text-secondary-purple-rain">Ride Levels</h2>
                  <div className="space-y-6">
                    {levels.map((lvl) => {
                      const guides = lvl.data?.guides?.nodes || [];
                      if (guides.length === 0) return null;

                      return (
                        <div key={lvl.id} className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg md:text-xl font-heading-light text-secondary-purple-rain">
                              Level {lvl.id}
                            </h3>
                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded">
                              {guides.length * 7} Spots
                            </span>
                          </div>

                          {/* Guides */}
                          <div className="mb-6">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-600 mb-3">
                              Guided by
                            </p>
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="flex -space-x-3">
                                {guides.slice(0, 3).map((g, i) => (
                                  <img
                                    key={i}
                                    src={
                                      g.featuredImage?.node?.sourceUrl
                                        ? transformMediaUrl(g.featuredImage.node.sourceUrl)
                                        : '/default-avatar.png'
                                    }
                                    className="w-10 h-10 rounded-full border-2 border-white object-cover"
                                    alt={g.title}
                                    title={g.title}
                                  />
                                ))}
                              </div>
                              <p className="text-sm text-slate-700 font-medium">{guides.map((g) => g.title).join(' & ')}</p>
                            </div>
                          </div>

                          {/* CTA Buttons */}
                          <div className="flex flex-wrap gap-3">
                            <button
                              disabled={!isPublicPhase}
                              className={`flex-1 min-w-[200px] py-3 px-4 rounded font-black uppercase text-sm tracking-wide transition-all flex items-center justify-between ${
                                isPublicPhase
                                  ? 'bg-[#f9f100] text-black hover:bg-black hover:text-[#f9f100] border border-black'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              {isPublicPhase ? 'Join the Pack' : 'Locked'}
                              <ArrowRight className="w-4 h-4" />
                            </button>

                            {lvl.data?.gpxFile?.node?.mediaItemUrl && (
                              <a
                                href={lvl.data.gpxFile.node.mediaItemUrl}
                                download
                                className="py-3 px-4 border border-slate-300 rounded font-semibold text-sm hover:bg-slate-50 transition-colors flex items-center gap-2"
                                title="Download GPX"
                              >
                                GPX
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sticky Signup Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 border border-slate-200 rounded-lg p-8 bg-slate-50">
                <h3 className="text-2xl font-heading-light mb-6 text-secondary-purple-rain">
                  {isGroupRide ? 'Join Now' : 'Register'}
                </h3>

                {!isGroupRide && (
                  <div className="space-y-6 mb-6">
                    <div className="text-center py-8 bg-white border border-dashed border-slate-300 rounded">
                      <p className="text-3xl font-black text-secondary-purple-rain">{workshopCapacity || 0}</p>
                      <p className="text-xs font-semibold text-slate-500 uppercase mt-2 tracking-widest">Available Spots</p>
                    </div>

                    <button
                      disabled={!isPublicPhase}
                      className={`w-full py-4 rounded font-black uppercase tracking-wide transition-all flex items-center justify-between px-4 ${
                        isPublicPhase
                          ? 'bg-secondary-purple-rain text-white hover:bg-slate-900'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isPublicPhase ? 'Book Now' : 'Locked'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Info Box */}
                <div className="bg-white border border-slate-200 rounded p-4 text-xs space-y-3">
                  {!isPublicPhase && (
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">Not Public Yet</p>
                      <p className="text-slate-600">
                        Public release: {new Date(publicReleaseDate).toLocaleDateString('en-DE')}
                      </p>
                      {isFlintaOnly && (
                        <p className="text-[#f9f100] font-semibold mt-2">FLINTA* priority access on Discord</p>
                      )}
                    </div>
                  )}

                  {isPublicPhase && isFlintaOnly && (
                    <div>
                      <p className="font-semibold text-secondary-blush flex items-center gap-1">
                        ✓ FLINTA* Priority
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default KandieEventPage;

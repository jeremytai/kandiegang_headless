/**
 * EventPage.tsx
 * Standalone event page (e.g. UX Connect 26). Renders title, description,
 * date/location, speakers, and partners from event data.
 * Route: /event/:slug (e.g. /event/ux-connect-26)
 * CTA: logged-in users go to /members; others open a login sidebar.
 */

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Calendar } from "lucide-react";
import { getKandieEventBySlug } from "../lib/wordpress";
import { AnimatedHeadline } from "../components/AnimatedHeadline";
import { useAuth } from "../context/AuthContext";
import { useMemberLoginOffcanvas } from "../context/MemberLoginOffcanvasContext";

export const EventPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, status } = useAuth();
  const { openMemberLogin } = useMemberLoginOffcanvas();
  const [event, setEvent] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchEvent = async () => {
      if (!slug) return;
      try {
        const e = await getKandieEventBySlug(slug);
        if (mounted) setEvent(e);
      } catch (err) {
        console.error('Failed to load event', err);
      }
    };

    fetchEvent();
    return () => { mounted = false; };
  }, [slug]);

  if (!slug || !event) {
    return (
      <div className="min-h-screen pt-32 md:pt-40 pb-40 flex flex-col items-center justify-center bg-primary-breath">
        <p className="text-slate-500 mb-6">Event not found.</p>
        <Link
          to="/community"
          className="inline-flex items-center gap-2 text-secondary-purple-rain font-bold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Community
        </Link>
      </div>
    );
  }

  const {
    title,
    description,
    location,
    address,
    dateRange,
    time,
    price,
    ctaLabel,
    speakers,
    partners,
  } = event;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="bg-primary-breath min-h-screen selection:bg-[#f9f100] selection:text-black"
    >
      <div className="max-w-3xl mx-auto px-6 pt-32 md:pt-40 pb-24">
        <div className="mb-10">
          <Link
            to="/community"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-primary-ink text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Community
          </Link>
        </div>

        {/* Hero / Title */}
        <header className="text-center mb-12">
          <AnimatedHeadline
            as="h1"
            text={title}
            lineHeight={1.2}
            className="text-4xl md:text-5xl lg:text-6xl font-heading-thin tracking-normal text-secondary-purple-rain mb-6 text-balance"
          />
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-slate-600 text-sm md:text-base">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 shrink-0" aria-hidden />
              {dateRange}
              {time != null && ` · ${time}`}
            </span>
            <span className="text-slate-400" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 shrink-0" aria-hidden />
              {address ?? location}
            </span>
          </div>
        </header>

        {/* Description */}
        <section className="mb-12">
          <div className="prose prose-lg max-w-none text-primary-ink leading-relaxed whitespace-pre-line">
            {description}
          </div>
        </section>

        {/* Price & CTA — logged in: link to /members; else: open login sidebar */}
        {(price != null || ctaLabel != null) && (
          <section className="mb-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-primary-ecru border border-primary-ecru">
            {price != null && (
              <p className="text-sm md:text-base text-slate-700 font-medium m-0">
                {price}
              </p>
            )}
            {ctaLabel != null &&
              (status === "loading" ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-secondary-purple-rain/70 px-5 py-2.5 text-sm font-medium text-white shrink-0">
                  {ctaLabel}
                </span>
              ) : user ? (
                <Link
                  to="/members"
                  className="inline-flex items-center gap-2 rounded-full bg-secondary-purple-rain px-5 py-2.5 text-sm font-medium text-white hover:bg-secondary-current transition-colors shrink-0"
                >
                  {ctaLabel}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={openMemberLogin}
                  className="inline-flex items-center gap-2 rounded-full bg-secondary-purple-rain px-5 py-2.5 text-sm font-medium text-white hover:bg-secondary-current transition-colors shrink-0"
                >
                  {ctaLabel}
                </button>
              ))}
          </section>
        )}

        {/* Speakers */}
        {speakers != null && speakers.length > 0 && (
          <section className="mt-14">
            <h2 className="text-2xl font-heading-regular text-primary-ink mb-8">
              Speakers
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 list-none p-0 m-0">
              {speakers.map((speaker) => (
                <li
                  key={speaker.name}
                  className="text-center"
                >
                  {speaker.image != null ? (
                    <img
                      src={speaker.image}
                      alt=""
                      className="w-full aspect-square object-cover rounded-xl mb-3 mx-auto max-w-[180px]"
                    />
                  ) : (
                    <div
                      className="w-full aspect-square max-w-[180px] mx-auto mb-3 rounded-xl bg-primary-ecru flex items-center justify-center text-secondary-purple-rain font-heading-thin text-4xl"
                      aria-hidden
                    >
                      {speaker.name.charAt(0)}
                    </div>
                  )}
                  <p className="font-semibold text-primary-ink m-0 text-base">
                    {speaker.name}
                  </p>
                  <p className="text-slate-600 text-sm mt-0.5 m-0">
                    {speaker.title}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Partners */}
        {partners != null && partners.length > 0 && (
          <section className="mt-14 pt-10 border-t border-slate-200">
            <h2 className="text-xl font-heading-regular text-primary-ink mb-4">
              With support from
            </h2>
            <p className="text-slate-600 text-sm md:text-base leading-relaxed m-0">
              {partners}
            </p>
          </section>
        )}
      </div>
    </motion.main>
  );
};

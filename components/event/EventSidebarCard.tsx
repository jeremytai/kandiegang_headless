import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Link, Info, User, Clock, X } from 'lucide-react';

interface EventSidebarCardProps {
  date: string;
  time?: string;
  location: string;
  category?: string;
  type?: string;
  levels?: Array<{
    levelKey: string;
    label: string;
    guides: Array<{ id: string | number; name?: string; email?: string }>;
    pace?: string;
    distanceKm?: number | null;
    routeUrl?: string;
    places?: number;
    spotsLeft?: number;
    isSoldOut?: boolean;
  }>;
  isPublic: boolean;
  canSignup: boolean;
  publicReleaseDate?: string;
  signupState?: {
    label: string;
    disabled: boolean;
    helper?: string;
    allowWaitlist?: boolean;
  };
  onSignup?: (level: { levelKey: string; label: string }) => void;
  registrations?: Record<string, { isWaitlist: boolean }>;
  onCancelRegistration?: (levelKey: string) => void;
  workshop?: {
    capacity: number;
    spotsLeft?: number;
  };
  // currentUser?: { email: string; id: string; name?: string };
  participantsByLevel?: Record<
    string,
    Array<{
      first_name: string;
      last_name: string;
      user_id: string | null;
      is_waitlist: boolean;
      created_at: string;
    }>
  >;
}

import { useAuth } from '../../context/AuthContext';
const EventSidebarCard: React.FC<EventSidebarCardProps> = ({
  date,
  time,
  location,
  category,
  type,
  levels,
  isPublic,
  canSignup,
  publicReleaseDate,
  signupState,
  onSignup,
  registrations,
  onCancelRegistration,
  workshop,
  participantsByLevel,
}) => {
  const { profile: currentUser } = useAuth();
  const labelClass = 'text-xs tracking-[0.08em] text-secondary-purple-rain';
  const valueClass = 'text-sm text-primary-ink';
  const locationLines = location.split('\n');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [routeModal, setRouteModal] = useState<{ url: string; label: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [cancelTarget, setCancelTarget] = useState<{ key: string; label: string } | null>(null);
  const [participantsSidebar, setParticipantsSidebar] = useState<{
    levelKey: string;
    label: string;
  } | null>(null);

  useEffect(() => {
    if (isPublic) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isPublic]);

  const countdownLabel = useMemo(() => {
    if (isPublic || !publicReleaseDate) return '';
    const target = new Date(publicReleaseDate).getTime();
    if (Number.isNaN(target)) return '';
    const diffMs = Math.max(0, target - now);
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad2 = (value: number) => String(value).padStart(2, '0');
    if (days > 0) {
      return `${days}d ${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`;
    }
    return `${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`;
  }, [isPublic, publicReleaseDate, now]);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const placesPerGuide = 7;

  const isWorkshop = type === 'workshop';
  return (
    <aside className="bg-primary-breath p-6 rounded-lg space-y-4">
      <div>
        <div className="space-y-1 mb-4">
          <p className={labelClass}>Date & Time</p>
          <p className="text-lg font-semibold text-primary-ink">
            {date}
            {time && <span className={`ml-2 ${valueClass}`}>{time}</span>}
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <p className={labelClass}>Location</p>
            <p className={valueClass}>
              {locationLines.map((line, index) => (                  
                <span
                key={`${line}-${index}`}
                className={index === 0 ? 'font-semibold' : undefined}
                >
                  {line}
                  {index < locationLines.length - 1 && <br />}
                </span>
              ))}
            </p>
          </div>
          {category && (
            <div>
              <p className={labelClass}>Category</p>
              <p className={valueClass}>{typeof category === 'string' ? category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : category}</p>
            </div>
          )}
          {type && (
            <div>
              <p className={labelClass}>Type</p>
              <p className={valueClass}>{typeof type === 'string' ? type.charAt(0).toUpperCase() + type.slice(1) : type}</p>
            </div>
          )}
          {type && <div className="mb-2" />}
        </div>
        {!isWorkshop && <hr className="border-t border-black/10" />}
        {levels && levels.length > 0 && (
          <div>
            {isWorkshop
              ? levels.map((level) => {
                  const registration = registrations?.[level.levelKey];
                  const isGuide = !!(
                    currentUser &&
                    currentUser.is_guide &&
                    currentUser.wp_user_id &&
                    Array.isArray(level.guides) &&
                    level.guides.some((g) => String(g.id) === String(currentUser.wp_user_id))
                  );
                  return (
                    <div
                      key={level.label}
                      className="border-t border-black/10 py-3 first:border-t-0"
                    >
                      <span className="text-sm font-normal text-primary-ink flex items-center gap-2">
                        {level.label}
                        {isGuide && null}
                        {level.spotsLeft != null && level.places != null && (
                          <span className="text-xs font-light text-slate-200">
                            {`${level.spotsLeft} of ${level.places} Spots available`}
                          </span>
                        )}
                      </span>
                      {/* No chevron or toggle for workshop */}
                      <div className="pt-2 space-y-3">
                        <div>
                          <p className={labelClass}>Guides</p>
                          <p className={valueClass}>
                            {level.guides.map((g) => g.name || g.email || g.id).join(', ')}
                          </p>
                        </div>
                        <div>
                          <p className={labelClass}>Spots Available</p>
                          <p className={valueClass}>
                            {level.places ?? placesPerGuide * level.guides.length}
                            {level.spotsLeft != null && ` total · ${level.spotsLeft} left`}
                          </p>
                        </div>
                        {typeof level.distanceKm === 'number' && (
                          <div>
                            <p className={labelClass}>Distance</p>
                            <p className={valueClass}>{`${level.distanceKm} km`}</p>
                          </div>
                        )}
                        {level.pace && (
                          <div>
                            <p className={labelClass}>Pace</p>
                            <p className={valueClass}>{level.pace}</p>
                          </div>
                        )}
                        {level.routeUrl && (
                          <div>
                            <p className={labelClass}>Route</p>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                className={valueClass}
                                onClick={() =>
                                  setRouteModal({
                                    url: level.routeUrl as string,
                                    label: level.label,
                                  })
                                }
                              >
                                View Route
                              </button>
                              <a
                                className="inline-flex items-center text-slate-500 hover:text-slate-800"
                                href={level.routeUrl}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Open ${level.label} route in a new tab`}
                              >
                                <Link className="h-4 w-4" aria-hidden />
                              </a>
                            </div>
                          </div>
                        )}
                        {signupState?.helper && (
                          <p className="text-xs text-slate-500">{signupState.helper}</p>
                        )}
                        {level.isSoldOut && signupState?.allowWaitlist && (
                          <span className="inline-flex items-center rounded-full bg-secondary-purple-rain/15 px-3 py-1 text-xs font-medium text-secondary-purple-rain border border-secondary-purple-rain/30">
                            Waitlist open
                          </span>
                        )}
                        {registration ? (
                          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            <p className="font-semibold">
                              {registration.isWaitlist
                                ? "You're on the waitlist."
                                : "You're spot is saved."}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setCancelTarget({ key: level.levelKey, label: level.label })
                              }
                              className="mt-1 text-xs text-secondary-purple-rain hover:underline"
                            >
                              Can't make it? Cancel your spot
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="w-full bg-secondary-purple-rain hover:bg-secondary-purple-rain/80 text-white font-semibold py-2 px-4 rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            disabled={
                              (!signupState?.allowWaitlist && level.isSoldOut) ||
                              signupState?.disabled ||
                              !canSignup
                            }
                            onClick={() =>
                              onSignup?.({ levelKey: level.levelKey, label: level.label })
                            }
                          >
                            {level.isSoldOut
                              ? signupState?.allowWaitlist
                                ? 'Join Waitlist'
                                : 'Sold Out'
                              : (signupState?.label ?? (isPublic ? 'Sign Up' : 'Coming Soon'))}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              : levels.map((level, index) => {
                  // ...existing code for toggling/accordion UI...
                  const isOpen = openIndex === index;
                  const registration = registrations?.[level.levelKey];
                  const isGuide = !!(
                    currentUser &&
                    currentUser.is_guide &&
                    currentUser.wp_user_id &&
                    Array.isArray(level.guides) &&
                    level.guides.some((g) => String(g.id) === String(currentUser.wp_user_id))
                  );
                  return (
                    <div
                      key={level.label}
                      className="overflow-hidden border-t border-black/10 py-3 first:border-t-0"
                    >
                      <div className="flex w-full items-start justify-between text-left group">
                        <button
                          type="button"
                          onClick={() => toggleIndex(index)}
                          className="flex flex-1 items-center gap-2 text-left min-w-0"
                        >
                          <span className="text-sm font-normal text-primary-ink">{level.label}</span>
                          {!isOpen && level.spotsLeft != null && level.places != null && (
                            <span className="text-xs font-normal text-slate-500">
                              {`${level.spotsLeft} of ${level.places} Spots available`}
                            </span>
                          )}
                        </button>
                        <div className="flex items-center shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleIndex(index)}
                            className="p-1"
                            aria-label={isOpen ? 'Collapse section' : 'Expand section'}
                          >
                            <span
                              className={`inline-flex shrink-0 pt-0.5 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
                            >
                              <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
                            </span>
                          </button>
                        </div>
                      </div>
                      {isOpen && (
                        <div className="pt-2 space-y-3">
                          <div>
                            <p className={labelClass}>Guides</p>
                            <p className={valueClass}>
                              {level.guides.map((g) => g.name || g.email || g.id).join(', ')}
                            </p>
                          </div>
                          <div>
                            <p className={labelClass}>Spots Available</p>
                            <p className={valueClass}>
                              {level.places ?? placesPerGuide * level.guides.length}
                              {level.spotsLeft != null && ` total · ${level.spotsLeft} left`}
                            </p>
                          </div>
                          {typeof level.distanceKm === 'number' && (
                            <div>
                              <p className={labelClass}>Distance</p>
                              <p className={valueClass}>{`${level.distanceKm} km`}</p>
                            </div>
                          )}
                          {level.pace && (
                            <div>
                              <p className={labelClass}>Pace</p>
                              <p className={valueClass}>{level.pace}</p>
                            </div>
                          )}
                          {level.routeUrl && (
                            <div>
                              <p className={labelClass}>Route</p>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  className={valueClass}
                                  onClick={() =>
                                    setRouteModal({
                                      url: level.routeUrl as string,
                                      label: level.label,
                                    })
                                  }
                                >
                                  View Route
                                </button>
                                <a
                                  className="inline-flex items-center text-slate-500 hover:text-slate-800"
                                  href={level.routeUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`Open ${level.label} route in a new tab`}
                                >
                                  <Link className="h-4 w-4" aria-hidden />
                                </a>
                              </div>
                            </div>
                          )}
                          {signupState?.helper && (
                            <p className="text-xs text-slate-500">{signupState.helper}</p>
                          )}
                          {level.isSoldOut && signupState?.allowWaitlist && (
                            <span className="inline-flex items-center rounded-full bg-secondary-purple-rain/15 px-3 py-1 text-xs font-medium text-secondary-purple-rain border border-secondary-purple-rain/30">
                              Waitlist open
                            </span>
                          )}
                          {registration ? (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                              <p className="font-semibold">
                                {registration.isWaitlist
                                  ? "You're on the waitlist."
                                  : "You're spot is saved."}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  setCancelTarget({ key: level.levelKey, label: level.label })
                                }
                                className="mt-1 text-xs text-secondary-drift hover:underline"
                              >
                                Can't make it? Cancel your spot
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="w-full bg-secondary-purple-rain hover:bg-secondary-signal text-white font-normal py-2 px-4 rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              disabled={
                                (!signupState?.allowWaitlist && level.isSoldOut) ||
                                signupState?.disabled ||
                                !canSignup
                              }
                              onClick={() =>
                                onSignup?.({ levelKey: level.levelKey, label: level.label })
                              }
                            >
                              {level.isSoldOut
                                ? signupState?.allowWaitlist
                                  ? 'Join Waitlist'
                                  : 'Sold Out'
                                : (signupState?.label ?? (isPublic ? 'Sign Up' : 'Coming Soon'))}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
          </div>
        )}

        {/* Info modal removed */}
        {workshop && (
          <div className="pt-2 space-y-3">
            <div>
              <p className={labelClass}>Workshop spots</p>
              <p className={valueClass}>
                {workshop.capacity}
                {workshop.spotsLeft != null && ` total · ${workshop.spotsLeft} left`}
              </p>
            </div>
            {signupState?.helper && <p className="text-xs text-slate-500">{signupState.helper}</p>}
            {(workshop.spotsLeft ?? 1) <= 0 && signupState?.allowWaitlist && (
              <span className="inline-flex items-center rounded-full bg-secondary-purple-rain/15 px-3 py-1 text-xs font-medium text-secondary-purple-rain border border-secondary-purple-rain/30">
                Waitlist open
              </span>
            )}
            {registrations?.workshop ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <p className="font-semibold">
                  {registrations.workshop.isWaitlist
                    ? "You're on the waitlist."
                    : "You're spot is saved."}
                </p>
                <button
                  type="button"
                  onClick={() => setCancelTarget({ key: 'workshop', label: 'Workshop' })}
                  className="mt-1 text-xs text-secondary-drift hover:underline"
                >
                  Can't make it? Cancel your spot
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="w-full bg-secondary-purple-rain hover:bg-secondary-signal text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={
                  ((workshop.spotsLeft ?? 1) <= 0 && !signupState?.allowWaitlist) ||
                  signupState?.disabled ||
                  !canSignup
                }
                onClick={() => onSignup?.({ levelKey: 'workshop', label: 'Workshop' })}
              >
                {(workshop.spotsLeft ?? 1) <= 0
                  ? signupState?.allowWaitlist
                    ? 'Join Waitlist'
                    : 'Sold Out'
                  : (signupState?.label ?? (isPublic ? 'Sign Up' : 'Coming Soon'))}
              </button>
            )}
          </div>
        )}
        <hr className="border-t border-black/10" />
        {type && <div className="mb-4" />}
        <div>
          <p className={labelClass}>General Registration</p>
          <p className={valueClass}>
            {isPublic ? 'Open' : countdownLabel ? `Available in ${countdownLabel}` : 'Closed'}
          </p>
        </div>
      </div>

      {routeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${routeModal.label} route`}
          onClick={() => setRouteModal(null)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
              <p className="text-sm font-medium text-primary-ink">{routeModal.label} Route</p>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-800"
                onClick={() => setRouteModal(null)}
              >
                Close
              </button>
            </div>
            <div className="aspect-video w-full bg-white">
              <iframe
                title={`${routeModal.label} route`}
                src={routeModal.url}
                className="h-full w-full"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      )}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Cancel registration"
          onClick={() => setCancelTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-primary-ink">
              Cancel {cancelTarget.label} spot?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              This will free up your spot for someone else in{' '}
              <span className="font-medium text-slate-900">{cancelTarget.label}</span>. You can
              re-register if spots are still available.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Keep spot
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onCancelRegistration) {
                    onCancelRegistration(cancelTarget.key);
                  }
                  setCancelTarget(null);
                }}
                className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default EventSidebarCard;

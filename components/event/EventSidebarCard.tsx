import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Link, Info } from 'lucide-react';

interface EventSidebarCardProps {
  date: string;
  time?: string;
  location: string;
  category?: string;
  type?: string;
  levels?: Array<{
    levelKey: string;
    label: string;
    guides: string[];
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
  currentUser?: { email: string; id: string; name?: string };
  participantsByLevel?: Record<string, Array<{ name: string; id: string }>>;
}

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
  currentUser,
  participantsByLevel,
}) => {
  const labelClass = 'text-xs tracking-[0.08em] text-slate-500';
  const valueClass = 'text-sm text-slate-900';
  const locationLines = location.split('\n');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [routeModal, setRouteModal] = useState<{ url: string; label: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [workshopOpen, setWorkshopOpen] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<{ key: string; label: string } | null>(null);
  const [participantsSidebar, setParticipantsSidebar] = useState<{ levelKey: string; label: string } | null>(null);

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

  return (
    <aside className="bg-gray-50 p-6 rounded-lg space-y-4">
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
                <span key={`${line}-${index}`}>
                  {line}
                  {index < locationLines.length - 1 && <br />}
                </span>
              ))}
            </p>
          </div>
          {category && (
            <div>
              <p className={labelClass}>Category</p>
              <p className={valueClass}>{category}</p>
            </div>
          )}
          {type && (
            <div>
              <p className={labelClass}>Type</p>
              <p className={valueClass}>{type}</p>
            </div>
          )}
          {type && <div className="mb-2" />}
        </div>
        <hr className="border-t border-black/10" />
        {levels && levels.length > 0 && (
          <div>
            {levels.map((level, index) => {
              const isOpen = openIndex === index;
              const registration = registrations?.[level.levelKey];
              const isGuide = currentUser && level.guides.includes(currentUser.email);
              return (
                <div
                  key={level.label}
                  className="overflow-hidden border-t border-black/10 py-3 first:border-t-0"
                >
                  <button
                    type="button"
                    onClick={() => toggleIndex(index)}
                    className="flex w-full items-start justify-between text-left group"
                  >
                    <span className="text-sm font-medium text-primary-ink flex items-center gap-2">
                      {level.label}
                      {/* Guide info icon */}
                      {isGuide && (
                        <button
                          type="button"
                          className="ml-1 p-1 rounded hover:bg-slate-100"
                          onClick={e => {
                            e.stopPropagation();
                            setParticipantsSidebar({ levelKey: level.levelKey, label: level.label });
                          }}
                          aria-label="View participants"
                        >
                          <Info className="h-4 w-4 text-slate-500" />
                        </button>
                      )}
                      {!isOpen && level.spotsLeft != null && level.places != null && (
                        <span className="text-xs font-normal text-slate-500">
                          {`${level.spotsLeft} of ${level.places} spots available`}
                        </span>
                      )}
                    </span>
                    <span
                      className={`inline-flex shrink-0 pt-0.5 transition-transform duration-300 ease-in-out ${isOpen ? 'rotate-180' : ''}`}
                    >
                      <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="pt-2 space-y-3">
                      <div>
                        <p className={labelClass}>Guides</p>
                        <p className={valueClass}>{level.guides.join(', ')}</p>
                      </div>
                      <div>
                        <p className={labelClass}>Places</p>
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
                                setRouteModal({ url: level.routeUrl as string, label: level.label })
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
                          className="w-full bg-secondary-purple-rain hover:bg-secondary-signal text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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

      {/* Participants sidebar/modal for guides */}
      {participantsSidebar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-label="Participants"
          onClick={() => setParticipantsSidebar(null)}
        >
          <div
            className="w-full max-w-md h-full bg-white shadow-lg p-6 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">
              {participantsSidebar.label} Participants
            </h3>
            <ul className="space-y-2">
              {(participantsByLevel?.[participantsSidebar.levelKey] ?? []).length === 0 ? (
                <li className="text-slate-500">No participants yet.</li>
              ) : (
                participantsByLevel![participantsSidebar.levelKey].map((p, i) => (
                  <li key={p.id || i} className="text-slate-800">
                    {p.name}
                  </li>
                ))
              )}
            </ul>
            <button
              type="button"
              className="mt-6 rounded bg-black px-4 py-2 text-white"
              onClick={() => setParticipantsSidebar(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
        {workshop && (
          <div className="border-t border-black/10 pt-4">
            <button
              type="button"
              onClick={() => setWorkshopOpen((prev) => !prev)}
              className="flex w-full items-start justify-between text-left group"
            >
              <span className="text-sm font-medium text-primary-ink flex items-center gap-2">
                Workshop
                {!workshopOpen && workshop.spotsLeft != null && (
                  <span className="text-xs font-normal text-slate-500">
                    {`${workshop.spotsLeft} of ${workshop.capacity} spots available`}
                  </span>
                )}
              </span>
              <span
                className={`inline-flex shrink-0 pt-0.5 transition-transform duration-300 ease-in-out ${workshopOpen ? 'rotate-180' : ''}`}
              >
                <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
              </span>
            </button>
            {workshopOpen && (
              <div className="pt-2 space-y-3">
                <div>
                  <p className={labelClass}>Workshop places</p>
                  <p className={valueClass}>
                    {workshop.capacity}
                    {workshop.spotsLeft != null && ` total · ${workshop.spotsLeft} left`}
                  </p>
                </div>
                {signupState?.helper && (
                  <p className="text-xs text-slate-500">{signupState.helper}</p>
                )}
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
          </div>
        )}
        <hr className="border-t border-black/10" />
        {type && <div className="mb-4" />}
        <div>
          <p className={labelClass}>General Registration</p>
          <p className={valueClass}>
            {isPublic ? 'Yes' : countdownLabel ? `Available in ${countdownLabel}` : 'No'}
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

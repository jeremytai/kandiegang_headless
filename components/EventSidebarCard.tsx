import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Link } from 'lucide-react';

interface EventSidebarCardProps {
  date: string;
  time?: string;
  location: string;
  category?: string;
  type?: string;
  levels?: Array<{ label: string; guides: string[]; pace?: string; routeUrl?: string }>;
  isPublic: boolean;
  publicReleaseDate?: string;
}

const EventSidebarCard: React.FC<EventSidebarCardProps> = ({
  date,
  time,
  location,
  category,
  type,
  levels,
  isPublic,
  publicReleaseDate,
}) => {
  const labelClass = "text-xs tracking-[0.08em] text-slate-500";
  const valueClass = "text-sm text-slate-900";
  const locationLines = location.split('\n');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [routeModal, setRouteModal] = useState<{ url: string; label: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

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
              return (
                <div key={level.label} className="overflow-hidden border-t border-black/10 py-3 first:border-t-0">
                  <button
                    type="button"
                    onClick={() => toggleIndex(index)}
                    className="flex w-full items-start justify-between text-left group"
                  >
                    <span className="text-sm font-medium text-primary-ink">{level.label}</span>
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
                        <p className={valueClass}>{placesPerGuide * level.guides.length}</p>
                      </div>
                      <div>
                        <p className={labelClass}>Distance</p>
                        <p className={valueClass}>x km</p>
                      </div>
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
                              className={`${valueClass} underline underline-offset-2`}
                              onClick={() => setRouteModal({ url: level.routeUrl as string, label: level.label })}
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
                      <button
                        className="w-full bg-secondary-purple-rain hover:bg-secondary-signal text-white font-semibold py-2 px-4 rounded-md transition-colors"
                        disabled={!isPublic}
                      >
                        {isPublic ? 'Sign Up' : 'Coming Soon'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <hr className="border-t border-black/10" />
          {type && <div className="mb-4" />}
        <div>
          <p className={labelClass}>General Registration</p>
          <p className={valueClass}>
            {isPublic ? 'Yes' : (countdownLabel ? `Available in ${countdownLabel}` : 'No')}
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
    </aside>
  );
};

export default EventSidebarCard;

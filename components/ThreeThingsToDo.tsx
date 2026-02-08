/**
 * ThreeThingsToDo.tsx
 * "Real-world ready, technically proven" – two-column section with heading,
 * specifications list, and glossary. Styled to match the project's design system.
 * Completed items are persisted in a cookie so they survive refresh.
 */

import React, { useCallback, useState } from 'react';
import { Check } from 'lucide-react';
import { KandieCodeModal } from './KandieCodeModal';
import { RideLevelsModal } from './RideLevelsModal';
import { WaiverModal } from './WaiverModal';

type SpecHref = 'kandie-code' | 'ride-levels' | 'ride-waiver';

const SPECIFICATIONS = [
  { term: 'Kandie Code', value: 'Kandie Kodex — unser gemeinsames Verhalten in der Kandie Gang', href: 'kandie-code' as SpecHref },
  { term: 'Ride Levels', value: 'Eckdaten zu den vier Kandie-Gruppen — finde Dein passendes Level', href: 'ride-levels' as SpecHref },
  { term: 'Ride Waiver', value: 'Haftungsausschluss für gemeinsame sportliche Aktivitäten der Kandie Gang', href: 'ride-waiver' as SpecHref },
] as const;

const CARD_CLASS = 'rounded-xl bg-secondary-blush p-4 w-full cursor-pointer text-left border-none';

const COOKIE_NAME = 'three_things_done';
const COOKIE_MAX_AGE_DAYS = 365;

type ThreeThingsState = { kandieCode: boolean; rideLevels: boolean; waiver: boolean };

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, maxAgeDays: number) {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location?.protocol === 'https:';
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    'path=/',
    `max-age=${maxAgeDays * 24 * 60 * 60}`,
    'samesite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

function readThreeThingsFromCookie(): ThreeThingsState {
  const raw = getCookie(COOKIE_NAME);
  if (!raw) return { kandieCode: false, rideLevels: false, waiver: false };
  try {
    const parsed = JSON.parse(raw) as Partial<ThreeThingsState>;
    return {
      kandieCode: Boolean(parsed.kandieCode),
      rideLevels: Boolean(parsed.rideLevels),
      waiver: Boolean(parsed.waiver),
    };
  } catch {
    return { kandieCode: false, rideLevels: false, waiver: false };
  }
}

function writeThreeThingsCookie(state: ThreeThingsState) {
  setCookie(COOKIE_NAME, JSON.stringify(state), COOKIE_MAX_AGE_DAYS);
}

export const ThreeThingsToDo: React.FC = () => {
  const [kandieCodeModalOpen, setKandieCodeModalOpen] = useState(false);
  const [rideLevelsModalOpen, setRideLevelsModalOpen] = useState(false);
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);
  const [doneState, setDoneState] = useState<ThreeThingsState>(readThreeThingsFromCookie);

  const setDone = useCallback((updates: Partial<ThreeThingsState>) => {
    setDoneState((prev) => {
      const next = { ...prev, ...updates };
      writeThreeThingsCookie(next);
      return next;
    });
  }, []);

  const kandieCodeDone = doneState.kandieCode;
  const rideLevelsDone = doneState.rideLevels;
  const waiverDone = doneState.waiver;

  const openModal = (href: SpecHref) => {
    if (href === 'kandie-code') setKandieCodeModalOpen(true);
    else if (href === 'ride-levels') setRideLevelsModalOpen(true);
    else if (href === 'ride-waiver') setWaiverModalOpen(true);
  };

  const completed = (href: SpecHref) =>
    href === 'kandie-code' ? kandieCodeDone : href === 'ride-levels' ? rideLevelsDone : waiverDone;

  return (
    <section
      className="grid grid-cols-12 gap-x-4 gap-y-5 px-4 pt-6 pb-16 text-primary-ink transition-colors duration-300 lg:gap-x-6 lg:px-6 lg:pt-10 lg:pb-24 bg-white/75 backdrop-blur-md rounded-xl"
      aria-labelledby="specifications-heading"
    >
      {/* Left column: main heading + Specifications label */}
      <div className="col-span-full lg:col-span-6 lg:col-start-1">
        <h2 id="specifications-heading" className="font-heading font-gtplanar text-h4 text-secondary-current text-balance">
        Drei Dinge, die du erledigen musst
        </h2>
        <h3 className="mt-0.5 font-heading text-h4 font-gtplanar text-secondary-blush">
        Pflichtlektüre vor der Fahrt
        </h3>
      </div>

      {/* Right column: intro paragraph */}
      <div className="col-span-full lg:col-span-6 lg:col-start-7">
        <p className="[&+p]:mt-[1em] font-body text-large text-secondary-current leading-relaxed">
          Damit alle eine sichere und entspannte Zeit haben, bitten wir dich, die folgenden drei Punkte durchzulesen – einschließlich der unterschriebenen Verzichtserklärung..
        </p>
      </div>

      {/* Specifications list: full width below */}
      <div className="col-span-full mt-10 lg:mt-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 font-body">
          {SPECIFICATIONS.map(({ term, value, href }) => {
            const isDone = completed(href);
            return (
              <button
                key={term}
                type="button"
                onClick={() => openModal(href)}
                className={CARD_CLASS}
              >
                <span className="text-normal font-bold text-secondary-current flex items-center justify-between gap-2">
                  {term}
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isDone ? 'bg-secondary-blush text-secondary-current' : 'bg-white text-gray-200'}`}
                    aria-hidden
                  >
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                </span>
                <p className="mt-1 text-small text-secondary-current">{value}</p>
              </button>
            );
          })}
        </div>
        <KandieCodeModal isOpen={kandieCodeModalOpen} onClose={() => { setKandieCodeModalOpen(false); setDone({ kandieCode: true }); }} />
        <RideLevelsModal isOpen={rideLevelsModalOpen} onClose={() => { setRideLevelsModalOpen(false); setDone({ rideLevels: true }); }} />
        <WaiverModal isOpen={waiverModalOpen} onClose={() => setWaiverModalOpen(false)} onSignWaiver={() => setDone({ waiver: true })} />
      </div>

    </section>
  );
};

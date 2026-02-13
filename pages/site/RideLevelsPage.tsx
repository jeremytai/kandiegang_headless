/**
 * RideLevelsPage.tsx
 * Ride Levels page — overview of the four Kandie Gang ride groups (Level 1–3).
 * Layout matches WaiverPage/ImprintPage: hero title, structured sections.
 */

import React from 'react';

const SECTION_SPACING = 'mb-12 md:mb-16';
const PARAGRAPH_CLASS = 'text-slate-600 text-[15px] md:text-base leading-relaxed mb-4';
const LEVEL_HEADING_CLASS = 'font-heading text-primary-ink text-xl md:text-2xl font-normal tracking-tight mb-4';
const SPEC_ROW_CLASS = 'text-slate-600 text-[15px] md:text-base leading-relaxed py-2 border-b border-slate-100 last:border-0 flex justify-between gap-4';
const SPEC_LABEL = 'text-slate-500 shrink-0';
const SPEC_VALUE = 'text-primary-ink font-medium text-right';

const LEVELS = [
  {
    id: 'level-1',
    name: 'Level 1',
    specs: [
      { label: 'Teilnehmer:innen', value: 'max. 8 Fahrer:innen + Guides' },
      { label: 'Strecke', value: 'ca. 40 km' },
      { label: 'Schnitt', value: '22 – 25 km/h' },
      { label: 'Formation', value: 'Zweierreihe wird trainiert' },
      { label: 'Gruppenerfahrung', value: 'nein' },
    ],
  },
  {
    id: 'level-2',
    name: 'Level 2',
    specs: [
      { label: 'Teilnehmer:innen', value: 'max. 14 Fahrer:innen + Guides' },
      { label: 'Strecke', value: '40–60 km' },
      { label: 'Schnitt', value: '25 – 28 km/h' },
      { label: 'Formation', value: 'Zweierreihe' },
      { label: 'Führungswechsel', value: 'wird trainiert' },
      { label: 'Gruppenerfahrung', value: 'ja' },
    ],
  },
  {
    id: 'level-2-plus',
    name: 'Level 2+',
    specs: [
      { label: 'Teilnehmer:innen', value: 'max. 14 Fahrer:innen + Guides' },
      { label: 'Strecke', value: '40–60 km' },
      { label: 'Schnitt', value: '28 – 30 km/h' },
      { label: 'Formation', value: 'Zweierreihe' },
      { label: 'Führungswechsel', value: 'wird trainiert' },
      { label: 'Gruppenerfahrung', value: 'ja' },
    ],
  },
  {
    id: 'level-3',
    name: 'Level 3',
    specs: [
      { label: 'Teilnehmer:innen', value: 'max. 14 Fahrer:innen + Guides' },
      { label: 'Strecke', value: '60–80 km' },
      { label: 'Schnitt', value: '30 – 33 km/h' },
      { label: 'Formation', value: 'Zweierreihe' },
      { label: 'Führungswechsel', value: 'ja' },
      { label: 'Gruppenerfahrung', value: 'ja' },
    ],
  },
] as const;

/** Shared content for RideLevelsPage and RideLevelsModal. */
export const RideLevelsContent: React.FC<{ variant?: 'page' | 'modal'; headerAction?: React.ReactNode }> = ({ variant = 'page', headerAction }) => {
  const isModal = variant === 'modal';
  return (
    <>
      <header className={isModal ? 'pt-24 pb-6 px-6 max-w-4xl mx-auto' : 'pt-32 md:pt-40 pb-12 md:pb-16 px-6 max-w-4xl mx-auto text-center md:text-left'}>
        <div className={isModal ? 'flex items-start justify-between gap-4' : undefined}>
          <div className={isModal ? 'min-w-0 flex-1' : undefined}>
            <h1 id={isModal ? 'ridelevels-modal-title' : undefined} className="font-heading text-primary-ink text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-4">
              Ride Levels
            </h1>
            <p className="text-slate-500 text-sm md:text-base">
              Eckdaten zu den vier Kandie-Gruppen — finde Dein passendes Level
            </p>
          </div>
          {isModal && headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-24 md:pb-32">
        <p className={PARAGRAPH_CLASS}>
          Du willst bei einem Kandie Ride mitfahren und willst das für Dich passende Level finden? Dann bist Du hier genau richtig, denn hier findest Du die Eckdaten zu den vier Gruppen.
        </p>

        {LEVELS.map((level) => (
          <section key={level.id} id={level.id} className={SECTION_SPACING}>
            <h2 className={LEVEL_HEADING_CLASS}>{level.name}</h2>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 overflow-hidden">
              {level.specs.map(({ label, value }) => (
                <div key={label} className={SPEC_ROW_CLASS}>
                  <span className={SPEC_LABEL}>{label}</span>
                  <span className={SPEC_VALUE}>{value}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
};

export const RideLevelsPage: React.FC = () => (
  <div className="min-h-screen bg-white">
    <RideLevelsContent variant="page" />
  </div>
);

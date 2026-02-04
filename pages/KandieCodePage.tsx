/**
 * KandieCodePage.tsx
 * Kandie Code (Kandie Kodex) page — community guidelines and expected behaviour.
 * Layout matches WaiverPage/ImprintPage: hero title, structured sections.
 */

import React from 'react';

const SECTION_SPACING = 'mb-12 md:mb-16';
const PARAGRAPH_CLASS = 'text-slate-600 text-[15px] md:text-base leading-relaxed mb-4';
const HEADING_CLASS = 'font-heading text-primary-ink text-xl md:text-2xl font-normal tracking-tight mb-4';
const INTRO_CLASS = 'text-slate-600 text-[15px] md:text-base leading-relaxed mb-8';

/** Shared content for KandieCodePage and KandieCodeModal. */
export const KandieCodeContent: React.FC<{ variant?: 'page' | 'modal'; headerAction?: React.ReactNode }> = ({ variant = 'page', headerAction }) => {
  const isModal = variant === 'modal';
  return (
    <>
      <header className={isModal ? 'pt-24 pb-6 px-6 max-w-4xl mx-auto' : 'pt-32 md:pt-40 pb-12 md:pb-16 px-6 max-w-4xl mx-auto text-center md:text-left'}>
        <div className={isModal ? 'flex items-start justify-between gap-4' : undefined}>
          <div className={isModal ? 'min-w-0 flex-1' : undefined}>
            <h1 id={isModal ? 'kandiecode-modal-title' : undefined} className="font-heading text-primary-ink text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-4">
              Kandie Code
            </h1>
            <p className="text-slate-500 text-sm md:text-base">
              Kandie Kodex — unser gemeinsames Verhalten in der Kandie Gang
            </p>
          </div>
          {isModal && headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-24 md:pb-32">
      <p className={INTRO_CLASS}>
        Wir möchten hier nochmal ein paar &apos;Kandie Codes&apos; ansprechen, die wir als selbstverständlich sehen und in der Kandie Gang als &apos;Kandie Kodex&apos; im Verhalten miteinander verstehen.
      </p>
      <p className={INTRO_CLASS}>
        Wir verstehen uns als eine diverse, tolerante und inklusive Gemeinschaft. Dazu gehört, dass wir uns alle dementsprechend verhalten.
      </p>

      <section id="grenzen-wahren" className={SECTION_SPACING}>
        <h2 className={HEADING_CLASS}>
          Grenzen wahren 🏳️ 🏳️‍🌈 🏳️‍⚧️
        </h2>
        <p className={PARAGRAPH_CLASS}>
          Bei den Kandies treffen viele unterschiedliche Menschen aufeinander. Gerade für die teilnehmenden FLINTA* soll die Kandie Gang ein &apos;Safe Space&apos; sein, in dem sie sich wohl und sicher fühlen. Bitte wahrt die Grenzen der anderen Teilnehmerinnen. Versichert euch immer, ob ihr z.B. Fotos von einer Person machen dürft und drängt euch nicht auf.
        </p>
      </section>

      <section id="respektiert-die-guides" className={SECTION_SPACING}>
        <h2 className={HEADING_CLASS}>
          Respektiert die Guides 🙇‍♀️
        </h2>
        <p className={PARAGRAPH_CLASS}>
          Jede/r Guide ist mit viel Herzblut dabei, macht alle Rides freiwillig und ohne Bezahlung. Die Strecken, Regeln, Teilnehmeranzahl und Geschwindigkeit werden von den Guides vorgegeben und sind im Ride nicht diskutabel. Für Anregungen sind wir gerne nach den Rides offen und nehmen eure Ideen mit in unsere Besprechungen.
        </p>
      </section>

      <section id="social-rides" className={SECTION_SPACING}>
        <h2 className={HEADING_CLASS}>
          Social Rides ohne Kompetiton 🙌
        </h2>
        <p className={PARAGRAPH_CLASS}>
          Die Kandie Gang verzichtet bewusst auf den Vergleich. Bitte vergleicht nicht euer Können mit dem der anderen Kandies. Verzichtet auf das Angeben mit Equipment, QOMs, Geschwindigkeiten und Wattzahlen.
        </p>
        <p className="font-heading text-primary-ink text-lg md:text-xl font-normal tracking-tight mt-4">
          ALL KANDIES ARE BEAUTIFUL!
        </p>
      </section>

      <section id="be-kandie" className={SECTION_SPACING}>
        <h2 className={HEADING_CLASS}>
          Be Kandie — be friendly 🍬
        </h2>
        <p className={PARAGRAPH_CLASS}>
          Wir Kandies sind freundlich zueinander, grüßen uns, stellen uns vor den Rides mit Namen vor und pflegen einen smoothen Umgangston. Andere Teilnehmerinnen, Autofahrerinnen und andere Radfahrgruppen werden stets respektvoll behandelt.
        </p>
      </section>
      </main>
    </>
  );
};

export const KandieCodePage: React.FC = () => (
  <div className="min-h-screen bg-white">
    <KandieCodeContent variant="page" />
  </div>
);

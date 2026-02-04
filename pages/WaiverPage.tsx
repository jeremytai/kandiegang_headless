/**
 * WaiverPage.tsx
 * Ride Waiver (Haftungsausschluss) page for Kandie Gang group activities.
 * Layout matches ImprintPage: hero title, structured sections.
 * Content sourced from kandiegang.com/waiver.
 */

import React from 'react';

const SECTION_SPACING = 'mb-12 md:mb-16';
const PARAGRAPH_CLASS = 'text-slate-600 text-[15px] md:text-base leading-relaxed mb-4';
const HEADING_CLASS = 'font-heading text-primary-ink text-xl md:text-2xl font-normal tracking-tight mb-4';
const LIST_ITEM_CLASS = 'text-slate-600 text-[15px] md:text-base leading-relaxed mb-4 pl-4 border-l-2 border-slate-200';

/** Shared content for WaiverPage and WaiverModal. */
export const WaiverContent: React.FC<{ variant?: 'page' | 'modal'; onSignWaiver?: () => void; headerAction?: React.ReactNode }> = ({ variant = 'page', onSignWaiver, headerAction }) => {
  const isModal = variant === 'modal';
  return (
    <>
      <header className={isModal ? 'pt-24 pb-6 px-6 max-w-4xl mx-auto' : 'pt-32 md:pt-40 pb-12 md:pb-16 px-6 max-w-4xl mx-auto text-center md:text-left'}>
        <div className={isModal ? 'flex items-start justify-between gap-4' : undefined}>
          <div className={isModal ? 'min-w-0 flex-1' : undefined}>
            <h1 id={isModal ? 'waiver-modal-title' : undefined} className="font-heading text-primary-ink text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-4">
              Ride Waiver
            </h1>
            <p className="text-slate-500 text-sm md:text-base">
              Haftungsausschluss für gemeinsame sportliche Aktivitäten der Kandie Gang
            </p>
          </div>
          {isModal && headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-24 md:pb-32">
        <section id="waiver" className={SECTION_SPACING}>
          <p className={PARAGRAPH_CLASS}>
            Der/Die Teilnehmer:in der Kandie Gang Ausfahrten nimmt zur Kenntnis, dass weder die Kandie Gang Ausfahrt selbst noch dessen Organisator:innen der Kandie Gang (im Folgenden „Initiator:innen") einzelner Aktivitäten oder die Teilnehmer:innen an gemeinsamen Aktivitäten für Unfälle oder sonstige Schadensereignisse, die bei gemeinsamen Unternehmungen eintreten, haftbar gemacht werden können. Die Teilnahme an derartigen Aktivitäten erfolgt ausschließlich auf eigene Gefahr und Verantwortung des/der Teilnehmer:in. Der/Die Teilnehmer:in erkennt durch seine/ihre Teilnahme diesen Haftungsausschluss gegenüber der Kandie Gang Ausfahrten, deren Initiator:innen und den anderen Teilnehmer:innen an.
          </p>

          <ol className="list-decimal list-inside space-y-6 mt-8">
            <li className={LIST_ITEM_CLASS}>
              Routenvorschläge, Materialempfehlungen, Trainingsvorschläge o.ä., auch wenn sie im Rahmen der Internetpräsentation der Kandie Gang, im Rahmen von Aktivitäten oder von Teilnehmer:innen abgegeben werden, erfolgen ausschließlich aus sportkameradschaftlicher Sicht und stellen die eigene unverbindliche und unüberprüfbare Meinung des/der Einzelnen dar. Die Befolgung derartiger sportkameradschaftlicher Meinungen erfolgt ausschließlich auf eigene Gefahr. Daraus resultierende Gesundheitsschäden, sonstige Schäden, gerichtliche oder verwaltungsrechtliche Verfolgung begründen keine wie immer geartete Haftung gegenüber der Kandie Gang Ausfahrten, deren Initiator:innen oder Teilnehmer:innen. Der/Die Teilnehmer:in ist für die Einhaltung aller gesetzlichen Bestimmungen verantwortlich.
            </li>
            <li className={LIST_ITEM_CLASS}>
              Die Kandie Gang weist ausdrücklich darauf hin, dass während den Veranstaltungen der Kandie Gang kein Versicherungsschutz für Sport- und Freizeitunfälle besteht.
            </li>
            <li className={LIST_ITEM_CLASS}>
              Die Benutzung und Anwendung von veröffentlichten oder im persönlichen Gespräch gegebenen Technik-/ und oder Trainingstipps, erfolgt ausschließlich auf eigenes gesundheitliches Risiko, eigene Gefahr und auf eigene Verantwortung.
            </li>
            <li className={LIST_ITEM_CLASS}>
              Der/Die Teilnehmer:in der Kandie Gang Ausfahrten ist aufgefordert, sich vor dem Beginn des Trainings sportmedizinisch untersuchen zu lassen.
            </li>
            <li className={LIST_ITEM_CLASS}>
              Der/Die Teilnehmer:in der Kandie Gang Ausfahrten ist damit einverstanden, dass die von ihm/ihr im Zusammenhang mit der Teilnahme an gemeinsamen Aktivitäten gemachten Fotos, Berichterstattungen in der Presse, Internet etc. ohne Vergütungsansprüche von der Kandie Gang und deren Teilnehmer:innen genutzt werden dürfen.
            </li>
          </ol>

          <div className="mt-10 flex flex-col items-center">
            <a
              href="https://form.jotform.com/Kollektif_Kandie/haftungsausschluss"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onSignWaiver?.()}
              className="inline-flex items-center justify-center rounded-full bg-black px-6 py-3.5 md:px-8 md:py-4 font-bold text-white text-sm md:text-base shadow-2xl shadow-black/10 transition-all hover:bg-slate-800 active:scale-95 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              Sign the waiver
            </a>
            <p className="text-slate-500 text-sm mt-10 pt-6 border-t border-slate-100 text-center">
              By participating in Kandie Gang rides, you acknowledge this waiver.
            </p>
          </div>
        </section>
      </main>
    </>
  );
};

export const WaiverPage: React.FC = () => (
  <div className="min-h-screen bg-white">
    <WaiverContent variant="page" />
  </div>
);

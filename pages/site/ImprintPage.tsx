/**
 * ImprintPage.tsx
 * Legal imprint page (Impressum) for Kandie Gang.
 * Layout matches PrivacyPolicyPage: hero title, structured sections.
 * Content sourced from kandiegang.com/imprint.
 */

import React from 'react';
import { useContactModal } from '../../context/ContactModalContext';

const SECTION_SPACING = 'mb-12 md:mb-16';
const PARAGRAPH_CLASS = 'text-slate-600 text-[15px] md:text-base leading-relaxed mb-4';
const HEADING_CLASS = 'font-heading text-primary-ink text-xl md:text-2xl font-normal tracking-tight mb-4';
const SUBHEADING_CLASS = 'font-semibold text-primary-ink text-base md:text-lg mb-2 mt-6';
const LINK_CLASS = 'text-secondary-current underline underline-offset-2 hover:text-secondary-purple-rain transition-colors';

export const ImprintPage: React.FC = () => {
  const { openContactModal } = useContactModal();
  return (
  <div className="min-h-screen bg-white">
    {/* Hero — same style as PrivacyPolicyPage */}
    <header className="pt-32 md:pt-40 pb-12 md:pb-16 px-6 max-w-4xl mx-auto text-center md:text-left">
      <h1 className="font-heading text-primary-ink text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-4">
        Imprint
      </h1>
      <p className="text-slate-500 text-sm md:text-base">
        Legal information according to German law § 5 TMG.
      </p>
    </header>

    {/* Content — single column, readable width */}
    <main className="max-w-3xl mx-auto px-6 pb-24 md:pb-32">
      <section id="responsible" className={SECTION_SPACING}>
        <h2 className={HEADING_CLASS}>Responsible for this website according to § 5 TMG</h2>
        <p className="font-semibold text-primary-ink text-lg mb-4">
          Kandie Kollektiv UG (haftungsbeschränkt)
        </p>

        <h3 className={SUBHEADING_CLASS}>Address</h3>
        <p className={PARAGRAPH_CLASS}>
          Postfach 13 03 90<br />
          20103 Hamburg, Germany
        </p>

        <h3 className={SUBHEADING_CLASS}>Contact</h3>
        <p className={PARAGRAPH_CLASS}>
          E-Mail:{' '}
          <button
            type="button"
            onClick={openContactModal}
            className={`${LINK_CLASS} bg-transparent border-none cursor-pointer p-0 font-inherit`}
          >
            hallo [AT] kandiegang.com
          </button>
        </p>

        <p className={PARAGRAPH_CLASS}>
          <strong>Entry in the commercial register</strong><br />
          Register court: Hamburg<br />
          Register number: HRB 169684
        </p>

        <p className={PARAGRAPH_CLASS}>
          <strong>VAT identification number:</strong> DE358341015
        </p>

        <h3 className={SUBHEADING_CLASS}>Represented by</h3>
        <p className={PARAGRAPH_CLASS}>
          Jeremy Tai Abbett
        </p>
      </section>

      <section id="vsbg" className={SECTION_SPACING}>
        <h2 className={HEADING_CLASS}>Information according to § 36 VSBG</h2>
        <p className={PARAGRAPH_CLASS}>
          The EU Commission has created a platform for online dispute resolution (ODR platform) between merchants and consumers. This ODR platform is available via the following link:
        </p>
        <p className={PARAGRAPH_CLASS}>
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className={LINK_CLASS}
          >
            ec.europa.eu/consumers/odr
          </a>
        </p>
      </section>
    </main>
  </div>
  );
};

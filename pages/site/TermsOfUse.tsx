/**
 * TermsOfUsePage.tsx
 * Legal page presenting the Kandie Gang Terms of Use.
 * Layout inspired by Sunday.ai terms-of-service: hero title, effective date, structured sections.
 * Content sourced from kandiegang.com/terms-of-use.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useContactModal } from '../../context/ContactModalContext';

const SECTION_SPACING = 'mb-12 md:mb-16';
const _SUBSECTION_SPACING = 'mb-6';
const PARAGRAPH_CLASS = 'text-slate-600 text-[15px] md:text-base leading-relaxed mb-4';
const HEADING_CLASS =
  'font-heading text-primary-ink text-xl md:text-2xl font-normal tracking-tight mb-4';
const SUBHEADING_CLASS = 'font-normal text-primary-ink text-base md:text-lg mb-2 mt-6';
const LIST_CLASS =
  'list-disc pl-5 space-y-2 text-slate-600 text-[15px] md:text-base leading-relaxed mb-4';
const LINK_CLASS =
  'text-secondary-current underline underline-offset-2 hover:text-secondary-purple-rain transition-colors';

export const TermsOfUsePage: React.FC = () => {
  const { openContactModal } = useContactModal();
  return (
    <div className="min-h-screen bg-white">
      {/* Hero — Sunday.ai style: single title + effective date */}
      <header className="pt-32 md:pt-40 pb-12 md:pb-16 px-6 max-w-4xl mx-auto text-center md:text-left">
        <h1 className="font-heading text-primary-ink text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-4">
          Terms of Use
        </h1>
        <p className="text-slate-500 text-sm md:text-base">
          Status: January, 2026. For questions,{' '}
          <button
            type="button"
            onClick={openContactModal}
            className={`${LINK_CLASS} cursor-pointer bg-transparent border-0 p-0 font-inherit`}
          >
            contact us
          </button>
          .
        </p>
      </header>

      {/* Content — single column, readable width */}
      <main className="max-w-3xl mx-auto px-6 pb-24 md:pb-32">
        <section id="preamble" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Preamble</h2>
          <p className={PARAGRAPH_CLASS}>
            These terms of use govern the use of the website kandiegang.com and all related
            services. The platform provides digital community functions, content, and organizational
            tools for users. Unless expressly stated otherwise, the operator does not act as an
            organizer of real-world events. Participation in any activities arranged through the
            platform occurs at the user&apos;s own responsibility. Users are responsible for
            complying with applicable laws and ensuring appropriate insurance where necessary.
          </p>
          <p className={PARAGRAPH_CLASS}>
            Kandie Gang reserves the right to change these terms of use at any time and without
            giving reasons. Changes will be communicated to users in a timely manner. If no
            objection is raised within two weeks of receiving the notification of changes, the
            amended terms of use will be deemed accepted by the user.
          </p>
        </section>

        <section id="section-1" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Section 1: Operator and scope</h2>

          <h3 className={SUBHEADING_CLASS}>1.1 Operator</h3>
          <p className={PARAGRAPH_CLASS}>
            The operator of kandiegang.com is the legal entity identified in the website imprint.
          </p>

          <h3 className={SUBHEADING_CLASS}>1.2 Scope of application</h3>
          <p className={PARAGRAPH_CLASS}>
            These terms apply to all users of kandiegang.com. Conflicting terms of users do not
            apply unless expressly accepted by the operator.
          </p>

          <h3 className={SUBHEADING_CLASS}>1.3 Contract language</h3>
          <p className={PARAGRAPH_CLASS}>
            Unless otherwise specified, the contract language is German.
          </p>

          <h3 className={SUBHEADING_CLASS}>1.4 Storage of contract text</h3>
          <p className={PARAGRAPH_CLASS}>
            The terms of use are accessible on the website and may be saved or printed by users.
          </p>
        </section>

        <section id="section-2" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Section 2: Eligibility and user account</h2>

          <h3 className={SUBHEADING_CLASS}>2.1 Minimum age</h3>
          <p className={PARAGRAPH_CLASS}>
            Users must be at least 18 years old or have reached the age of majority under applicable
            law. By registering, users confirm compliance with this requirement.
          </p>

          <h3 className={SUBHEADING_CLASS}>2.2 Account creation</h3>
          <p className={PARAGRAPH_CLASS}>
            A contract between the operator and the user is concluded when the user creates an
            account and accepts these terms via an explicit confirmation action.
          </p>

          <h3 className={SUBHEADING_CLASS}>2.3 Account security</h3>
          <p className={PARAGRAPH_CLASS}>
            Users are responsible for maintaining confidentiality of login credentials and for all
            activities performed through their accounts.
          </p>

          <h3 className={SUBHEADING_CLASS}>2.4 Accurate information</h3>
          <p className={PARAGRAPH_CLASS}>
            Users must provide truthful and complete information and update it when necessary.
          </p>
        </section>

        <section id="section-3" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Section 3: Services</h2>

          <h3 className={SUBHEADING_CLASS}>3.1 Service description</h3>
          <p className={PARAGRAPH_CLASS}>
            The platform provides digital services, community interaction features, and content as
            described on the website. The exact scope results from the respective service
            description at the time of use or purchase.
          </p>

          <h3 className={SUBHEADING_CLASS}>3.2 Technical requirements</h3>
          <p className={PARAGRAPH_CLASS}>
            Use requires compatible devices, updated software, and a functioning internet
            connection.
          </p>

          <h3 className={SUBHEADING_CLASS}>3.3 Third-party services</h3>
          <p className={PARAGRAPH_CLASS}>
            The operator may use third-party service providers to deliver technical or operational
            functions.
          </p>
        </section>

        <section id="section-4" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Section 4: Paid services and subscriptions</h2>

          <h3 className={SUBHEADING_CLASS}>4.1 Pricing</h3>
          <p className={PARAGRAPH_CLASS}>
            Prices and billing conditions for paid services are displayed before purchase.
          </p>

          <h3 className={SUBHEADING_CLASS}>4.2 Contract term and renewal</h3>
          <p className={PARAGRAPH_CLASS}>
            Subscriptions run for the agreed term and renew automatically unless cancelled before
            the end of the current term. Users will be informed about renewal conditions prior to
            purchase.
          </p>

          <h3 className={SUBHEADING_CLASS}>4.3 Termination</h3>
          <p className={PARAGRAPH_CLASS}>
            Users may terminate subscriptions according to the specified notice period. The
            statutory right to extraordinary termination remains unaffected.
          </p>
        </section>

        <section id="section-5" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Section 5: Right of withdrawal and digital content</h2>

          <h3 className={SUBHEADING_CLASS}>5.1 Consumer withdrawal rights</h3>
          <p className={PARAGRAPH_CLASS}>
            Consumers generally have a statutory right of withdrawal under applicable law.
          </p>

          <h3 className={SUBHEADING_CLASS}>5.2 Early expiration of withdrawal rights</h3>
          <p className={PARAGRAPH_CLASS}>
            The right of withdrawal for digital content or digital services may expire if the user
            expressly agrees that performance begins before expiry of the withdrawal period and
            confirms knowledge that the right of withdrawal is lost upon commencement of
            performance.
          </p>

          <h3 className={SUBHEADING_CLASS}>5.3 Leisure activities with fixed dates</h3>
          <p className={PARAGRAPH_CLASS}>
            For services relating to leisure activities with specific dates or periods, no right of
            withdrawal exists pursuant to section 312g paragraph 2 number 9 of the German Civil
            Code.
          </p>
        </section>

        <section id="section-6" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Section 6: Acceptable use and user obligations</h2>

          <h3 className={SUBHEADING_CLASS}>6.1 Lawful conduct</h3>
          <p className={PARAGRAPH_CLASS}>
            Users must use the platform only in accordance with applicable law.
          </p>

          <h3 className={SUBHEADING_CLASS}>6.2 Prohibited conduct</h3>
          <p className={PARAGRAPH_CLASS}>Users must not upload or distribute content that:</p>
          <ul className={LIST_CLASS}>
            <li>is illegal, discriminatory, defamatory, or harmful</li>
            <li>contains hate speech, incitement to violence, or harassment</li>
            <li>violates intellectual property rights or privacy rights</li>
            <li>contains unlawful pornographic or youth-endangering material</li>
          </ul>

          <h3 className={SUBHEADING_CLASS}>6.3 Automated access</h3>
          <p className={PARAGRAPH_CLASS}>
            Unauthorized scraping, crawler usage, or automated extraction of content is prohibited.
          </p>

          <h3 className={SUBHEADING_CLASS}>6.4 Content responsibility</h3>
          <p className={PARAGRAPH_CLASS}>
            Users are solely responsible for content they upload. They must ensure they hold the
            necessary rights.
          </p>

          <h3 className={SUBHEADING_CLASS}>6.5 Indemnification</h3>
          <p className={PARAGRAPH_CLASS}>
            If third parties assert claims against the operator due to unlawful user conduct, the
            user must indemnify the operator to the extent permitted by law.
          </p>
        </section>

        <section id="section-7" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Section 7: Participation in real-world activities</h2>

          <h3 className={SUBHEADING_CLASS}>7.1 Independent participation</h3>
          <p className={PARAGRAPH_CLASS}>
            Activities arranged via the platform are generally organized by users unless explicitly
            stated otherwise. Participation occurs at the user&apos;s own risk.
          </p>

          <h3 className={SUBHEADING_CLASS}>7.2 Compliance with regulations</h3>
          <p className={PARAGRAPH_CLASS}>
            Participants must comply with traffic regulations, safety requirements, and applicable
            local laws.
          </p>

          <h3 className={SUBHEADING_CLASS}>7.3 Health responsibility</h3>
          <p className={PARAGRAPH_CLASS}>
            Users confirm they are responsible for assessing their own health conditions before
            participating in activities.
          </p>

          <h3 className={SUBHEADING_CLASS}>7.4 Equipment responsibility</h3>
          <p className={PARAGRAPH_CLASS}>
            Users must ensure appropriate equipment and safety measures.
          </p>

          <h3 className={SUBHEADING_CLASS}>7.5 Media recordings</h3>
          <p className={PARAGRAPH_CLASS}>
            Photos or videos may be taken during community activities. As written in the{' '}
            <Link to="/waiver" className={LINK_CLASS}>
              Ride Waiver
            </Link>
            , you grant the operator a non-exclusive, worldwide, royalty-free license to use such
            media for promotional purposes.
          </p>
        </section>

        <section id="section-8" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Section 8: Intellectual property rights</h2>

          <h3 className={SUBHEADING_CLASS}>8.1 Platform content</h3>
          <p className={PARAGRAPH_CLASS}>
            All content provided by the operator is protected by copyright and related rights unless
            otherwise indicated.
          </p>
          <p className={PARAGRAPH_CLASS}>
            Reproduction, public display, or any other use or exploitation of such protected content
            is generally prohibited without the consent of the respective rights holder. Unless
            exceptions arise from the law, only personal, non-commercial use within the intended
            purpose of the offering is permitted. Users may therefore access, save, and print the
            content for private use, provided that it does not serve directly or indirectly for
            commercial purposes.
          </p>

          <h3 className={SUBHEADING_CLASS}>8.2 User license</h3>
          <p className={PARAGRAPH_CLASS}>
            Users receive a non-exclusive, revocable, non-transferable right to use the platform for
            its intended purpose.
          </p>

          <h3 className={SUBHEADING_CLASS}>8.3 User-generated content license</h3>
          <p className={PARAGRAPH_CLASS}>
            By uploading content, users grant the operator a non-exclusive, worldwide, royalty-free
            license to host, reproduce, display, and technically process such content for operation
            of the platform.
          </p>
        </section>

        <section id="section-9" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Section 9: Availability</h2>

          <h3 className={SUBHEADING_CLASS}>9.1 Free services</h3>
          <p className={PARAGRAPH_CLASS}>
            No specific availability level is guaranteed for free services.
          </p>

          <h3 className={SUBHEADING_CLASS}>9.2 Paid services</h3>
          <p className={PARAGRAPH_CLASS}>
            For paid services, the operator aims for high availability. Maintenance windows and
            events beyond control are excluded from availability calculations.
          </p>
        </section>

        <section id="section-10" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Section 10: Account suspension and termination</h2>
          <p className={PARAGRAPH_CLASS}>
            The operator may restrict or terminate accounts if users violate these terms, provide
            false information, misuse services, or where another significant reason exists. Measures
            will respect applicable legal requirements and proportionality.
          </p>
        </section>

        <section id="section-11" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Section 11: Liability</h2>

          <h3 className={SUBHEADING_CLASS}>11.1 Mandatory liability</h3>
          <p className={PARAGRAPH_CLASS}>
            The operator is fully liable for intent, gross negligence, injury to life, body, or
            health, fraudulent concealment of defects, and claims under mandatory product liability
            law.
          </p>

          <h3 className={SUBHEADING_CLASS}>11.2 Limited liability</h3>
          <p className={PARAGRAPH_CLASS}>
            For slightly negligent breaches of essential contractual obligations, liability is
            limited to foreseeable damages typical for the contract.
          </p>

          <h3 className={SUBHEADING_CLASS}>11.3 Exclusions</h3>
          <p className={PARAGRAPH_CLASS}>
            Otherwise, liability is excluded to the extent permitted by law.
          </p>

          <h3 className={SUBHEADING_CLASS}>11.4 External activities</h3>
          <p className={PARAGRAPH_CLASS}>
            The operator is not responsible for conduct of users or third parties during
            independently organized activities unless the operator is directly responsible.
          </p>
        </section>

        <section id="section-12" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Section 12: Data protection</h2>
          <p className={PARAGRAPH_CLASS}>
            Personal data is processed in accordance with applicable data protection laws, including
            the GDPR. Details are provided in the privacy policy available on the website.
          </p>
        </section>

        <section id="section-13" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Section 13: Force majeure</h2>
          <p className={PARAGRAPH_CLASS}>
            The operator is not liable for delays or failure to perform caused by events beyond
            reasonable control, including governmental measures, pandemics, infrastructure failures,
            or lawful industrial action.
          </p>
        </section>

        <section id="section-14" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>
            Section 14: Special plans for community or non-profit use
          </h2>
          <p className={PARAGRAPH_CLASS}>
            Where special tariffs exist for private communities or registered associations,
            eligibility requirements must be met. By selecting such plans, users confirm
            eligibility. If incorrect information is provided, the operator may adjust pricing to
            the applicable commercial tariff and charge the difference. Intentional
            misrepresentation may result in immediate termination.
          </p>
        </section>

        <section id="section-15" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Section 15: Amendments</h2>
          <p className={PARAGRAPH_CLASS}>
            The operator may amend these terms where necessary for legal, technical, or operational
            reasons. Users will be informed in advance. If changes materially affect users,
            reasonable notice and termination options will be provided.
          </p>
        </section>

        <section id="section-16" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>Section 16: Governing law and final provisions</h2>
          <p className={PARAGRAPH_CLASS}>
            German law applies, excluding conflict-of-law rules to the extent permitted. Mandatory
            consumer protection provisions of the user&apos;s country of residence remain
            unaffected.
          </p>
          <p className={PARAGRAPH_CLASS}>
            If individual provisions are invalid, the remainder of the terms remains effective.
          </p>
        </section>
      </main>
    </div>
  );
};

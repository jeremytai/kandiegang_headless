/**
 * PrivacyPolicyPage.tsx
 * Legal page presenting the Kandie Gang privacy policy.
 * Layout inspired by Sunday.ai terms-of-service: hero title, effective date, structured sections.
 * Content sourced from kandiegang.com/privacy-policy.
 */

import React from 'react';
import { useContactModal } from '../../context/ContactModalContext';

const SECTION_SPACING = 'mb-12 md:mb-16';
const _SUBSECTION_SPACING = 'mb-6';
const PARAGRAPH_CLASS = 'text-slate-600 text-[15px] md:text-base leading-relaxed mb-4';
const HEADING_CLASS =
  'font-heading text-primary-ink text-xl md:text-2xl font-normal tracking-tight mb-4';
const SUBHEADING_CLASS = 'font-semibold text-primary-ink text-base md:text-lg mb-2 mt-6';
const LIST_CLASS =
  'list-disc pl-5 space-y-2 text-slate-600 text-[15px] md:text-base leading-relaxed mb-4';
const LINK_CLASS =
  'text-secondary-current underline underline-offset-2 hover:text-secondary-purple-rain transition-colors';

export const PrivacyPolicyPage: React.FC = () => {
  const { openContactModal } = useContactModal();
  return (
    <div className="min-h-screen bg-white">
      {/* Hero — Sunday.ai style: single title + effective date */}
      <header className="pt-32 md:pt-40 pb-12 md:pb-16 px-6 max-w-4xl mx-auto text-center md:text-left">
        <h1 className="font-heading text-primary-ink text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-4">
          Privacy Policy
        </h1>
        <p className="text-slate-500 text-sm md:text-base">
          Last updated: 2025. For questions,{' '}
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
        <section id="overview" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>1. An overview of data protection</h2>

          <h3 className={SUBHEADING_CLASS}>General information</h3>
          <p className={PARAGRAPH_CLASS}>
            The following information will provide you with an easy to navigate overview of what
            will happen with your personal data when you visit this website. The term &quot;personal
            data&quot; comprises all data that can be used to personally identify you. For detailed
            information about the subject matter of data protection, please consult our Data
            Protection Declaration, which we have included beneath this copy.
          </p>

          <h3 className={SUBHEADING_CLASS}>Data recording on this website</h3>
          <p className={PARAGRAPH_CLASS}>
            <strong>
              Who is the responsible party for the recording of data on this website (i.e., the
              &quot;controller&quot;)?
            </strong>
            <br />
            The data on this website is processed by the operator of the website, whose contact
            information is available under section &quot;Information about the responsible party
            (referred to as the &quot;controller&quot; in the GDPR)&quot; in this Privacy Policy.
          </p>
          <p className={PARAGRAPH_CLASS}>
            <strong>How do we record your data?</strong>
            <br />
            We collect your data as a result of your sharing of your data with us. This may, for
            instance be information you enter into our contact form. Other data shall be recorded by
            our IT systems automatically or after you consent to its recording during your website
            visit. This data comprises primarily technical information (e.g., web browser, operating
            system, or time the site was accessed). This information is recorded automatically when
            you access this website.
          </p>
          <p className={PARAGRAPH_CLASS}>
            <strong>What are the purposes we use your data for?</strong>
            <br />A portion of the information is generated to guarantee the error free provision of
            the website. Other data may be used to analyze your user patterns.
          </p>
          <p className={PARAGRAPH_CLASS}>
            <strong>What rights do you have as far as your information is concerned?</strong>
            <br />
            You have the right to receive information about the source, recipients, and purposes of
            your archived personal data at any time without having to pay a fee for such
            disclosures. You also have the right to demand that your data are rectified or
            eradicated. If you have consented to data processing, you have the option to revoke this
            consent at any time, which shall affect all future data processing. Moreover, you have
            the right to demand that the processing of your data be restricted under certain
            circumstances. Furthermore, you have the right to log a complaint with the competent
            supervising agency. Please do not hesitate to contact us at any time if you have
            questions about this or any other data protection related issues.
          </p>
          <p className={PARAGRAPH_CLASS}>
            <strong>Analysis tools and tools provided by third parties</strong>
            <br />
            There is a possibility that your browsing patterns will be statistically analyzed when
            your visit this website. Such analyses are performed primarily with what we refer to as
            analysis programs. For detailed information about these analysis programs please consult
            our Data Protection Declaration below.
          </p>
        </section>

        <section id="hosting" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>2. Hosting</h2>
          <h3 className={SUBHEADING_CLASS}>External Hosting</h3>
          <p className={PARAGRAPH_CLASS}>
            This website is hosted by an external service provider (host). Personal data collected
            on this website are stored on the servers of the host. These may include, but are not
            limited to, IP addresses, contact requests, metadata and communications, contract
            information, contact information, names, web page access, and other data generated
            through a web site.
          </p>
          <p className={PARAGRAPH_CLASS}>
            The host is used for the purpose of fulfilling the contract with our potential and
            existing customers (Art. 6(1)(b) GDPR) and in the interest of secure, fast, and
            efficient provision of our online services by a professional provider (Art. 6(1)(f)
            GDPR). If appropriate consent has been obtained, the processing is carried out
            exclusively on the basis of Art. 6 (1)(a) GDPR and § 25 (1) TTDSG, insofar the consent
            includes the storage of cookies or the access to information in the user&apos;s end
            device (e.g., device fingerprinting) within the meaning of the TTDSG. This consent can
            be revoked at any time.
          </p>
          <p className={PARAGRAPH_CLASS}>
            Our host will only process your data to the extent necessary to fulfil its performance
            obligations and to follow our instructions with respect to such data.
          </p>
        </section>

        <section id="general" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>3. General information and mandatory information</h2>
          <h3 className={SUBHEADING_CLASS}>Data protection</h3>
          <p className={PARAGRAPH_CLASS}>
            The operators of this website and its pages take the protection of your personal data
            very seriously. Hence, we handle your personal data as confidential information and in
            compliance with the statutory data protection regulations and this Data Protection
            Declaration. Whenever you use this website, a variety of personal information will be
            collected. Personal data comprises data that can be used to personally identify you.
            This Data Protection Declaration explains which data we collect as well as the purposes
            we use this data for. It also explains how, and for which purpose the information is
            collected.
          </p>
          <p className={PARAGRAPH_CLASS}>
            We herewith advise you that the transmission of data via the Internet (i.e., through
            e-mail communications) may be prone to security gaps. It is not possible to completely
            protect data against third-party access.
          </p>

          <h3 className={SUBHEADING_CLASS}>
            Information about the responsible party (referred to as the &quot;controller&quot; in
            the GDPR)
          </h3>
          <p className={PARAGRAPH_CLASS}>
            The data processing controller on this website is:
            <br />
            <strong>Kandie Kollketiv UG (haftungsbeschränkt)</strong>
            <br />
            Postfach 13 03 90
            <br />
            20103 Hamburg, Germany
            <br />
            E-mail: hallo(at)kandiegang.com
          </p>
          <p className={PARAGRAPH_CLASS}>
            The controller is the natural person or legal entity that single-handedly or jointly
            with others makes decisions as to the purposes of and resources for the processing of
            personal data (e.g., names, e-mail addresses, etc.).
          </p>

          <h3 className={SUBHEADING_CLASS}>Storage duration</h3>
          <p className={PARAGRAPH_CLASS}>
            Unless a more specific storage period has been specified in this privacy policy, your
            personal data will remain with us until the purpose for which it was collected no longer
            applies. If you assert a justified request for deletion or revoke your consent to data
            processing, your data will be deleted, unless we have other legally permissible reasons
            for storing your personal data (e.g., tax or commercial law retention periods); in the
            latter case, the deletion will take place after these reasons cease to apply.
          </p>

          <h3 className={SUBHEADING_CLASS}>
            General information on the legal basis for the data processing on this website
          </h3>
          <p className={PARAGRAPH_CLASS}>
            If you have consented to data processing, we process your personal data on the basis of
            Art. 6(1)(a) GDPR or Art. 9 (2)(a) GDPR, if special categories of data are processed
            according to Art. 9 (1) DSGVO. In the case of explicit consent to the transfer of
            personal data to third countries, the data processing is also based on Art. 49 (1)(a)
            GDPR. If you have consented to the storage of cookies or to the access to information in
            your end device (e.g., via device fingerprinting), the data processing is additionally
            based on § 25 (1) TTDSG. The consent can be revoked at any time. If your data is
            required for the fulfillment of a contract or for the implementation of pre-contractual
            measures, we process your data on the basis of Art. 6(1)(b) GDPR. Furthermore, if your
            data is required for the fulfillment of a legal obligation, we process it on the basis
            of Art. 6(1)(c) GDPR. Furthermore, the data processing may be carried out on the basis
            of our legitimate interest according to Art. 6(1)(f) GDPR. Information on the relevant
            legal basis in each individual case is provided in the following paragraphs of this
            privacy policy.
          </p>

          <h3 className={SUBHEADING_CLASS}>Designation of a data protection officer</h3>
          <p className={PARAGRAPH_CLASS}>
            We have appointed a data protection officer for our company.
            <br />
            Kandie Kollketiv UG (haftungsbeschränkt), Postfach 13 03 90, 20103 Hamburg, Germany.
            E-mail: hallo@kandiegang.com
          </p>

          <h3 className={SUBHEADING_CLASS}>
            Information on data transfer to the USA and other non-EU countries
          </h3>
          <p className={PARAGRAPH_CLASS}>
            Among other things, we use tools of companies domiciled in the United States or other
            from a data protection perspective non-secure non-EU countries. If these tools are
            active, your personal data may potentially be transferred to these non-EU countries and
            may be processed there. We must point out that in these countries, a data protection
            level that is comparable to that in the EU cannot be guaranteed. For instance, U.S.
            enterprises are under a mandate to release personal data to the security agencies and
            you as the data subject do not have any litigation options to defend yourself in court.
            Hence, it cannot be ruled out that U.S. agencies (e.g., the Secret Service) may process,
            analyze, and permanently archive your personal data for surveillance purposes. We have
            no control over these processing activities.
          </p>
          <p className={PARAGRAPH_CLASS}>
            Where technically and contractually available, we use EU hosting or EU-based options for
            our service providers (e.g. EU regions for analytics and data storage) in order to keep
            data processing within the European Economic Area and to reduce transfers to non-EU
            countries.
          </p>

          <h3 className={SUBHEADING_CLASS}>Revocation of your consent to the processing of data</h3>
          <p className={PARAGRAPH_CLASS}>
            A wide range of data processing transactions are possible only subject to your express
            consent. You can also revoke at any time any consent you have already given us. This
            shall be without prejudice to the lawfulness of any data collection that occurred prior
            to your revocation.
          </p>

          <h3 className={SUBHEADING_CLASS}>
            Right to object to the collection of data in special cases; right to object to direct
            advertising (Art. 21 GDPR)
          </h3>
          <p className={PARAGRAPH_CLASS}>
            In the event that data are processed on the basis of Art. 6(1)(e) or (f) GDPR, you have
            the right to at any time object to the processing of your personal data based on grounds
            arising from your unique situation. This also applies to any profiling based on these
            provisions. To determine the legal basis, on which any processing of data is based,
            please consult this data protection declaration. If you log an objection, we will no
            longer process your affected personal data, unless we are in a position to present
            compelling protection worthy grounds for the processing of your data, that outweigh your
            interests, rights and freedoms or if the purpose of the processing is the claiming,
            exercising or defence of legal entitlements (objection pursuant to Art. 21(1) GDPR).
          </p>
          <p className={PARAGRAPH_CLASS}>
            If your personal data is being processed in order to engage in direct advertising, you
            have the right to object to the processing of your affected personal data for the
            purposes of such advertising at any time. This also applies to profiling to the extent
            that it is affiliated with such direct advertising. If you object, your personal data
            will subsequently no longer be used for direct advertising purposes (objection pursuant
            to Art. 21(2) GDPR).
          </p>

          <h3 className={SUBHEADING_CLASS}>
            Right to log a complaint with the competent supervisory agency
          </h3>
          <p className={PARAGRAPH_CLASS}>
            In the event of violations of the GDPR, data subjects are entitled to log a complaint
            with a supervisory agency, in particular in the member state where they usually maintain
            their domicile, place of work or at the place where the alleged violation occurred. The
            right to log a complaint is in effect regardless of any other administrative or court
            proceedings available as legal recourses.
          </p>

          <h3 className={SUBHEADING_CLASS}>Right to data portability</h3>
          <p className={PARAGRAPH_CLASS}>
            You have the right to demand that we hand over any data we automatically process on the
            basis of your consent or in order to fulfil a contract be handed over to you or a third
            party in a commonly used, machine readable format. If you should demand the direct
            transfer of the data to another controller, this will be done only if it is technically
            feasible.
          </p>

          <h3 className={SUBHEADING_CLASS}>SSL and/or TLS encryption</h3>
          <p className={PARAGRAPH_CLASS}>
            For security reasons and to protect the transmission of confidential content, such as
            purchase orders or inquiries you submit to us as the website operator, this website uses
            either an SSL or a TLS encryption program. You can recognize an encrypted connection by
            checking whether the address line of the browser switches from &quot;http://&quot; to
            &quot;https://&quot; and also by the appearance of the lock icon in the browser line. If
            the SSL or TLS encryption is activated, data you transmit to us cannot be read by third
            parties.
          </p>

          <h3 className={SUBHEADING_CLASS}>
            Information about, rectification and eradication of data
          </h3>
          <p className={PARAGRAPH_CLASS}>
            Within the scope of the applicable statutory provisions, you have the right to at any
            time demand information about your archived personal data, their source and recipients
            as well as the purpose of the processing of your data. You may also have a right to have
            your data rectified or eradicated. If you have questions about this subject matter or
            any other questions about personal data, please do not hesitate to contact us at any
            time.
          </p>

          <h3 className={SUBHEADING_CLASS}>Right to demand processing restrictions</h3>
          <p className={PARAGRAPH_CLASS}>
            You have the right to demand the imposition of restrictions as far as the processing of
            your personal data is concerned. To do so, you may contact us at any time. The right to
            demand restriction of processing applies in the following cases:
          </p>
          <ul className={LIST_CLASS}>
            <li>
              In the event that you should dispute the correctness of your data archived by us, we
              will usually need some time to verify this claim. During the time that this
              investigation is ongoing, you have the right to demand that we restrict the processing
              of your personal data.
            </li>
            <li>
              If the processing of your personal data was/is conducted in an unlawful manner, you
              have the option to demand the restriction of the processing of your data in lieu of
              demanding the eradication of this data.
            </li>
            <li>
              If we do not need your personal data any longer and you need it to exercise, defend or
              claim legal entitlements, you have the right to demand the restriction of the
              processing of your personal data instead of its eradication.
            </li>
            <li>
              If you have raised an objection pursuant to Art. 21(1) GDPR, your rights and our
              rights will have to be weighed against each other. As long as it has not been
              determined whose interests prevail, you have the right to demand a restriction of the
              processing of your personal data.
            </li>
          </ul>
          <p className={PARAGRAPH_CLASS}>
            If you have restricted the processing of your personal data, these data – with the
            exception of their archiving – may be processed only subject to your consent or to
            claim, exercise or defend legal entitlements or to protect the rights of other natural
            persons or legal entities or for important public interest reasons cited by the European
            Union or a member state of the EU.
          </p>

          <h3 className={SUBHEADING_CLASS}>Rejection of unsolicited e-mails</h3>
          <p className={PARAGRAPH_CLASS}>
            We herewith object to the use of contact information published in conjunction with the
            mandatory information to be provided in our Site Notice to send us promotional and
            information material that we have not expressly requested. The operators of this website
            and its pages reserve the express right to take legal action in the event of the
            unsolicited sending of promotional information, for instance via SPAM messages.
          </p>
        </section>

        <section id="recording" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>4. Recording of data on this website</h2>
          <h3 className={SUBHEADING_CLASS}>Data processing</h3>
          <p className={PARAGRAPH_CLASS}>
            We have concluded a data processing agreement (DPA) with the above-mentioned provider.
            This is a contract mandated by data privacy laws that guarantees that they process
            personal data of our website visitors only based on our instructions and in compliance
            with the GDPR.
          </p>
          <h3 className={SUBHEADING_CLASS}>Server log files</h3>
          <p className={PARAGRAPH_CLASS}>
            The provider of this website and its pages automatically collects and stores information
            in so-called server log files, which your browser communicates to us automatically. The
            information comprises:
          </p>
          <ul className={LIST_CLASS}>
            <li>The type and version of browser used</li>
            <li>The used operating system</li>
            <li>Referrer URL</li>
            <li>The hostname of the accessing computer</li>
            <li>The time of the server inquiry</li>
            <li>The IP address</li>
          </ul>
          <p className={PARAGRAPH_CLASS}>
            This data is not merged with other data sources. This data is recorded on the basis of
            Art. 6(1)(f) GDPR. The operator of the website has a legitimate interest in the
            technically error free depiction and the optimization of the operator&apos;s website. In
            order to achieve this, server log files must be recorded.
          </p>
          <h3 className={SUBHEADING_CLASS}>Contact form</h3>
          <p className={PARAGRAPH_CLASS}>
            You can contact us using either a contact form provided on our website or by email using
            the email address provided on our website. If you contact us using the contact form, the
            data you enter in the input mask will be sent to us and saved when you send them. The
            following data will be saved: User&apos;s email address, User&apos;s name, Country of
            origin, Subject, Free text box for the message, Browser type and browser version,
            Operating system and its interface, Date and time when the contact was accepted,
            Optional: Degree/professional qualification, Current profession, Age, Gender.
          </p>
          <p className={PARAGRAPH_CLASS}>
            Before you send the completed contract form, your consent to our processing the data is
            obtained, and reference is made to this privacy policy. The information you have entered
            into the contact form shall remain with us until you ask us to eradicate the data,
            revoke your consent to the archiving of data, 14 days are over or if the purpose for
            which the information is being archived no longer exists (e.g., after we have concluded
            our response to your inquiry). This shall be without prejudice to any mandatory legal
            provisions, in particular retention periods.
          </p>
          <h3 className={SUBHEADING_CLASS}>Request by e-mail, telephone, or fax</h3>
          <p className={PARAGRAPH_CLASS}>
            If you contact us by e-mail, telephone or fax, your request, including all resulting
            personal data (name, request) will be stored and processed by us for the purpose of
            processing your request. We do not pass these data on without your consent. These data
            are processed on the basis of Art. 6(1)(b) GDPR if your inquiry is related to the
            fulfillment of a contract or is required for the performance of pre-contractual
            measures. In all other cases, the data are processed on the basis of our legitimate
            interest in the effective handling of inquiries submitted to us (Art. 6(1)(f) GDPR) or
            on the basis of your consent (Art. 6(1)(a) GDPR) if it has been obtained; the consent
            can be revoked at any time. The data sent by you to us via contact requests remain with
            us until you request us to delete, revoke your consent to the storage or the purpose for
            the data storage lapses (e.g. after completion of your request). Mandatory statutory
            provisions – in particular statutory retention periods – remain unaffected.
          </p>
        </section>

        <section id="social-media" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>5. Social Media</h2>
          <h3 className={SUBHEADING_CLASS}>Social media links</h3>
          <p className={PARAGRAPH_CLASS}>
            Displaying icons from social media platforms such as Facebook, Twitter, YouTube, etc. on
            our websites does not induce automatic transfer of your personal data. Therefore, these
            services are integrated via web links to avoid involuntary automatic data transfer to
            social media providers. According to the Data Protection Law, we are not jointly
            responsible for your data being processed for purposes specified by said providers. Our
            presence on social media is part of our PR work. We endeavour to provide target
            group-oriented information and to stay in close contact with you.
          </p>
        </section>

        <section id="analysis" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>6. Analysis tools and advertising</h2>
          <h3 className={SUBHEADING_CLASS}>Website analytics (PostHog)</h3>
          <p className={PARAGRAPH_CLASS}>
            We use PostHog for website analytics when you have given your consent to analytics
            cookies. PostHog helps us understand how visitors use the site (e.g. page views and key
            actions) in order to improve the website. Analytics only run after you accept analytics
            in our cookie banner. You can change your choice at any time via the cookie preferences.
            For more information, see PostHog&apos;s privacy policy at{' '}
            <a
              href="https://posthog.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
            >
              posthog.com/privacy
            </a>
            . The use of this service is based on your consent pursuant to Art. 6(1)(a) GDPR and §
            25(1) TTDSG.
          </p>
        </section>

        <section id="newsletter" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>7. Newsletter</h2>
          <h3 className={SUBHEADING_CLASS}>Newsletter data</h3>
          <p className={PARAGRAPH_CLASS}>
            It is possible to subscribe to our free newsletter on our website, a general website
            newsletter. When you subscribe to the newsletter, the data from the input mask are sent
            to us. You must enter your email address to subscribe for the newsletter. Furthermore,
            the following data are collected during the subscription process:
          </p>
          <h3 className={SUBHEADING_CLASS}>Double opt-in procedure</h3>
          <p className={PARAGRAPH_CLASS}>
            To ensure that the registration actually came from you and that you agree to receiving
            the information, we use the so-called double opt-in procedure (double approval of use).
            After you have signed up, you will receive a confirmation email at the email address you
            provided. Your registration only becomes effective when you click on the confirmation
            link in this e-mail.
          </p>
          <p className={PARAGRAPH_CLASS}>
            <strong>Deletion in case of non-confirmation:</strong> If you do not confirm the
            confirmation e-mail within seven days, your registration will be automatically deleted.
            In this case, the data you provide will no longer be used and will be removed from our
            database immediately.
          </p>
          <p className={PARAGRAPH_CLASS}>
            <strong>General newsletter:</strong> Email address, IP address of the requesting
            computer, Date and time of registration. Only your email address is essential for us to
            send you the newsletter.
          </p>
        </section>

        <section id="plugins" className={SECTION_SPACING}>
          <h2 className={HEADING_CLASS}>8. Plug-ins and Tools</h2>
          <h3 className={SUBHEADING_CLASS}>YouTube with expanded data protection integration</h3>
          <p className={PARAGRAPH_CLASS}>
            Our website embeds videos of the website YouTube. The website operator is Google Ireland
            Limited (&quot;Google&quot;), Gordon House, Barrow Street, Dublin 4, Ireland. We use
            YouTube in the expanded data protection mode. According to YouTube, this mode ensures
            that YouTube does not store any information about visitors to this website before they
            watch the video. Nevertheless, this does not necessarily mean that the sharing of data
            with YouTube partners can be ruled out as a result of the expanded data protection mode.
            For instance, regardless of whether you are watching a video, YouTube will always
            establish a connection with the Google DoubleClick network. As soon as you start to play
            a YouTube video on this website, a connection to YouTube&apos;s servers will be
            established. As a result, the YouTube server will be notified, which of our pages you
            have visited. If you are logged into your YouTube account while you visit our site, you
            enable YouTube to directly allocate your browsing patterns to your personal profile. You
            have the option to prevent this by logging out of your YouTube account. Furthermore,
            after you have started to play a video, YouTube will be able to place various cookies on
            your device or comparable technologies for recognition (e.g. device fingerprinting). In
            this way YouTube will be able to obtain information about this website&apos;s visitors.
            Among other things, this information will be used to generate video statistics with the
            aim of improving the user friendliness of the site and to prevent attempts to commit
            fraud. Under certain circumstances, additional data processing transactions may be
            triggered after you have started to play a YouTube video, which are beyond our control.
            The use of YouTube is based on our interest in presenting our online content in an
            appealing manner. Pursuant to Art. 6(1)(f) GDPR, this is a legitimate interest. For more
            information on how YouTube handles user data, please consult the YouTube Data Privacy
            Policy under:{' '}
            <a
              href="https://policies.google.com/privacy?hl=en"
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
            >
              policies.google.com/privacy
            </a>
            .
          </p>
          <h3 className={SUBHEADING_CLASS}>OpenStreetMap</h3>
          <p className={PARAGRAPH_CLASS}>
            We are using the mapping service provided by OpenStreetMap (OSM). We host OpenStreetMap
            on the server of the following provider: Mapbox, Inc, 740 15th Street NW, 5th Floor,
            Washington DC 20005, privacy@mapbox.com. We use OpenStreetMap with the objective of
            ensuring the attractive presentation of our online offers and to make it easy for
            visitors to find the locations we specify on our website. This establishes legitimate
            grounds as defined in Art. 6(1)(f) GDPR.
          </p>
        </section>
      </main>
    </div>
  );
};

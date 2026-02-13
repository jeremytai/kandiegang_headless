/**
 * ContactPage.tsx
 * Contact form page for reaching the Kandie Gang team.
 * - Centered layout with heading, intro text, and shared ContactForm (Formspree + honeypot).
 */

import React from 'react';
import { ContactForm } from '../../components/ContactForm';

export const ContactPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-white px-6 pt-32 pb-20">
    <div className="max-w-md w-full text-center">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-slate-900">Contact</h1>
      <p className="text-slate-500 mb-10 leading-relaxed text-base md:text-lg font-light">
        Reach out to the Kandie Gang team. We're building the future of home robotics.
      </p>
      <ContactForm variant="page" />
    </div>
  </div>
);

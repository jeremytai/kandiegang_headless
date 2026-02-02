/**
 * ContactPage.tsx
 * Contact form page for reaching the Kandie Gang team.
 * - Centered layout with heading, intro text, and form fields (name, email, message).
 * - Styling aligned with the rest of the app (slate, rounded-2xl, font weights).
 */

import React from 'react';

export const ContactPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-white px-6 pt-32 pb-20">
    <div className="max-w-md w-full text-center">
      <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-slate-900">Contact</h1>
      <p className="text-slate-500 mb-10 leading-relaxed text-base md:text-lg font-light">Reach out to the Kandie Gang team. We’re building the future of home robotics.</p>
      <div className="space-y-4 text-left">
        <input className="w-full p-5 md:p-6 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-slate-200 transition-all font-medium text-slate-900 text-sm md:text-base" placeholder="Full Name" />
        <input className="w-full p-5 md:p-6 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-slate-200 transition-all font-medium text-slate-900 text-sm md:text-base" placeholder="Email address" />
        <textarea className="w-full p-5 md:p-6 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-slate-200 transition-all font-medium h-40 md:h-48 resize-none text-slate-900 text-sm md:text-base" placeholder="Message" />
        <button className="w-full bg-black text-white p-5 md:p-6 rounded-2xl font-bold hover:bg-slate-800 transition-all text-base md:text-lg shadow-xl shadow-black/10">Send Inquiry</button>
      </div>
    </div>
  </div>
);

/**
 * ContactForm.tsx
 * Reusable contact form with Formspree submission and honeypot (_gotcha) spam protection.
 * Set VITE_FORMSPREE_CONTACT_FORM_ID in .env to your Formspree form ID (e.g. xyzabcde).
 */

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { posthog, FUNNEL_EVENTS } from '../../lib/posthog';

const FORMSPREE_FORM_ID = (
  import.meta as unknown as { env: { VITE_FORMSPREE_CONTACT_FORM_ID?: string } }
).env.VITE_FORMSPREE_CONTACT_FORM_ID?.trim();

const formAction = FORMSPREE_FORM_ID ? `https://formspree.io/f/${FORMSPREE_FORM_ID}` : '#';

type Variant = 'page' | 'modal';

const inputBase =
  'w-full bg-slate-50 border-none outline-none focus:ring-2 focus:ring-slate-200 transition-all font-medium text-slate-900 text-sm md:text-base';
const inputPage = 'p-5 md:p-6 rounded-2xl';
const inputModal = 'p-3 md:p-4 rounded-2xl';

export const ContactForm: React.FC<{ variant?: Variant }> = ({ variant = 'page' }) => {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputClass = `${inputBase} ${variant === 'modal' ? inputModal : inputPage}`;
  const textareaClass = `${inputClass} h-20 resize-none ${variant === 'page' ? 'md:h-48' : ''}`;

  if (!FORMSPREE_FORM_ID) {
    return (
      <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
        Set <code className="rounded bg-amber-100 px-1">VITE_FORMSPREE_CONTACT_FORM_ID</code> in
        your <code className="rounded bg-amber-100 px-1">.env</code> to your Formspree form ID to
        enable the contact form.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setStatus('submitting');
    setErrorMessage(null);
    try {
      const res = await fetch(formAction, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setStatus('success');
        form.reset();
        posthog.capture(FUNNEL_EVENTS.CONTACT_FORM_SUBMITTED);
        return;
      }
      const data = await res.json().catch(() => ({}));
      const msg =
        typeof data?.error === 'string' ? data.error : 'Something went wrong. Please try again.';
      setErrorMessage(msg);
      setStatus('error');
    } catch {
      setErrorMessage('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  };

  return (
    <form action={formAction} method="POST" onSubmit={handleSubmit} className="space-y-4 text-left">
      {/* Honeypot: hidden from users, bots often fill it. Formspree rejects if _gotcha is set. */}
      <input
        type="text"
        name="_gotcha"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] w-px h-px overflow-hidden opacity-0 pointer-events-none"
        aria-hidden="true"
      />
      <input type="hidden" name="_subject" value="New contact form submission" />

      <input
        type="text"
        name="name"
        placeholder={variant === 'modal' ? 'First and Last Name' : 'Full Name'}
        required
        className={inputClass}
        disabled={status === 'submitting'}
      />
      <input
        type="email"
        name="email"
        placeholder="Email address"
        required
        className={inputClass}
        disabled={status === 'submitting'}
      />
      <textarea
        name="message"
        placeholder="Message"
        required
        rows={variant === 'modal' ? 3 : 6}
        className={textareaClass}
        disabled={status === 'submitting'}
      />

      {status === 'success' && (
        <p className="text-secondary-drift font-medium text-sm">
          Thanks! We’ll get back to you soon.
        </p>
      )}
      {status === 'error' && errorMessage && (
        <p className="text-red-600 font-medium text-sm">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className={
          variant === 'modal'
            ? 'group inline-flex flex-nowrap items-center justify-center gap-2 w-full rounded-full border border-secondary-purple-rain bg-transparent px-6 py-4 text-sm font-medium text-secondary-purple-rain transition-colors hover:border-secondary-blush hover:bg-secondary-blush hover:text-white active:scale-95 disabled:opacity-70 md:gap-2 md:text-base'
            : 'group inline-flex flex-nowrap items-center justify-center gap-2 w-full rounded-full border border-secondary-blush bg-transparent px-6 py-4 text-sm font-medium text-secondary-blush transition-colors hover:border-secondary-blush hover:bg-secondary-blush hover:text-white disabled:opacity-70 md:gap-2 md:py-5 md:px-8 md:text-base'
        }
      >
        <span>{status === 'submitting' ? 'Sending…' : 'Send Inquiry'}</span>
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary-blush/20 p-1 transition-colors group-hover:bg-white">
          <ArrowRight
            className="h-3 w-3 text-secondary-blush transition-colors"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </span>
      </button>
    </form>
  );
};

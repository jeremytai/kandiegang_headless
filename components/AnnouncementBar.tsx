/**
 * AnnouncementBar.tsx
 * Full-width announcement strip at the top of the main content. Scrolls with the page.
 */

import React, { useState } from 'react';

export interface AnnouncementBarProps {
  /** Main message text. */
  message: string;
  /** Optional link URL; when set, the message is wrapped in an anchor. */
  href?: string;
  /** Optional additional class names. */
  className?: string;
  /** Optional callback when the bar is dismissed. */
  onDismiss?: () => void;
}

const DEFAULT_MESSAGE = 'We\'re  making some changes. Some things might not work as expected.';

export const AnnouncementBar: React.FC<AnnouncementBarProps> = ({
  message = DEFAULT_MESSAGE,
  href,
  className = '',
  onDismiss,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const content = (
    <span className="font-body text-[11px] md:text-xs font-normal tracking-wide leading-none text-slate-600">
      {message}
    </span>
  );

  return (
    <div
      className={`w-full bg-black px-4 md:px-6 flex items-center justify-center h-8 md:h-9 ${className}`.trim()}
      role="region"
      aria-label="Announcement"
    >
      <div className="mx-auto max-w-4xl relative flex items-center justify-center">
        <div className="px-8 text-center mx-auto relative -top-0.5">
          {href ? (
            <a
              href={href}
              className="hover:underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black rounded"
            >
              {content}
            </a>
          ) : (
            content
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            onDismiss?.();
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-600 text-[10px] text-slate-600 hover:text-white hover:border-white focus:outline-none focus:ring-2 focus:ring-white/80 focus:ring-offset-2 focus:ring-offset-black"
        >
          <span aria-hidden="true">×</span>
          <span className="sr-only">Dismiss announcement</span>
        </button>
      </div>
    </div>
  );
};

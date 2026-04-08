import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

export interface EventShareButtonProps {
  eventSlug: string;
  /** Shown as `title` in Web Share API payloads. */
  eventTitle: string;
  /** Canonical event URL for share text (optional). */
  pageUrl?: string | null;
}

function shareCardUrl(slug: string): string {
  const params = new URLSearchParams({ slug });
  return `/api/event-share?${params.toString()}`;
}

export const EventShareButton: React.FC<EventShareButtonProps> = ({ eventSlug, eventTitle, pageUrl }) => {
  const shareTitle = eventTitle.trim() || 'Kandie Gang event';
  const [busy, setBusy] = useState(false);
  // Pre-fetched blob cached here so the click handler can call navigator.share() synchronously,
  // which is required to satisfy the browser's user-gesture requirement.
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    if (!eventSlug.trim()) return;
    let cancelled = false;
    fetch(shareCardUrl(eventSlug))
      .then((res) => (res.ok && res.headers.get('content-type')?.includes('image') ? res.blob() : null))
      .then((blob) => { if (!cancelled && blob) blobRef.current = blob; })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [eventSlug]);

  const handleShare = useCallback(() => {
    if (busy) return;

    const blob = blobRef.current;
    const fallbackUrl = pageUrl || window.location.href;

    // Path 1: file share — blob is ready, call navigator.share() synchronously
    if (blob) {
      const file = new File([blob], `kandie-gang-${eventSlug}.png`, { type: 'image/png' });
      const filePayload: ShareData = {
        files: [file],
        title: shareTitle,
        text: pageUrl ? `Join us here: ${pageUrl}` : undefined,
      };
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.(filePayload)) {
        navigator.share(filePayload)
          .then(() => toast.success('Shared'))
          .catch((e) => { if (e.name !== 'AbortError') toast.error('Could not share'); });
        return;
      }
      // navigator.share unavailable — download instead
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kandie-gang-${eventSlug}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Image downloaded');
      return;
    }

    // Path 2: blob not ready yet — fall back to URL-only share (still synchronous)
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: shareTitle, url: fallbackUrl })
        .then(() => toast.success('Shared'))
        .catch((e) => { if (e.name !== 'AbortError') toast.error('Could not share'); });
      return;
    }

    // Path 3: no share API — fetch now and download (async is fine here, no share API involved)
    setBusy(true);
    fetch(shareCardUrl(eventSlug))
      .then((res) => res.ok ? res.blob() : Promise.reject(new Error(`HTTP ${res.status}`)))
      .then((b) => {
        blobRef.current = b;
        const url = URL.createObjectURL(b);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kandie-gang-${eventSlug}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Image downloaded');
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not create share image'))
      .finally(() => setBusy(false));
  }, [eventSlug, eventTitle, pageUrl, busy]);

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={busy}
      className="group inline-flex flex-nowrap items-center justify-center gap-2 rounded-full border border-white/50 bg-transparent px-3 py-1.5 text-[0.7rem] md:text-xs font-medium text-white transition-colors hover:border-secondary-blush hover:bg-white/10 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
      aria-label="Share event image"
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 p-1 transition-colors group-hover:bg-white/20">
        <Share2 className="h-3 w-3 text-white" strokeWidth={2} aria-hidden />
      </span>
      {busy ? 'Kurzer…' : 'Share event'}
    </button>
  );
};

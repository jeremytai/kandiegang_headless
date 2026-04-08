import React, { useCallback, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

export interface EventShareButtonProps {
  eventSlug: string;
  /** Canonical event URL for share text (optional). */
  pageUrl?: string | null;
}

function shareCardUrl(slug: string): string {
  const params = new URLSearchParams({ slug });
  return `/api/event-share?${params.toString()}`;
}

export const EventShareButton: React.FC<EventShareButtonProps> = ({ eventSlug, pageUrl }) => {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const handleShare = useCallback(async () => {
    if (!eventSlug.trim() || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const cardUrl = shareCardUrl(eventSlug);
      const res = await fetch(cardUrl);
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'Event not found' : `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const file = new File([blob], `kandie-gang-${eventSlug}.png`, { type: 'image/png' });
      const sharePayload: ShareData = {
        files: [file],
        title: 'Kandie Gang event',
        text: pageUrl ? `Join us: ${pageUrl}` : undefined,
      };

      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.(sharePayload)) {
        await navigator.share(sharePayload);
        toast.success('Shared');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kandie-gang-${eventSlug}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Image downloaded');
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      toast.error(e instanceof Error ? e.message : 'Could not create share image');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, [eventSlug, pageUrl]);

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
      aria-label="Share event image"
    >
      <Share2 className="h-4 w-4" aria-hidden />
      {busy ? 'Kurzer…' : 'Share event'}
    </button>
  );
};

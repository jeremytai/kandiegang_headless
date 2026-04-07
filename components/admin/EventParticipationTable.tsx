import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useEventParticipation } from '../../hooks/useEventParticipation';
import { supabase } from '../../lib/supabaseClient';
import type { EventParticipationEvent, EventParticipationRegistrant } from '../../types/analytics';

/* ─── Constants ─── */
const LEVEL_LABELS: Record<string, string> = {
  level1: 'L1',
  level2: 'L2',
  level2plus: 'L2+',
  level3: 'L3',
  workshop: 'Workshop',
  gravel: 'Gravel',
};

const LEVEL_ORDER = ['level1', 'level2', 'level2plus', 'level3', 'gravel', 'workshop'];

const TYPE_COLORS: Record<string, string> = {
  ride: '#2A3577',
  gravel: '#16a34a',
  workshop: '#7c3aed',
};

/* ─── Badge ─── */
function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}14`, color, border: `1px solid ${color}30` }}
    >
      {children}
    </span>
  );
}

/* ─── Participant actions dropdown ─── */
function ParticipantActions({
  registrant,
  eventId,
  eventTitle,
  onActionComplete,
  onOptimisticUpdate,
}: {
  registrant: EventParticipationRegistrant;
  eventId: number;
  eventTitle: string;
  onActionComplete: () => void;
  onOptimisticUpdate: (registrationId: string, type: 'cancel' | 'noshow') => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<'remove' | 'noshow' | null>(null);
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState(`Message about ${eventTitle}`);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isCancelled = Boolean(registrant.cancelledAt);
  const isNoShow = Boolean(registrant.noShowAt) && !isCancelled;
  const hasEmail = Boolean(registrant.email) || Boolean(registrant.userId);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(null);
        setError(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function callApi(body: Record<string, unknown>) {
    const { data: { session } } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    if (!session?.access_token) throw new Error('Not authenticated');
    const res = await fetch('/api/admin-update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json;
  }

  async function doRemove() {
    setLoading(true);
    setError(null);
    try {
      await callApi({ action: 'admin-remove-participant', registrationId: registrant.registrationId, eventId });
      setOpen(false);
      setConfirming(null);
      onOptimisticUpdate(registrant.registrationId, 'cancel');
      onActionComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove participant');
    } finally {
      setLoading(false);
    }
  }

  async function doNoShow() {
    setLoading(true);
    setError(null);
    try {
      await callApi({ action: 'admin-no-show', registrationId: registrant.registrationId });
      setOpen(false);
      setConfirming(null);
      onOptimisticUpdate(registrant.registrationId, 'noshow');
      onActionComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as no-show');
    } finally {
      setLoading(false);
    }
  }

  async function doSendEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await callApi({ action: 'admin-send-participant-email', registrationId: registrant.registrationId, subject, message });
      setComposing(false);
      setMessage('');
      setOpen(false);
      onActionComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setLoading(false);
    }
  }

  if (isCancelled) {
    return <span className="text-neutral-300 text-xs select-none">—</span>;
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setConfirming(null); setError(null); }}
        className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors leading-none"
        title="Participant actions"
        aria-label="Participant actions"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-1 w-52 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 text-sm"
          style={{ minWidth: '13rem' }}
        >
          {error && (
            <div className="px-3 py-2 text-red-500 text-xs border-b border-neutral-100">{error}</div>
          )}

          {confirming === 'remove' ? (
            <div className="px-3 py-2">
              <p className="text-neutral-700 text-xs mb-2">Remove this participant? This will open their spot to the next person on the waitlist.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={doRemove}
                  disabled={loading}
                  className="flex-1 py-1 px-2 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  {loading ? 'Removing…' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirming(null); setError(null); }}
                  disabled={loading}
                  className="flex-1 py-1 px-2 bg-neutral-100 text-neutral-700 rounded text-xs font-medium hover:bg-neutral-200 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : confirming === 'noshow' ? (
            <div className="px-3 py-2">
              <p className="text-neutral-700 text-xs mb-2">Mark as no-show? This does not open their spot to the waitlist.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={doNoShow}
                  disabled={loading}
                  className="flex-1 py-1 px-2 bg-amber-500 text-white rounded text-xs font-medium hover:bg-amber-600 disabled:opacity-50"
                >
                  {loading ? 'Marking…' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirming(null); setError(null); }}
                  disabled={loading}
                  className="flex-1 py-1 px-2 bg-neutral-100 text-neutral-700 rounded text-xs font-medium hover:bg-neutral-200 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setConfirming('remove')}
                className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-red-600 transition-colors"
              >
                Remove from event
              </button>
              {!isNoShow && (
                <button
                  type="button"
                  onClick={() => setConfirming('noshow')}
                  className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-amber-600 transition-colors"
                >
                  Mark as no-show
                </button>
              )}
              <button
                type="button"
                onClick={() => { setComposing(true); setOpen(false); }}
                disabled={!hasEmail}
                title={!hasEmail ? 'No email address on file' : undefined}
                className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-neutral-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Send personal email
              </button>
            </>
          )}
        </div>
      )}

      {/* Email compose panel — rendered inline below the row, but shown via sibling state */}
      {composing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={(e) => { if (e.target === e.currentTarget) { setComposing(false); setError(null); } }}
        >
          <div className="bg-white rounded-xl shadow-xl border border-neutral-200 w-full max-w-md mx-4 p-5">
            <h3 className="text-sm font-semibold text-neutral-900 mb-1">
              Email to {registrant.firstName} {registrant.lastName}
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              {registrant.email ?? 'Email from profile'}
            </p>
            <form onSubmit={doSendEmail} className="space-y-3">
              <div>
                <label htmlFor="email-subject" className="block text-xs text-neutral-500 mb-1 uppercase tracking-wide">Subject</label>
                <input
                  id="email-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  required
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#2A3577]/30"
                />
              </div>
              <div>
                <label htmlFor="email-message" className="block text-xs text-neutral-500 mb-1 uppercase tracking-wide">Message</label>
                <textarea
                  id="email-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={5000}
                  required
                  rows={5}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#2A3577]/30 resize-none"
                />
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-[#2A3577] text-white rounded-lg text-sm font-medium hover:bg-[#1E2555] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Sending…' : 'Send email'}
                </button>
                <button
                  type="button"
                  onClick={() => { setComposing(false); setError(null); }}
                  disabled={loading}
                  className="flex-1 py-2 bg-neutral-100 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Participant sub-table ─── */
function ParticipantList({
  registrants,
  eventId,
  eventTitle,
  onRefresh,
}: {
  registrants: EventParticipationRegistrant[];
  eventId: number;
  eventTitle: string;
  onRefresh: () => void;
}) {
  // Optimistic overrides: applied immediately on action success, cleared on next data refresh
  const [overrides, setOverrides] = useState<Record<string, 'cancel' | 'noshow'>>({});

  function handleOptimisticUpdate(registrationId: string, type: 'cancel' | 'noshow') {
    setOverrides((prev) => ({ ...prev, [registrationId]: type }));
  }

  const sorted = [...registrants].sort((a, b) => {
    const effectiveCancelled = (r: EventParticipationRegistrant) =>
      Boolean(r.cancelledAt) || overrides[r.registrationId] === 'cancel';
    const rank = (r: EventParticipationRegistrant) =>
      effectiveCancelled(r) ? 2 : r.isWaitlist ? 1 : 0;
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return a.signedUpAt.localeCompare(b.signedUpAt);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-neutral-100">
            {['Name', 'Email', 'Level', 'Signed up', 'Status', 'Total signups', 'Total cancels', ''].map(
              (h, i) => (
                <th
                  key={i}
                  className={`text-left py-2 px-3 text-neutral-400 font-medium uppercase tracking-[0.08em] whitespace-nowrap${h === '' ? ' w-8' : ''}`}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const override = overrides[r.registrationId];
            const isCancelled = Boolean(r.cancelledAt) || override === 'cancel';
            const isNoShow = (Boolean(r.noShowAt) || override === 'noshow') && !isCancelled;
            const isWaitlist = r.isWaitlist && !isCancelled;
            const rowClass = isCancelled ? 'opacity-50' : '';

            return (
              <tr key={i} className={`border-b border-neutral-50 last:border-0 ${rowClass}`}>
                <td className="py-2 px-3 font-medium text-neutral-800 whitespace-nowrap">
                  {r.firstName} {r.lastName}
                </td>
                <td className="py-2 px-3 text-neutral-500">{r.email ?? '—'}</td>
                <td className="py-2 px-3">
                  <Badge color={TYPE_COLORS.ride}>
                    {LEVEL_LABELS[r.rideLevel] ?? r.rideLevel}
                  </Badge>
                </td>
                <td className="py-2 px-3 text-neutral-500 whitespace-nowrap">
                  {r.signedUpAt ? new Date(r.signedUpAt).toLocaleDateString('en-GB') : '—'}
                </td>
                <td className="py-2 px-3">
                  {isCancelled ? (
                    <Badge color="#6b7280">Cancelled</Badge>
                  ) : isNoShow ? (
                    <Badge color="#f59e0b">No-show</Badge>
                  ) : isWaitlist ? (
                    <Badge color="#7c3aed">Waitlist</Badge>
                  ) : (
                    <Badge color="#16a34a">Confirmed</Badge>
                  )}
                </td>
                <td className="py-2 px-3 text-center text-neutral-700">{r.totalSignups}</td>
                <td className="py-2 px-3 text-center text-neutral-500">{r.totalCancellations}</td>
                <td className="py-2 px-3 text-right">
                  <ParticipantActions
                    registrant={{ ...r, cancelledAt: isCancelled ? (r.cancelledAt ?? 'pending') : null, noShowAt: isNoShow ? (r.noShowAt ?? 'pending') : null }}
                    eventId={eventId}
                    eventTitle={eventTitle}
                    onActionComplete={onRefresh}
                    onOptimisticUpdate={handleOptimisticUpdate}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Event row ─── */
function EventRow({
  event,
  isExpanded,
  onToggle,
  onRefresh,
}: {
  event: EventParticipationEvent;
  isExpanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const typeColor = TYPE_COLORS[event.eventType] ?? '#6b7280';
  const typeLabel =
    event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1);

  // Sort levels by canonical order
  const levelEntries = LEVEL_ORDER.filter((l) => event.byLevel[l]).map((l) => ({
    key: l,
    label: LEVEL_LABELS[l] ?? l,
    ...event.byLevel[l],
  }));
  // Any levels not in LEVEL_ORDER
  Object.keys(event.byLevel)
    .filter((l) => !LEVEL_ORDER.includes(l))
    .forEach((l) =>
      levelEntries.push({ key: l, label: LEVEL_LABELS[l] ?? l, ...event.byLevel[l] })
    );

  return (
    <>
      <tr
        className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        {/* Chevron + title */}
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 transition-transform" style={{ display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ›
            </span>
            <span className="font-medium text-neutral-900 text-sm">{event.title}</span>
          </div>
        </td>
        {/* Date */}
        <td className="py-3 px-4 text-neutral-500 text-sm whitespace-nowrap">
          {event.date ? new Date(event.date).toLocaleDateString('en-GB') : '—'}
        </td>
        {/* Type */}
        <td className="py-3 px-4">
          <Badge color={typeColor}>{typeLabel}</Badge>
        </td>
        {/* Confirmed */}
        <td className="py-3 px-4 text-center">
          <span className="text-emerald-600 font-medium text-sm">{event.confirmed}</span>
        </td>
        {/* Waitlist */}
        <td className="py-3 px-4 text-center">
          <span className="text-violet-600 text-sm">{event.waitlist || '—'}</span>
        </td>
        {/* Cancelled */}
        <td className="py-3 px-4 text-center">
          <span className="text-neutral-400 text-sm">{event.cancelled || '—'}</span>
        </td>
        {/* Level breakdown */}
        <td className="py-3 px-4">
          <div className="flex flex-wrap gap-1">
            {levelEntries.length > 0 ? (
              levelEntries.map(({ key, label, confirmed: c, waitlist: w }) => (
                <span
                  key={key}
                  className="inline-block px-1.5 py-0.5 rounded text-xs bg-neutral-100 text-neutral-600"
                >
                  {label}: {c}{w > 0 ? `+${w}w` : ''}
                </span>
              ))
            ) : (
              <span className="text-neutral-300 text-xs">—</span>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={7} className="bg-neutral-50 px-6 py-4">
            {event.registrants.length === 0 ? (
              <p className="text-neutral-400 text-xs">No participants.</p>
            ) : (
              <ParticipantList
                registrants={event.registrants}
                eventId={event.eventId}
                eventTitle={event.title}
                onRefresh={onRefresh}
              />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

/* ─── Main component ─── */
type SortKey = 'date' | 'title' | 'confirmed' | 'waitlist' | 'cancelled';
type SortDir = 'asc' | 'desc';

export function EventParticipationTable() {
  const { events, loading, error, refresh } = useEventParticipation();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'desc');
    }
  };

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => {
      let diff = 0;
      if (sortKey === 'date') diff = a.date.localeCompare(b.date);
      else if (sortKey === 'title') diff = a.title.localeCompare(b.title);
      else if (sortKey === 'confirmed') diff = a.confirmed - b.confirmed;
      else if (sortKey === 'waitlist') diff = a.waitlist - b.waitlist;
      else if (sortKey === 'cancelled') diff = a.cancelled - b.cancelled;
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [events, sortKey, sortDir]);

  const SortIcon = ({ k }: { k: SortKey }) =>
    k !== sortKey ? null : (
      <span className="ml-1 text-[#ff611a]">{sortDir === 'asc' ? '↑' : '↓'}</span>
    );

  const thClass =
    'text-left py-3 px-4 text-neutral-400 text-xs font-medium uppercase tracking-[0.1em] cursor-pointer hover:text-[#ff611a] transition-colors whitespace-nowrap';

  return (
    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-neutral-100">
        <p className="text-[#ff611a] text-xs font-medium uppercase tracking-[0.2em] mb-1">
          Breakdown
        </p>
        <h2 className="text-xl font-light text-neutral-900">Event Participation</h2>
      </div>

      {loading && (
        <div className="px-6 py-8 text-neutral-400 text-sm">Loading event participation…</div>
      )}
      {error && (
        <div className="px-6 py-8 text-red-500 text-sm">{error}</div>
      )}
      {!loading && !error && sorted.length === 0 && (
        <div className="px-6 py-8 text-neutral-400 text-sm">No registrations found.</div>
      )}

      {!loading && !error && sorted.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className={thClass} onClick={() => handleSort('title')}>
                  Event <SortIcon k="title" />
                </th>
                <th className={thClass} onClick={() => handleSort('date')}>
                  Date <SortIcon k="date" />
                </th>
                <th className={thClass}>Type</th>
                <th
                  className={`${thClass} text-center`}
                  onClick={() => handleSort('confirmed')}
                >
                  Confirmed <SortIcon k="confirmed" />
                </th>
                <th
                  className={`${thClass} text-center`}
                  onClick={() => handleSort('waitlist')}
                >
                  Waitlist <SortIcon k="waitlist" />
                </th>
                <th
                  className={`${thClass} text-center`}
                  onClick={() => handleSort('cancelled')}
                >
                  Cancelled <SortIcon k="cancelled" />
                </th>
                <th className={thClass}>By Level</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((event) => (
                <EventRow
                  key={event.eventId}
                  event={event}
                  isExpanded={expandedId === event.eventId}
                  onToggle={() =>
                    setExpandedId((prev) => (prev === event.eventId ? null : event.eventId))
                  }
                  onRefresh={refresh}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

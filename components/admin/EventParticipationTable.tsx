import React, { useState, useMemo } from 'react';
import { useEventParticipation } from '../../hooks/useEventParticipation';
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

/* ─── Participant sub-table ─── */
function ParticipantList({ registrants }: { registrants: EventParticipationRegistrant[] }) {
  const sorted = [...registrants].sort((a, b) => {
    // Confirmed first, then waitlist, then cancelled
    const rank = (r: EventParticipationRegistrant) =>
      r.cancelledAt ? 2 : r.isWaitlist ? 1 : 0;
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return a.signedUpAt.localeCompare(b.signedUpAt);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-neutral-100">
            {['Name', 'Email', 'Level', 'Signed up', 'Status', 'Total signups', 'Total cancels'].map(
              (h) => (
                <th
                  key={h}
                  className="text-left py-2 px-3 text-neutral-400 font-medium uppercase tracking-[0.08em] whitespace-nowrap"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const isCancelled = Boolean(r.cancelledAt);
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
                  ) : isWaitlist ? (
                    <Badge color="#7c3aed">Waitlist</Badge>
                  ) : (
                    <Badge color="#16a34a">Confirmed</Badge>
                  )}
                </td>
                <td className="py-2 px-3 text-center text-neutral-700">{r.totalSignups}</td>
                <td className="py-2 px-3 text-center text-neutral-500">{r.totalCancellations}</td>
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
}: {
  event: EventParticipationEvent;
  isExpanded: boolean;
  onToggle: () => void;
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
              <ParticipantList registrants={event.registrants} />
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
  const { events, loading, error } = useEventParticipation();
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
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Event share card date/time formatting — shared rules for API and UI copy.
 * Mirrors KandieEventPage dateLabel + timeLine for consistency.
 */

function getOrdinal(day: number): string {
  const mod10 = day % 10;
  const mod100 = day % 100;
  if (mod10 === 1 && mod100 !== 11) return `${day}st`;
  if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
  return `${day}th`;
}

/** e.g. "Saturday, April 11th, 2026" — same pieces as event page dateLabel. */
export function formatEventDateLabel(eventDateIso: string): string {
  if (!eventDateIso) return '';
  const eventDatePart = eventDateIso.split('T')[0];
  const eventDate = eventDateIso ? new Date(eventDateIso) : new Date(NaN);
  const eventDateForWeekday = eventDatePart ? new Date(`${eventDatePart}T12:00:00`) : null;
  const weekdayLabel =
    eventDateForWeekday && !Number.isNaN(eventDateForWeekday.getTime())
      ? eventDateForWeekday.toLocaleDateString('en-GB', { weekday: 'long' })
      : '';
  const monthLabel =
    eventDate && !Number.isNaN(eventDate.getTime())
      ? eventDate.toLocaleDateString('en-GB', { month: 'long' })
      : '';
  const dayLabel =
    eventDate && !Number.isNaN(eventDate.getTime()) ? getOrdinal(eventDate.getDate()) : '';
  const yearLabel =
    eventDate && !Number.isNaN(eventDate.getTime()) ? String(eventDate.getFullYear()) : '';
  if (weekdayLabel && monthLabel && dayLabel && yearLabel) {
    return `${weekdayLabel}, ${dayLabel} ${monthLabel}, ${yearLabel}`;
  }
  return eventDateIso;
}

export function formatEventTimeLabel(details: {
  workshopStartTime?: string | null;
  rideTime?: string | null;
}): string {
  const t = details.workshopStartTime?.trim() || details.rideTime?.trim() || '';
  return t;
}

/** Figma-style line: "Saturday, April 11th, 2026 | 10:00am" */
export function formatShareDateTimeLine(
  eventDateIso: string,
  details: { workshopStartTime?: string | null; rideTime?: string | null }
): string {
  const date = formatEventDateLabel(eventDateIso);
  const time = formatEventTimeLabel(details);
  if (date && time) return `${date} | ${time}`;
  if (date) return date;
  return time;
}

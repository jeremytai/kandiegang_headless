import React, { useState } from 'react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useAuth } from '../../context/AuthContext';

type WaitlistRow = {
  id: string;
  event_id: number;
  ride_level: string | null;
  waitlist_joined_at: string | null;
  user_id: string;
  profiles?: { email?: string | null } | null;
};

export const WaitlistAdminPage: React.FC = () => {
  usePageMeta('Waitlist Report | Kandie Gang', 'Waitlist report');
  const { user, profile, status } = useAuth();
  const [secret, setSecret] = useState('');
  const [eventId, setEventId] = useState('');
  const [rideLevel, setRideLevel] = useState('');
  const [rows, setRows] = useState<WaitlistRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasAccess = Boolean(user && profile?.is_guide);

  const handleExport = () => {
    if (!rows.length) return;
    const header = ['event_id', 'ride_level', 'waitlist_joined_at', 'user_id', 'email'];
    const lines = [header.join(',')];
    rows.forEach((row) => {
      const values = [
        String(row.event_id ?? ''),
        row.ride_level ?? 'workshop',
        row.waitlist_joined_at ?? '',
        row.user_id ?? '',
        row.profiles?.email ?? '',
      ].map((value) => {
        const safe = String(value).replace(/"/g, '""');
        return `"${safe}"`;
      });
      lines.push(values.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'waitlist-report.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleLoad = async () => {
    setError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventId.trim()) params.set('eventId', eventId.trim());
      if (rideLevel.trim()) params.set('rideLevel', rideLevel.trim());
      const response = await fetch(`/api/waitlist-report?${params.toString()}`, {
        headers: {
          'x-waitlist-secret': secret.trim(),
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || 'Unable to load waitlist report.');
        setRows([]);
        return;
      }
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (err) {
      setError('Unable to load waitlist report.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white pt-32 md:pt-40 pb-40">
        <div className="max-w-3xl mx-auto px-6 text-slate-600">Loading…</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-white pt-32 md:pt-40 pb-40">
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-3xl font-heading text-secondary-purple-rain font-thin mb-4">
            Waitlist Report
          </h1>
          <p className="text-slate-600 text-sm">
            Please sign in with a guide account to view the waitlist report.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 md:pt-40 pb-40">
      <div className="max-w-5xl mx-auto px-6">
        <h1 className="text-4xl md:text-5xl font-heading text-secondary-purple-rain font-thin mb-6">
          Waitlist Report
        </h1>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Enter the waitlist report secret to view the current queue. You can filter by event id or ride level.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="waitlist-secret">
                Report secret
              </label>
              <input
                id="waitlist-secret"
                type="password"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="waitlist-event">
                Event ID (optional)
              </label>
              <input
                id="waitlist-event"
                type="text"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="waitlist-level">
                Ride level (optional)
              </label>
              <input
                id="waitlist-level"
                type="text"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={rideLevel}
                onChange={(event) => setRideLevel(event.target.value)}
                placeholder="level1, level2, workshop"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLoad}
              disabled={loading || !secret.trim()}
              className="inline-flex items-center justify-center rounded-full bg-black px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Load report'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={!rows.length}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-900 disabled:opacity-50"
            >
              Export CSV
            </button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold text-primary-ink mb-4">Waitlist entries</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Event ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Level</th>
                  <th className="px-4 py-3 text-left font-semibold">Joined</th>
                  <th className="px-4 py-3 text-left font-semibold">User</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      No waitlist entries found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">{row.event_id}</td>
                      <td className="px-4 py-3">{row.ride_level || 'workshop'}</td>
                      <td className="px-4 py-3">{row.waitlist_joined_at || '—'}</td>
                      <td className="px-4 py-3">{row.user_id}</td>
                      <td className="px-4 py-3">{row.profiles?.email ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

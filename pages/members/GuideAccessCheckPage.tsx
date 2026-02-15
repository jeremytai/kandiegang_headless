import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Guide {
  databaseId: number | string;
  title: string;
}

interface GuideLevel {
  key: string;
  label: string;
  guides: Guide[];
}

interface GuideAccessCheckResponse {
  eventId: string;
  eventTitle: string;
  levels: GuideLevel[];
}

const GuideAccessCheckPage: React.FC = () => {
  const { profile } = useAuth();
  const [eventId, setEventId] = useState('');
  const [result, setResult] = useState<GuideAccessCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/guide-access-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      const data: GuideAccessCheckResponse | { error: string } = await res.json();
      if (!res.ok) throw new Error((data as { error: string }).error || 'Unknown error');
      setResult(data as GuideAccessCheckResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Guide Access Checker</h1>
      <div className="mb-4">
        <label className="block mb-1 font-medium">Event ID</label>
        <input
          className="border rounded px-3 py-2 w-full"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          placeholder="Enter WordPress event databaseId"
        />
      </div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleCheck}
        disabled={loading || !eventId}
      >
        {loading ? 'Checking...' : 'Check Access'}
      </button>
      {error && <div className="text-red-600 mt-4">{error}</div>}
      {result && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Result</h2>
          <div className="mb-2">
            Your wp_user_id: <b>{profile?.wp_user_id}</b>
          </div>
          {result.levels && result.levels.length > 0 ? (
            <ul>
              {result.levels.map((level) => (
                <li key={level.key} className="mb-2">
                  <b>{level.label}:</b>
                  <ul>
                    {level.guides.map((g) => (
                      <li key={g.databaseId}>
                        {g.title} (databaseId: {g.databaseId})
                        {String(g.databaseId) === String(profile?.wp_user_id) && (
                          <span className="ml-2 text-green-600 font-bold">&larr; YOU</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <div>No guides found for this event.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default GuideAccessCheckPage;

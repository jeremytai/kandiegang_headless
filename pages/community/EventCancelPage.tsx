import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';

export const EventCancelPage: React.FC = () => {
  usePageMeta('Event Cancelled | Kandie Gang', 'Your event signup was cancelled');
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Missing cancellation token.');
      return;
    }

    const cancel = async () => {
      try {
        const response = await fetch('/api/event-cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setStatus('error');
          setMessage(data?.error || 'Unable to cancel this event spot.');
          return;
        }
        setStatus('success');
        setMessage('Your event spot has been cancelled.');
      } catch (err) {
        setStatus('error');
        setMessage('Unable to cancel this event spot.');
      }
    };

    cancel();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white pt-32 md:pt-40 pb-40">
      <div className="max-w-2xl mx-auto px-4 md:px-8">
        <div className="flex flex-col items-center text-center space-y-8">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
            {status === 'success' ? (
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            ) : (
              <XCircle className="w-12 h-12 text-slate-400" />
            )}
          </div>

          <div>
            <h1 className="text-4xl md:text-5xl font-heading text-secondary-purple-rain font-thin mb-4">
              {status === 'success' ? 'Event Cancelled' : 'Cancellation Failed'}
            </h1>
            <p className="text-lg text-slate-600">
              {status === 'loading' ? 'Cancelling your spot…' : message}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Link
              to="/community"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary-purple-rain px-6 py-3 text-base font-medium text-white transition-colors hover:bg-secondary-current"
            >
              Browse Community Events
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-secondary-purple-rain px-6 py-3 text-base font-medium text-secondary-purple-rain transition-colors hover:bg-secondary-purple-rain hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
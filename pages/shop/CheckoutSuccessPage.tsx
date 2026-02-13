/**
 * CheckoutSuccessPage.tsx
 * Success page shown after successful Stripe checkout.
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Loader2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { usePageMeta } from '../../hooks/usePageMeta';
import { posthog, FUNNEL_EVENTS } from '../../lib/posthog';

export const CheckoutSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);

  usePageMeta('Order Confirmed | Kandie Gang', 'Thank you for your purchase');

  useEffect(() => {
    // In a production app, you might want to verify the session with your backend
    // For now, we'll just check if session_id exists
    if (sessionId) {
      setIsValid(true);
      posthog.capture(FUNNEL_EVENTS.ORDER_COMPLETED, { session_id: sessionId });
    }
    setIsVerifying(false);
  }, [sessionId]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-6">
          <Loader2 className="w-12 h-12 animate-spin text-slate-400" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Verifying Order</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 md:pt-40 pb-40">
      <div className="max-w-2xl mx-auto px-4 md:px-8">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Success Icon */}
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-4xl md:text-5xl font-heading text-secondary-purple-rain font-thin mb-4">
              Order Confirmed!
            </h1>
            <p className="text-lg text-slate-600">
              Thank you for your purchase. We've received your order and will process it shortly.
            </p>
          </div>

          {/* Session ID (for reference) */}
          {sessionId && (
            <div className="bg-slate-50 rounded-lg p-4 w-full">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Order Reference</p>
              <p className="text-sm font-mono text-slate-700 break-all">{sessionId}</p>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-primary-breath rounded-lg p-6 w-full text-left">
            <h2 className="text-lg font-semibold text-secondary-purple-rain mb-4">What's Next?</h2>
            <ul className="space-y-3 text-slate-700">
              <li className="flex items-start gap-3">
                <span className="text-secondary-purple-rain font-bold">1.</span>
                <span>You'll receive an email confirmation with your order details.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-secondary-purple-rain font-bold">2.</span>
                <span>We'll notify you when your order ships.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-secondary-purple-rain font-bold">3.</span>
                <span>If you have any questions, feel free to contact us.</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Link
              to="/shop"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary-purple-rain px-6 py-3 text-base font-medium text-white transition-colors hover:bg-secondary-current"
            >
              <ShoppingBag className="w-5 h-5" />
              Continue Shopping
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

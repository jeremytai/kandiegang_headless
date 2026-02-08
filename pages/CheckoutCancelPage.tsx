/**
 * CheckoutCancelPage.tsx
 * Page shown when user cancels Stripe checkout.
 */

import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft, ShoppingBag } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { posthog, FUNNEL_EVENTS } from '../lib/posthog';

export const CheckoutCancelPage: React.FC = () => {
  usePageMeta('Checkout Cancelled | Kandie Gang', 'Your checkout was cancelled');

  useEffect(() => {
    posthog.capture(FUNNEL_EVENTS.CHECKOUT_CANCELLED);
  }, []);

  return (
    <div className="min-h-screen bg-white pt-32 md:pt-40 pb-40">
      <div className="max-w-2xl mx-auto px-4 md:px-8">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Cancel Icon */}
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-slate-400" />
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-4xl md:text-5xl font-heading text-secondary-purple-rain font-thin mb-4">
              Checkout Cancelled
            </h1>
            <p className="text-lg text-slate-600">
              Your checkout was cancelled. No charges were made.
            </p>
          </div>

          {/* Message */}
          <div className="bg-primary-breath rounded-lg p-6 w-full">
            <p className="text-slate-700">
              If you encountered any issues during checkout or have questions about our products, 
              please don't hesitate to contact us. We're here to help!
            </p>
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

import React, { useMemo } from 'react';

export interface StripePaymentTrustBarProps {
  clientSecret?: string;
  paymentMethodTypes?: string[];
  region?: 'EU' | 'US' | 'GLOBAL';
  className?: string;
  showText?: boolean;
  iconSize?: number;
  stripePublishableKey?: string;
}

const DEFAULT_MICROCOPY =
  'Secure checkout. Free shipping on orders over €99 within the EU.';

const PAYMENT_ICONS = [
  { src: '/images/payment/applePay-title.svg', alt: 'Apple Pay' },
  { src: '/images/payment/mastercard-title.svg', alt: 'Mastercard' },
  { src: '/images/payment/paypal-title.svg', alt: 'PayPal' },
] as const;

export const StripePaymentTrustBar: React.FC<StripePaymentTrustBarProps> = ({
  className = '',
  showText = false,
  iconSize = 24,
}) => {
  const content = useMemo(
    () => (
      <div
        className={`flex flex-nowrap sm:flex-wrap items-center justify-start gap-x-4 gap-y-2 ${className}`}
        role="img"
        aria-label="Accepted payment methods"
      >
        {PAYMENT_ICONS.map(({ src, alt }) => (
          <span
            key={src}
            className="inline-flex items-center justify-center shrink-0"
            aria-label={alt}
          >
            <img
              src={src}
              alt={alt}
              className="block w-auto"
              width={iconSize * (40 / 24)}
              height={iconSize}
              loading="lazy"
            />
          </span>
        ))}
        {showText && (
          <span className="text-left text-xs text-slate-500 shrink-0 max-w-[240px]">
            {DEFAULT_MICROCOPY}
          </span>
        )}
      </div>
    ),
    [showText, iconSize, className]
  );

  return (
    <div className="flex items-center justify-start min-h-[24px]">
      {content}
    </div>
  );
};

/*
  Example usage (Next.js with @stripe/react-stripe-js):

  import { loadStripe } from '@stripe/stripe-js';
  import { Elements } from '@stripe/react-stripe-js';
  import { StripePaymentTrustBar } from '@/components/StripePaymentTrustBar';

  const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

  export default function CheckoutPage() {
    return (
      <Elements stripe={stripePromise}>
        <StripePaymentTrustBar
          paymentMethodTypes={['card', 'klarna', 'link']}
          region="EU"
          showText
          iconSize={24}
        />
      </Elements>
    );
  }

  With PaymentIntent from backend:
  <StripePaymentTrustBar
    clientSecret={paymentIntent.client_secret}
    paymentMethodTypes={paymentIntent.payment_method_types}
    region="EU"
  />
*/

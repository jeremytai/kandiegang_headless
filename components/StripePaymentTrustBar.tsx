import React, { useMemo } from 'react';
import { useStripePaymentMethods } from '../hooks/useStripePaymentMethods';
import { getPaymentMethodConfig } from '../utils/paymentMethodMapping';
import { getPaymentIcon } from './PaymentIcons';

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
  'Secure checkout. Pay with major credit cards and express wallets.';

export const StripePaymentTrustBar: React.FC<StripePaymentTrustBarProps> = ({
  clientSecret,
  paymentMethodTypes,
  region = 'EU',
  className = '',
  showText = false,
  iconSize = 24,
  stripePublishableKey,
}) => {
  const { paymentMethods } = useStripePaymentMethods({
    paymentMethodTypes,
    clientSecret,
    region,
    stripePublishableKey,
  });

  const displayMethods = useMemo(
    () =>
      paymentMethods.map((id) => ({
        id,
        config: getPaymentMethodConfig(id),
        Icon: getPaymentIcon(id),
      })),
    [paymentMethods]
  );

  const content = useMemo(
    () => (
      <div
        className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}
        role="img"
        aria-label="Accepted payment methods"
      >
        {displayMethods.map(({ id, config, Icon }) => (
          <span
            key={id}
            className={`inline-flex items-center justify-center shrink-0 text-slate-600 ${iconSize <= 20 ? 'h-5' : iconSize <= 24 ? 'h-6' : 'h-8'}`}
            aria-label={config.label}
          >
            <Icon size={iconSize} className="block" />
          </span>
        ))}
        {showText && (
          <span className="text-xs text-slate-500 max-w-[240px]">
            {DEFAULT_MICROCOPY}
          </span>
        )}
      </div>
    ),
    [displayMethods, showText, iconSize, className]
  );

  if (displayMethods.length === 0) return null;

  return (
    <div className="flex items-center justify-center min-h-[24px]">
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

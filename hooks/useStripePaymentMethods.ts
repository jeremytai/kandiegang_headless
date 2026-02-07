import { useState, useEffect, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  filterByRegion,
  getDefaultOrderPriority,
} from '../utils/paymentMethodMapping';
import { getDeviceWalletOrder } from '../utils/deviceDetection';

export type Region = 'EU' | 'US' | 'GLOBAL';

export interface WalletAvailability {
  applePay: boolean;
  googlePay: boolean;
}

export interface UseStripePaymentMethodsOptions {
  paymentMethodTypes?: string[];
  clientSecret?: string;
  region?: Region;
  stripePublishableKey?: string;
}

function applyDeviceOrder(methods: string[]): string[] {
  const priority = getDeviceWalletOrder();
  const wallets = methods.filter((m) => m === 'apple_pay' || m === 'google_pay');
  const rest = methods.filter((m) => m !== 'apple_pay' && m !== 'google_pay');
  if (priority === 'apple_pay') {
    return [
      ...wallets.filter((m) => m === 'apple_pay'),
      ...wallets.filter((m) => m === 'google_pay'),
      ...rest,
    ];
  }
  if (priority === 'google_pay') {
    return [
      ...wallets.filter((m) => m === 'google_pay'),
      ...wallets.filter((m) => m === 'apple_pay'),
      ...rest,
    ];
  }
  return methods;
}

function orderByRegionPriority(methods: string[], region: Region): string[] {
  const priorityOrder = getDefaultOrderPriority(region);
  const ordered: string[] = [];
  const set = new Set(methods);
  for (const id of priorityOrder) {
    if (set.has(id)) {
      ordered.push(id);
      set.delete(id);
    }
  }
  set.forEach((id) => ordered.push(id));
  return ordered;
}

export function useStripePaymentMethods({
  paymentMethodTypes,
  clientSecret,
  region = 'EU',
  stripePublishableKey,
}: UseStripePaymentMethodsOptions): {
  paymentMethods: string[];
  walletAvailability: WalletAvailability;
  isLoading: boolean;
  error: Error | null;
} {
  const [mounted, setMounted] = useState(false);
  const [walletAvailability, setWalletAvailability] = useState<WalletAvailability>({
    applePay: false,
    googlePay: false,
  });
  const [walletChecked, setWalletChecked] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const key =
      stripePublishableKey ??
      (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_STRIPE_PUBLISHABLE_KEY);
    if (!key) {
      setWalletChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stripe = await loadStripe(key);
        if (!stripe || cancelled) return;
        const paymentRequest = stripe.paymentRequest({
          country: region === 'EU' ? 'DE' : 'US',
          currency: 'eur',
          total: { label: 'Total', amount: 100 },
          requestPayerName: false,
          requestPayerEmail: false,
        });
        const result = await paymentRequest.canMakePayment();
        if (cancelled) return;
        setWalletAvailability({
          applePay: !!(result?.applePay ?? false),
          googlePay: !!(result?.googlePay ?? false),
        });
      } catch {
        if (!cancelled) setWalletAvailability({ applePay: false, googlePay: false });
      } finally {
        if (!cancelled) setWalletChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, region, stripePublishableKey]);

  const paymentMethods = useMemo(() => {
    const explicit = paymentMethodTypes && paymentMethodTypes.length > 0
      ? paymentMethodTypes
      : ['card'];
    const filtered = filterByRegion(explicit, region);
    const withWallets: string[] = [...filtered];
    if (mounted && walletChecked) {
      if (walletAvailability.applePay && !withWallets.includes('apple_pay')) withWallets.push('apple_pay');
      if (walletAvailability.googlePay && !withWallets.includes('google_pay')) withWallets.push('google_pay');
    }
    const ordered = orderByRegionPriority(withWallets, region);
    return applyDeviceOrder(ordered);
  }, [paymentMethodTypes, region, mounted, walletChecked, walletAvailability]);

  return {
    paymentMethods,
    walletAvailability,
    isLoading: mounted && !walletChecked,
    error: null,
  };
}

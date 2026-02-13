export type PaymentMethodId =
  | 'card'
  | 'link'
  | 'klarna'
  | 'bancontact'
  | 'ideal'
  | 'giropay'
  | 'eps'
  | 'sofort'
  | 'sepa_debit'
  | 'apple_pay'
  | 'google_pay'
  | string;

export interface PaymentMethodConfig {
  id: PaymentMethodId;
  label: string;
  euRelevant: boolean;
  category: 'wallet' | 'card' | 'bnpl' | 'bank';
}

const CONFIG: Record<string, PaymentMethodConfig> = {
  card: { id: 'card', label: 'Card', euRelevant: true, category: 'card' },
  link: { id: 'link', label: 'Link', euRelevant: true, category: 'wallet' },
  klarna: { id: 'klarna', label: 'Klarna', euRelevant: true, category: 'bnpl' },
  bancontact: { id: 'bancontact', label: 'Bancontact', euRelevant: true, category: 'bank' },
  ideal: { id: 'ideal', label: 'iDEAL', euRelevant: true, category: 'bank' },
  giropay: { id: 'giropay', label: 'giropay', euRelevant: true, category: 'bank' },
  eps: { id: 'eps', label: 'EPS', euRelevant: true, category: 'bank' },
  sofort: { id: 'sofort', label: 'Sofort', euRelevant: true, category: 'bank' },
  sepa_debit: { id: 'sepa_debit', label: 'SEPA', euRelevant: true, category: 'bank' },
  apple_pay: { id: 'apple_pay', label: 'Apple Pay', euRelevant: true, category: 'wallet' },
  google_pay: { id: 'google_pay', label: 'Google Pay', euRelevant: true, category: 'wallet' },
};

export function getPaymentMethodConfig(id: string): PaymentMethodConfig {
  const normalized = id.toLowerCase().replace(/-/g, '_');
  return (
    CONFIG[normalized] ?? {
      id: normalized,
      label: id,
      euRelevant: false,
      category: 'card',
    }
  );
}

export function filterByRegion(methodIds: string[], region: 'EU' | 'US' | 'GLOBAL'): string[] {
  if (region === 'GLOBAL') return methodIds;
  return methodIds.filter((id) => {
    const config = getPaymentMethodConfig(id);
    return region === 'EU' ? config.euRelevant : true;
  });
}

export function getDefaultOrderPriority(region: 'EU' | 'US' | 'GLOBAL'): PaymentMethodId[] {
  if (region === 'EU') {
    return [
      'apple_pay',
      'google_pay',
      'link',
      'card',
      'klarna',
      'bancontact',
      'ideal',
      'giropay',
      'eps',
      'sofort',
      'sepa_debit',
    ];
  }
  return ['apple_pay', 'google_pay', 'link', 'card', 'klarna'];
}

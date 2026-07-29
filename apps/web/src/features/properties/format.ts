import type { PropertyAddress } from '@propertyflow/types';

const WHOLE_CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const EXACT_CURRENCY = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

/** Renders cents as currency, hiding the decimals when the amount is whole. */
export function formatCents(cents: number): string {
  const amount = cents / 100;
  return cents % 100 === 0 ? WHOLE_CURRENCY.format(amount) : EXACT_CURRENCY.format(amount);
}

export function formatAddress(address: PropertyAddress): string {
  const street = [address.addressLine1, address.addressLine2].filter(Boolean).join(', ');
  return `${street}, ${address.city}, ${address.state} ${address.postalCode}`;
}

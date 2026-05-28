export function formatUsd(value: number | null | undefined): string {
  if (typeof value !== 'number') return 'Unavailable';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function formatCompactUsd(value: number | null | undefined): string {
  if (typeof value !== 'number') return '--';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (typeof value !== 'number') return '--';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (typeof value !== 'number') return '--';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (!value) return 'Waiting for signal';
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    month: 'short',
    day: '2-digit'
  }).format(new Date(value));
}

export function formatDate(value: string | number | Date | null | undefined): string {
  if (!value) return '--';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value));
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value === 0) return '$0.00';

  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  if (abs >= 1000) {
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (abs >= 1) {
    return '$' + value.toFixed(2);
  }
  if (abs >= 0.01) {
    return '$' + value.toFixed(4);
  }
  if (abs >= 0.0001) {
    return '$' + value.toFixed(6);
  }
  const str = value.toFixed(10).replace(/0+$/, '');
  return '$' + str;
}

export function formatVolume(value: number | string | null | undefined): string {
  if (value == null) return '—';

  const numericValue = typeof value === 'string'
    ? Number.parseFloat(value.replace(/[^0-9.]/g, ''))
    : value;

  if (typeof numericValue !== 'number' || !Number.isFinite(numericValue)) return '—';

  function compact(amount: number, divisor: number, suffix: string): string {
    const scaled = amount / divisor;
    const digits = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1);
    return '$' + digits + suffix;
  }

  if (numericValue >= 999_950_000) return compact(numericValue, 1_000_000_000, 'B');
  if (numericValue >= 1_000_000_000) return compact(numericValue, 1_000_000_000, 'B');
  if (numericValue >= 999_950) return compact(numericValue, 1_000_000, 'M');
  if (numericValue >= 1_000_000) return compact(numericValue, 1_000_000, 'M');
  if (numericValue >= 1_000) return compact(numericValue, 1_000, 'K');
  return '$' + numericValue.toFixed(0);
}

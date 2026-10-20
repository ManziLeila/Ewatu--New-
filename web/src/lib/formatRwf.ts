export function formatRwf(amount: number, compact = false): string {
  if (!Number.isFinite(amount)) return '—';
  if (compact && amount >= 1_000_000_000) {
    return `RWF ${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (compact && amount >= 1_000_000) {
    return `RWF ${(amount / 1_000_000).toFixed(2)}M`;
  }
  return `RWF ${Math.round(amount).toLocaleString()}`;
}

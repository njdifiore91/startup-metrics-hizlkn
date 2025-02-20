export const REVENUE_RANGES = [
  { value: '0-1M', label: '0 to 1 Million' },
  { value: '1M-5M', label: '1 Million to 5 Million' },
  { value: '5M-10M', label: '5 Million to 20 Million' },
  { value: '10M-50M', label: '20 Million to 50 Million' },
  { value: '50M+', label: '50 Million or more' },
] as const;

export type RevenueRange = (typeof REVENUE_RANGES)[number]['value'];

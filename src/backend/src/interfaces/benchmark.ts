export interface IBenchmarkData {
  id: string;
  metricId: string;
  revenueRange: string;
  value: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
} 
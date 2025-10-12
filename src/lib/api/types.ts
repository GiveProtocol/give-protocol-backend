// API Response Types
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  metadata?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Charity Types
export interface CharityData {
  id: string;
  name: string;
  description: string;
  category: string;
  verified: boolean;
  walletAddress: string;
  totalDonations: number;
  impactMetrics: ImpactMetric[];
  causes: CauseData[];
}

export interface CauseData {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  deadline: string;
  status: "active" | "completed" | "expired";
}

export interface ImpactMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: string;
}

// Blockchain Types
export interface ChainData {
  blockNumber: number;
  timestamp: number;
  hash: string;
}

export interface TransactionData extends ChainData {
  from: string;
  to: string;
  value: string;
  status: "pending" | "confirmed" | "failed";
}

// Cache Types
export interface CacheConfig {
  ttl: number;
  maxSize: number;
  prefetch: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Query Types
export interface QueryOptions {
  page?: number;
  limit?: number;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
}

export interface InfiniteQueryOptions extends QueryOptions {
  cursor?: string;
}

import { ApiResponse, ApiError, QueryOptions } from './types';
import { Logger } from '@/utils/logger';
import { CacheManager } from '@/utils/caching';
interface ApiClientConfig {
  baseUrl: string;
  cacheConfig?: {
    ttl: number;
    maxSize: number;
  };
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
  };
}

/** Singleton HTTP client with caching, retries, and request cancellation. */
export class ApiClient {
  private static instance: ApiClient;
  private cache: CacheManager;
  private baseUrl: string;
  private readonly retryConfig: Required<ApiClientConfig['retryConfig']>;
  private abortControllers: Map<string, AbortController>;

  private constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.cache = CacheManager.getInstance(config.cacheConfig);
    this.retryConfig = {
      maxRetries: config.retryConfig?.maxRetries ?? 3,
      retryDelay: config.retryConfig?.retryDelay ?? 1000
    };
    this.abortControllers = new Map();
  }

  /** Return the singleton instance, creating it from config on first call. */
  static getInstance(config?: ApiClientConfig): ApiClient {
    if (!this.instance && config) {
      this.instance = new ApiClient(config);
    }
    return this.instance;
  }

  /** Send a GET request, returning a cached response if available. */
  get<T>(
    endpoint: string,
    options: QueryOptions = {}
  ): Promise<ApiResponse<T>> {
    const cacheKey = ApiClient.getCacheKey('GET', endpoint, options);
    const cachedResponse = this.cache.get<ApiResponse<T>>(cacheKey);

    if (cachedResponse) {
      return Promise.resolve(cachedResponse);
    }

    return this.request<T>('GET', endpoint, undefined, options);
  }

  /** Send a POST request with the given data. */
  post<T>(
    endpoint: string,
    data: unknown,
    options: QueryOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, options);
  }

  /** Send a PUT request with the given data. */
  put<T>(
    endpoint: string,
    data: unknown,
    options: QueryOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  /** Send a DELETE request. */
  delete<T>(
    endpoint: string,
    options: QueryOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  /** Execute an HTTP request with retry and caching logic. */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    options: QueryOptions = {},
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    this.abortControllers.set(endpoint, controller);

    try {
      const url = this.buildUrl(endpoint, options);
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...ApiClient.getAuthHeaders(),
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      const result = await ApiClient.handleResponse<T>(response);

      if (method === 'GET' && result.data) {
        const cacheKey = ApiClient.getCacheKey(method, endpoint, options);
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      if (retryCount < this.retryConfig.maxRetries) {
        await new Promise(resolve =>
          setTimeout(resolve, this.retryConfig.retryDelay * Math.pow(2, retryCount))
        );
        return this.request<T>(method, endpoint, data, options, retryCount + 1);
      }
      return ApiClient.handleError<T>(error);
    } finally {
      this.abortControllers.delete(endpoint);
    }
  }

  /** Parse the fetch response, throwing on non-OK status. */
  private static async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    const data = await response.json();
    return {
      data,
      error: null,
      metadata: ApiClient.extractMetadata(response),
    };
  }

  /** Wrap an error into a standardised ApiResponse. */
  private static handleError<T>(error: unknown): ApiResponse<T> {
    const apiError: ApiError = {
      code: 'REQUEST_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    Logger.error('API request failed', {
      error,
      timestamp: new Date().toISOString(),
    });

    return {
      data: null,
      error: apiError,
    };
  }

  /** Build a full URL from the endpoint and query options. */
  private buildUrl(endpoint: string, options: QueryOptions): string {
    const url = new URL(endpoint, this.baseUrl);

    if (options.page) {
      url.searchParams.append('page', options.page.toString());
    }
    if (options.limit) {
      url.searchParams.append('limit', options.limit.toString());
    }
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        url.searchParams.append(key, value.toString());
      });
    }
    if (options.sort) {
      url.searchParams.append('sort', `${options.sort.field}:${options.sort.direction}`);
    }

    return url.toString();
  }

  /** Derive a deterministic cache key from method, endpoint, and options. */
  private static getCacheKey(method: string, endpoint: string, options: QueryOptions): string {
    return `${method}:${endpoint}:${JSON.stringify(options)}`;
  }

  /** Return authorization headers for outgoing requests. */
  private static getAuthHeaders(): Record<string, string> {
    // Add authentication headers if needed
    return {};
  }

  /** Extract pagination metadata from response headers. */
  private static extractMetadata(response: Response): Record<string, unknown> {
    const total = response.headers.get('x-total-count');
    return {
      total: total ? parseInt(total, 10) : undefined,
    };
  }

  /** Abort an in-flight request by endpoint. */
  cancelRequest(endpoint: string): void {
    const controller = this.abortControllers.get(endpoint);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(endpoint);
    }
  }

  /** Clear the response cache. */
  clearCache(): void {
    this.cache.clear();
  }
}

export const apiClient = ApiClient.getInstance({
  baseUrl: import.meta.env.VITE_API_URL || '',
  cacheConfig: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100
  },
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000
  }
});

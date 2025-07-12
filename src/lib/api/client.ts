import { ApiResponse, ApiError, QueryOptions } from './types';
import { Logger } from '@/utils/logger';
import { CacheManager } from '@/utils/caching';
import { ErrorHandler } from '@/utils/errorBoundary';

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

  static getInstance(config?: ApiClientConfig): ApiClient {
    if (!this.instance && config) {
      this.instance = new ApiClient(config);
    }
    return this.instance;
  }

  async get<T>(
    endpoint: string,
    options: QueryOptions = {}
  ): Promise<ApiResponse<T>> {
    const cacheKey = this.getCacheKey('GET', endpoint, options);
    const cachedResponse = this.cache.get<ApiResponse<T>>(cacheKey);

    if (cachedResponse) {
      return cachedResponse;
    }

    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(
    endpoint: string,
    data: any,
    options: QueryOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, options);
  }

  async put<T>(
    endpoint: string,
    data: any,
    options: QueryOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  async delete<T>(
    endpoint: string,
    options: QueryOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
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
          ...this.getAuthHeaders(),
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      const result = await this.handleResponse<T>(response);

      if (method === 'GET' && result.data) {
        const cacheKey = this.getCacheKey(method, endpoint, options);
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
      return this.handleError<T>(error);
    } finally {
      this.abortControllers.delete(endpoint);
    }
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    const data = await response.json();
    return {
      data,
      error: null,
      metadata: this.extractMetadata(response),
    };
  }

  private handleError<T>(error: unknown): ApiResponse<T> {
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

  private getCacheKey(method: string, endpoint: string, options: QueryOptions): string {
    return `${method}:${endpoint}:${JSON.stringify(options)}`;
  }

  private getAuthHeaders(): Record<string, string> {
    // Add authentication headers if needed
    return {};
  }

  private extractMetadata(response: Response): Record<string, any> {
    const total = response.headers.get('x-total-count');
    return {
      total: total ? parseInt(total, 10) : undefined,
    };
  }

  cancelRequest(endpoint: string): void {
    const controller = this.abortControllers.get(endpoint);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(endpoint);
    }
  }

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
/**
 * Text-to-3D Construction Platform - API Client with Proxy Support
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { API_CONFIG } from './config';
import { monitoring } from './services/monitoring';

export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  data: T;
  error?: string;
  message?: string;
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private maxFailures = 5,
    private resetTimeout = 60000, // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.resetTimeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.maxFailures) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return this.state;
  }
}

export class ApiClient {
  private static meshyCircuitBreaker = new CircuitBreaker(5, 60000);
  private static airtableCircuitBreaker = new CircuitBreaker(5, 60000);

  private static async makeRequest<T = any>(
    path: string,
    options: RequestInit = {},
    apiType: 'meshy' | 'airtable' = 'meshy',
  ): Promise<ApiResponse<T>> {
    const circuitBreaker = apiType === 'meshy' ? this.meshyCircuitBreaker : this.airtableCircuitBreaker;
    const timer = monitoring.startPerformanceTimer(`api_request_${apiType}`);
    
    try {
      return await circuitBreaker.execute(async () => {
        let url: string;
        let requestOptions: RequestInit;

        if (API_CONFIG.USE_PROXY) {
          // Use appropriate proxy (API keys are now handled server-side)
          const proxyUrl =
            apiType === 'meshy'
              ? API_CONFIG.MESHY_PROXY_URL
              : API_CONFIG.AIRTABLE_PROXY_URL;

          url = proxyUrl;
          requestOptions = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              path,
              method: options.method || 'GET',
              body: options.body ? JSON.parse(options.body as string) : undefined,
            }),
          };
        } else {
          // Direct API call for development (deprecated - API keys moved server-side)
          throw new Error(
            'Direct API calls are no longer supported. Please use proxy mode (USE_PROXY: true) for security.'
          );
        }

        const response = await fetch(url, requestOptions);

        if (API_CONFIG.USE_PROXY) {
          // Handle proxy response format
          const proxyResponse = await response.json();
          
          // Track successful API call
          monitoring.trackUserAction('api_request_success', `${apiType}_api`, {
            path,
            method: options.method || 'GET',
            status: response.status,
          });
          
          return proxyResponse as ApiResponse<T>;
        } else {
          // Handle direct API response
          const data = await response.json();
          return {
            success: response.ok,
            status: response.status,
            data: data,
          };
        }
      });
    } catch (error) {
      timer(); // End performance timer
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isCircuitBreakerError = errorMessage.includes('Circuit breaker is OPEN');
      
      // Track API failure
      monitoring.captureError(error instanceof Error ? error : new Error(errorMessage), {
        feature: `${apiType}_api`,
        action: 'api_request_failed',
        additionalData: {
          path,
          method: options.method || 'GET',
          isCircuitBreakerError,
          circuitBreakerState: circuitBreaker.getState(),
        },
      });
      
      return {
        success: false,
        status: isCircuitBreakerError ? 503 : 0,
        data: null as T,
        error: isCircuitBreakerError ? 'Service temporarily unavailable' : 'Network error',
        message: errorMessage,
      };
    } finally {
      timer(); // End performance timer
    }
  }

  // Meshy API methods
  static async get<T = any>(path: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(path, { method: 'GET' }, 'meshy');
  }

  static async post<T = any>(path: string, body: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      path,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      'meshy',
    );
  }

  static async put<T = any>(path: string, body: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      path,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
      'meshy',
    );
  }

  static async delete<T = any>(path: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(path, { method: 'DELETE' }, 'meshy');
  }

  // Airtable API methods
  static async airtableGet<T = any>(path: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(path, { method: 'GET' }, 'airtable');
  }

  static async airtablePost<T = any>(
    path: string,
    body: any,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      path,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      'airtable',
    );
  }

  static async airtablePatch<T = any>(
    path: string,
    body: any,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      path,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
      'airtable',
    );
  }

  static async airtableDelete<T = any>(path: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(path, { method: 'DELETE' }, 'airtable');
  }

  // Health check for proxy
  static async checkConnection(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.success;
    } catch {
      return false;
    }
  }
}

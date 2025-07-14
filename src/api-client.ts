/**
 * Text-to-3D Construction Platform - API Client with Proxy Support
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { API_CONFIG } from './config';

export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  data: T;
  error?: string;
  message?: string;
}

export class ApiClient {
  private static async makeRequest<T = any>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      let url: string;
      let requestOptions: RequestInit;

      if (API_CONFIG.USE_PROXY && API_CONFIG.PROXY_URL) {
        // Use proxy for production
        url = API_CONFIG.PROXY_URL;
        requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path,
            method: options.method || 'GET',
            body: options.body ? JSON.parse(options.body as string) : undefined,
            apiKey: API_CONFIG.MESHY_API_KEY
          })
        };
      } else {
        // Direct API call for development
        url = `${API_CONFIG.MESHY_API_URL}${path}`;
        requestOptions = {
          ...options,
          headers: {
            'Authorization': `Bearer ${API_CONFIG.MESHY_API_KEY}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        };
      }

      const response = await fetch(url, requestOptions);
      
      if (API_CONFIG.USE_PROXY) {
        // Handle proxy response format
        const proxyResponse = await response.json();
        return proxyResponse as ApiResponse<T>;
      } else {
        // Handle direct API response
        const data = await response.json();
        return {
          success: response.ok,
          status: response.status,
          data: data
        };
      }
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        status: 0,
        data: null as T,
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async get<T = any>(path: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(path, { method: 'GET' });
  }

  static async post<T = any>(path: string, body: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(path, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  static async put<T = any>(path: string, body: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  static async delete<T = any>(path: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(path, { method: 'DELETE' });
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
/**
 * API Client Unit Tests
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from './api-client';
import { server } from './test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Circuit Breaker Pattern', () => {
    it('should handle successful requests', async () => {
      const response = await ApiClient.get('/test-endpoint');
      
      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should trigger circuit breaker after multiple failures', async () => {
      // Mock repeated failures
      server.use(
        http.post('/.netlify/functions/meshy-proxy', () => {
          return HttpResponse.json({
            success: false,
            status: 500,
            error: 'Internal server error'
          }, { status: 500 });
        })
      );

      // Make 6 requests to trigger circuit breaker (threshold is 5)
      for (let i = 0; i < 6; i++) {
        await ApiClient.get('/test-endpoint');
      }

      // The 7th request should be blocked by circuit breaker
      const response = await ApiClient.get('/test-endpoint');
      
      expect(response.success).toBe(false);
      expect(response.status).toBe(503);
      expect(response.error).toBe('Service temporarily unavailable');
    });

    it('should recover from circuit breaker after timeout', async () => {
      // Mock initial failures
      server.use(
        http.post('/.netlify/functions/meshy-proxy', () => {
          return HttpResponse.json({
            success: false,
            status: 500,
            error: 'Internal server error'
          }, { status: 500 });
        })
      );

      // Trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        await ApiClient.get('/test-endpoint');
      }

      // Mock recovery
      server.use(
        http.post('/.netlify/functions/meshy-proxy', () => {
          return HttpResponse.json({
            success: true,
            status: 200,
            data: { message: 'recovered' }
          });
        })
      );

      // Fast forward time to simulate timeout
      vi.advanceTimersByTime(60000);

      // Should be able to make requests again
      const response = await ApiClient.get('/test-endpoint');
      expect(response.success).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track API request performance', async () => {
      const mockStartTimer = vi.fn().mockReturnValue(vi.fn());
      const mockTracking = {
        startPerformanceTimer: mockStartTimer,
        trackUserAction: vi.fn(),
        captureError: vi.fn(),
      };

      // Mock monitoring
      vi.doMock('./services/monitoring', () => ({
        monitoring: mockTracking,
      }));

      await ApiClient.get('/test-endpoint');

      expect(mockStartTimer).toHaveBeenCalledWith('api_request_meshy');
    });

    it('should track successful API calls', async () => {
      const mockTracking = {
        startPerformanceTimer: vi.fn().mockReturnValue(vi.fn()),
        trackUserAction: vi.fn(),
        captureError: vi.fn(),
      };

      vi.doMock('./services/monitoring', () => ({
        monitoring: mockTracking,
      }));

      await ApiClient.get('/test-endpoint');

      expect(mockTracking.trackUserAction).toHaveBeenCalledWith(
        'api_request_success',
        'meshy_api',
        expect.objectContaining({
          path: '/test-endpoint',
          method: 'GET',
          status: 200,
        })
      );
    });

    it('should track failed API calls', async () => {
      const mockTracking = {
        startPerformanceTimer: vi.fn().mockReturnValue(vi.fn()),
        trackUserAction: vi.fn(),
        captureError: vi.fn(),
      };

      vi.doMock('./services/monitoring', () => ({
        monitoring: mockTracking,
      }));

      // Mock failure
      server.use(
        http.post('/.netlify/functions/meshy-proxy', () => {
          return HttpResponse.json({
            success: false,
            status: 500,
            error: 'Internal server error'
          }, { status: 500 });
        })
      );

      await ApiClient.get('/test-endpoint');

      expect(mockTracking.captureError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          feature: 'meshy_api',
          action: 'api_request_failed',
          additionalData: expect.objectContaining({
            path: '/test-endpoint',
            method: 'GET',
          })
        })
      );
    });
  });

  describe('Request Methods', () => {
    it('should handle GET requests', async () => {
      const response = await ApiClient.get('/test-get');
      
      expect(response.success).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should handle POST requests', async () => {
      const testData = { prompt: 'test prompt' };
      const response = await ApiClient.post('/test-post', testData);
      
      expect(response.success).toBe(true);
    });

    it('should handle PUT requests', async () => {
      const testData = { id: '123', status: 'updated' };
      const response = await ApiClient.put('/test-put', testData);
      
      expect(response.success).toBe(true);
    });

    it('should handle DELETE requests', async () => {
      const response = await ApiClient.delete('/test-delete');
      
      expect(response.success).toBe(true);
    });
  });

  describe('Airtable API Methods', () => {
    it('should handle Airtable GET requests', async () => {
      const response = await ApiClient.airtableGet('/Projects');
      
      expect(response.success).toBe(true);
    });

    it('should handle Airtable POST requests', async () => {
      const testData = { 
        records: [{ 
          fields: { 
            prompt: 'test prompt',
            user_email: 'test@example.com' 
          } 
        }] 
      };
      const response = await ApiClient.airtablePost('/Projects', testData);
      
      expect(response.success).toBe(true);
    });

    it('should handle Airtable PATCH requests', async () => {
      const testData = { 
        records: [{ 
          id: 'rec123',
          fields: { status: 'completed' } 
        }] 
      };
      const response = await ApiClient.airtablePatch('/Projects', testData);
      
      expect(response.success).toBe(true);
    });

    it('should handle Airtable DELETE requests', async () => {
      const response = await ApiClient.airtableDelete('/Projects/rec123');
      
      expect(response.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network failure
      server.use(
        http.post('/.netlify/functions/meshy-proxy', () => {
          return HttpResponse.error();
        })
      );

      const response = await ApiClient.get('/test-endpoint');
      
      expect(response.success).toBe(false);
      expect(response.status).toBe(0);
      expect(response.error).toBe('Network error');
    });

    it('should handle timeout errors', async () => {
      // Mock timeout
      server.use(
        http.post('/.netlify/functions/meshy-proxy', () => {
          return new Promise(() => {
            // Never resolve to simulate timeout
          });
        })
      );

      const response = await ApiClient.get('/test-endpoint');
      
      expect(response.success).toBe(false);
      expect(response.error).toBe('Network error');
    });

    it('should handle malformed responses', async () => {
      // Mock malformed response
      server.use(
        http.post('/.netlify/functions/meshy-proxy', () => {
          return new Response('invalid json', {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        })
      );

      const response = await ApiClient.get('/test-endpoint');
      
      expect(response.success).toBe(false);
      expect(response.error).toBe('Network error');
    });
  });

  describe('Health Check', () => {
    it('should check connection health', async () => {
      const isHealthy = await ApiClient.checkConnection();
      
      expect(isHealthy).toBe(true);
    });

    it('should handle health check failures', async () => {
      // Mock health check failure
      server.use(
        http.post('/.netlify/functions/meshy-proxy', ({ request }) => {
          return HttpResponse.json({
            success: false,
            status: 500,
            error: 'Service unavailable'
          }, { status: 500 });
        })
      );

      const isHealthy = await ApiClient.checkConnection();
      
      expect(isHealthy).toBe(false);
    });
  });
});
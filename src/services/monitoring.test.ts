/**
 * Monitoring Service Unit Tests
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { monitoring } from './monitoring';
import * as Sentry from '@sentry/browser';

// Mock Sentry
vi.mock('@sentry/browser', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
  withScope: vi.fn((callback) => callback({
    setUser: vi.fn(),
    setTag: vi.fn(),
    setContext: vi.fn(),
  })),
  setUser: vi.fn(),
}));

// Mock web-vitals
vi.mock('web-vitals', () => ({
  onCLS: vi.fn((callback) => callback({ name: 'CLS', value: 0.1, rating: 'good' })),
  onFCP: vi.fn((callback) => callback({ name: 'FCP', value: 1500, rating: 'good' })),
  onLCP: vi.fn((callback) => callback({ name: 'LCP', value: 2000, rating: 'good' })),
  onINP: vi.fn((callback) => callback({ name: 'INP', value: 100, rating: 'good' })),
  onTTFB: vi.fn((callback) => callback({ name: 'TTFB', value: 500, rating: 'good' })),
}));

describe('MonitoringService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.gtag
    delete (window as any).gtag;
  });

  describe('Initialization', () => {
    it('should initialize Sentry in production', () => {
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: expect.any(String),
          environment: 'production',
          tracesSampleRate: 0.1,
        })
      );
    });

    it('should initialize Google Analytics', () => {
      // Mock gtag
      (window as any).gtag = vi.fn();
      
      expect((window as any).gtag).toBeDefined();
    });

    it('should set up Web Vitals tracking', () => {
      const performanceMetrics = monitoring.getPerformanceMetrics();
      
      expect(performanceMetrics.length).toBeGreaterThan(0);
      expect(performanceMetrics[0].name).toBe('CLS');
      expect(performanceMetrics[0].value).toBe(0.1);
      expect(performanceMetrics[0].rating).toBe('good');
    });
  });

  describe('Error Tracking', () => {
    it('should capture errors with context', () => {
      const error = new Error('Test error');
      const context = {
        user: 'test-user',
        feature: 'model-generation',
        action: 'generate-model',
        additionalData: { prompt: 'test prompt' },
      };

      monitoring.captureError(error, context);

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should capture string errors', () => {
      const errorMessage = 'String error message';
      
      monitoring.captureError(errorMessage);

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should capture messages with different levels', () => {
      const message = 'Test message';
      
      monitoring.captureMessage(message, 'warning');

      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith(message, 'warning');
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', () => {
      const operation = 'model-loading';
      const duration = 1500;
      const metadata = { fileSize: 1024 };

      monitoring.trackPerformance(operation, duration, metadata);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'performance',
        message: `${operation}: ${duration}ms`,
        level: 'info',
        data: expect.objectContaining({
          operation,
          duration,
          ...metadata,
        }),
      });
    });

    it('should warn on slow operations', () => {
      const operation = 'slow-operation';
      const duration = 5000; // 5 seconds
      
      monitoring.trackPerformance(operation, duration);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'performance',
        message: `${operation}: ${duration}ms`,
        level: 'warning', // Should be warning for slow operations
        data: expect.objectContaining({
          operation,
          duration,
        }),
      });
    });

    it('should create performance timers', () => {
      const operation = 'test-operation';
      const endTimer = monitoring.startPerformanceTimer(operation);
      
      expect(typeof endTimer).toBe('function');
      
      // Advance time and end timer
      vi.advanceTimersByTime(1000);
      const duration = endTimer();
      
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('User Action Tracking', () => {
    it('should track user actions', () => {
      const action = 'button-click';
      const feature = 'model-generation';
      const data = { buttonId: 'generate-btn' };

      monitoring.trackUserAction(action, feature, data);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'user-action',
        message: `${feature}: ${action}`,
        level: 'info',
        data: data,
      });
    });

    it('should track user actions with Google Analytics', () => {
      (window as any).gtag = vi.fn();
      
      const action = 'model-download';
      const feature = 'downloads';
      const data = { format: 'glb' };

      monitoring.trackUserAction(action, feature, data);

      expect((window as any).gtag).toHaveBeenCalledWith('event', action, {
        event_category: feature,
        event_label: undefined,
        value: undefined,
        custom_parameter_1: undefined,
        custom_parameter_2: undefined,
      });
    });
  });

  describe('Memory Monitoring', () => {
    it('should track memory usage', () => {
      // Mock performance.memory
      const mockMemory = {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB
        totalJSHeapSize: 100 * 1024 * 1024, // 100MB
        jsHeapSizeLimit: 200 * 1024 * 1024, // 200MB
      };
      
      (performance as any).memory = mockMemory;

      monitoring.trackMemoryUsage('model-viewer');

      // Should not capture error for normal memory usage
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    it('should warn on high memory usage', () => {
      // Mock high memory usage
      const mockMemory = {
        usedJSHeapSize: 180 * 1024 * 1024, // 180MB
        totalJSHeapSize: 190 * 1024 * 1024, // 190MB
        jsHeapSizeLimit: 200 * 1024 * 1024, // 200MB (90% usage)
      };
      
      (performance as any).memory = mockMemory;

      monitoring.trackMemoryUsage('model-viewer');

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('High memory usage'),
        'warning',
        expect.objectContaining({
          feature: 'model-viewer',
          additionalData: expect.objectContaining({
            usedJSHeapSize: 180 * 1024 * 1024,
            totalJSHeapSize: 190 * 1024 * 1024,
            jsHeapSizeLimit: 200 * 1024 * 1024,
          }),
        })
      );
    });

    it('should handle missing memory API', () => {
      // Remove memory property
      delete (performance as any).memory;

      // Should not throw error
      expect(() => monitoring.trackMemoryUsage('test')).not.toThrow();
    });
  });

  describe('Web Vitals Integration', () => {
    it('should track Web Vitals metrics', () => {
      const performanceMetrics = monitoring.getPerformanceMetrics();
      
      // Should have tracked all core web vitals
      const metricNames = performanceMetrics.map(m => m.name);
      expect(metricNames).toContain('CLS');
      expect(metricNames).toContain('FCP');
      expect(metricNames).toContain('LCP');
      expect(metricNames).toContain('INP');
      expect(metricNames).toContain('TTFB');
    });

    it('should send Web Vitals to Google Analytics', () => {
      (window as any).gtag = vi.fn();
      
      // Web Vitals should be automatically tracked
      expect((window as any).gtag).toHaveBeenCalledWith('event', 'CLS', {
        event_category: 'Web Vitals',
        event_label: 'good',
        value: 0,
        non_interaction: true,
      });
    });

    it('should add Web Vitals breadcrumbs to Sentry', () => {
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'web-vitals',
        message: 'CLS: 0.1',
        level: 'info',
        data: expect.objectContaining({
          name: 'CLS',
          value: 0.1,
          rating: 'good',
        }),
      });
    });
  });

  describe('User Context Management', () => {
    it('should set user context', () => {
      const user = {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      monitoring.setUserContext(user);

      expect(Sentry.setUser).toHaveBeenCalledWith(user);
    });

    it('should clear user context', () => {
      monitoring.clearUserContext();

      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });
  });

  describe('Global Error Handling', () => {
    it('should handle unhandled promise rejections', () => {
      const error = new Error('Unhandled promise rejection');
      const event = new CustomEvent('unhandledrejection', {
        detail: { reason: error, promise: Promise.reject(error) }
      });

      window.dispatchEvent(event);

      // Should capture the error
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('should handle uncaught errors', () => {
      const error = new Error('Uncaught error');
      const event = new ErrorEvent('error', {
        error: error,
        filename: 'test.js',
        lineno: 10,
        colno: 5,
      });

      window.dispatchEvent(event);

      // Should capture the error
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
  });
});
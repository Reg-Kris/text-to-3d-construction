/**
 * Text-to-3D Construction Platform - Monitoring Service
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import * as Sentry from '@sentry/browser';
import { onCLS, onFCP, onLCP, onINP, onTTFB, Metric } from 'web-vitals';
import { logger } from '../utils/logger';
import { IS_DEVELOPMENT, MONITORING_CONFIG } from '../config';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface ErrorContext {
  user?: string;
  feature?: string;
  action?: string;
  additionalData?: Record<string, any>;
}

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

class MonitoringService {
  private static instance: MonitoringService;
  private performanceMetrics: PerformanceMetric[] = [];
  private sentryInitialized = false;

  private constructor() {
    this.initializeSentry();
    this.initializeGoogleAnalytics();
    this.initializeWebVitals();
    this.setupGlobalErrorHandling();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private initializeSentry() {
    if (IS_DEVELOPMENT || !MONITORING_CONFIG.ENABLE_MONITORING) {
      logger.info('Skipping Sentry initialization in development', 'MonitoringService');
      return;
    }

    if (!MONITORING_CONFIG.SENTRY_DSN) {
      logger.warn('Sentry DSN not configured', 'MonitoringService');
      return;
    }

    try {
      Sentry.init({
        dsn: MONITORING_CONFIG.SENTRY_DSN,
        environment: IS_DEVELOPMENT ? 'development' : 'production',
        tracesSampleRate: 0.1, // 10% of transactions
        beforeSend: (event) => {
          // Filter out development errors
          if (IS_DEVELOPMENT) {
            return null;
          }
          
          // Add additional context
          event.extra = {
            ...event.extra,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
          };
          
          return event;
        },
      });

      this.sentryInitialized = true;
      logger.info('Sentry initialized successfully', 'MonitoringService');
    } catch (error) {
      logger.error('Failed to initialize Sentry', 'MonitoringService', error);
    }
  }

  private initializeGoogleAnalytics() {
    if (IS_DEVELOPMENT || !MONITORING_CONFIG.ENABLE_MONITORING) {
      logger.info('Skipping Google Analytics initialization in development', 'MonitoringService');
      return;
    }

    if (!MONITORING_CONFIG.GA_TRACKING_ID) {
      logger.warn('Google Analytics tracking ID not configured', 'MonitoringService');
      return;
    }

    try {
      // Load Google Analytics script
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${MONITORING_CONFIG.GA_TRACKING_ID}`;
      document.head.appendChild(script);

      // Initialize gtag
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).gtag = function() {
        (window as any).dataLayer.push(arguments);
      };

      const gtag = (window as any).gtag;
      gtag('js', new Date());
      gtag('config', MONITORING_CONFIG.GA_TRACKING_ID, {
        page_title: document.title,
        page_location: window.location.href,
        send_page_view: true,
      });

      logger.info('Google Analytics initialized successfully', 'MonitoringService');
    } catch (error) {
      logger.error('Failed to initialize Google Analytics', 'MonitoringService', error);
    }
  }

  private initializeWebVitals() {
    const handleMetric = (metric: Metric) => {
      const performanceMetric: PerformanceMetric = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        timestamp: Date.now(),
      };

      this.performanceMetrics.push(performanceMetric);
      
      // Send to analytics
      this.trackWebVital(performanceMetric);
      
      // Log poor performance
      if (metric.rating === 'poor') {
        logger.warn(`Poor Web Vital: ${metric.name} = ${metric.value}`, 'MonitoringService');
      }
    };

    // Track Core Web Vitals
    onLCP(handleMetric);
    onFCP(handleMetric);
    onCLS(handleMetric);
    onINP(handleMetric);
    onTTFB(handleMetric);
  }

  private setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, {
        feature: 'global',
        action: 'unhandled_promise_rejection',
        additionalData: {
          promise: event.promise,
          type: 'unhandledrejection',
        },
      });
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error, {
        feature: 'global',
        action: 'uncaught_error',
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          type: 'error',
        },
      });
    });
  }

  private trackWebVital(metric: PerformanceMetric) {
    // Send to Google Analytics if available
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        event_label: metric.rating,
        value: Math.round(metric.value),
        non_interaction: true,
      });
    }

    // Send to Sentry as transaction
    if (this.sentryInitialized) {
      Sentry.addBreadcrumb({
        category: 'web-vitals',
        message: `${metric.name}: ${metric.value}`,
        level: metric.rating === 'poor' ? 'warning' : 'info',
        data: metric,
      });
    }
  }

  // Public API
  captureError(error: Error | string, context?: ErrorContext) {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorObject = error instanceof Error ? error : new Error(errorMessage);

    // Log locally
    logger.error(errorMessage, context?.feature || 'Unknown', {
      context,
      stack: errorObject.stack,
    });

    // Send to Sentry
    if (this.sentryInitialized) {
      Sentry.withScope((scope) => {
        if (context?.user) {
          scope.setUser({ id: context.user });
        }
        
        if (context?.feature) {
          scope.setTag('feature', context.feature);
        }
        
        if (context?.action) {
          scope.setTag('action', context.action);
        }
        
        if (context?.additionalData) {
          scope.setContext('additional_data', context.additionalData);
        }
        
        Sentry.captureException(errorObject);
      });
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) {
    // Log locally
    logger.info(message, context?.feature || 'Unknown', context);

    // Send to Sentry
    if (this.sentryInitialized) {
      Sentry.withScope((scope) => {
        if (context?.user) {
          scope.setUser({ id: context.user });
        }
        
        if (context?.feature) {
          scope.setTag('feature', context.feature);
        }
        
        if (context?.action) {
          scope.setTag('action', context.action);
        }
        
        if (context?.additionalData) {
          scope.setContext('additional_data', context.additionalData);
        }
        
        Sentry.captureMessage(message, level);
      });
    }
  }

  trackUserAction(action: string, feature: string, data?: Record<string, any>) {
    // Track user interactions
    logger.info(`User action: ${action}`, feature, data);

    // Send to analytics
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', action, {
        event_category: feature,
        event_label: data?.label,
        value: data?.value,
        custom_parameter_1: data?.custom1,
        custom_parameter_2: data?.custom2,
      });
    }

    // Add breadcrumb to Sentry
    if (this.sentryInitialized) {
      Sentry.addBreadcrumb({
        category: 'user-action',
        message: `${feature}: ${action}`,
        level: 'info',
        data: data,
      });
    }
  }

  trackPerformance(operation: string, duration: number, metadata?: Record<string, any>) {
    const performanceData = {
      operation,
      duration,
      timestamp: Date.now(),
      ...metadata,
    };

    logger.info(`Performance: ${operation} took ${duration}ms`, 'Performance', performanceData);

    // Send to analytics
    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', 'timing_complete', {
        name: operation,
        value: duration,
        event_category: 'Performance',
        custom_parameter_1: metadata?.feature,
      });
    }

    // Add to Sentry
    if (this.sentryInitialized) {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `${operation}: ${duration}ms`,
        level: duration > 3000 ? 'warning' : 'info',
        data: performanceData,
      });
    }
  }

  // Performance monitoring helpers
  startPerformanceTimer(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.trackPerformance(operation, duration);
      return duration;
    };
  }

  // Memory monitoring
  trackMemoryUsage(feature: string) {
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      const memoryData = {
        usedJSHeapSize: memoryInfo.usedJSHeapSize,
        totalJSHeapSize: memoryInfo.totalJSHeapSize,
        jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit,
        feature,
      };

      logger.info('Memory usage', feature, memoryData);

      // Track high memory usage
      const memoryUsagePercent = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
      if (memoryUsagePercent > 80) {
        this.captureMessage(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`, 'warning', {
          feature,
          additionalData: memoryData,
        });
      }
    }
  }

  // Get performance metrics
  getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.performanceMetrics];
  }

  // Set user context
  setUserContext(user: { id: string; email?: string; name?: string }) {
    if (this.sentryInitialized) {
      Sentry.setUser(user);
    }
  }

  // Clear user context
  clearUserContext() {
    if (this.sentryInitialized) {
      Sentry.setUser(null);
    }
  }
}

// Export singleton
export const monitoring = MonitoringService.getInstance();

// Export types
export type { PerformanceMetric, ErrorContext };
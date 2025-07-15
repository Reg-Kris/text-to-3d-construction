/**
 * Monitoring Services Mock Handlers
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { http, HttpResponse } from 'msw';

export const monitoringHandlers = [
  // Mock Sentry DSN endpoint
  http.post('https://sentry.io/api/*', () => {
    return HttpResponse.json({
      success: true,
      id: 'test-sentry-event-123'
    });
  }),

  // Mock Google Analytics endpoint
  http.post('https://www.google-analytics.com/mp/collect', () => {
    return HttpResponse.json({
      success: true
    });
  }),

  // Mock Google Tag Manager
  http.get('https://www.googletagmanager.com/gtag/js', () => {
    return HttpResponse.text(`
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-TEST123');
    `, {
      headers: {
        'Content-Type': 'application/javascript',
      },
    });
  }),

  // Mock performance monitoring endpoints
  http.post('/api/monitoring/performance', async ({ request }) => {
    const body = await request.json();
    
    return HttpResponse.json({
      success: true,
      data: {
        recorded: true,
        timestamp: new Date().toISOString(),
        metrics: body,
      }
    });
  }),

  // Mock error tracking endpoint
  http.post('/api/monitoring/error', async ({ request }) => {
    const body = await request.json();
    
    return HttpResponse.json({
      success: true,
      data: {
        errorId: 'test-error-123',
        timestamp: new Date().toISOString(),
        error: body,
      }
    });
  }),

  // Mock Web Vitals endpoint
  http.post('/api/monitoring/web-vitals', async ({ request }) => {
    const body = await request.json();
    
    return HttpResponse.json({
      success: true,
      data: {
        recorded: true,
        timestamp: new Date().toISOString(),
        vitals: body,
      }
    });
  }),

  // Mock circuit breaker health check
  http.get('/api/health/circuit-breaker', () => {
    return HttpResponse.json({
      success: true,
      data: {
        meshy: {
          state: 'CLOSED',
          failures: 0,
          lastFailureTime: 0,
        },
        airtable: {
          state: 'CLOSED',
          failures: 0,
          lastFailureTime: 0,
        },
      }
    });
  }),
];
/**
 * Test Setup Configuration
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window properties
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock navigator
Object.defineProperty(navigator, 'userAgent', {
  writable: true,
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
vi.stubGlobal('sessionStorage', sessionStorageMock);

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock WebGL context
const mockWebGLContext = {
  canvas: {},
  drawingBufferWidth: 300,
  drawingBufferHeight: 150,
  getExtension: vi.fn(),
  getParameter: vi.fn(),
  getShaderPrecisionFormat: vi.fn().mockReturnValue({
    precision: 1,
    rangeMin: 1,
    rangeMax: 1,
  }),
  createShader: vi.fn(),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  getShaderParameter: vi.fn().mockReturnValue(true),
  createProgram: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  getProgramParameter: vi.fn().mockReturnValue(true),
  useProgram: vi.fn(),
  createBuffer: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  createTexture: vi.fn(),
  bindTexture: vi.fn(),
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),
  generateMipmap: vi.fn(),
  viewport: vi.fn(),
  clearColor: vi.fn(),
  clear: vi.fn(),
  drawArrays: vi.fn(),
  drawElements: vi.fn(),
  VERTEX_SHADER: 35633,
  FRAGMENT_SHADER: 35632,
  COLOR_BUFFER_BIT: 16384,
  DEPTH_BUFFER_BIT: 256,
  TRIANGLES: 4,
  ARRAY_BUFFER: 34962,
  ELEMENT_ARRAY_BUFFER: 34963,
  STATIC_DRAW: 35044,
  TEXTURE_2D: 3553,
  RGBA: 6408,
  UNSIGNED_BYTE: 5121,
  TEXTURE_MAG_FILTER: 10240,
  TEXTURE_MIN_FILTER: 10241,
  LINEAR: 9729,
  FLOAT: 5126,
  FALSE: 0,
  TRUE: 1,
};

HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type) => {
  if (type === 'webgl' || type === 'webgl2') {
    return mockWebGLContext;
  }
  return null;
});

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock fetch for manual mocking in tests
global.fetch = vi.fn();

// MSW server setup
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
});

// Mock process.env for tests
vi.mock('../config', () => ({
  IS_DEVELOPMENT: true,
  IS_PRODUCTION: false,
  API_CONFIG: {
    USE_PROXY: true,
    MESHY_PROXY_URL: '/.netlify/functions/meshy-proxy',
    AIRTABLE_PROXY_URL: '/.netlify/functions/airtable-proxy',
    AUTHORIZED_EMAILS: ['test@example.com'],
  },
  MONITORING_CONFIG: {
    SENTRY_DSN: 'https://test@sentry.io/123',
    GA_TRACKING_ID: 'G-TEST123',
    ENABLE_MONITORING: false,
    ENABLE_PERFORMANCE_MONITORING: false,
  },
}));
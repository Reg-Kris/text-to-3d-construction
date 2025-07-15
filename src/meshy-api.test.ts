/**
 * Meshy API Unit Tests
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeshyAPI, GenerationRequest, MeshyTask } from './meshy-api';
import { createMockTask, createSuccessfulTask, createFailedTask, createInProgressTask } from './test/mocks/handlers/meshy';
import { server } from './test/mocks/server';
import { http, HttpResponse } from 'msw';

describe('MeshyAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Device Capability Detection', () => {
    it('should detect mobile devices', () => {
      const originalUserAgent = navigator.userAgent;
      
      // Mock mobile user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true,
      });

      const capabilities = MeshyAPI.getDeviceCapabilities();
      
      expect(capabilities.isMobile).toBe(true);
      expect(capabilities.maxPolyCount).toBe(8000);
      expect(capabilities.maxFileSizeMB).toBe(5);
      expect(capabilities.supportedFormats).toContain('glb');
      expect(capabilities.supportedFormats).toContain('usdz');

      // Restore original user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true,
      });
    });

    it('should detect tablet devices', () => {
      const originalUserAgent = navigator.userAgent;
      
      // Mock tablet user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        writable: true,
      });

      const capabilities = MeshyAPI.getDeviceCapabilities();
      
      expect(capabilities.isMobile).toBe(false);
      expect(capabilities.maxPolyCount).toBe(12000);
      expect(capabilities.maxFileSizeMB).toBe(10);

      // Restore original user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true,
      });
    });

    it('should detect desktop devices', () => {
      const originalUserAgent = navigator.userAgent;
      
      // Mock desktop user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        writable: true,
      });

      const capabilities = MeshyAPI.getDeviceCapabilities();
      
      expect(capabilities.isMobile).toBe(false);
      expect(capabilities.maxPolyCount).toBe(30000);
      expect(capabilities.maxFileSizeMB).toBe(50);
      expect(capabilities.supportedFormats).toContain('glb');
      expect(capabilities.supportedFormats).toContain('fbx');
      expect(capabilities.supportedFormats).toContain('obj');

      // Restore original user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true,
      });
    });
  });

  describe('Model Generation', () => {
    it('should generate a model successfully', async () => {
      const request: GenerationRequest = {
        prompt: 'modern house',
        artStyle: 'realistic',
        enablePBR: true,
        targetPolyCount: 30000,
        topology: 'quad',
        enableRemesh: true,
      };

      const task = await MeshyAPI.generateModel(request);
      
      expect(task.id).toBeDefined();
      expect(task.status).toBe('PENDING');
      expect(task.progress).toBe(0);
      expect(task.created_at).toBeDefined();
    });

    it('should handle generation failures', async () => {
      // Mock generation failure
      server.use(
        http.post('/.netlify/functions/meshy-proxy', () => {
          return HttpResponse.json({
            success: false,
            status: 500,
            error: 'Generation failed'
          }, { status: 500 });
        })
      );

      const request: GenerationRequest = {
        prompt: 'invalid prompt',
        artStyle: 'realistic',
      };

      await expect(MeshyAPI.generateModel(request)).rejects.toThrow();
    });

    it('should validate generation request parameters', async () => {
      const request: GenerationRequest = {
        prompt: '', // Empty prompt should fail
        artStyle: 'realistic',
      };

      await expect(MeshyAPI.generateModel(request)).rejects.toThrow();
    });
  });

  describe('Task Polling', () => {
    it('should poll task status successfully', async () => {
      const taskId = 'test-task-123';
      
      const task = await MeshyAPI.getTaskStatus(taskId);
      
      expect(task.id).toBe(taskId);
      expect(task.status).toBe('SUCCEEDED');
      expect(task.progress).toBe(100);
      expect(task.model_urls).toBeDefined();
      expect(task.model_urls?.glb).toBeDefined();
    });

    it('should handle polling errors', async () => {
      const taskId = 'non-existent-task';
      
      await expect(MeshyAPI.getTaskStatus(taskId)).rejects.toThrow();
    });

    it('should handle polling timeout', async () => {
      const taskId = 'test-task-123';
      
      // Mock timeout scenario
      server.use(
        http.get('/.netlify/functions/meshy-proxy', () => {
          return new Promise(() => {
            // Never resolve to simulate timeout
          });
        })
      );

      await expect(MeshyAPI.getTaskStatus(taskId)).rejects.toThrow();
    });
  });

  describe('Model Downloads', () => {
    it('should download GLB model successfully', async () => {
      const task = createSuccessfulTask();
      
      const modelBlob = await MeshyAPI.downloadModel(task.model_urls!.glb!);
      
      expect(modelBlob).toBeInstanceOf(Blob);
      expect(modelBlob.size).toBeGreaterThan(0);
    });

    it('should download FBX model successfully', async () => {
      const task = createSuccessfulTask();
      
      const modelBlob = await MeshyAPI.downloadModel(task.model_urls!.fbx!);
      
      expect(modelBlob).toBeInstanceOf(Blob);
      expect(modelBlob.size).toBeGreaterThan(0);
    });

    it('should download OBJ model successfully', async () => {
      const task = createSuccessfulTask();
      
      const modelBlob = await MeshyAPI.downloadModel(task.model_urls!.obj!);
      
      expect(modelBlob).toBeInstanceOf(Blob);
      expect(modelBlob.size).toBeGreaterThan(0);
    });

    it('should download USDZ model successfully', async () => {
      const task = createSuccessfulTask();
      
      const modelBlob = await MeshyAPI.downloadModel(task.model_urls!.usdz!);
      
      expect(modelBlob).toBeInstanceOf(Blob);
      expect(modelBlob.size).toBeGreaterThan(0);
    });

    it('should handle download failures', async () => {
      const invalidUrl = 'https://invalid-url.com/model.glb';
      
      await expect(MeshyAPI.downloadModel(invalidUrl)).rejects.toThrow();
    });
  });

  describe('Progress Tracking', () => {
    it('should track generation progress', async () => {
      const taskId = 'test-task-123';
      const progressCallback = vi.fn();
      
      // Mock progressive updates
      let progressCount = 0;
      server.use(
        http.get('/.netlify/functions/meshy-proxy', ({ request }) => {
          const url = new URL(request.url);
          const requestedTaskId = url.searchParams.get('taskId');
          
          if (requestedTaskId === taskId) {
            progressCount += 20;
            const task = createInProgressTask(Math.min(progressCount, 100));
            
            if (progressCount >= 100) {
              task.status = 'SUCCEEDED';
              task.model_urls = {
                glb: 'https://example.com/model.glb',
                fbx: 'https://example.com/model.fbx',
                obj: 'https://example.com/model.obj',
                usdz: 'https://example.com/model.usdz',
              };
            }
            
            return HttpResponse.json({
              success: true,
              status: 200,
              data: task
            });
          }
          
          return HttpResponse.json({
            success: false,
            status: 404,
            error: 'Task not found'
          });
        })
      );

      const finalTask = await MeshyAPI.pollTaskUntilComplete(taskId, progressCallback);
      
      expect(finalTask.status).toBe('SUCCEEDED');
      expect(finalTask.progress).toBe(100);
      expect(progressCallback).toHaveBeenCalledTimes(5); // 0, 20, 40, 60, 80, 100
    });

    it('should handle task failures during polling', async () => {
      const taskId = 'test-task-123';
      const progressCallback = vi.fn();
      
      // Mock failure after some progress
      server.use(
        http.get('/.netlify/functions/meshy-proxy', ({ request }) => {
          const url = new URL(request.url);
          const requestedTaskId = url.searchParams.get('taskId');
          
          if (requestedTaskId === taskId) {
            const task = createFailedTask();
            
            return HttpResponse.json({
              success: true,
              status: 200,
              data: task
            });
          }
          
          return HttpResponse.json({
            success: false,
            status: 404,
            error: 'Task not found'
          });
        })
      );

      await expect(MeshyAPI.pollTaskUntilComplete(taskId, progressCallback)).rejects.toThrow();
    });
  });

  describe('Model Validation', () => {
    it('should validate model URLs', () => {
      const task = createSuccessfulTask();
      
      expect(MeshyAPI.validateModelUrls(task.model_urls!)).toBe(true);
    });

    it('should reject invalid model URLs', () => {
      const invalidUrls = {
        glb: 'invalid-url',
        fbx: 'not-a-url',
      };
      
      expect(MeshyAPI.validateModelUrls(invalidUrls)).toBe(false);
    });

    it('should validate model file size', async () => {
      const task = createSuccessfulTask();
      
      const isValid = await MeshyAPI.validateModelSize(task.model_urls!.glb!, 10 * 1024 * 1024); // 10MB limit
      
      expect(isValid).toBe(true);
    });

    it('should reject oversized models', async () => {
      const task = createSuccessfulTask();
      
      const isValid = await MeshyAPI.validateModelSize(task.model_urls!.glb!, 100); // 100 byte limit
      
      expect(isValid).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle rate limiting', async () => {
      // Mock rate limit response
      server.use(
        http.post('/.netlify/functions/meshy-proxy', () => {
          return HttpResponse.json({
            success: false,
            status: 429,
            error: 'Rate limit exceeded'
          }, { status: 429 });
        })
      );

      const request: GenerationRequest = {
        prompt: 'test prompt',
        artStyle: 'realistic',
      };

      await expect(MeshyAPI.generateModel(request)).rejects.toThrow();
    });

    it('should handle network interruptions', async () => {
      // Mock network failure
      server.use(
        http.post('/.netlify/functions/meshy-proxy', () => {
          return HttpResponse.error();
        })
      );

      const request: GenerationRequest = {
        prompt: 'test prompt',
        artStyle: 'realistic',
      };

      await expect(MeshyAPI.generateModel(request)).rejects.toThrow();
    });

    it('should handle malformed API responses', async () => {
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

      const request: GenerationRequest = {
        prompt: 'test prompt',
        artStyle: 'realistic',
      };

      await expect(MeshyAPI.generateModel(request)).rejects.toThrow();
    });
  });
});
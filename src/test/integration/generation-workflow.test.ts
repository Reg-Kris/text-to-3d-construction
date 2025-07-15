/**
 * 3D Model Generation Workflow Integration Tests
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConstructionApp } from '../../core/app';
import { createMockTask, createSuccessfulTask } from '../mocks/handlers/meshy';
import { createMockProject } from '../mocks/handlers/airtable';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('3D Model Generation Workflow Integration', () => {
  let app: ConstructionApp;

  beforeEach(() => {
    // Create a container element for the viewer
    const container = document.createElement('div');
    container.id = 'viewer-container';
    document.body.appendChild(container);

    app = new ConstructionApp();
    
    // Mock successful authentication
    app.setCurrentUser({ email: 'test@example.com' });
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    const container = document.getElementById('viewer-container');
    if (container) {
      document.body.removeChild(container);
    }
  });

  describe('Happy Path: Complete Generation Workflow', () => {
    it('should complete full generation workflow successfully', async () => {
      // Mock progressive task updates
      let callCount = 0;
      server.use(
        http.post('/.netlify/functions/meshy-proxy', async ({ request }) => {
          const body = await request.json();
          
          if (body?.path === '/v1/text-to-3d') {
            return HttpResponse.json({
              success: true,
              status: 201,
              data: {
                id: 'test-task-123',
                status: 'PENDING',
                progress: 0,
                created_at: new Date().toISOString(),
              }
            });
          }
          
          return HttpResponse.json({
            success: false,
            status: 404,
            error: 'Not found'
          });
        }),
        
        http.get('/.netlify/functions/meshy-proxy', ({ request }) => {
          const url = new URL(request.url);
          const taskId = url.searchParams.get('taskId');
          
          if (taskId === 'test-task-123') {
            callCount++;
            
            // Progressive status updates
            if (callCount <= 3) {
              return HttpResponse.json({
                success: true,
                status: 200,
                data: {
                  id: 'test-task-123',
                  status: 'IN_PROGRESS',
                  progress: callCount * 25,
                  created_at: new Date().toISOString(),
                }
              });
            } else {
              // Final success
              return HttpResponse.json({
                success: true,
                status: 200,
                data: createSuccessfulTask()
              });
            }
          }
          
          return HttpResponse.json({
            success: false,
            status: 404,
            error: 'Task not found'
          });
        })
      );

      // Start generation
      const progressCallback = vi.fn();
      const result = await app.generateModel(
        'modern house with garage',
        { quality: 'high', prioritizeSpeed: false },
        progressCallback
      );

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.task.id).toBe('test-task-123');
      expect(result.task.status).toBe('SUCCEEDED');
      expect(result.task.model_urls?.glb).toBeDefined();
      expect(result.project.prompt).toBe('modern house with garage');
      
      // Verify progress was tracked
      expect(progressCallback).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should handle viewer loading and controls', async () => {
      const task = createSuccessfulTask();
      
      // Load model into viewer
      await app.loadModelInViewer(task.model_urls!.glb!);
      
      // Test viewer controls
      app.setViewMode('top');
      app.setViewMode('perspective');
      app.resetCamera();
      
      // Test auto-rotate
      app.setAutoRotate(true);
      app.setAutoRotate(false);
      
      // Verify no errors occurred
      expect(app.getViewerError()).toBeNull();
    });

    it('should handle model downloads', async () => {
      const task = createSuccessfulTask();
      
      // Test GLB download
      const glbBlob = await app.downloadModel(task.model_urls!.glb!, 'glb');
      expect(glbBlob).toBeInstanceOf(Blob);
      expect(glbBlob.size).toBeGreaterThan(0);
      
      // Test FBX download
      const fbxBlob = await app.downloadModel(task.model_urls!.fbx!, 'fbx');
      expect(fbxBlob).toBeInstanceOf(Blob);
      expect(fbxBlob.size).toBeGreaterThan(0);
      
      // Test batch download
      const downloads = await app.downloadAllFormats(task.model_urls!);
      expect(downloads).toHaveLength(4); // GLB, FBX, OBJ, USDZ
      
      for (const download of downloads) {
        expect(download.blob).toBeInstanceOf(Blob);
        expect(download.blob.size).toBeGreaterThan(0);
      }
    });

    it('should handle engine-specific downloads', async () => {
      const task = createSuccessfulTask();
      
      // Test Unreal Engine download
      const unrealBlob = await app.downloadForEngine(task.model_urls!.fbx!, 'unreal');
      expect(unrealBlob).toBeInstanceOf(Blob);
      
      // Test Blender download
      const blenderBlob = await app.downloadForEngine(task.model_urls!.obj!, 'blender');
      expect(blenderBlob).toBeInstanceOf(Blob);
      
      // Test Unity download
      const unityBlob = await app.downloadForEngine(task.model_urls!.fbx!, 'unity');
      expect(unityBlob).toBeInstanceOf(Blob);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle generation failures gracefully', async () => {
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

      const progressCallback = vi.fn();
      const result = await app.generateModel(
        'invalid prompt',
        { quality: 'high', prioritizeSpeed: false },
        progressCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Generation failed');
    });

    it('should handle task polling failures', async () => {
      // Mock initial success, then polling failure
      server.use(
        http.post('/.netlify/functions/meshy-proxy', () => {
          return HttpResponse.json({
            success: true,
            status: 201,
            data: {
              id: 'test-task-123',
              status: 'PENDING',
              progress: 0,
              created_at: new Date().toISOString(),
            }
          });
        }),
        
        http.get('/.netlify/functions/meshy-proxy', () => {
          return HttpResponse.json({
            success: false,
            status: 500,
            error: 'Polling failed'
          }, { status: 500 });
        })
      );

      const progressCallback = vi.fn();
      const result = await app.generateModel(
        'test prompt',
        { quality: 'high', prioritizeSpeed: false },
        progressCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle viewer loading errors', async () => {
      const invalidUrl = 'https://invalid-url.com/model.glb';
      
      // Mock 404 for invalid URL
      server.use(
        http.get('https://invalid-url.com/model.glb', () => {
          return HttpResponse.json({
            error: 'Not found'
          }, { status: 404 });
        })
      );

      const result = await app.loadModelInViewer(invalidUrl);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(app.getViewerError()).toBeDefined();
    });

    it('should handle download failures', async () => {
      const invalidUrl = 'https://invalid-url.com/model.glb';
      
      // Mock 404 for invalid URL
      server.use(
        http.get('https://invalid-url.com/model.glb', () => {
          return HttpResponse.json({
            error: 'Not found'
          }, { status: 404 });
        })
      );

      await expect(app.downloadModel(invalidUrl, 'glb')).rejects.toThrow();
    });
  });

  describe('Device-Specific Behavior', () => {
    it('should optimize for mobile devices', async () => {
      // Mock mobile user agent
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true,
      });

      const progressCallback = vi.fn();
      const result = await app.generateModel(
        'simple house',
        { quality: 'low', prioritizeSpeed: true },
        progressCallback
      );

      // Verify mobile optimizations were applied
      expect(result.project.polygon_count).toBeLessThanOrEqual(8000);
      expect(result.project.device_type).toBe('mobile');

      // Restore original user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true,
      });
    });

    it('should handle tablet optimizations', async () => {
      // Mock tablet user agent
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        writable: true,
      });

      const progressCallback = vi.fn();
      const result = await app.generateModel(
        'detailed building',
        { quality: 'medium', prioritizeSpeed: false },
        progressCallback
      );

      // Verify tablet optimizations were applied
      expect(result.project.polygon_count).toBeLessThanOrEqual(12000);
      expect(result.project.device_type).toBe('tablet');

      // Restore original user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true,
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should track generation performance', async () => {
      const startTime = performance.now();
      
      const progressCallback = vi.fn();
      const result = await app.generateModel(
        'test prompt',
        { quality: 'high', prioritizeSpeed: false },
        progressCallback
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify performance was tracked
      expect(duration).toBeGreaterThan(0);
      expect(result.performance?.duration).toBeDefined();
    });

    it('should track memory usage during generation', async () => {
      // Mock performance.memory
      const mockMemory = {
        usedJSHeapSize: 50 * 1024 * 1024,
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024,
      };
      
      (performance as any).memory = mockMemory;

      const progressCallback = vi.fn();
      const result = await app.generateModel(
        'test prompt',
        { quality: 'high', prioritizeSpeed: false },
        progressCallback
      );

      // Verify memory usage was tracked
      expect(result.performance?.memoryUsage).toBeDefined();
    });
  });
});
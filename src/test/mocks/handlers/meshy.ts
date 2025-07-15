/**
 * Meshy API Mock Handlers
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { http, HttpResponse } from 'msw';
import { MeshyTask } from '../../../meshy-api';

const mockTaskId = 'test-task-123';
const mockUserId = 'test-user-456';

export const meshyHandlers = [
  // Generate model endpoint
  http.post('/.netlify/functions/meshy-proxy', async ({ request }) => {
    const body = await request.json();
    
    if (body?.path === '/v1/text-to-3d') {
      return HttpResponse.json({
        success: true,
        status: 201,
        data: {
          id: mockTaskId,
          status: 'PENDING',
          progress: 0,
          created_at: new Date().toISOString(),
        }
      });
    }
    
    // Health check endpoint
    if (body?.path === '/health') {
      return HttpResponse.json({
        success: true,
        status: 200,
        data: { status: 'healthy' }
      });
    }
    
    return HttpResponse.json({
      success: false,
      status: 404,
      error: 'Not found'
    });
  }),

  // Get task status endpoint
  http.get('/.netlify/functions/meshy-proxy', ({ request }) => {
    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId');
    
    if (taskId === mockTaskId) {
      const mockTask: MeshyTask = {
        id: mockTaskId,
        status: 'SUCCEEDED',
        progress: 100,
        model_urls: {
          glb: 'https://example.com/model.glb',
          fbx: 'https://example.com/model.fbx',
          obj: 'https://example.com/model.obj',
          usdz: 'https://example.com/model.usdz',
        },
        thumbnail_url: 'https://example.com/thumbnail.jpg',
        created_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      };
      
      return HttpResponse.json({
        success: true,
        status: 200,
        data: mockTask
      });
    }
    
    return HttpResponse.json({
      success: false,
      status: 404,
      error: 'Task not found'
    });
  }),

  // Download model file
  http.get('https://example.com/model.glb', () => {
    return HttpResponse.arrayBuffer(new ArrayBuffer(1024), {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Content-Length': '1024',
      },
    });
  }),

  // Download other model formats
  http.get('https://example.com/model.fbx', () => {
    return HttpResponse.arrayBuffer(new ArrayBuffer(2048), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': '2048',
      },
    });
  }),

  http.get('https://example.com/model.obj', () => {
    return HttpResponse.text('# Test OBJ file\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3', {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': '42',
      },
    });
  }),

  http.get('https://example.com/model.usdz', () => {
    return HttpResponse.arrayBuffer(new ArrayBuffer(1536), {
      headers: {
        'Content-Type': 'model/vnd.usdz+zip',
        'Content-Length': '1536',
      },
    });
  }),

  // Thumbnail image
  http.get('https://example.com/thumbnail.jpg', () => {
    return HttpResponse.arrayBuffer(new ArrayBuffer(512), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': '512',
      },
    });
  }),

  // Error scenarios
  http.post('/.netlify/functions/meshy-proxy-error', () => {
    return HttpResponse.json({
      success: false,
      status: 500,
      error: 'Internal server error'
    }, { status: 500 });
  }),

  // Timeout scenario
  http.post('/.netlify/functions/meshy-proxy-timeout', () => {
    return new Promise(() => {
      // Never resolve to simulate timeout
    });
  }),

  // Rate limit scenario
  http.post('/.netlify/functions/meshy-proxy-ratelimit', () => {
    return HttpResponse.json({
      success: false,
      status: 429,
      error: 'Rate limit exceeded'
    }, { status: 429 });
  }),
];

export const createMockTask = (overrides: Partial<MeshyTask> = {}): MeshyTask => ({
  id: mockTaskId,
  status: 'PENDING',
  progress: 0,
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createSuccessfulTask = (): MeshyTask => 
  createMockTask({
    status: 'SUCCEEDED',
    progress: 100,
    model_urls: {
      glb: 'https://example.com/model.glb',
      fbx: 'https://example.com/model.fbx',
      obj: 'https://example.com/model.obj',
      usdz: 'https://example.com/model.usdz',
    },
    thumbnail_url: 'https://example.com/thumbnail.jpg',
    finished_at: new Date().toISOString(),
  });

export const createFailedTask = (): MeshyTask => 
  createMockTask({
    status: 'FAILED',
    progress: 0,
    finished_at: new Date().toISOString(),
  });

export const createInProgressTask = (progress: number = 50): MeshyTask => 
  createMockTask({
    status: 'IN_PROGRESS',
    progress,
  });
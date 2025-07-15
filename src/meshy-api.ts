/**
 * Text-to-3D Construction Platform - Meshy API Service
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { ApiClient } from './api-client';
import { logger } from './utils/logger';

export interface MeshyTask {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';
  progress: number;
  model_urls?: {
    glb?: string;
    fbx?: string;
    usdz?: string;
    obj?: string;
  };
  thumbnail_url?: string;
  created_at: string;
  finished_at?: string;
}

export interface GenerationRequest {
  prompt: string;
  artStyle?: 'realistic' | 'sculpture';
  enablePBR?: boolean;
  seed?: number;
  targetPolyCount?: number;
  topology?: 'quad' | 'triangle';
  enableRemesh?: boolean;
}

export interface DeviceCapabilities {
  isMobile: boolean;
  maxPolyCount: number;
  maxFileSizeMB: number;
  supportedFormats: string[];
}

export class MeshyAPI {
  // Detect device capabilities
  static getDeviceCapabilities(): DeviceCapabilities {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isTablet = /iPad|Android.*tablet/i.test(navigator.userAgent);

    return {
      isMobile: isMobile && !isTablet,
      maxPolyCount: isMobile ? 8000 : isTablet ? 12000 : 30000,
      maxFileSizeMB: isMobile ? 10 : isTablet ? 15 : 25,
      supportedFormats: isMobile ? ['glb'] : ['glb', 'fbx', 'obj', 'usdz'],
    };
  }

  // Stage 1: Create preview task
  static async createPreviewTask(
    request: GenerationRequest,
  ): Promise<MeshyTask> {
    const capabilities = this.getDeviceCapabilities();
    const optimizedPolyCount = Math.min(
      request.targetPolyCount || capabilities.maxPolyCount,
      capabilities.maxPolyCount,
    );

    const payload = {
      mode: 'preview',
      prompt: request.prompt,
      art_style: request.artStyle || 'realistic',
      should_remesh: request.enableRemesh !== false,
      ai_model: 'meshy-4', // Use meshy-4 for PBR compatibility
      ...(request.seed && { seed: request.seed }),
    };

    logger.info('Creating Meshy preview task', undefined, {
      prompt: request.prompt,
      polyCount: optimizedPolyCount,
      artStyle: request.artStyle || 'realistic',
      capabilities
    });

    const response = await ApiClient.post<{result: string}>('/openapi/v2/text-to-3d', payload);

    if (!response.success) {
      logger.error('Meshy API createPreviewTask failed', undefined, {
        status: response.status,
        error: response.error,
        message: response.message,
        data: response.data
      });
      
      const errorMessage = response.error || response.message || `HTTP ${response.status}` || 'Unknown error';
      throw new Error(`Preview task failed: ${errorMessage}`);
    }

    // Meshy API returns {result: "task-id"}, but we need a MeshyTask object
    // Create a minimal task object with the ID
    const taskId = response.data.result;
    if (!taskId) {
      throw new Error('Preview task failed: No task ID returned from API');
    }

    logger.info('Preview task created', undefined, { taskId });
    
    return {
      id: taskId,
      status: 'PENDING',
      progress: 0,
      created_at: Date.now().toString(),
    } as MeshyTask;
  }

  // Stage 2: Create refine task
  static async createRefineTask(previewTaskId: string): Promise<MeshyTask> {
    const payload = {
      mode: 'refine',
      preview_task_id: previewTaskId,
      enable_pbr: true, // Enable PBR maps for better quality
      ai_model: 'meshy-4', // Required for PBR support
    };

    const response = await ApiClient.post<{result: string}>('/openapi/v2/text-to-3d', payload);

    if (!response.success) {
      throw new Error(
        `Refine task failed: ${response.error || response.message || 'Unknown error'}`,
      );
    }

    // Meshy API returns {result: "task-id"}, extract the task ID
    const taskId = response.data.result;
    if (!taskId) {
      throw new Error('Refine task failed: No task ID returned from API');
    }

    logger.info('Refine task created', undefined, { taskId });
    
    return {
      id: taskId,
      status: 'PENDING',
      progress: 0,
      created_at: Date.now().toString(),
    } as MeshyTask;
  }

  // Get task status
  static async getTaskStatus(taskId: string): Promise<MeshyTask> {
    logger.info('Getting task status', undefined, { taskId });
    
    const response = await ApiClient.get<MeshyTask>(`/openapi/v2/text-to-3d/${taskId}`);

    if (!response.success) {
      logger.error('Task status failed', undefined, {
        taskId,
        status: response.status,
        error: response.error,
        message: response.message,
        data: response.data
      });
      
      throw new Error(
        `Task status failed: ${response.error || response.message || 'Unknown error'}`,
      );
    }

    logger.info('Task status retrieved', undefined, { 
      taskId, 
      status: response.data.status, 
      progress: response.data.progress 
    });

    return response.data;
  }

  // Generate model (unified method for tests)
  static async generateModel(
    request: GenerationRequest, 
    progressCallback?: (stage: string, progress: number) => void
  ): Promise<MeshyTask> {
    if (!request.prompt || request.prompt.trim() === '') {
      throw new Error('Prompt is required');
    }

    const payload = {
      mode: 'preview',
      prompt: request.prompt,
      art_style: request.artStyle || 'realistic',
      enable_pbr: request.enablePBR || false,
      seed: request.seed,
      target_poly_count: request.targetPolyCount,
      topology: request.topology || 'quad',
      enable_remesh: request.enableRemesh || false,
      ai_model: 'meshy-4',
    };

    const response = await ApiClient.post<{result: string}>('/openapi/v2/text-to-3d', payload);

    if (!response.success) {
      throw new Error(
        `Model generation failed: ${response.error || response.message || 'Unknown error'}`,
      );
    }

    const taskId = response.data.result;
    if (!taskId) {
      throw new Error('Model generation failed: No task ID returned from API');
    }

    const task = {
      id: taskId,
      status: 'PENDING',
      progress: 0,
      created_at: new Date().toISOString(),
    } as MeshyTask;

    // If progress callback is provided, poll for completion
    if (progressCallback) {
      return await this.pollTaskUntilComplete(taskId, (progress) => {
        progressCallback('Generating model...', progress);
      });
    }

    return task;
  }

  // Download model from URL
  static async downloadModel(url: string): Promise<Blob> {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download model: ${response.statusText}`);
    }
    
    return response.blob();
  }

  // Poll task until completion
  static async pollTaskUntilComplete(
    taskId: string,
    progressCallback?: (progress: number) => void,
    maxAttempts: number = 60,
  ): Promise<MeshyTask> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const task = await this.getTaskStatus(taskId);

      if (task.status === 'SUCCEEDED') {
        return task;
      }

      if (task.status === 'FAILED') {
        throw new Error('3D model generation failed');
      }

      // Report progress
      if (progressCallback) {
        progressCallback(task.progress || 0);
      }

      // Wait 2 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('Task polling timed out');
  }

  // Validate model URLs
  static validateModelUrls(modelUrls: { [key: string]: string }): boolean {
    for (const [format, url] of Object.entries(modelUrls)) {
      if (!url || !this.isValidUrl(url)) {
        return false;
      }
    }
    return true;
  }

  // Validate model file size
  static async validateModelSize(url: string, maxSizeBytes: number): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      
      if (!contentLength) {
        return true; // Can't determine size, assume it's valid
      }
      
      const size = parseInt(contentLength, 10);
      return size <= maxSizeBytes;
    } catch (error) {
      return false;
    }
  }

  // Cancel a task
  static async cancelTask(taskId: string): Promise<void> {
    const response = await ApiClient.delete(`/openapi/v2/text-to-3d/${taskId}`);
    
    if (!response.success) {
      throw new Error(
        `Failed to cancel task: ${response.error || response.message || 'Unknown error'}`,
      );
    }
  }

  // Helper to validate URL format
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Poll for task completion
  static async pollForCompletion(
    taskId: string,
    maxAttempts: number = 60,
    onProgress?: (progress: number) => void,
  ): Promise<MeshyTask> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const task = await this.getTaskStatus(taskId);

      if (task.status === 'SUCCEEDED') {
        return task;
      }

      if (task.status === 'FAILED') {
        throw new Error('3D model generation failed');
      }

      // Report progress
      const progress = Math.min(attempts / maxAttempts, 0.9); // Cap at 90% until complete
      onProgress?.(progress);

      // Wait 5 seconds before next poll
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('3D model generation timed out');
  }

  // Complete text-to-3D generation workflow with progress callbacks
  static async generateModel(
    request: GenerationRequest,
    onProgress?: (stage: string, progress: number) => void,
  ): Promise<MeshyTask> {
    try {
      onProgress?.('Creating preview model...', 10);

      // Stage 1: Create preview
      const previewTask = await this.createPreviewTask(request);

      onProgress?.('Generating geometry...', 20);

      // Poll for preview completion
      const completedPreview = await this.pollForCompletion(
        previewTask.id,
        60,
        (progress) => {
          onProgress?.('Processing geometry...', 20 + progress * 0.4); // 20-60%
        },
      );

      onProgress?.('Creating textured model...', 60);

      // Stage 2: Create refine task
      const refineTask = await this.createRefineTask(completedPreview.id);

      onProgress?.('Applying textures...', 70);

      // Poll for refine completion
      const completedRefine = await this.pollForCompletion(
        refineTask.id,
        60,
        (progress) => {
          onProgress?.('Finalizing model...', 70 + progress * 0.3); // 70-100%
        },
      );

      onProgress?.('Model ready!', 100);

      return completedRefine;
    } catch (error) {
      logger.error('Meshy API request failed', 'MeshyAPI', error);
      throw error;
    }
  }

  // Cancel task
  static async cancelTask(taskId: string): Promise<void> {
    const response = await ApiClient.delete(`/openapi/v2/text-to-3d/${taskId}`);

    if (!response.success) {
      throw new Error(
        `Cancel task failed: ${response.error || response.message || 'Unknown error'}`,
      );
    }
  }

  // Download model file
  static async downloadModel(url: string, filename: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(downloadUrl);
  }
}

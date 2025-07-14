/**
 * Text-to-3D Construction Platform - Meshy API Service
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { API_CONFIG } from './config';

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
}

export class MeshyAPI {
  private static readonly BASE_URL = API_CONFIG.MESHY_API_URL;
  private static readonly HEADERS = {
    'Authorization': `Bearer ${API_CONFIG.MESHY_API_KEY}`,
    'Content-Type': 'application/json',
  };

  // Stage 1: Create preview task
  static async createPreviewTask(request: GenerationRequest): Promise<MeshyTask> {
    const payload = {
      mode: 'preview',
      prompt: request.prompt,
      art_style: request.artStyle || 'realistic',
      enable_pbr: request.enablePBR || true,
      ...(request.seed && { seed: request.seed })
    };

    const response = await fetch(`${this.BASE_URL}/text-to-3d`, {
      method: 'POST',
      headers: this.HEADERS,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Preview task failed: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  // Stage 2: Create refine task
  static async createRefineTask(previewTaskId: string): Promise<MeshyTask> {
    const payload = {
      mode: 'refine',
      preview_task_id: previewTaskId
    };

    const response = await fetch(`${this.BASE_URL}/text-to-3d`, {
      method: 'POST',
      headers: this.HEADERS,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Refine task failed: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  // Get task status
  static async getTaskStatus(taskId: string): Promise<MeshyTask> {
    const response = await fetch(`${this.BASE_URL}/text-to-3d/${taskId}`, {
      headers: this.HEADERS
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Task status failed: ${error.message || response.statusText}`);
    }

    return await response.json();
  }

  // Poll for task completion
  static async pollForCompletion(
    taskId: string, 
    maxAttempts: number = 60, 
    onProgress?: (progress: number) => void
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
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
    
    throw new Error('3D model generation timed out');
  }

  // Complete text-to-3D generation workflow with progress callbacks
  static async generateModel(
    request: GenerationRequest, 
    onProgress?: (stage: string, progress: number) => void
  ): Promise<MeshyTask> {
    try {
      onProgress?.('Creating preview model...', 10);
      
      // Stage 1: Create preview
      const previewTask = await this.createPreviewTask(request);
      
      onProgress?.('Generating geometry...', 20);
      
      // Poll for preview completion
      const completedPreview = await this.pollForCompletion(previewTask.id, 60, (progress) => {
        onProgress?.('Processing geometry...', 20 + (progress * 0.4)); // 20-60%
      });
      
      onProgress?.('Creating textured model...', 60);
      
      // Stage 2: Create refine task
      const refineTask = await this.createRefineTask(completedPreview.id);
      
      onProgress?.('Applying textures...', 70);
      
      // Poll for refine completion
      const completedRefine = await this.pollForCompletion(refineTask.id, 60, (progress) => {
        onProgress?.('Finalizing model...', 70 + (progress * 0.3)); // 70-100%
      });
      
      onProgress?.('Model ready!', 100);
      
      return completedRefine;
    } catch (error) {
      console.error('Meshy API error:', error);
      throw error;
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
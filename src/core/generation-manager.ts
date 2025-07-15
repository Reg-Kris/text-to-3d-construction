/**
 * Text-to-3D Construction Platform - Generation Manager
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { MeshyAPI } from '../meshy-api';
import { DeviceUtils } from '../device-utils';
import {
  AppState,
  QualitySettings,
  GenerationRequest,
  MeshyTask,
  ProjectRecord,
} from '../types';

export class GenerationManager {
  constructor(private state: AppState) {}

  async generateModel(
    prompt: string,
    qualitySettings: QualitySettings,
    progressCallback: (stage: string, progress: number) => void,
  ): Promise<{ task: MeshyTask; project: ProjectRecord }> {
    const deviceSettings = DeviceUtils.getOptimizedSettings(qualitySettings);
    const deviceInfo = DeviceUtils.getDeviceInfo();

    // Create in-memory project record (no database needed)
    const project: ProjectRecord = {
      id: `temp-${Date.now()}`, // Temporary ID for in-memory tracking
      user_email: this.state.currentUser?.email || 'anonymous@local.dev',
      prompt: prompt,
      status: 'generating',
      device_type: deviceInfo.type,
      art_style: 'realistic',
      polygon_count: deviceSettings.targetPolyCount,
      created_at: new Date().toISOString(),
      download_count: 0,
    };

    const request: GenerationRequest = {
      prompt: prompt,
      artStyle: 'realistic',
      enablePBR: deviceSettings.enablePBR,
      targetPolyCount: deviceSettings.targetPolyCount,
      topology: deviceSettings.topology,
      enableRemesh: deviceSettings.enableRemesh,
    };

    try {
      // Generate the model using Meshy API with progress tracking
      const task = await MeshyAPI.generateModel(request, progressCallback);

      // Update in-memory project with completion data
      const generationTime = Math.round(
        (Date.now() - this.state.generationStartTime) / 1000,
      );
      
      const completedProject: ProjectRecord = {
        ...project,
        status: 'completed',
        model_urls: task.model_urls,
        generation_time_seconds: generationTime,
        thumbnail_url: task.thumbnail_url,
      };

      return {
        task,
        project: completedProject,
      };
    } catch (error) {
      // Update in-memory project with failure status (for potential future use)
      project.status = 'failed';
      throw error;
    }
  }

  async retryGeneration(
    _projectId: string,
    _progressCallback: (stage: string, progress: number) => void,
  ): Promise<MeshyTask> {
    // For self-contained mode, retry is not supported since we don't persist projects
    throw new Error('Retry generation is not available in self-contained mode. Please create a new generation instead.');
  }

  async cancelGeneration(): Promise<void> {
    if (this.state.currentTask) {
      try {
        await MeshyAPI.cancelTask(this.state.currentTask.id);

        // In self-contained mode, just update the in-memory state
        this.state.currentTask = null;
        this.state.isGenerating = false;
        
        // Update current project status if it exists
        if (this.state.currentProject) {
          this.state.currentProject.status = 'failed';
        }
      } catch (error) {
        console.error('Failed to cancel generation:', error);
        throw error;
      }
    }
  }

  getGenerationProgress(): { stage: string; progress: number } | null {
    if (!this.state.currentTask || !this.state.isGenerating) {
      return null;
    }

    // This would need to be implemented based on the Meshy API response
    // For now, return a placeholder
    return {
      stage: 'Generating model...',
      progress: 50,
    };
  }
}

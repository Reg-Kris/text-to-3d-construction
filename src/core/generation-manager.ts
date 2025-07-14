/**
 * Text-to-3D Construction Platform - Generation Manager
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { MeshyAPI } from '../meshy-api';
import { AirtableService } from '../airtable-service';
import { DeviceUtils } from '../device-utils';
import { AppState, QualitySettings, GenerationRequest, MeshyTask, ProjectRecord } from '../types';

export class GenerationManager {
  constructor(private state: AppState) {}

  async generateModel(
    prompt: string,
    qualitySettings: QualitySettings,
    progressCallback: (stage: string, progress: number) => void
  ): Promise<{ task: MeshyTask; project: ProjectRecord }> {
    
    const deviceSettings = DeviceUtils.getOptimizedSettings(qualitySettings);
    const deviceInfo = DeviceUtils.getDeviceInfo();

    // Create project record in Airtable
    const project = await AirtableService.createProject({
      user_email: this.state.currentUser!.email,
      prompt: prompt,
      status: 'generating',
      device_type: deviceInfo.type,
      art_style: 'realistic',
      polygon_count: deviceSettings.targetPolyCount
    });

    const request: GenerationRequest = {
      prompt: prompt,
      artStyle: 'realistic',
      enablePBR: deviceSettings.enablePBR,
      targetPolyCount: deviceSettings.targetPolyCount,
      topology: deviceSettings.topology,
      enableRemesh: deviceSettings.enableRemesh
    };

    try {
      // Generate the model using Meshy API with progress tracking
      const task = await MeshyAPI.generateModel(request, progressCallback);
      
      // Update project with completion data
      const generationTime = Math.round((Date.now() - this.state.generationStartTime) / 1000);
      const updatedProject = await AirtableService.updateProject(project.id!, {
        status: 'completed',
        model_urls: task.model_urls,
        generation_time_seconds: generationTime,
        thumbnail_url: task.thumbnail_url
      });

      return {
        task,
        project: updatedProject || project
      };
      
    } catch (error) {
      // Update project with failure status
      await AirtableService.updateProject(project.id!, {
        status: 'failed'
      }).catch(console.error);
      
      throw error;
    }
  }

  async retryGeneration(
    projectId: string,
    progressCallback: (stage: string, progress: number) => void
  ): Promise<MeshyTask> {
    const project = await AirtableService.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Reset project status
    await AirtableService.updateProject(projectId, {
      status: 'generating'
    });

    const qualitySettings: QualitySettings = {
      quality: 'medium',
      prioritizeSpeed: false
    };

    const result = await this.generateModel(project.prompt, qualitySettings, progressCallback);
    return result.task;
  }

  async cancelGeneration(): Promise<void> {
    if (this.state.currentTask) {
      try {
        await MeshyAPI.cancelTask(this.state.currentTask.id);
        
        if (this.state.currentProject) {
          await AirtableService.updateProject(this.state.currentProject.id!, {
            status: 'failed'
          });
        }
        
        this.state.currentTask = null;
        this.state.isGenerating = false;
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
      progress: 50
    };
  }
}
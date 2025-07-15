/**
 * Generation Manager Unit Tests
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerationManager } from './generation-manager';
import { AppState, QualitySettings } from '../types';
import { MeshyTask, ProjectRecord } from '../types';

// Mock the dependencies
vi.mock('../meshy-api', () => ({
  MeshyAPI: {
    generateModel: vi.fn(),
    pollTaskUntilComplete: vi.fn(),
    getTaskStatus: vi.fn(),
  },
}));

vi.mock('../device-utils', () => ({
  DeviceUtils: {
    getOptimizedSettings: vi.fn().mockReturnValue({
      targetPolyCount: 30000,
      enablePBR: true,
      topology: 'quad',
      enableRemesh: true,
    }),
    getDeviceInfo: vi.fn().mockReturnValue({
      type: 'desktop',
      isMobile: false,
      performance: 'high',
    }),
  },
}));

describe('GenerationManager', () => {
  let generationManager: GenerationManager;
  let mockState: AppState;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockState = {
      currentUser: { email: 'test@example.com' },
      currentTask: null,
      currentProject: null,
      generationStartTime: 0,
      isGenerating: false,
      isLoading: false,
    };

    generationManager = new GenerationManager(mockState);
  });

  describe('Model Generation', () => {
    it('should generate a model successfully', async () => {
      const prompt = 'modern house';
      const qualitySettings: QualitySettings = {
        quality: 'high',
        prioritizeSpeed: false,
      };
      const progressCallback = vi.fn();

      // Mock successful generation
      const mockTask: MeshyTask = {
        id: 'test-task-123',
        status: 'SUCCEEDED',
        progress: 100,
        model_urls: {
          glb: 'https://example.com/model.glb',
          fbx: 'https://example.com/model.fbx',
        },
        created_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      };

      const { MeshyAPI } = await import('../meshy-api');
      (MeshyAPI.generateModel as any).mockResolvedValue(mockTask);
      (MeshyAPI.pollTaskUntilComplete as any).mockResolvedValue(mockTask);

      const result = await generationManager.generateModel(
        prompt,
        qualitySettings,
        progressCallback
      );

      expect(result.task).toBeDefined();
      expect(result.task.id).toBe('test-task-123');
      expect(result.project).toBeDefined();
      expect(result.project.prompt).toBe(prompt);
      expect(result.project.status).toBe('completed');
    });

    it('should handle generation failures', async () => {
      const prompt = 'invalid prompt';
      const qualitySettings: QualitySettings = {
        quality: 'high',
        prioritizeSpeed: false,
      };
      const progressCallback = vi.fn();

      // Mock generation failure
      const { MeshyAPI } = await import('../meshy-api');
      (MeshyAPI.generateModel as any).mockRejectedValue(new Error('Generation failed'));

      await expect(
        generationManager.generateModel(prompt, qualitySettings, progressCallback)
      ).rejects.toThrow('Generation failed');
    });

    it('should apply device-specific optimizations', async () => {
      const prompt = 'test prompt';
      const qualitySettings: QualitySettings = {
        quality: 'medium',
        prioritizeSpeed: true,
      };
      const progressCallback = vi.fn();

      const mockTask: MeshyTask = {
        id: 'test-task-123',
        status: 'SUCCEEDED',
        progress: 100,
        created_at: new Date().toISOString(),
      };

      const { MeshyAPI } = await import('../meshy-api');
      (MeshyAPI.generateModel as any).mockResolvedValue(mockTask);
      (MeshyAPI.pollTaskUntilComplete as any).mockResolvedValue(mockTask);

      const { DeviceUtils } = await import('../device-utils');
      
      await generationManager.generateModel(prompt, qualitySettings, progressCallback);

      // Verify device utils was called for optimization
      expect(DeviceUtils.getOptimizedSettings).toHaveBeenCalledWith(qualitySettings);
      expect(DeviceUtils.getDeviceInfo).toHaveBeenCalled();
    });

    it('should track progress during generation', async () => {
      const prompt = 'test prompt';
      const qualitySettings: QualitySettings = {
        quality: 'high',
        prioritizeSpeed: false,
      };
      const progressCallback = vi.fn();

      const mockTask: MeshyTask = {
        id: 'test-task-123',
        status: 'SUCCEEDED',
        progress: 100,
        created_at: new Date().toISOString(),
      };

      const { MeshyAPI } = await import('../meshy-api');
      (MeshyAPI.generateModel as any).mockImplementation(
        (request: any, callback: (stage: string, progress: number) => void) => {
          // Simulate progress updates
          callback('Generating model...', 25);
          callback('Generating model...', 50);
          callback('Generating model...', 75);
          callback('Generating model...', 100);
          return Promise.resolve(mockTask);
        }
      );

      await generationManager.generateModel(prompt, qualitySettings, progressCallback);

      // Verify progress was tracked
      expect(progressCallback).toHaveBeenCalledWith('Generating model...', 25);
      expect(progressCallback).toHaveBeenCalledWith('Generating model...', 50);
      expect(progressCallback).toHaveBeenCalledWith('Generating model...', 75);
      expect(progressCallback).toHaveBeenCalledWith('Generating model...', 100);
    });

    it('should create project record with correct data', async () => {
      const prompt = 'modern building';
      const qualitySettings: QualitySettings = {
        quality: 'high',
        prioritizeSpeed: false,
      };
      const progressCallback = vi.fn();

      const mockTask: MeshyTask = {
        id: 'test-task-123',
        status: 'SUCCEEDED',
        progress: 100,
        created_at: new Date().toISOString(),
      };

      const { MeshyAPI } = await import('../meshy-api');
      (MeshyAPI.generateModel as any).mockResolvedValue(mockTask);
      (MeshyAPI.pollTaskUntilComplete as any).mockResolvedValue(mockTask);

      const result = await generationManager.generateModel(
        prompt,
        qualitySettings,
        progressCallback
      );

      expect(result.project).toEqual(
        expect.objectContaining({
          user_email: 'test@example.com',
          prompt: 'modern building',
          status: 'completed',
          device_type: 'desktop',
          art_style: 'realistic',
          polygon_count: 30000,
          download_count: 0,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const prompt = 'test prompt';
      const qualitySettings: QualitySettings = {
        quality: 'high',
        prioritizeSpeed: false,
      };
      const progressCallback = vi.fn();

      const { MeshyAPI } = await import('../meshy-api');
      (MeshyAPI.generateModel as any).mockRejectedValue(new Error('Network error'));

      await expect(
        generationManager.generateModel(prompt, qualitySettings, progressCallback)
      ).rejects.toThrow('Network error');
    });

    it('should handle task polling failures', async () => {
      const prompt = 'test prompt';
      const qualitySettings: QualitySettings = {
        quality: 'high',
        prioritizeSpeed: false,
      };
      const progressCallback = vi.fn();

      const mockTask: MeshyTask = {
        id: 'test-task-123',
        status: 'PENDING',
        progress: 0,
        created_at: new Date().toISOString(),
      };

      const { MeshyAPI } = await import('../meshy-api');
      (MeshyAPI.generateModel as any).mockRejectedValue(new Error('Polling failed'));

      await expect(
        generationManager.generateModel(prompt, qualitySettings, progressCallback)
      ).rejects.toThrow('Polling failed');
    });

    it('should handle empty prompts', async () => {
      const prompt = '';
      const qualitySettings: QualitySettings = {
        quality: 'high',
        prioritizeSpeed: false,
      };
      const progressCallback = vi.fn();

      const { MeshyAPI } = await import('../meshy-api');
      (MeshyAPI.generateModel as any).mockRejectedValue(new Error('Prompt is required'));

      await expect(
        generationManager.generateModel(prompt, qualitySettings, progressCallback)
      ).rejects.toThrow('Prompt is required');
    });
  });

  describe('Quality Settings', () => {
    it('should apply low quality settings', async () => {
      const prompt = 'test prompt';
      const qualitySettings: QualitySettings = {
        quality: 'low',
        prioritizeSpeed: true,
      };
      const progressCallback = vi.fn();

      const mockTask: MeshyTask = {
        id: 'test-task-123',
        status: 'SUCCEEDED',
        progress: 100,
        created_at: new Date().toISOString(),
      };

      const { MeshyAPI } = await import('../meshy-api');
      (MeshyAPI.generateModel as any).mockResolvedValue(mockTask);
      (MeshyAPI.pollTaskUntilComplete as any).mockResolvedValue(mockTask);

      await generationManager.generateModel(prompt, qualitySettings, progressCallback);

      expect(MeshyAPI.generateModel).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'test prompt',
          artStyle: 'realistic',
          enablePBR: true,
          targetPolyCount: 30000,
          topology: 'quad',
          enableRemesh: true,
        }),
        expect.any(Function)
      );
    });

    it('should apply high quality settings', async () => {
      const prompt = 'test prompt';
      const qualitySettings: QualitySettings = {
        quality: 'high',
        prioritizeSpeed: false,
      };
      const progressCallback = vi.fn();

      const mockTask: MeshyTask = {
        id: 'test-task-123',
        status: 'SUCCEEDED',
        progress: 100,
        created_at: new Date().toISOString(),
      };

      const { MeshyAPI } = await import('../meshy-api');
      (MeshyAPI.generateModel as any).mockResolvedValue(mockTask);
      (MeshyAPI.pollTaskUntilComplete as any).mockResolvedValue(mockTask);

      await generationManager.generateModel(prompt, qualitySettings, progressCallback);

      expect(MeshyAPI.generateModel).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'test prompt',
          artStyle: 'realistic',
          enablePBR: true,
          targetPolyCount: 30000,
          topology: 'quad',
          enableRemesh: true,
        }),
        expect.any(Function)
      );
    });
  });
});
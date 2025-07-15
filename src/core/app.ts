/**
 * Text-to-3D Construction Platform - Main Application
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { validateConfig } from '../config';
import { AuthService } from '../auth';
import { GoogleModelViewer } from '../viewer/google-model-viewer';
import { UIManager } from './ui-manager';
import { GenerationManager } from './generation-manager';
import { DownloadManager } from './download-manager';
import { AppState, ViewerSettings } from '../types';
import type { MeshyTask } from '../types';
import { logger } from '../utils/logger';

export class ConstructionApp {
  private state: AppState = {
    currentUser: null,
    currentTask: null,
    currentProject: null,
    generationStartTime: 0,
    isGenerating: false,
    isLoading: false,
  };

  private modelViewer: GoogleModelViewer | null = null;
  private uiManager: UIManager;
  private generationManager: GenerationManager;
  private downloadManager: DownloadManager;
  private viewerSettings: ViewerSettings = {
    viewMode: 'perspective',
    lodEnabled: true,
    lodLevel: 1,
    shadowsEnabled: true,
  };

  constructor() {
    this.uiManager = new UIManager();
    this.generationManager = new GenerationManager(this.state);
    this.downloadManager = new DownloadManager(this.state);
    
    // Add window resize listener
    window.addEventListener('resize', () => this.onWindowResize());
    
    this.init();
  }

  private async init() {
    if (!validateConfig()) {
      this.uiManager.showError(
        'Application configuration is incomplete. Please contact support.',
      );
      return;
    }

    this.state.currentUser = AuthService.getCurrentUser();

    if (!this.state.currentUser) {
      await this.authenticate();
    }

    if (this.state.currentUser) {
      this.showMainInterface();
    }

    this.setupCharacterCounter();
  }

  private setupCharacterCounter() {
    const prompt = document.getElementById('prompt') as HTMLTextAreaElement;
    const charCount = document.getElementById('char-count');

    if (prompt && charCount) {
      const updateCharCount = () => {
        const count = prompt.value.length;
        charCount.textContent = count.toString();

        // Change color based on usage
        if (count > 500) {
          charCount.style.color = '#dc3545'; // Red
        } else if (count > 400) {
          charCount.style.color = '#ffc107'; // Yellow
        } else {
          charCount.style.color = '#666'; // Gray
        }
      };

      prompt.addEventListener('input', updateCharCount);
      updateCharCount(); // Initial count
    }
  }

  private async authenticate() {
    try {
      this.state.currentUser = await AuthService.authenticate();
      if (!this.state.currentUser) {
        this.uiManager.showError('Authentication failed. Access denied.');
        return;
      }
    } catch (error) {
      logger.error('Authentication failed', 'ConstructionApp', error);
      this.uiManager.showError('Authentication failed. Please try again.');
    }
  }

  private showMainInterface() {
    this.uiManager.showMainInterface(this.state.currentUser!);
    this.initModelViewer();
    document.body.style.display = 'block';
  }

  private initModelViewer() {
    const viewerContainer = this.uiManager.createOrGetViewerContainer();

    if (viewerContainer) {
      try {
        this.modelViewer = new GoogleModelViewer({
          container: viewerContainer,
          backgroundColor: '#2a2a2a', // Dark background for better contrast
          autoRotate: true,
          cameraControls: true,
          environmentImage: undefined, // Will add HDR environment later
        });
      } catch (error) {
        logger.error('Failed to initialize Google Model Viewer', 'ConstructionApp', error);
        this.uiManager.showError(
          'Failed to initialize 3D viewer. Your browser may not support WebGL.',
        );
      }
    }
  }

  async generateModel() {
    if (!this.state.currentUser) {
      await this.authenticate();
      return;
    }

    const prompt = this.uiManager.getPrompt();
    const qualitySettings = this.uiManager.getQualitySettings();

    if (!prompt) {
      this.uiManager.showError('Please enter a construction description');
      return;
    }

    if (prompt.length > 600) {
      this.uiManager.showError('Description must be 600 characters or less');
      return;
    }

    this.state.isGenerating = true;
    this.state.generationStartTime = Date.now();
    this.uiManager.showLoading('Initializing generation...');
    this.uiManager.hideViewer();
    this.uiManager.hideDownload();

    try {
      const result = await this.generationManager.generateModel(
        prompt,
        qualitySettings,
        (stage, progress) => this.uiManager.updateProgress(stage, progress),
      );

      this.state.currentTask = result.task;
      this.state.currentProject = result.project;

      await this.displayModel(result.task);
    } catch (error) {
      logger.error('3D model generation failed', 'ConstructionApp', error);
      this.uiManager.showError(
        `Failed to generate model: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      this.state.isGenerating = false;
      this.uiManager.hideLoading();
    }
  }

  private async displayModel(task: MeshyTask) {
    if (!task.model_urls?.glb || !this.modelViewer) {
      this.uiManager.showError('No model generated or viewer not initialized.');
      return;
    }

    try {
      this.uiManager.showLoading('Loading 3D model...');

      const modelInfo = await this.modelViewer.loadModel(
        task.model_urls.glb,
        (progress) =>
          this.uiManager.updateProgress('Loading model...', progress),
      );

      this.uiManager.showViewer();
      this.uiManager.addViewerControls(this);
      this.uiManager.showModelInfo(modelInfo);
      this.uiManager.showDownloadOptions(task, this);
    } catch (error) {
      logger.error('Failed to display generated model', 'ConstructionApp', error);
      this.uiManager.showError(
        'Failed to load 3D model. Please try downloading the file directly.',
      );
    } finally {
      this.uiManager.hideLoading();
    }
  }

  // Public methods for viewer controls
  setViewMode(mode: 'perspective' | 'top' | 'front' | 'side') {
    this.viewerSettings.viewMode = mode;
    if (this.modelViewer) {
      this.modelViewer.setViewMode(mode);
    }
  }

  resetCamera() {
    if (this.modelViewer) {
      this.modelViewer.resetCamera();
    }
  }

  async takeScreenshot() {
    if (this.modelViewer) {
      try {
        const dataURL = await this.modelViewer.takeScreenshot();
        const link = document.createElement('a');
        link.download = `construction-model-screenshot-${Date.now()}.png`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.uiManager.showSuccess('Screenshot saved successfully!');
      } catch (error) {
        logger.error('Screenshot capture failed', 'ConstructionApp', error);
        this.uiManager.showError('Failed to take screenshot.');
      }
    }
  }

  toggleAutoRotate() {
    if (this.modelViewer) {
      const stats = this.modelViewer.getStats();
      const newAutoRotate = !stats.autoRotate;
      this.modelViewer.setAutoRotate(newAutoRotate);

      this.uiManager.showSuccess(
        `Auto-rotate ${newAutoRotate ? 'enabled' : 'disabled'}`,
      );
    }
  }

  setExposure(level: string | number) {
    if (this.modelViewer) {
      const levelNum = typeof level === 'string' ? parseFloat(level) : level;
      this.modelViewer.setExposure(levelNum);

      this.uiManager.showSuccess(`Exposure set to ${levelNum}`);
    }
  }

  setShadowIntensity(intensity: string | number) {
    if (this.modelViewer) {
      const intensityNum = typeof intensity === 'string' ? parseFloat(intensity) : intensity;
      this.modelViewer.setShadowIntensity(intensityNum);

      this.uiManager.showSuccess(`Shadow intensity set to ${intensityNum}`);
    }
  }

  async downloadModel(url: string, extension: string) {
    try {
      await this.downloadManager.downloadModel(url, extension);
      this.uiManager.showSuccess(
        `${extension.toUpperCase()} file downloaded successfully!`,
      );
    } catch (error) {
      logger.error('Model download failed', 'ConstructionApp', error);
      this.uiManager.showError('Failed to download model. Please try again.');
    }
  }

  async downloadForEngine(engine: 'unreal' | 'unity' | 'blender') {
    if (!this.state.currentTask?.model_urls) {
      this.uiManager.showError('No model available for download.');
      return;
    }

    try {
      await this.downloadManager.downloadForEngine(this.state.currentTask.model_urls, engine);
      this.uiManager.showSuccess(
        `Model downloaded and optimized for ${engine.charAt(0).toUpperCase() + engine.slice(1)}!`,
      );
    } catch (error) {
      logger.error('Engine-specific download failed', 'ConstructionApp', error);
      this.uiManager.showError(`Failed to download model for ${engine}. Please try again.`);
    }
  }

  async downloadAllFormats() {
    if (!this.state.currentTask?.model_urls) {
      this.uiManager.showError('No model available for download.');
      return;
    }

    try {
      await this.downloadManager.downloadMultipleFormats(this.state.currentTask.model_urls);
      const formatCount = Object.keys(this.state.currentTask.model_urls).length;
      this.uiManager.showSuccess(
        `All ${formatCount} formats downloaded successfully!`,
      );
    } catch (error) {
      logger.error('Batch download failed', 'ConstructionApp', error);
      this.uiManager.showError('Failed to download all formats. Please try again.');
    }
  }

  logout() {
    AuthService.logout();
    location.reload();
  }

  // Getters for internal state access
  getCurrentUser() {
    return this.state.currentUser;
  }
  getCurrentTask() {
    return this.state.currentTask;
  }
  getCurrentProject() {
    return this.state.currentProject;
  }
  getViewerSettings() {
    return this.viewerSettings;
  }

  // Viewer management methods
  disposeViewer() {
    if (this.modelViewer) {
      this.modelViewer.dispose();
      this.modelViewer = null;
    }
  }

  onWindowResize() {
    if (this.modelViewer) {
      this.modelViewer.onWindowResize();
    }
  }

  getViewerStats() {
    return this.modelViewer ? this.modelViewer.getStats() : null;
  }
}

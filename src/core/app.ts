/**
 * Text-to-3D Construction Platform - Main Application
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { validateConfig } from '../config';
import { AuthService } from '../auth';
import { ThreeViewer } from '../three-viewer';
import { DeviceUtils } from '../device-utils';
import { UIManager } from './ui-manager';
import { GenerationManager } from './generation-manager';
import { DownloadManager } from './download-manager';
import { AppState, ViewerSettings } from '../types';
import type { MeshyTask } from '../types';

export class ConstructionApp {
  private state: AppState = {
    currentUser: null,
    currentTask: null,
    currentProject: null,
    generationStartTime: 0,
    isGenerating: false,
    isLoading: false,
  };

  private threeViewer: ThreeViewer | null = null;
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
  }

  private async authenticate() {
    try {
      this.state.currentUser = await AuthService.authenticate();
      if (!this.state.currentUser) {
        this.uiManager.showError('Authentication failed. Access denied.');
        return;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.uiManager.showError('Authentication failed. Please try again.');
    }
  }

  private showMainInterface() {
    this.uiManager.showMainInterface(this.state.currentUser!);
    this.initThreeViewer();
    document.body.style.display = 'block';
  }

  private initThreeViewer() {
    const viewerContainer = this.uiManager.createOrGetViewerContainer();

    if (viewerContainer) {
      try {
        this.threeViewer = new ThreeViewer({
          container: viewerContainer,
          enableShadows:
            this.viewerSettings.shadowsEnabled &&
            !DeviceUtils.getDeviceInfo().isMobile,
          backgroundColor: 0xf5f5f5,
        });
      } catch (error) {
        console.error('Failed to initialize Three.js viewer:', error);
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
      console.error('Generation error:', error);
      this.uiManager.showError(
        `Failed to generate model: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      this.state.isGenerating = false;
      this.uiManager.hideLoading();
    }
  }

  private async displayModel(task: MeshyTask) {
    if (!task.model_urls?.glb || !this.threeViewer) {
      this.uiManager.showError('No model generated or viewer not initialized.');
      return;
    }

    try {
      this.uiManager.showLoading('Loading 3D model...');

      const modelInfo = await this.threeViewer.loadModel(
        task.model_urls.glb,
        'glb',
        (progress) =>
          this.uiManager.updateProgress('Loading model...', progress),
      );

      this.uiManager.showViewer();
      this.uiManager.addViewerControls(this);
      this.uiManager.showModelInfo(modelInfo);
      this.uiManager.showDownloadOptions(task, this);
    } catch (error) {
      console.error('Failed to display model:', error);
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
    if (this.threeViewer) {
      this.threeViewer.setViewMode(mode);
    }
  }

  resetCamera() {
    if (this.threeViewer) {
      this.threeViewer.resetCamera();
    }
  }

  takeScreenshot() {
    if (this.threeViewer) {
      try {
        const dataURL = this.threeViewer.takeScreenshot();
        const link = document.createElement('a');
        link.download = `construction-model-screenshot-${Date.now()}.png`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.uiManager.showSuccess('Screenshot saved successfully!');
      } catch (error) {
        console.error('Screenshot failed:', error);
        this.uiManager.showError('Failed to take screenshot.');
      }
    }
  }

  toggleLOD() {
    if (this.threeViewer) {
      this.threeViewer.toggleLOD();
      const stats = this.threeViewer.getStats();
      this.viewerSettings.lodEnabled = stats.lod.enabled;

      this.uiManager.updateLODButton(stats.lod.enabled);
      this.uiManager.showSuccess(
        `LOD ${stats.lod.enabled ? 'enabled' : 'disabled'}`,
      );
    }
  }

  setLODLevel(level: string | number) {
    if (this.threeViewer) {
      const levelNum = typeof level === 'string' ? parseInt(level) : level;
      this.viewerSettings.lodLevel = levelNum;
      this.threeViewer.setLODLevel(levelNum);

      const qualityNames = ['High', 'Medium', 'Low'];
      this.uiManager.showSuccess(
        `Quality set to ${qualityNames[levelNum] || 'Unknown'}`,
      );
    }
  }

  async downloadModel(url: string, extension: string) {
    try {
      await this.downloadManager.downloadModel(url, extension);
      this.uiManager.showSuccess(
        `${extension.toUpperCase()} file downloaded successfully!`,
      );
    } catch (error) {
      console.error('Download error:', error);
      this.uiManager.showError('Failed to download model. Please try again.');
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
}

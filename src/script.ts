/**
 * Text-to-3D Construction Platform - Main Script
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { validateConfig } from './config';
import { AuthService, User } from './auth';
import { MeshyAPI, GenerationRequest, MeshyTask } from './meshy-api';

class ConstructionApp {
  private currentUser: User | null = null;
  private currentTask: MeshyTask | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    // Validate configuration
    if (!validateConfig()) {
      this.showError('Application configuration is incomplete. Please contact support.');
      return;
    }

    // Check authentication
    this.currentUser = AuthService.getCurrentUser();
    
    if (!this.currentUser) {
      await this.authenticate();
    }

    if (this.currentUser) {
      this.showMainInterface();
    }
  }

  private async authenticate() {
    try {
      this.currentUser = await AuthService.authenticate();
      if (!this.currentUser) {
        this.showError('Authentication failed. Access denied.');
        return;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.showError('Authentication failed. Please try again.');
    }
  }

  private showMainInterface() {
    const container = document.querySelector('.container');
    if (!container) return;

    // Add welcome message
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-section';
    welcomeDiv.innerHTML = `
      <div class="user-info">
        <span>Welcome, ${this.currentUser?.name}</span>
        <button onclick="app.logout()" class="logout-btn">Logout</button>
      </div>
    `;
    
    container.insertBefore(welcomeDiv, container.firstChild);

    // Show the main interface
    document.body.style.display = 'block';
  }

  async generateModel() {
    if (!this.currentUser) {
      await this.authenticate();
      return;
    }

    const promptElement = document.getElementById('prompt') as HTMLTextAreaElement;
    if (!promptElement) return;
    
    const prompt = promptElement.value.trim();
    if (!prompt) {
      this.showError('Please enter a construction description');
      return;
    }

    if (prompt.length > 600) {
      this.showError('Description must be 600 characters or less');
      return;
    }

    this.showLoading('Generating 3D model...');
    this.hideViewer();
    this.hideDownload();

    try {
      const request: GenerationRequest = {
        prompt: prompt,
        artStyle: 'realistic',
        enablePBR: true
      };

      // Generate the model using Meshy API with progress tracking
      this.currentTask = await MeshyAPI.generateModel(request, (stage, progress) => {
        this.updateProgress(stage, progress);
      });
      
      // Display the model
      this.displayModel(this.currentTask);
      
    } catch (error) {
      console.error('Generation error:', error);
      this.showError(`Failed to generate model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.hideLoading();
    }
  }

  private displayModel(task: MeshyTask) {
    if (!task.model_urls?.glb) {
      this.showError('No model generated. Please try again.');
      return;
    }

    // Show 3D model in browser
    const viewer = document.getElementById('viewer') as any;
    if (viewer) {
      viewer.src = task.model_urls.glb;
      viewer.style.display = 'block';
    }

    // Enable download options
    this.showDownloadOptions(task);
  }

  private showDownloadOptions(task: MeshyTask) {
    const downloadSection = document.getElementById('download-section');
    if (!downloadSection || !task.model_urls) return;

    const formats = [
      { key: 'glb', label: 'GLB (Recommended for Unreal Engine 5)', extension: 'glb' },
      { key: 'fbx', label: 'FBX (Traditional Unreal Engine)', extension: 'fbx' },
      { key: 'usdz', label: 'USDZ (Universal Scene Description)', extension: 'usdz' },
      { key: 'obj', label: 'OBJ (Wavefront)', extension: 'obj' }
    ];

    const buttonsHTML = formats
      .filter(format => task.model_urls![format.key as keyof typeof task.model_urls])
      .map(format => `
        <button onclick="app.downloadModel('${task.model_urls![format.key as keyof typeof task.model_urls]}', '${format.extension}')" 
                class="download-btn">
          Download ${format.label}
        </button>
      `).join('');

    downloadSection.innerHTML = `
      <div class="download-options">
        <h3>Download Options</h3>
        ${buttonsHTML}
      </div>
    `;
    
    downloadSection.style.display = 'block';
  }

  async downloadModel(url: string, extension: string) {
    try {
      const filename = `construction-model-${Date.now()}.${extension}`;
      await MeshyAPI.downloadModel(url, filename);
    } catch (error) {
      console.error('Download error:', error);
      this.showError('Failed to download model. Please try again.');
    }
  }

  logout() {
    AuthService.logout();
    location.reload();
  }

  private showLoading(message: string) {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.innerHTML = `
        <div class="loading-content">
          <div class="loading-message">${message}</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
          <div class="progress-text">0%</div>
        </div>
      `;
      loading.style.display = 'block';
    }
  }

  private updateProgress(stage: string, progress: number) {
    const loading = document.getElementById('loading');
    if (loading) {
      const messageEl = loading.querySelector('.loading-message');
      const progressFill = loading.querySelector('.progress-fill') as HTMLElement;
      const progressText = loading.querySelector('.progress-text');
      
      if (messageEl) messageEl.textContent = stage;
      if (progressFill) progressFill.style.width = `${progress}%`;
      if (progressText) progressText.textContent = `${Math.round(progress)}%`;
    }
  }

  private hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  private showError(message: string) {
    alert(message);
    console.error(message);
  }

  private hideViewer() {
    const viewer = document.getElementById('viewer');
    if (viewer) {
      viewer.style.display = 'none';
    }
  }

  private hideDownload() {
    const downloadSection = document.getElementById('download-section');
    if (downloadSection) {
      downloadSection.style.display = 'none';
    }
  }
}

// Initialize the application
const app = new ConstructionApp();

// Make functions available globally
(window as any).app = app;
(window as any).generateModel = () => app.generateModel();

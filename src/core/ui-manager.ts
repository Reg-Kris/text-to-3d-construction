/**
 * Text-to-3D Construction Platform - UI Manager
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import type { MeshyTask } from '../types';
import type { ModelInfo } from '../viewer/google-model-viewer';
import type { ConstructionApp } from './app';
import { DownloadManager } from './download-manager';

export interface QualitySettings {
  quality: 'low' | 'medium' | 'high';
  prioritizeSpeed: boolean;
}

export class UIManager {
  private viewerContainer: HTMLElement | null = null;
  private loadingElement: HTMLElement | null = null;
  private downloadSection: HTMLElement | null = null;
  private progressBar: HTMLElement | null = null;
  private progressText: HTMLElement | null = null;

  constructor() {
    this.setupUI();
  }

  private setupUI() {
    // Initialize UI elements
    this.loadingElement = document.getElementById('loading');
    this.downloadSection = document.getElementById('download-section');
  }

  showError(message: string): void {
    // Create or update error message element
    let errorElement = document.querySelector('.error-message') as HTMLElement;
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      
      const container = document.querySelector('.container');
      if (container) {
        container.insertBefore(errorElement, container.firstChild);
      }
    }
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (errorElement) {
        errorElement.style.display = 'none';
      }
    }, 5000);
  }

  showSuccess(message: string): void {
    // Create or update success message element
    let successElement = document.querySelector('.success-message') as HTMLElement;
    if (!successElement) {
      successElement = document.createElement('div');
      successElement.className = 'success-message';
      
      const container = document.querySelector('.container');
      if (container) {
        container.insertBefore(successElement, container.firstChild);
      }
    }
    
    successElement.textContent = message;
    successElement.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (successElement) {
        successElement.style.display = 'none';
      }
    }, 3000);
  }

  showMainInterface(user: any): void {
    // Create welcome section
    const welcomeSection = document.createElement('div');
    welcomeSection.className = 'welcome-section';
    welcomeSection.innerHTML = `
      <div class="user-info">
        <span>Welcome, ${user.name || 'User'}!</span>
        <button class="logout-btn" onclick="app.logout()">Logout</button>
      </div>
    `;
    
    const container = document.querySelector('.container');
    if (container) {
      container.insertBefore(welcomeSection, container.firstChild);
    }
    
    // Update background color to dark theme
    document.body.style.backgroundColor = '#1a1a1a';
    document.body.style.color = '#ffffff';
    
    // Update container styling
    if (container) {
      (container as HTMLElement).style.backgroundColor = '#2a2a2a';
      (container as HTMLElement).style.borderRadius = '8px';
      (container as HTMLElement).style.padding = '30px';
      (container as HTMLElement).style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    }
  }

  createOrGetViewerContainer(): HTMLElement {
    if (!this.viewerContainer) {
      this.viewerContainer = document.createElement('div');
      this.viewerContainer.id = 'viewer-container';
      this.viewerContainer.style.width = '100%';
      this.viewerContainer.style.height = '500px';
      this.viewerContainer.style.marginTop = '20px';
      this.viewerContainer.style.borderRadius = '8px';
      this.viewerContainer.style.overflow = 'hidden';
      this.viewerContainer.style.backgroundColor = '#2a2a2a';
      this.viewerContainer.style.display = 'none';
      
      const outputSection = document.querySelector('.output-section');
      if (outputSection) {
        outputSection.insertBefore(this.viewerContainer, outputSection.firstChild);
      }
    }
    
    return this.viewerContainer;
  }

  getPrompt(): string {
    const promptElement = document.getElementById('prompt') as HTMLTextAreaElement;
    return promptElement ? promptElement.value.trim() : '';
  }

  getQualitySettings(): QualitySettings {
    // For now, return default settings
    // These would be configurable in a future UI
    return {
      quality: 'high',
      prioritizeSpeed: false,
    };
  }

  showLoading(message: string): void {
    if (this.loadingElement) {
      this.loadingElement.style.display = 'block';
      
      // Create enhanced loading content
      this.loadingElement.innerHTML = `
        <div class="loading-content">
          <div class="loading-message">${message}</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
          <div class="progress-text">0%</div>
        </div>
      `;
      
      // Cache progress elements
      this.progressBar = this.loadingElement.querySelector('.progress-fill');
      this.progressText = this.loadingElement.querySelector('.progress-text');
    }
  }

  hideLoading(): void {
    if (this.loadingElement) {
      this.loadingElement.style.display = 'none';
    }
  }

  updateProgress(stage: string, progress: number): void {
    if (this.loadingElement) {
      const messageElement = this.loadingElement.querySelector('.loading-message');
      if (messageElement) {
        messageElement.textContent = stage;
      }
      
      if (this.progressBar) {
        this.progressBar.style.width = `${progress}%`;
      }
      
      if (this.progressText) {
        this.progressText.textContent = `${Math.round(progress)}%`;
      }
    }
  }

  showViewer(): void {
    if (this.viewerContainer) {
      this.viewerContainer.style.display = 'block';
    }
  }

  hideViewer(): void {
    if (this.viewerContainer) {
      this.viewerContainer.style.display = 'none';
    }
  }

  addViewerControls(_app: ConstructionApp): void {
    if (!this.viewerContainer) return;
    
    // Remove existing controls
    const existingControls = this.viewerContainer.querySelector('.viewer-controls');
    if (existingControls) {
      existingControls.remove();
    }
    
    // Create new controls
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'viewer-controls';
    controlsDiv.innerHTML = `
      <div class="control-group">
        <button class="viewer-btn" onclick="app.resetCamera()">Reset Camera</button>
        <button class="viewer-btn" onclick="app.takeScreenshot()">Screenshot</button>
        <button class="viewer-btn" onclick="app.toggleAutoRotate()">Toggle Rotation</button>
      </div>
      <div class="control-group">
        <label for="exposure-slider">Exposure:</label>
        <input type="range" id="exposure-slider" min="0" max="2" step="0.1" value="1" 
               onchange="app.setExposure(this.value)">
      </div>
      <div class="control-group">
        <label for="shadow-slider">Shadow:</label>
        <input type="range" id="shadow-slider" min="0" max="1" step="0.1" value="0.5" 
               onchange="app.setShadowIntensity(this.value)">
      </div>
    `;
    
    this.viewerContainer.appendChild(controlsDiv);
  }

  showModelInfo(modelInfo: ModelInfo): void {
    // Create model info section
    let modelInfoSection = document.querySelector('.model-info');
    if (!modelInfoSection) {
      modelInfoSection = document.createElement('div');
      modelInfoSection.className = 'model-info';
      
      const outputSection = document.querySelector('.output-section');
      if (outputSection) {
        outputSection.appendChild(modelInfoSection);
      }
    }
    
    modelInfoSection.innerHTML = `
      <div class="model-stats">
        <h4>Model Information</h4>
        <div class="stats-grid">
          <div class="stat">
            <label>Supported Formats</label>
            <span>${modelInfo.formats.join(', ')}</span>
          </div>
          <div class="stat">
            <label>Status</label>
            <span style="color: #4CAF50;">Ready</span>
          </div>
        </div>
      </div>
    `;
  }

  showDownloadOptions(task: MeshyTask, app: ConstructionApp): void {
    if (!this.downloadSection) return;
    
    this.downloadSection.style.display = 'block';
    
    const formats = task.model_urls || {};
    const availableFormats = Object.keys(formats);
    
    let downloadHTML = `
      <div class="download-options">
        <h3>Download 3D Model</h3>
        <div class="download-categories">
          <div class="download-category">
            <h4>🎮 Game Engines</h4>
            <div class="engine-downloads">
              ${this.renderEngineDownloads(formats, 'unreal', 'Unreal Engine', app)}
              ${this.renderEngineDownloads(formats, 'unity', 'Unity', app)}
            </div>
          </div>
          
          <div class="download-category">
            <h4>🎨 3D Software</h4>
            <div class="software-downloads">
              ${this.renderEngineDownloads(formats, 'blender', 'Blender', app)}
              ${this.renderGeneralDownloads(formats, ['obj'], '3D Software (OBJ)', app)}
            </div>
          </div>
          
          <div class="download-category">
            <h4>🌐 Web & AR</h4>
            <div class="web-downloads">
              ${this.renderGeneralDownloads(formats, ['glb'], 'Web/Three.js', app)}
              ${this.renderGeneralDownloads(formats, ['usdz'], 'iOS AR', app)}
            </div>
          </div>
          
          <div class="download-category">
            <h4>🖨️ 3D Printing</h4>
            <div class="printing-downloads">
              ${this.renderGeneralDownloads(formats, ['stl'], '3D Printing', app)}
            </div>
          </div>
        </div>
        
        <div class="download-all-section">
          <h4>📦 Download All Available Formats</h4>
          <button class="download-btn download-all-btn" onclick="app.downloadAllFormats()">
            Download All (${availableFormats.length} formats)
          </button>
        </div>
      </div>
    `;
    
    this.downloadSection.innerHTML = downloadHTML;
  }

  private renderEngineDownloads(formats: Record<string, string>, engine: string, displayName: string, _app: ConstructionApp): string {
    const supportedFormats = DownloadManager.getFormatsForEngine(engine);
    const availableFormats = supportedFormats.filter(format => formats[format]);
    
    if (availableFormats.length === 0) {
      return `
        <div class="engine-download-item unavailable">
          <div class="engine-name">${displayName}</div>
          <div class="engine-status">No compatible formats available</div>
        </div>
      `;
    }

    const bestFormat = this.getBestFormatForEngine(availableFormats, engine);
    const formatInfo = DownloadManager.getFormatInfo(bestFormat);
    
    return `
      <div class="engine-download-item">
        <div class="engine-info">
          <div class="engine-name">${displayName}</div>
          <div class="engine-format">Best: ${formatInfo?.name} - ${formatInfo?.description}</div>
          <div class="engine-formats">Available: ${availableFormats.map(f => DownloadManager.getFormatInfo(f)?.name).join(', ')}</div>
        </div>
        <div class="engine-actions">
          <button class="download-btn engine-btn" onclick="app.downloadForEngine('${engine}')">
            Download for ${displayName}
          </button>
        </div>
      </div>
    `;
  }

  private renderGeneralDownloads(formats: Record<string, string>, targetFormats: string[], displayName: string, _app: ConstructionApp): string {
    const availableFormats = targetFormats.filter(format => formats[format]);
    
    if (availableFormats.length === 0) {
      return `
        <div class="general-download-item unavailable">
          <div class="format-name">${displayName}</div>
          <div class="format-status">Not available</div>
        </div>
      `;
    }

    const format = availableFormats[0];
    const formatInfo = DownloadManager.getFormatInfo(format);
    const url = formats[format];
    
    return `
      <div class="general-download-item">
        <div class="format-info">
          <div class="format-name">${displayName}</div>
          <div class="format-desc">${formatInfo?.description}</div>
          <div class="format-use-case">${formatInfo?.useCase}</div>
        </div>
        <div class="format-actions">
          <button class="download-btn format-btn" onclick="app.downloadModel('${url}', '${format}')">
            Download ${formatInfo?.name}
          </button>
        </div>
      </div>
    `;
  }

  private getBestFormatForEngine(availableFormats: string[], engine: string): string {
    const priorities = {
      unreal: ['fbx', 'obj', 'glb'],
      unity: ['fbx', 'obj', 'glb'],
      blender: ['blend', 'fbx', 'obj', 'glb']
    };

    const enginePriorities = priorities[engine as keyof typeof priorities] || ['fbx', 'obj', 'glb'];
    
    for (const format of enginePriorities) {
      if (availableFormats.includes(format)) {
        return format;
      }
    }

    return availableFormats[0]; // Fallback to first available
  }

  hideDownload(): void {
    if (this.downloadSection) {
      this.downloadSection.style.display = 'none';
    }
  }

  updateLODButton(_enabled: boolean): void {
    // For model-viewer, we don't have LOD controls
    // This method is kept for compatibility
  }
}
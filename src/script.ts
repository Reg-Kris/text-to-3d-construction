/**
 * Text-to-3D Construction Platform - Main Script
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { validateConfig } from './config';
import { AuthService, User } from './auth';
import { MeshyAPI, GenerationRequest, MeshyTask } from './meshy-api';
import { AirtableService, ProjectRecord } from './airtable-service';
import { DeviceUtils } from './device-utils';
import { ThreeViewer, ModelInfo } from './three-viewer';

class ConstructionApp {
  private currentUser: User | null = null;
  private currentTask: MeshyTask | null = null;
  private currentProject: ProjectRecord | null = null;
  private generationStartTime: number = 0;
  private threeViewer: ThreeViewer | null = null;

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

    // Get device info and warnings
    const deviceInfo = DeviceUtils.getDeviceInfo();
    const warnings = DeviceUtils.getPerformanceWarnings();

    // Add welcome message with device optimization info
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-section';
    welcomeDiv.innerHTML = `
      <div class="user-info">
        <span>Welcome, ${this.currentUser?.name}</span>
        <button onclick="app.logout()" class="logout-btn">Logout</button>
      </div>
      <div class="device-info">
        <small>Device: ${deviceInfo.type} | Max polygons: ${deviceInfo.maxPolyCount.toLocaleString()} | File limit: ${deviceInfo.maxFileSizeMB}MB</small>
        ${warnings.length > 0 ? `<div class="warnings">${warnings.map(w => `<div class="warning">⚠️ ${w}</div>`).join('')}</div>` : ''}
      </div>
    `;
    
    container.insertBefore(welcomeDiv, container.firstChild);

    // Add quality settings if supported
    if (DeviceUtils.shouldShowQualityOptions()) {
      this.addQualitySettings();
    }

    // Initialize Three.js viewer
    this.initThreeViewer();

    // Show the main interface
    document.body.style.display = 'block';
  }

  private addQualitySettings() {
    const inputSection = document.querySelector('.input-section');
    if (!inputSection) return;

    const qualityDiv = document.createElement('div');
    qualityDiv.className = 'quality-settings';
    qualityDiv.innerHTML = `
      <div class="settings-row">
        <label for="quality-select">Quality:</label>
        <select id="quality-select">
          <option value="medium" selected>Balanced (Recommended)</option>
          <option value="low">Fast (Lower Quality)</option>
          <option value="high">High Quality (Slower)</option>
        </select>
      </div>
      <div class="settings-row">
        <label>
          <input type="checkbox" id="prioritize-speed"> Prioritize Speed
        </label>
      </div>
    `;
    
    inputSection.appendChild(qualityDiv);
  }

  private initThreeViewer() {
    const viewerContainer = document.getElementById('viewer-container');
    if (!viewerContainer) {
      // Create viewer container if it doesn't exist
      const outputSection = document.querySelector('.output-section');
      if (outputSection) {
        const container = document.createElement('div');
        container.id = 'viewer-container';
        container.style.width = '100%';
        container.style.height = '400px';
        container.style.display = 'none';
        container.style.border = '1px solid #ddd';
        container.style.borderRadius = '5px';
        container.style.marginBottom = '20px';
        
        // Insert before download section
        const downloadSection = document.getElementById('download-section');
        if (downloadSection) {
          outputSection.insertBefore(container, downloadSection);
        } else {
          outputSection.appendChild(container);
        }
      }
    }

    if (viewerContainer) {
      try {
        this.threeViewer = new ThreeViewer({
          container: viewerContainer as HTMLElement,
          enableShadows: !DeviceUtils.getDeviceInfo().isMobile,
          backgroundColor: 0xf5f5f5
        });
      } catch (error) {
        console.error('Failed to initialize Three.js viewer:', error);
        this.showError('Failed to initialize 3D viewer. Your browser may not support WebGL.');
      }
    }
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

    // Get quality settings
    const qualitySelect = document.getElementById('quality-select') as HTMLSelectElement;
    const prioritizeSpeedCheckbox = document.getElementById('prioritize-speed') as HTMLInputElement;
    
    const quality = qualitySelect?.value as 'low' | 'medium' | 'high' || 'medium';
    const prioritizeSpeed = prioritizeSpeedCheckbox?.checked || false;

    // Get optimized settings based on device and user preferences
    const deviceSettings = DeviceUtils.getOptimizedSettings({ quality, prioritizeSpeed });
    const deviceInfo = DeviceUtils.getDeviceInfo();

    this.showLoading('Initializing generation...');
    this.hideViewer();
    this.hideDownload();
    this.generationStartTime = Date.now();

    try {
      // Create project record in Airtable
      this.currentProject = await AirtableService.createProject({
        user_email: this.currentUser.email,
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

      // Generate the model using Meshy API with progress tracking
      this.currentTask = await MeshyAPI.generateModel(request, (stage, progress) => {
        this.updateProgress(stage, progress);
      });
      
      // Update project with completion data
      const generationTime = Math.round((Date.now() - this.generationStartTime) / 1000);
      if (this.currentProject) {
        await AirtableService.updateProject(this.currentProject.id!, {
          status: 'completed',
          model_urls: this.currentTask.model_urls,
          generation_time_seconds: generationTime,
          thumbnail_url: this.currentTask.thumbnail_url
        });
      }
      
      // Display the model
      this.displayModel(this.currentTask);
      
    } catch (error) {
      console.error('Generation error:', error);
      
      // Update project with failure status
      if (this.currentProject) {
        await AirtableService.updateProject(this.currentProject.id!, {
          status: 'failed'
        }).catch(console.error);
      }
      
      this.showError(`Failed to generate model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.hideLoading();
    }
  }

  private async displayModel(task: MeshyTask) {
    if (!task.model_urls?.glb) {
      this.showError('No model generated. Please try again.');
      return;
    }

    if (!this.threeViewer) {
      this.showError('3D viewer not initialized. Please refresh the page.');
      return;
    }

    try {
      this.showLoading('Loading 3D model...');
      
      // Load model with progress tracking
      const modelInfo = await this.threeViewer.loadModel(
        task.model_urls.glb, 
        'glb', 
        (progress) => {
          this.updateProgress('Loading model...', progress);
        }
      );

      // Show viewer container
      const viewerContainer = document.getElementById('viewer-container');
      if (viewerContainer) {
        viewerContainer.style.display = 'block';
        this.addViewerControls(viewerContainer);
      }

      // Add model info to the UI
      this.showModelInfo(modelInfo);

      // Enable download options
      this.showDownloadOptions(task);
      
    } catch (error) {
      console.error('Failed to display model:', error);
      this.showError('Failed to load 3D model. Please try downloading the file directly.');
    } finally {
      this.hideLoading();
    }
  }

  private addViewerControls(container: HTMLElement) {
    // Remove existing controls if any
    const existingControls = container.querySelector('.viewer-controls');
    if (existingControls) {
      existingControls.remove();
    }

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'viewer-controls';
    controlsDiv.innerHTML = `
      <button class="viewer-btn" onclick="app.setViewMode('perspective')">3D</button>
      <button class="viewer-btn" onclick="app.setViewMode('top')">Top</button>
      <button class="viewer-btn" onclick="app.setViewMode('front')">Front</button>
      <button class="viewer-btn" onclick="app.setViewMode('side')">Side</button>
      <button class="viewer-btn" onclick="app.resetCamera()">Reset</button>
      <button class="viewer-btn" onclick="app.takeScreenshot()">📷</button>
    `;
    
    container.appendChild(controlsDiv);
  }

  // Public methods for viewer controls
  setViewMode(mode: 'perspective' | 'top' | 'front' | 'side') {
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
        
        this.showSuccess('Screenshot saved successfully!');
      } catch (error) {
        console.error('Screenshot failed:', error);
        this.showError('Failed to take screenshot.');
      }
    }
  }

  private showModelInfo(info: ModelInfo) {
    const deviceInfo = DeviceUtils.getDeviceInfo();
    const isHighPoly = info.triangles > deviceInfo.maxPolyCount;
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'model-info';
    infoDiv.innerHTML = `
      <div class="model-stats">
        <h4>Model Information</h4>
        <div class="stats-grid">
          <div class="stat">
            <label>Triangles:</label>
            <span class="${isHighPoly ? 'warning' : ''}">${info.triangles.toLocaleString()}</span>
          </div>
          <div class="stat">
            <label>Vertices:</label>
            <span>${info.vertices.toLocaleString()}</span>
          </div>
          <div class="stat">
            <label>Memory:</label>
            <span>${info.memoryUsage}MB</span>
          </div>
        </div>
        ${isHighPoly ? '<div class="warning">⚠️ High polygon count may affect performance on this device</div>' : ''}
      </div>
    `;

    // Insert after viewer container
    const viewerContainer = document.getElementById('viewer-container');
    if (viewerContainer && viewerContainer.parentNode) {
      viewerContainer.parentNode.insertBefore(infoDiv, viewerContainer.nextSibling);
    }
  }

  private showDownloadOptions(task: MeshyTask) {
    const downloadSection = document.getElementById('download-section');
    if (!downloadSection || !task.model_urls) return;

    const deviceInfo = DeviceUtils.getDeviceInfo();
    const recommendedFormat = DeviceUtils.getRecommendedFormat();

    const formats = [
      { key: 'glb', label: 'GLB (Recommended for Unreal Engine 5)', extension: 'glb', size: 'Unknown' },
      { key: 'fbx', label: 'FBX (Traditional Unreal Engine)', extension: 'fbx', size: 'Unknown' },
      { key: 'usdz', label: 'USDZ (Universal Scene Description)', extension: 'usdz', size: 'Unknown' },
      { key: 'obj', label: 'OBJ (Wavefront)', extension: 'obj', size: 'Unknown' }
    ];

    const availableFormats = formats.filter(format => {
      const hasUrl = task.model_urls![format.key as keyof typeof task.model_urls];
      const isSupported = deviceInfo.recommendedFormats.includes(format.key);
      return hasUrl && (deviceInfo.isDesktop || isSupported);
    });

    const buttonsHTML = availableFormats
      .map(format => {
        const isRecommended = format.key === recommendedFormat;
        const estimatedTime = DeviceUtils.estimateLoadTime(deviceInfo.maxFileSizeMB * 0.7); // Rough estimate
        
        return `
          <div class="download-option">
            <button onclick="app.downloadModel('${task.model_urls![format.key as keyof typeof task.model_urls]}', '${format.extension}')" 
                    class="download-btn ${isRecommended ? 'recommended' : ''}">
              ${isRecommended ? '⭐ ' : ''}Download ${format.label}
            </button>
            <div class="download-info">
              <small>Est. download time: ${estimatedTime}</small>
              ${isRecommended ? '<span class="badge">Recommended</span>' : ''}
            </div>
          </div>
        `;
      }).join('');

    downloadSection.innerHTML = `
      <div class="download-options">
        <h3>Download Options</h3>
        <div class="device-notice">
          <small>Optimized for ${deviceInfo.type} devices (${deviceInfo.maxFileSizeMB}MB limit)</small>
        </div>
        ${buttonsHTML}
      </div>
    `;
    
    downloadSection.style.display = 'block';
  }

  async downloadModel(url: string, extension: string) {
    try {
      const filename = `construction-model-${Date.now()}.${extension}`;
      
      // Record download in Airtable
      if (this.currentProject && this.currentUser) {
        const deviceInfo = DeviceUtils.getDeviceInfo();
        await AirtableService.recordDownload({
          project_id: this.currentProject.id!,
          user_email: this.currentUser.email,
          format: extension,
          device_type: deviceInfo.type
        });
      }
      
      await MeshyAPI.downloadModel(url, filename);
      
      // Show success message
      this.showSuccess(`${extension.toUpperCase()} file downloaded successfully!`);
      
    } catch (error) {
      console.error('Download error:', error);
      this.showError('Failed to download model. Please try again.');
    }
  }

  private showSuccess(message: string) {
    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
      container.appendChild(successDiv);
      
      // Remove after 3 seconds
      setTimeout(() => {
        successDiv.remove();
      }, 3000);
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
    const viewerContainer = document.getElementById('viewer-container');
    if (viewerContainer) {
      viewerContainer.style.display = 'none';
    }
    
    // Remove model info if it exists
    const modelInfo = document.querySelector('.model-info');
    if (modelInfo) {
      modelInfo.remove();
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

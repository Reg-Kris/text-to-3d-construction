/**
 * Text-to-3D Construction Platform - UI Manager
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { DeviceUtils } from '../device-utils';
import { User, ModelInfo, MeshyTask, QualitySettings } from '../types';

export class UIManager {
  showMainInterface(user: User) {
    const container = document.querySelector('.container');
    if (!container) return;

    const deviceInfo = DeviceUtils.getDeviceInfo();
    const warnings = DeviceUtils.getPerformanceWarnings();

    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-section';
    welcomeDiv.innerHTML = `
      <div class="user-info">
        <span>Welcome, ${user.name}</span>
        <button onclick="app.logout()" class="logout-btn">Logout</button>
      </div>
      <div class="device-info">
        <small>Device: ${deviceInfo.type} | Max polygons: ${deviceInfo.maxPolyCount.toLocaleString()} | File limit: ${deviceInfo.maxFileSizeMB}MB</small>
        ${warnings.length > 0 ? `<div class="warnings">${warnings.map(w => `<div class="warning">⚠️ ${w}</div>`).join('')}</div>` : ''}
      </div>
    `;
    
    container.insertBefore(welcomeDiv, container.firstChild);

    if (DeviceUtils.shouldShowQualityOptions()) {
      this.addQualitySettings();
    }
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

  createOrGetViewerContainer(): HTMLElement | null {
    let viewerContainer = document.getElementById('viewer-container');
    
    if (!viewerContainer) {
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
        
        const downloadSection = document.getElementById('download-section');
        if (downloadSection) {
          outputSection.insertBefore(container, downloadSection);
        } else {
          outputSection.appendChild(container);
        }
        
        viewerContainer = container;
      }
    }

    return viewerContainer;
  }

  showViewer() {
    const viewerContainer = document.getElementById('viewer-container');
    if (viewerContainer) {
      viewerContainer.style.display = 'block';
    }
  }

  hideViewer() {
    const viewerContainer = document.getElementById('viewer-container');
    if (viewerContainer) {
      viewerContainer.style.display = 'none';
    }
    
    const modelInfo = document.querySelector('.model-info');
    if (modelInfo) {
      modelInfo.remove();
    }
  }

  addViewerControls(app: any) {
    const viewerContainer = document.getElementById('viewer-container');
    if (!viewerContainer) return;

    const existingControls = viewerContainer.querySelector('.viewer-controls');
    if (existingControls) {
      existingControls.remove();
    }

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'viewer-controls';
    controlsDiv.innerHTML = `
      <div class="control-group">
        <button class="viewer-btn" onclick="app.setViewMode('perspective')">3D</button>
        <button class="viewer-btn" onclick="app.setViewMode('top')">Top</button>
        <button class="viewer-btn" onclick="app.setViewMode('front')">Front</button>
        <button class="viewer-btn" onclick="app.setViewMode('side')">Side</button>
        <button class="viewer-btn" onclick="app.resetCamera()">Reset</button>
        <button class="viewer-btn" onclick="app.takeScreenshot()">📷</button>
      </div>
      ${DeviceUtils.getDeviceInfo().isMobile || DeviceUtils.getDeviceInfo().isTablet ? `
        <div class="control-group">
          <button class="viewer-btn" onclick="app.toggleLOD()" id="lod-toggle">LOD: ON</button>
          <select class="viewer-select" onchange="app.setLODLevel(this.value)" id="lod-level">
            <option value="0">High Quality</option>
            <option value="1">Medium Quality</option>
            <option value="2">Low Quality</option>
          </select>
        </div>
      ` : ''}
    `;
    
    viewerContainer.appendChild(controlsDiv);
  }

  showModelInfo(info: ModelInfo) {
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

    const viewerContainer = document.getElementById('viewer-container');
    if (viewerContainer && viewerContainer.parentNode) {
      viewerContainer.parentNode.insertBefore(infoDiv, viewerContainer.nextSibling);
    }
  }

  showDownloadOptions(task: MeshyTask, app: any) {
    const downloadSection = document.getElementById('download-section');
    if (!downloadSection || !task.model_urls) return;

    const deviceInfo = DeviceUtils.getDeviceInfo();
    const recommendedFormat = DeviceUtils.getRecommendedFormat();

    const formats = [
      { key: 'glb', label: 'GLB (Recommended for Unreal Engine 5)', extension: 'glb' },
      { key: 'fbx', label: 'FBX (Traditional Unreal Engine)', extension: 'fbx' },
      { key: 'usdz', label: 'USDZ (Universal Scene Description)', extension: 'usdz' },
      { key: 'obj', label: 'OBJ (Wavefront)', extension: 'obj' }
    ];

    const availableFormats = formats.filter(format => {
      const hasUrl = task.model_urls![format.key as keyof typeof task.model_urls];
      const isSupported = deviceInfo.recommendedFormats.includes(format.key);
      return hasUrl && (deviceInfo.isDesktop || isSupported);
    });

    const buttonsHTML = availableFormats
      .map(format => {
        const isRecommended = format.key === recommendedFormat;
        const estimatedTime = DeviceUtils.estimateLoadTime(deviceInfo.maxFileSizeMB * 0.7);
        
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

  hideDownload() {
    const downloadSection = document.getElementById('download-section');
    if (downloadSection) {
      downloadSection.style.display = 'none';
    }
  }

  getPrompt(): string {
    const promptElement = document.getElementById('prompt') as HTMLTextAreaElement;
    return promptElement?.value.trim() || '';
  }

  getQualitySettings(): QualitySettings {
    const qualitySelect = document.getElementById('quality-select') as HTMLSelectElement;
    const prioritizeSpeedCheckbox = document.getElementById('prioritize-speed') as HTMLInputElement;
    
    return {
      quality: (qualitySelect?.value as 'low' | 'medium' | 'high') || 'medium',
      prioritizeSpeed: prioritizeSpeedCheckbox?.checked || false
    };
  }

  showLoading(message: string) {
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

  updateProgress(stage: string, progress: number) {
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

  hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  showError(message: string) {
    alert(message);
    console.error(message);
  }

  showSuccess(message: string) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
      container.appendChild(successDiv);
      
      setTimeout(() => {
        successDiv.remove();
      }, 3000);
    }
  }

  updateLODButton(enabled: boolean) {
    const toggleBtn = document.getElementById('lod-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = `LOD: ${enabled ? 'ON' : 'OFF'}`;
    }
  }
}
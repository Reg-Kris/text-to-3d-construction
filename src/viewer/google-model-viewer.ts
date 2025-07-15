/**
 * Text-to-3D Construction Platform - Google Model Viewer Component
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import '@google/model-viewer';
import { logger } from '../utils/logger';

export interface ModelViewerConfig {
  container: HTMLElement;
  width?: number;
  height?: number;
  backgroundColor?: string;
  autoRotate?: boolean;
  cameraControls?: boolean;
  environmentImage?: string;
}

export interface ModelInfo {
  triangles: number;
  vertices: number;
  textures: number;
  memoryUsage: number;
  formats: string[];
}

export class GoogleModelViewer {
  private modelViewer: any; // model-viewer element
  private container: HTMLElement;
  private currentModelUrl: string | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private isDestroyed = false;
  // private loadingPromise: Promise<void> | null = null;

  constructor(config: ModelViewerConfig) {
    this.container = config.container;
    this.initModelViewer(config);
  }

  private initModelViewer(config: ModelViewerConfig): void {
    // Create model-viewer element
    this.modelViewer = document.createElement('model-viewer');
    
    // Set dimensions
    const width = config.width || this.container.clientWidth;
    const height = config.height || this.container.clientHeight;
    
    this.modelViewer.style.width = `${width}px`;
    this.modelViewer.style.height = `${height}px`;
    this.modelViewer.style.backgroundColor = config.backgroundColor || '#f5f5f5';
    
    // Configure model-viewer attributes
    this.modelViewer.setAttribute('camera-controls', '');
    this.modelViewer.setAttribute('touch-action', 'pan-y');
    
    if (config.autoRotate) {
      this.modelViewer.setAttribute('auto-rotate', '');
    }
    
    if (config.environmentImage) {
      this.modelViewer.setAttribute('environment-image', config.environmentImage);
    }
    
    // Add loading and error handling
    this.setupEventListeners();
    
    // Add to container
    this.container.appendChild(this.modelViewer);
    
    // Set up resize observer for responsive behavior
    this.setupResizeObserver();
    
    logger.info('Google Model Viewer initialized', 'GoogleModelViewer');
  }

  private setupEventListeners(): void {
    // Loading events
    this.modelViewer.addEventListener('load', () => {
      logger.info('Model loaded successfully', 'GoogleModelViewer');
      this.onModelLoaded();
    });

    this.modelViewer.addEventListener('error', (event: any) => {
      logger.error('Model loading failed', 'GoogleModelViewer', event.detail);
      this.onModelError(event.detail);
    });

    // Progress events
    this.modelViewer.addEventListener('progress', (event: any) => {
      const progress = (event.detail.totalProgress * 100).toFixed(0);
      logger.info(`Model loading progress: ${progress}%`, 'GoogleModelViewer');
      this.onLoadingProgress(event.detail.totalProgress);
    });

    // Model change events
    this.modelViewer.addEventListener('model-visibility', (event: any) => {
      logger.info('Model visibility changed', 'GoogleModelViewer', event.detail);
    });

    // Camera change events
    this.modelViewer.addEventListener('camera-change', (event: any) => {
      logger.debug('Camera changed', 'GoogleModelViewer', event.detail);
    });

    // Animation events
    this.modelViewer.addEventListener('animation-finished', (event: any) => {
      logger.info('Animation finished', 'GoogleModelViewer', event.detail);
    });

    // AR events
    this.modelViewer.addEventListener('ar-status', (event: any) => {
      logger.info('AR status changed', 'GoogleModelViewer', event.detail);
    });

    // Environment events
    this.modelViewer.addEventListener('environment-change', (event: any) => {
      logger.info('Environment changed', 'GoogleModelViewer', event.detail);
    });

    // Interaction events
    this.modelViewer.addEventListener('interaction-prompt', (event: any) => {
      logger.info('Interaction prompt shown', 'GoogleModelViewer', event.detail);
    });
  }

  private onModelLoaded(): void {
    // Enable additional features after model loads
    this.modelViewer.setAttribute('shadow-intensity', '0.5');
    this.modelViewer.setAttribute('shadow-softness', '0.75');
    
    // Set up interaction prompts
    this.setInteractionPrompt('Use mouse/touch to rotate and zoom');
    
    // Auto-optimize based on model complexity
    this.optimizeViewerSettings();
  }

  private onModelError(error: any): void {
    // Handle different types of errors
    const errorType = error.type || 'unknown';
    const errorMessage = error.message || 'Model loading failed';
    
    switch (errorType) {
      case 'fetch':
        logger.error('Failed to fetch model file', 'GoogleModelViewer', error);
        break;
      case 'parse':
        logger.error('Failed to parse model file', 'GoogleModelViewer', error);
        break;
      case 'webgl':
        logger.error('WebGL error occurred', 'GoogleModelViewer', error);
        break;
      default:
        logger.error('Unknown model error', 'GoogleModelViewer', error);
    }
    
    // Show user-friendly error message
    this.showErrorMessage(errorMessage);
  }

  private onLoadingProgress(progress: number): void {
    // Update loading progress if needed
    this.setLoadingProgress(progress);
  }

  private optimizeViewerSettings(): void {
    // Auto-optimize based on device capabilities
    const deviceInfo = this.getDeviceInfo();
    
    if (deviceInfo.isMobile) {
      // Mobile optimizations
      this.modelViewer.setAttribute('shadow-intensity', '0.2');
      this.modelViewer.setAttribute('exposure', '0.8');
    } else {
      // Desktop optimizations
      this.modelViewer.setAttribute('shadow-intensity', '0.5');
      this.modelViewer.setAttribute('exposure', '1.0');
    }
    
    // Enable AR if supported
    if (this.isARSupported()) {
      this.enableAR();
    }
  }

  private showErrorMessage(message: string): void {
    // Create error overlay
    const errorOverlay = document.createElement('div');
    errorOverlay.className = 'model-viewer-error';
    errorOverlay.innerHTML = `
      <div class="error-content">
        <h3>Failed to load 3D model</h3>
        <p>${message}</p>
        <button onclick="this.parentElement.parentElement.remove()">Close</button>
      </div>
    `;
    
    this.container.appendChild(errorOverlay);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (this.container.contains(errorOverlay)) {
        this.container.removeChild(errorOverlay);
      }
    }, 10000);
  }

  private getDeviceInfo(): any {
    return {
      isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
      isTablet: /iPad|Android.*tablet/i.test(navigator.userAgent),
      hasWebGL: !!window.WebGLRenderingContext,
    };
  }

  private isARSupported(): boolean {
    return 'xr' in navigator || 'getVRDisplays' in navigator;
  }

  async loadModel(
    url: string,
    onProgress?: (progress: number) => void,
  ): Promise<ModelInfo> {
    return new Promise((resolve, reject) => {
      this.currentModelUrl = url;
      
      // Set up progress tracking
      if (onProgress) {
        const progressHandler = (event: any) => {
          const progress = event.detail.totalProgress * 100;
          onProgress(progress);
        };
        this.modelViewer.addEventListener('progress', progressHandler);
      }

      // Set up success handler
      const loadHandler = () => {
        this.modelViewer.removeEventListener('load', loadHandler);
        
        // Get model information
        const modelInfo = this.getModelInfo();
        resolve(modelInfo);
      };

      // Set up error handler
      const errorHandler = (event: any) => {
        this.modelViewer.removeEventListener('error', errorHandler);
        this.modelViewer.removeEventListener('load', loadHandler);
        
        const error = new Error(`Failed to load model: ${event.detail?.type || 'Unknown error'}`);
        logger.error('Model loading failed', 'GoogleModelViewer', error);
        reject(error);
      };

      this.modelViewer.addEventListener('load', loadHandler);
      this.modelViewer.addEventListener('error', errorHandler);

      // Set the model source
      this.modelViewer.setAttribute('src', url);
      
      logger.info('Loading model', 'GoogleModelViewer', { url });
    });
  }

  private getModelInfo(): ModelInfo {
    // Note: model-viewer doesn't expose detailed mesh information
    // We'll estimate based on the loaded model
    return {
      triangles: 0, // Not directly available
      vertices: 0, // Not directly available
      textures: 0, // Not directly available
      memoryUsage: 0, // Not directly available
      formats: this.getSupportedFormats(),
    };
  }

  private getSupportedFormats(): string[] {
    return ['glb', 'gltf', 'obj', 'fbx']; // Formats supported by model-viewer
  }

  // Camera controls
  resetCamera(): void {
    this.modelViewer.resetTurntableRotation();
    this.modelViewer.jumpCameraToGoal();
  }

  setViewMode(mode: 'perspective' | 'top' | 'front' | 'side'): void {
    // model-viewer doesn't have direct orthographic support
    // We can simulate by adjusting camera position
    switch (mode) {
      case 'top':
        this.modelViewer.setAttribute('camera-orbit', '0deg 90deg 5m');
        break;
      case 'front':
        this.modelViewer.setAttribute('camera-orbit', '0deg 0deg 5m');
        break;
      case 'side':
        this.modelViewer.setAttribute('camera-orbit', '90deg 0deg 5m');
        break;
      default:
        this.modelViewer.setAttribute('camera-orbit', '45deg 55deg 5m');
    }
    logger.info('View mode changed', 'GoogleModelViewer', { mode });
  }

  // Screenshot functionality
  takeScreenshot(_width = 1920, _height = 1080): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // model-viewer has toDataURL method
        const dataURL = this.modelViewer.toDataURL('image/png', 1.0);
        resolve(dataURL);
      } catch (error) {
        logger.error('Screenshot failed', 'GoogleModelViewer', error);
        reject(error);
      }
    });
  }

  // Auto-rotate controls
  setAutoRotate(enabled: boolean): void {
    if (enabled) {
      this.modelViewer.setAttribute('auto-rotate', '');
    } else {
      this.modelViewer.removeAttribute('auto-rotate');
    }
  }

  private setupResizeObserver(): void {
    if (!ResizeObserver) {
      return; // ResizeObserver not supported
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (this.isDestroyed) return;
      
      // Update model viewer size
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      
      this.modelViewer.style.width = `${width}px`;
      this.modelViewer.style.height = `${height}px`;
    });

    this.resizeObserver.observe(this.container);
  }

  // Memory management and cleanup
  destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove event listeners by cloning the element
    if (this.modelViewer && this.modelViewer.parentNode) {
      const newModelViewer = this.modelViewer.cloneNode(false);
      this.modelViewer.parentNode.replaceChild(newModelViewer, this.modelViewer);
    }

    // Clear model URL to release memory
    this.currentModelUrl = null;

    // Remove from container
    if (this.container && this.modelViewer) {
      try {
        this.container.removeChild(this.modelViewer);
      } catch (error) {
        // Element might already be removed
      }
    }

    logger.info('GoogleModelViewer destroyed', 'GoogleModelViewer');
  }

  // Animation controls
  pauseAnimation(): void {
    if (this.modelViewer) {
      this.modelViewer.pause();
    }
  }

  playAnimation(): void {
    if (this.modelViewer) {
      this.modelViewer.play();
    }
  }

  getAnimations(): string[] {
    return this.modelViewer?.availableAnimations || [];
  }

  setAnimation(name: string): void {
    if (this.modelViewer) {
      this.modelViewer.animationName = name;
    }
  }

  // Environment controls
  setEnvironmentImage(url: string): void {
    if (this.modelViewer) {
      this.modelViewer.setAttribute('environment-image', url);
    }
  }

  // Lighting controls
  setShadowIntensity(intensity: number): void {
    if (this.modelViewer) {
      this.modelViewer.setAttribute('shadow-intensity', intensity.toString());
    }
  }

  setShadowSoftness(softness: number): void {
    if (this.modelViewer) {
      this.modelViewer.setAttribute('shadow-softness', softness.toString());
    }
  }

  // Exposure controls
  setExposure(exposure: number): void {
    if (this.modelViewer) {
      this.modelViewer.setAttribute('exposure', exposure.toString());
    }
  }

  // Camera field of view
  setFieldOfView(fov: number): void {
    if (this.modelViewer) {
      this.modelViewer.setAttribute('field-of-view', `${fov}deg`);
    }
  }

  // Camera limits
  setCameraLimits(minDistance: number, maxDistance: number): void {
    if (this.modelViewer) {
      this.modelViewer.setAttribute('min-camera-orbit', `auto auto ${minDistance}m`);
      this.modelViewer.setAttribute('max-camera-orbit', `auto auto ${maxDistance}m`);
    }
  }

  // Interaction controls
  setInteractionPrompt(prompt: string): void {
    if (this.modelViewer) {
      this.modelViewer.setAttribute('interaction-prompt', prompt);
    }
  }

  // AR controls
  enableAR(): void {
    if (this.modelViewer) {
      this.modelViewer.setAttribute('ar', '');
      this.modelViewer.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
    }
  }

  disableAR(): void {
    if (this.modelViewer) {
      this.modelViewer.removeAttribute('ar');
      this.modelViewer.removeAttribute('ar-modes');
    }
  }

  // Loading controls
  setLoadingProgress(progress: number): void {
    if (this.modelViewer) {
      this.modelViewer.setAttribute('loading-progress', progress.toString());
    }
  }

  // Poster/placeholder image
  setPosterImage(url: string): void {
    if (this.modelViewer) {
      this.modelViewer.setAttribute('poster', url);
    }
  }

  // Get current model URL
  getCurrentModelUrl(): string | null {
    return this.currentModelUrl;
  }

  // Get stats (limited compared to Three.js)
  getStats(): any {
    return {
      isLoaded: this.modelViewer.loaded,
      modelUrl: this.currentModelUrl,
      hasAnimations: this.modelViewer.availableAnimations?.length > 0,
      cameraControls: this.modelViewer.hasAttribute('camera-controls'),
      autoRotate: this.modelViewer.hasAttribute('auto-rotate'),
    };
  }

  // Cleanup
  dispose(): void {
    if (this.modelViewer && this.container.contains(this.modelViewer)) {
      this.container.removeChild(this.modelViewer);
    }
    this.modelViewer = null;
    this.currentModelUrl = null;
    
    logger.info('Google Model Viewer disposed', 'GoogleModelViewer');
  }

  // Resize handler
  onWindowResize(): void {
    if (this.modelViewer) {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      
      this.modelViewer.style.width = `${width}px`;
      this.modelViewer.style.height = `${height}px`;
    }
  }
}
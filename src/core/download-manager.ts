/**
 * Text-to-3D Construction Platform - Enhanced Download Manager
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { MeshyAPI } from '../meshy-api';
import { DeviceUtils } from '../device-utils';
import { AppState } from '../types';
import { logger } from '../utils/logger';

export interface DownloadOptions {
  format: string;
  url: string;
  filename?: string;
  showProgress?: boolean;
  optimizeForEngine?: 'unreal' | 'unity' | 'blender' | 'web' | 'ar' | 'printing';
}

export interface FormatInfo {
  name: string;
  extension: string;
  description: string;
  useCase: string;
  engines: string[];
  recommended: boolean;
  fileSize: 'small' | 'medium' | 'large';
  quality: 'standard' | 'high' | 'ultra';
}

export class DownloadManager {
  private static readonly FORMAT_INFO: Record<string, FormatInfo> = {
    glb: {
      name: 'GLB',
      extension: 'glb',
      description: 'Binary glTF format optimized for web and AR',
      useCase: 'Web applications, AR experiences, model-viewer',
      engines: ['Web', 'AR', 'Three.js', 'Babylon.js'],
      recommended: true,
      fileSize: 'medium',
      quality: 'high'
    },
    fbx: {
      name: 'FBX',
      extension: 'fbx',
      description: 'Autodesk FBX format with animations and materials',
      useCase: 'Game engines, professional 3D software',
      engines: ['Unreal Engine', 'Unity', 'Maya', '3ds Max', 'Blender'],
      recommended: true,
      fileSize: 'large',
      quality: 'ultra'
    },
    obj: {
      name: 'OBJ',
      extension: 'obj',
      description: 'Universal 3D format with material support',
      useCase: 'Cross-platform 3D modeling and rendering',
      engines: ['Blender', 'Maya', 'Unity', 'Unreal Engine', 'Most 3D software'],
      recommended: false,
      fileSize: 'medium',
      quality: 'standard'
    },
    usdz: {
      name: 'USDZ',
      extension: 'usdz',
      description: 'Apple\'s AR format for iOS devices',
      useCase: 'iOS AR applications, Apple ecosystem',
      engines: ['iOS AR', 'macOS', 'Reality Composer'],
      recommended: false,
      fileSize: 'medium',
      quality: 'high'
    },
    stl: {
      name: 'STL',
      extension: 'stl',
      description: 'Standard tessellation format for 3D printing',
      useCase: '3D printing, rapid prototyping',
      engines: ['3D Printers', 'Slicing software'],
      recommended: false,
      fileSize: 'small',
      quality: 'standard'
    },
    blend: {
      name: 'BLEND',
      extension: 'blend',
      description: 'Blender native format with full feature support',
      useCase: 'Blender-specific workflows and advanced editing',
      engines: ['Blender'],
      recommended: false,
      fileSize: 'large',
      quality: 'ultra'
    }
  };

  constructor(private state: AppState) {}

  async downloadModel(url: string, extension: string): Promise<void> {
    const options: DownloadOptions = {
      format: extension,
      url,
      showProgress: true,
      optimizeForEngine: this.getOptimalEngine(extension)
    };

    return this.downloadWithOptions(options);
  }

  async downloadWithOptions(options: DownloadOptions): Promise<void> {
    const formatInfo = DownloadManager.FORMAT_INFO[options.format];
    const filename = options.filename || this.generateFilename(options.format);
    
    logger.info('Starting download', 'DownloadManager', {
      format: options.format,
      filename,
      engine: options.optimizeForEngine
    });

    try {
      // Validate download before starting
      const isValid = await this.validateDownload(options.url, options.format);
      if (!isValid) {
        throw new Error(`Download validation failed for ${options.format.toUpperCase()} format`);
      }

      // Show download progress if requested
      if (options.showProgress) {
        this.showDownloadProgress(filename, formatInfo);
      }

      // Download with optimizations
      await this.downloadWithOptimizations(options.url, filename, options);
      
      logger.info('Download completed successfully', 'DownloadManager', {
        format: options.format,
        filename
      });

    } catch (error) {
      logger.error('Download failed', 'DownloadManager', error);
      throw new Error(`Failed to download ${options.format.toUpperCase()} file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async downloadWithOptimizations(url: string, filename: string, options: DownloadOptions): Promise<void> {
    // Apply engine-specific optimizations to URL if needed
    const optimizedUrl = this.applyEngineOptimizations(url, options.optimizeForEngine);
    
    // Use the existing MeshyAPI download method
    await MeshyAPI.downloadModel(optimizedUrl, filename);
  }

  private applyEngineOptimizations(url: string, engine?: string): string {
    if (!engine) return url;

    const urlObj = new URL(url);
    
    switch (engine) {
      case 'unreal':
        // Unreal Engine optimizations
        urlObj.searchParams.set('optimize', 'unreal');
        urlObj.searchParams.set('coordinate_system', 'left_handed');
        urlObj.searchParams.set('scale', '100'); // Unreal uses centimeters
        break;
        
      case 'unity':
        // Unity optimizations
        urlObj.searchParams.set('optimize', 'unity');
        urlObj.searchParams.set('coordinate_system', 'left_handed');
        urlObj.searchParams.set('y_up', 'true');
        break;
        
      case 'blender':
        // Blender optimizations
        urlObj.searchParams.set('optimize', 'blender');
        urlObj.searchParams.set('coordinate_system', 'right_handed');
        urlObj.searchParams.set('z_up', 'true');
        break;
        
      case 'web':
        // Web optimizations
        urlObj.searchParams.set('optimize', 'web');
        urlObj.searchParams.set('compress', 'true');
        urlObj.searchParams.set('texture_size', '1024');
        break;
        
      case 'ar':
        // AR optimizations
        urlObj.searchParams.set('optimize', 'ar');
        urlObj.searchParams.set('poly_count', '5000');
        urlObj.searchParams.set('texture_size', '512');
        break;
        
      case 'printing':
        // 3D printing optimizations
        urlObj.searchParams.set('optimize', 'printing');
        urlObj.searchParams.set('watertight', 'true');
        urlObj.searchParams.set('manifold', 'true');
        break;
    }

    return urlObj.toString();
  }

  private getOptimalEngine(format: string): DownloadOptions['optimizeForEngine'] {
    switch (format) {
      case 'fbx':
        return 'unreal'; // FBX is commonly used with Unreal Engine
      case 'obj':
        return 'blender'; // OBJ is versatile but commonly used in Blender
      case 'glb':
        return 'web'; // GLB is optimized for web
      case 'usdz':
        return 'ar'; // USDZ is for AR
      case 'stl':
        return 'printing'; // STL is for 3D printing
      case 'blend':
        return 'blender'; // BLEND is Blender native
      default:
        return 'web';
    }
  }

  private generateFilename(format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const projectName = this.state.currentProject?.prompt?.slice(0, 30)
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'construction-model';
    
    return `${projectName}-${timestamp}.${format}`;
  }

  private async validateDownload(url: string, _format: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      
      if (!response.ok) {
        return false;
      }

      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');

      // Basic validation
      if (!contentType || !contentLength) {
        return false;
      }

      // Check file size limits
      const fileSize = parseInt(contentLength);
      const deviceInfo = DeviceUtils.getDeviceInfo();
      const maxSize = deviceInfo.maxFileSizeMB * 1024 * 1024;

      if (fileSize > maxSize) {
        throw new Error(`File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds device limit (${deviceInfo.maxFileSizeMB}MB)`);
      }

      return true;
    } catch (error) {
      logger.error('Download validation failed', 'DownloadManager', error);
      return false;
    }
  }

  private showDownloadProgress(filename: string, formatInfo: FormatInfo): void {
    // Create a temporary progress indicator
    const progressDiv = document.createElement('div');
    progressDiv.className = 'download-progress';
    progressDiv.innerHTML = `
      <div class="download-progress-content">
        <div class="download-progress-message">
          Downloading ${formatInfo.name} file...
        </div>
        <div class="download-progress-filename">${filename}</div>
        <div class="download-progress-info">
          ${formatInfo.description}
        </div>
      </div>
    `;
    
    // Add to page temporarily
    document.body.appendChild(progressDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (document.body.contains(progressDiv)) {
        document.body.removeChild(progressDiv);
      }
    }, 3000);
  }

  // Static methods for format information
  static getFormatInfo(format: string): FormatInfo | null {
    return DownloadManager.FORMAT_INFO[format] || null;
  }

  static getSupportedFormats(): string[] {
    return Object.keys(DownloadManager.FORMAT_INFO);
  }

  static getRecommendedFormats(): string[] {
    return Object.entries(DownloadManager.FORMAT_INFO)
      .filter(([_, info]) => info.recommended)
      .map(([format, _]) => format);
  }

  static getFormatsForEngine(engine: string): string[] {
    return Object.entries(DownloadManager.FORMAT_INFO)
      .filter(([_, info]) => info.engines.some(e => e.toLowerCase().includes(engine.toLowerCase())))
      .map(([format, _]) => format);
  }

  async downloadMultipleFormats(urls: Record<string, string>): Promise<void> {
    const downloadPromises = Object.entries(urls).map(([format, url]) =>
      this.downloadModel(url, format),
    );

    await Promise.all(downloadPromises);
  }

  async downloadForEngine(urls: Record<string, string>, engine: 'unreal' | 'unity' | 'blender'): Promise<void> {
    const supportedFormats = DownloadManager.getFormatsForEngine(engine);
    const availableFormats = Object.keys(urls).filter(format => supportedFormats.includes(format));
    
    if (availableFormats.length === 0) {
      throw new Error(`No compatible formats available for ${engine}`);
    }

    // Download the best format for the engine
    const bestFormat = this.getBestFormatForEngine(availableFormats, engine);
    const url = urls[bestFormat];
    
    if (url) {
      await this.downloadWithOptions({
        format: bestFormat,
        url,
        optimizeForEngine: engine,
        showProgress: true
      });
    }
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

  async getDownloadHistory(): Promise<any[]> {
    // Self-contained mode: no download history available
    logger.info('Download history not available in self-contained mode', 'DownloadManager');
    return [];
  }

  async generateDownloadLink(
    url: string,
    _expirationHours: number = 24,
  ): Promise<string> {
    // This would generate a temporary, secure download link
    // For now, return the original URL
    return url;
  }

  validateDownloadSize(url: string): Promise<boolean> {
    const deviceInfo = DeviceUtils.getDeviceInfo();
    const maxSize = deviceInfo.maxFileSizeMB * 1024 * 1024; // Convert to bytes

    return new Promise((resolve) => {
      fetch(url, { method: 'HEAD' })
        .then((response) => {
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            const fileSize = parseInt(contentLength);
            resolve(fileSize <= maxSize);
          } else {
            resolve(true); // If we can't determine size, allow download
          }
        })
        .catch(() => resolve(true)); // If request fails, allow download
    });
  }

  getOptimizedDownloadUrl(baseUrl: string, format: string): string {
    const deviceInfo = DeviceUtils.getDeviceInfo();

    // Add device-specific parameters to the URL
    const url = new URL(baseUrl);
    url.searchParams.set('device', deviceInfo.type);
    url.searchParams.set('format', format);

    if (deviceInfo.isMobile) {
      url.searchParams.set('optimize', 'mobile');
    }

    return url.toString();
  }

  // Batch download methods
  async downloadBatch(downloads: DownloadOptions[]): Promise<void> {
    const batchPromises = downloads.map(options => this.downloadWithOptions(options));
    await Promise.all(batchPromises);
  }

  // Create download recommendations
  getDownloadRecommendations(availableFormats: string[], useCase?: string): string[] {
    if (!useCase) {
      return DownloadManager.getRecommendedFormats().filter(format => availableFormats.includes(format));
    }

    const recommendations = [];
    
    switch (useCase.toLowerCase()) {
      case 'unreal':
      case 'unreal engine':
        recommendations.push('fbx', 'obj');
        break;
      case 'unity':
        recommendations.push('fbx', 'obj');
        break;
      case 'blender':
        recommendations.push('blend', 'fbx', 'obj');
        break;
      case 'web':
      case 'website':
        recommendations.push('glb');
        break;
      case 'ar':
      case 'augmented reality':
        recommendations.push('usdz', 'glb');
        break;
      case 'printing':
      case '3d printing':
        recommendations.push('stl');
        break;
      default:
        recommendations.push('glb', 'fbx');
    }

    return recommendations.filter(format => availableFormats.includes(format));
  }
}

/**
 * Text-to-3D Construction Platform - Download Manager
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { MeshyAPI } from '../meshy-api';
import { AirtableService } from '../airtable-service';
import { DeviceUtils } from '../device-utils';
import { AppState } from '../types';

export class DownloadManager {
  constructor(private state: AppState) {}

  async downloadModel(url: string, extension: string): Promise<void> {
    const filename = `construction-model-${Date.now()}.${extension}`;
    
    // Record download in Airtable
    if (this.state.currentProject && this.state.currentUser) {
      const deviceInfo = DeviceUtils.getDeviceInfo();
      
      try {
        await AirtableService.recordDownload({
          project_id: this.state.currentProject.id!,
          user_email: this.state.currentUser.email,
          format: extension,
          device_type: deviceInfo.type
        });
      } catch (error) {
        console.warn('Failed to record download:', error);
        // Don't fail the download if recording fails
      }
    }
    
    // Download the actual file
    await MeshyAPI.downloadModel(url, filename);
  }

  async downloadMultipleFormats(urls: Record<string, string>): Promise<void> {
    const downloadPromises = Object.entries(urls).map(([format, url]) => 
      this.downloadModel(url, format)
    );

    await Promise.all(downloadPromises);
  }

  async getDownloadHistory(): Promise<any[]> {
    if (!this.state.currentUser) {
      return [];
    }

    try {
      return await AirtableService.getDownloadHistory(this.state.currentUser.email);
    } catch (error) {
      console.error('Failed to get download history:', error);
      return [];
    }
  }

  async generateDownloadLink(url: string, expirationHours: number = 24): Promise<string> {
    // This would generate a temporary, secure download link
    // For now, return the original URL
    return url;
  }

  validateDownloadSize(url: string): Promise<boolean> {
    const deviceInfo = DeviceUtils.getDeviceInfo();
    const maxSize = deviceInfo.maxFileSizeMB * 1024 * 1024; // Convert to bytes
    
    return new Promise((resolve) => {
      fetch(url, { method: 'HEAD' })
        .then(response => {
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
}
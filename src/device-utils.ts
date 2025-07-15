/**
 * Text-to-3D Construction Platform - Device Utilities
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  maxPolyCount: number;
  maxFileSizeMB: number;
  recommendedFormats: string[];
  memoryLimitMB: number;
  supportsWebGL2: boolean;
}

export class DeviceUtils {
  private static deviceInfo: DeviceInfo | null = null;

  static getDeviceInfo(): DeviceInfo {
    if (this.deviceInfo) {
      return this.deviceInfo;
    }

    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipod|android.*mobile/i.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;

    // Detect WebGL2 support
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    const supportsWebGL2 = !!gl2;

    // Get approximate memory info (if available)
    const memoryInfo =
      (navigator as any).deviceMemory ||
      (performance as any).memory?.usedJSHeapSize
        ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
        : null;

    let deviceType: 'mobile' | 'tablet' | 'desktop';
    let maxPolyCount: number;
    let maxFileSizeMB: number;
    let memoryLimitMB: number;
    let recommendedFormats: string[];

    if (isMobile) {
      deviceType = 'mobile';
      maxPolyCount = 8000;
      maxFileSizeMB = 10;
      memoryLimitMB = 512;
      recommendedFormats = ['glb'];
    } else if (isTablet) {
      deviceType = 'tablet';
      maxPolyCount = 12000;
      maxFileSizeMB = 15;
      memoryLimitMB = 1024;
      recommendedFormats = ['glb', 'usdz'];
    } else {
      deviceType = 'desktop';
      maxPolyCount = 30000;
      maxFileSizeMB = 25;
      memoryLimitMB = 2048;
      recommendedFormats = ['glb', 'fbx', 'obj', 'usdz'];
    }

    // Adjust based on actual memory if available
    if (memoryInfo) {
      if (memoryInfo < 2) {
        maxPolyCount = Math.min(maxPolyCount, 6000);
        maxFileSizeMB = Math.min(maxFileSizeMB, 8);
      } else if (memoryInfo > 8) {
        maxPolyCount = Math.min(maxPolyCount * 1.5, 50000);
        maxFileSizeMB = Math.min(maxFileSizeMB * 1.5, 40);
      }
    }

    this.deviceInfo = {
      type: deviceType,
      isMobile,
      isTablet,
      isDesktop,
      maxPolyCount,
      maxFileSizeMB,
      recommendedFormats,
      memoryLimitMB,
      supportsWebGL2,
    };

    return this.deviceInfo;
  }

  static getOptimizedSettings(userPreference?: {
    quality?: 'low' | 'medium' | 'high';
    prioritizeSpeed?: boolean;
  }) {
    const device = this.getDeviceInfo();
    const quality = userPreference?.quality || 'medium';
    const prioritizeSpeed = userPreference?.prioritizeSpeed || false;

    let polyCount: number;
    let topology: 'triangle' | 'quad';
    let enablePBR: boolean;

    switch (quality) {
      case 'low':
        polyCount = Math.min(device.maxPolyCount * 0.5, 6000);
        topology = 'triangle';
        enablePBR = false;
        break;
      case 'high':
        polyCount = device.maxPolyCount;
        topology = device.isDesktop ? 'quad' : 'triangle';
        enablePBR = true;
        break;
      default: // medium
        polyCount = Math.min(device.maxPolyCount * 0.75, 15000);
        topology = 'triangle';
        enablePBR = !device.isMobile;
    }

    if (prioritizeSpeed) {
      polyCount = Math.min(polyCount * 0.7, 10000);
      enablePBR = false;
    }

    return {
      targetPolyCount: Math.round(polyCount),
      topology,
      enablePBR,
      enableRemesh: !device.isMobile,
    };
  }

  static getPerformanceWarnings(): string[] {
    const device = this.getDeviceInfo();
    const warnings: string[] = [];

    if (device.isMobile) {
      warnings.push(
        'Mobile device detected. Models will be optimized for performance.',
      );
    }

    if (!device.supportsWebGL2) {
      warnings.push('WebGL 2.0 not supported. Some features may be limited.');
    }

    if (device.maxFileSizeMB < 15) {
      warnings.push(
        `File size limited to ${device.maxFileSizeMB}MB for optimal performance.`,
      );
    }

    return warnings;
  }

  static estimateLoadTime(fileSizeMB: number): string {
    const device = this.getDeviceInfo();

    // Rough estimates based on typical connection speeds
    let speedMbps: number;
    if (device.isMobile) {
      speedMbps = 10; // 4G average
    } else if (device.isTablet) {
      speedMbps = 25; // WiFi average
    } else {
      speedMbps = 50; // Desktop broadband
    }

    const loadTimeSeconds = (fileSizeMB * 8) / speedMbps;

    if (loadTimeSeconds < 3) {
      return 'Under 3 seconds';
    } else if (loadTimeSeconds < 10) {
      return `${Math.round(loadTimeSeconds)} seconds`;
    } else if (loadTimeSeconds < 60) {
      return `${Math.round(loadTimeSeconds)} seconds (slow connection)`;
    } else {
      return 'Over 1 minute (very slow)';
    }
  }

  static shouldShowQualityOptions(): boolean {
    const device = this.getDeviceInfo();
    return device.isDesktop || device.isTablet;
  }

  static getRecommendedFormat(): string {
    const device = this.getDeviceInfo();

    if (device.isMobile) {
      return 'glb'; // Smallest file size, best mobile support
    } else if (device.isTablet) {
      return 'glb'; // Good balance of features and performance
    } else {
      return 'glb'; // Best web support, still good for desktop
    }
  }
}

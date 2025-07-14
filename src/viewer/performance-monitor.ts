/**
 * Text-to-3D Construction Platform - Performance Monitor
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { DeviceInfo } from '../device-utils';
import { LODSystem } from './lod-system';

export interface PerformanceStats {
  frameRate: number;
  renderTime: number;
  triangles: number;
  lastFrameTime: number;
  memoryUsage: number;
  gpuMemoryUsage: number;
}

export class PerformanceMonitor {
  private stats: PerformanceStats = {
    frameRate: 0,
    renderTime: 0,
    triangles: 0,
    lastFrameTime: 0,
    memoryUsage: 0,
    gpuMemoryUsage: 0
  };

  private frameCount = 0;
  private lastPerfCheck = 0;
  private deviceInfo: DeviceInfo;
  private lodSystem: LODSystem | null = null;

  constructor(deviceInfo: DeviceInfo) {
    this.deviceInfo = deviceInfo;
  }

  setLODSystem(lodSystem: LODSystem): void {
    this.lodSystem = lodSystem;
  }

  updateStats(timestamp: number, renderTime: number): void {
    const deltaTime = timestamp - this.stats.lastFrameTime;
    this.stats.frameRate = 1000 / deltaTime;
    this.stats.renderTime = renderTime;
    this.stats.lastFrameTime = timestamp;
    
    this.frameCount++;

    // Check performance every 60 frames (roughly 1 second at 60fps)
    if (this.frameCount % 60 === 0) {
      this.checkPerformance();
    }
  }

  private checkPerformance(): void {
    const now = performance.now();
    
    // Skip if we checked recently
    if (now - this.lastPerfCheck < 1000) return;
    
    this.lastPerfCheck = now;

    // Update memory usage if available
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      this.stats.memoryUsage = memInfo.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }

    this.monitorAndOptimize();
  }

  private monitorAndOptimize(): void {
    // Automatically adjust LOD based on performance
    if (this.stats.frameRate < 30 && this.deviceInfo.isMobile) {
      // Enable more aggressive LOD if performance is poor
      if (this.lodSystem && !this.lodSystem.isEnabled()) {
        this.lodSystem.toggleLOD(true);
        console.log('Performance LOD enabled due to low frame rate:', this.stats.frameRate);
      }
    } else if (this.stats.frameRate > 55 && this.deviceInfo.isDesktop) {
      // Disable LOD if performance is very good on desktop
      if (this.lodSystem && this.lodSystem.isEnabled()) {
        this.lodSystem.toggleLOD(false);
        console.log('Performance LOD disabled due to high frame rate:', this.stats.frameRate);
      }
    }

    // Log performance warnings
    if (this.stats.frameRate < 20) {
      console.warn('Low frame rate detected:', this.stats.frameRate);
    }

    if (this.stats.renderTime > 16) { // 16ms = 60fps
      console.warn('High render time detected:', this.stats.renderTime);
    }

    if (this.stats.memoryUsage > 100) { // 100MB threshold
      console.warn('High memory usage detected:', this.stats.memoryUsage);
    }
  }

  setTriangleCount(count: number): void {
    this.stats.triangles = count;
  }

  getStats(): PerformanceStats {
    return { ...this.stats };
  }

  getFormattedStats(): string {
    return `FPS: ${this.stats.frameRate.toFixed(1)} | ` +
           `Render: ${this.stats.renderTime.toFixed(1)}ms | ` +
           `Triangles: ${this.stats.triangles.toLocaleString()} | ` +
           `Memory: ${this.stats.memoryUsage.toFixed(1)}MB`;
  }

  isPerformanceGood(): boolean {
    return this.stats.frameRate >= 30 && this.stats.renderTime <= 16;
  }

  getPerformanceLevel(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (this.stats.frameRate >= 55 && this.stats.renderTime <= 10) {
      return 'excellent';
    } else if (this.stats.frameRate >= 30 && this.stats.renderTime <= 16) {
      return 'good';
    } else if (this.stats.frameRate >= 20 && this.stats.renderTime <= 25) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];

    if (this.stats.frameRate < 30) {
      suggestions.push('Enable Level of Detail (LOD) to improve performance');
    }

    if (this.stats.triangles > this.deviceInfo.maxPolyCount) {
      suggestions.push('Model complexity exceeds device capabilities');
    }

    if (this.stats.memoryUsage > 50) {
      suggestions.push('High memory usage detected - consider reloading the page');
    }

    if (this.stats.renderTime > 20) {
      suggestions.push('Reduce rendering quality or enable performance mode');
    }

    return suggestions;
  }

  reset(): void {
    this.stats = {
      frameRate: 0,
      renderTime: 0,
      triangles: 0,
      lastFrameTime: 0,
      memoryUsage: 0,
      gpuMemoryUsage: 0
    };
    this.frameCount = 0;
    this.lastPerfCheck = 0;
  }
}
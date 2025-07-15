/**
 * Text-to-3D Construction Platform - Performance Monitor
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { DeviceInfo } from '../device-utils';
import { LODSystem } from './lod-system';
import { logger } from '../utils/logger';

export interface PerformanceStats {
  frameRate: number;
  renderTime: number;
  triangles: number;
  lastFrameTime: number;
  memoryUsage: number;
  gpuMemoryUsage: number;
  webglStats: WebGLStats;
  networkStats: NetworkStats;
  powerUsage: PowerStats;
}

export interface WebGLStats {
  drawCalls: number;
  textureMemory: number; // MB
  bufferMemory: number; // MB
  shaderPrograms: number;
  activeTextures: number;
  contextLostCount: number;
  maxTextureSize: number;
  maxRenderBufferSize: number;
  vendorInfo: string;
  rendererInfo: string;
  extensions: string[];
}

export interface NetworkStats {
  requestCount: number;
  totalBytesTransferred: number;
  averageResponseTime: number;
  failedRequests: number;
  cacheHitRatio: number;
}

export interface PowerStats {
  batteryLevel?: number;
  isCharging?: boolean;
  estimatedTimeRemaining?: number;
  powerMode: 'high-performance' | 'balanced' | 'power-saver' | 'unknown';
}

export class PerformanceMonitor {
  private stats: PerformanceStats = {
    frameRate: 0,
    renderTime: 0,
    triangles: 0,
    lastFrameTime: 0,
    memoryUsage: 0,
    gpuMemoryUsage: 0,
    webglStats: {
      drawCalls: 0,
      textureMemory: 0,
      bufferMemory: 0,
      shaderPrograms: 0,
      activeTextures: 0,
      contextLostCount: 0,
      maxTextureSize: 0,
      maxRenderBufferSize: 0,
      vendorInfo: '',
      rendererInfo: '',
      extensions: [],
    },
    networkStats: {
      requestCount: 0,
      totalBytesTransferred: 0,
      averageResponseTime: 0,
      failedRequests: 0,
      cacheHitRatio: 0,
    },
    powerUsage: {
      powerMode: 'unknown',
    },
  };

  private frameCount = 0;
  private lastPerfCheck = 0;
  private deviceInfo: DeviceInfo;
  private lodSystem: LODSystem | null = null;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private drawCallCounter = 0;
  private networkRequests: { timestamp: number; duration: number; bytes: number; success: boolean }[] = [];
  private batteryManager: any = null;
  private contextLostListener: ((event: Event) => void) | null = null;

  constructor(deviceInfo: DeviceInfo) {
    this.deviceInfo = deviceInfo;
    this.initializeBatteryManager();
  }

  setLODSystem(lodSystem: LODSystem): void {
    this.lodSystem = lodSystem;
  }

  setWebGLContext(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.gl = gl;
    this.initializeWebGLMonitoring();
  }

  private async initializeBatteryManager(): Promise<void> {
    try {
      if ('getBattery' in navigator) {
        this.batteryManager = await (navigator as any).getBattery();
        this.updatePowerStats();
        
        // Listen for battery events
        this.batteryManager.addEventListener('chargingchange', () => this.updatePowerStats());
        this.batteryManager.addEventListener('levelchange', () => this.updatePowerStats());
      }
    } catch (error) {
      logger.warn('Battery API not available', 'PerformanceMonitor');
    }
  }

  private initializeWebGLMonitoring(): void {
    if (!this.gl) return;

    // Get WebGL info
    const debugInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      this.stats.webglStats.vendorInfo = (this.gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string) || '';
      this.stats.webglStats.rendererInfo = (this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string) || '';
    }

    // Get capabilities
    this.stats.webglStats.maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
    this.stats.webglStats.maxRenderBufferSize = this.gl.getParameter(this.gl.MAX_RENDERBUFFER_SIZE);

    // Get supported extensions
    this.stats.webglStats.extensions = this.gl.getSupportedExtensions() || [];

    // Set up context lost monitoring
    this.contextLostListener = () => {
      this.stats.webglStats.contextLostCount++;
      logger.error('WebGL context lost', 'PerformanceMonitor');
    };

    const canvas = this.gl.canvas as HTMLCanvasElement;
    canvas.addEventListener('webglcontextlost', this.contextLostListener);

    // Start monitoring draw calls
    this.instrumentWebGLDrawCalls();
  }

  private instrumentWebGLDrawCalls(): void {
    if (!this.gl) return;

    const originalDrawArrays = this.gl.drawArrays.bind(this.gl);
    const originalDrawElements = this.gl.drawElements.bind(this.gl);

    this.gl.drawArrays = (...args) => {
      this.drawCallCounter++;
      return originalDrawArrays(...args);
    };

    this.gl.drawElements = (...args) => {
      this.drawCallCounter++;
      return originalDrawElements(...args);
    };
  }

  private updatePowerStats(): void {
    if (!this.batteryManager) return;

    this.stats.powerUsage.batteryLevel = this.batteryManager.level * 100;
    this.stats.powerUsage.isCharging = this.batteryManager.charging;
    this.stats.powerUsage.estimatedTimeRemaining = this.batteryManager.dischargingTime;

    // Determine power mode based on battery level and charging status
    if (this.batteryManager.charging) {
      this.stats.powerUsage.powerMode = 'high-performance';
    } else if (this.batteryManager.level > 0.5) {
      this.stats.powerUsage.powerMode = 'balanced';
    } else if (this.batteryManager.level > 0.2) {
      this.stats.powerUsage.powerMode = 'balanced';
    } else {
      this.stats.powerUsage.powerMode = 'power-saver';
    }
  }

  updateStats(timestamp: number, renderTime: number): void {
    const deltaTime = timestamp - this.stats.lastFrameTime;
    this.stats.frameRate = 1000 / deltaTime;
    this.stats.renderTime = renderTime;
    this.stats.lastFrameTime = timestamp;

    this.frameCount++;

    // Update WebGL stats
    this.stats.webglStats.drawCalls = this.drawCallCounter;
    this.drawCallCounter = 0; // Reset for next frame

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

    // Update WebGL memory stats
    this.updateWebGLMemoryStats();

    // Update network stats
    this.updateNetworkStats();

    // Update power stats
    this.updatePowerStats();

    this.monitorAndOptimize();
  }

  private updateWebGLMemoryStats(): void {
    if (!this.gl) return;

    try {
      // Estimate GPU memory usage (this is approximate)
      const textureMemoryExt = this.gl.getExtension('WEBGL_memory_info');
      if (textureMemoryExt) {
        const totalMemory = this.gl.getParameter(textureMemoryExt.MEMORY_INFO_TOTAL_AVAILABLE_MEMORY_NVX) / 1024; // KB to MB
        const currentMemory = this.gl.getParameter(textureMemoryExt.MEMORY_INFO_CURRENT_AVAILABLE_MEMORY_NVX) / 1024;
        this.stats.gpuMemoryUsage = Math.max(0, totalMemory - currentMemory);
      }

      // Count active textures
      let activeTextures = 0;
      for (let i = 0; i < this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS); i++) {
        this.gl.activeTexture(this.gl.TEXTURE0 + i);
        const texture = this.gl.getParameter(this.gl.TEXTURE_BINDING_2D);
        if (texture) activeTextures++;
      }
      this.stats.webglStats.activeTextures = activeTextures;

      // Estimate shader program count (this is a rough estimate)
      this.stats.webglStats.shaderPrograms = this.estimateShaderProgramCount();

    } catch (error) {
      logger.warn('Failed to update WebGL memory stats:', undefined, error);
    }
  }

  private updateNetworkStats(): void {
    // Clean old requests (older than 1 minute)
    const cutoff = Date.now() - 60000;
    this.networkRequests = this.networkRequests.filter(req => req.timestamp > cutoff);

    // Calculate stats
    const recentRequests = this.networkRequests;
    this.stats.networkStats.requestCount = recentRequests.length;
    this.stats.networkStats.totalBytesTransferred = recentRequests.reduce((sum, req) => sum + req.bytes, 0);
    this.stats.networkStats.averageResponseTime = recentRequests.length > 0
      ? recentRequests.reduce((sum, req) => sum + req.duration, 0) / recentRequests.length
      : 0;
    this.stats.networkStats.failedRequests = recentRequests.filter(req => !req.success).length;

    // Calculate cache hit ratio (simplified - would need integration with cache manager)
    const totalRequests = recentRequests.length;
    const cacheMisses = recentRequests.filter(req => req.duration > 50).length; // Assume >50ms means cache miss
    this.stats.networkStats.cacheHitRatio = totalRequests > 0 
      ? ((totalRequests - cacheMisses) / totalRequests) * 100 
      : 0;
  }

  private estimateShaderProgramCount(): number {
    // This is a rough estimate since WebGL doesn't provide a direct way to count programs
    // In a real implementation, you'd track program creation/deletion
    return 5; // Default estimate for typical 3D applications
  }

  trackNetworkRequest(_url: string, startTime: number, endTime: number, bytes: number, success: boolean): void {
    this.networkRequests.push({
      timestamp: startTime,
      duration: endTime - startTime,
      bytes,
      success,
    });

    // Keep only the last 100 requests to prevent memory bloat
    if (this.networkRequests.length > 100) {
      this.networkRequests = this.networkRequests.slice(-100);
    }
  }

  private monitorAndOptimize(): void {
    // Power-aware performance adjustments
    if (this.stats.powerUsage.powerMode === 'power-saver') {
      // More aggressive optimizations in power saver mode
      if (this.lodSystem && !this.lodSystem.isEnabled()) {
        this.lodSystem.toggleLOD(true);
        logger.info('LOD enabled due to power saver mode', 'PerformanceMonitor');
      }
    }

    // Automatically adjust LOD based on performance
    if (this.stats.frameRate < 30 && this.deviceInfo.isMobile) {
      // Enable more aggressive LOD if performance is poor
      if (this.lodSystem && !this.lodSystem.isEnabled()) {
        this.lodSystem.toggleLOD(true);
        logger.info(`Performance LOD enabled due to low frame rate: ${this.stats.frameRate}fps`, 'PerformanceMonitor');
      }
    } else if (this.stats.frameRate > 55 && this.deviceInfo.isDesktop) {
      // Disable LOD if performance is very good on desktop
      if (this.lodSystem && this.lodSystem.isEnabled()) {
        this.lodSystem.toggleLOD(false);
        logger.info(`Performance LOD disabled due to high frame rate: ${this.stats.frameRate}fps`, 'PerformanceMonitor');
      }
    }

    // Advanced performance warnings
    if (this.stats.frameRate < 20) {
      logger.warn(`Low frame rate detected: ${this.stats.frameRate}fps`, 'PerformanceMonitor');
    }

    if (this.stats.renderTime > 16) {
      logger.warn(`High render time detected: ${this.stats.renderTime}ms`, 'PerformanceMonitor');
    }

    if (this.stats.memoryUsage > 100) {
      logger.warn(`High memory usage detected: ${this.stats.memoryUsage}MB`, 'PerformanceMonitor');
    }

    if (this.stats.gpuMemoryUsage > 500) {
      logger.warn(`High GPU memory usage detected: ${this.stats.gpuMemoryUsage}MB`, 'PerformanceMonitor');
    }

    if (this.stats.webglStats.drawCalls > 1000) {
      logger.warn(`High draw call count: ${this.stats.webglStats.drawCalls}`, 'PerformanceMonitor');
    }

    if (this.stats.networkStats.averageResponseTime > 500) {
      logger.warn(`Slow network detected: ${this.stats.networkStats.averageResponseTime}ms avg`, 'PerformanceMonitor');
    }
  }

  setTriangleCount(count: number): void {
    this.stats.triangles = count;
  }

  getStats(): PerformanceStats {
    return { ...this.stats };
  }

  getFormattedStats(): string {
    return (
      `FPS: ${this.stats.frameRate.toFixed(1)} | ` +
      `Render: ${this.stats.renderTime.toFixed(1)}ms | ` +
      `Triangles: ${this.stats.triangles.toLocaleString()} | ` +
      `Memory: ${this.stats.memoryUsage.toFixed(1)}MB | ` +
      `GPU: ${this.stats.gpuMemoryUsage.toFixed(1)}MB | ` +
      `Draws: ${this.stats.webglStats.drawCalls} | ` +
      `Network: ${this.stats.networkStats.averageResponseTime.toFixed(0)}ms`
    );
  }

  getDetailedStats(): {
    performance: PerformanceStats;
    recommendations: string[];
    healthScore: number;
  } {
    const recommendations = this.getOptimizationSuggestions();
    const healthScore = this.calculateHealthScore();

    return {
      performance: this.getStats(),
      recommendations,
      healthScore,
    };
  }

  private calculateHealthScore(): number {
    let score = 100;

    // Frame rate impact (40% of score)
    if (this.stats.frameRate < 20) score -= 40;
    else if (this.stats.frameRate < 30) score -= 25;
    else if (this.stats.frameRate < 45) score -= 10;

    // Memory impact (20% of score)
    if (this.stats.memoryUsage > 200) score -= 20;
    else if (this.stats.memoryUsage > 100) score -= 10;
    else if (this.stats.memoryUsage > 50) score -= 5;

    // GPU memory impact (15% of score)
    if (this.stats.gpuMemoryUsage > 1000) score -= 15;
    else if (this.stats.gpuMemoryUsage > 500) score -= 10;
    else if (this.stats.gpuMemoryUsage > 250) score -= 5;

    // Draw calls impact (15% of score)
    if (this.stats.webglStats.drawCalls > 2000) score -= 15;
    else if (this.stats.webglStats.drawCalls > 1000) score -= 10;
    else if (this.stats.webglStats.drawCalls > 500) score -= 5;

    // Network impact (10% of score)
    if (this.stats.networkStats.averageResponseTime > 1000) score -= 10;
    else if (this.stats.networkStats.averageResponseTime > 500) score -= 5;

    return Math.max(0, Math.min(100, score));
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

    // Performance suggestions
    if (this.stats.frameRate < 30) {
      suggestions.push('Enable Level of Detail (LOD) to improve performance');
    }

    if (this.stats.triangles > this.deviceInfo.maxPolyCount) {
      suggestions.push('Model complexity exceeds device capabilities - consider model optimization');
    }

    if (this.stats.renderTime > 20) {
      suggestions.push('Reduce rendering quality or enable performance mode');
    }

    // Memory suggestions
    if (this.stats.memoryUsage > 100) {
      suggestions.push('High memory usage detected - consider reloading the page');
    }

    if (this.stats.gpuMemoryUsage > 500) {
      suggestions.push('High GPU memory usage - reduce texture quality or model complexity');
    }

    // WebGL suggestions
    if (this.stats.webglStats.drawCalls > 1000) {
      suggestions.push('High draw call count - consider batching geometry or using instancing');
    }

    if (this.stats.webglStats.activeTextures > 16) {
      suggestions.push('Too many active textures - consider texture atlasing');
    }

    // Network suggestions
    if (this.stats.networkStats.averageResponseTime > 500) {
      suggestions.push('Slow network detected - enable offline mode or use smaller models');
    }

    if (this.stats.networkStats.cacheHitRatio < 50) {
      suggestions.push('Low cache hit ratio - consider preloading frequently used models');
    }

    // Power suggestions
    if (this.stats.powerUsage.powerMode === 'power-saver') {
      suggestions.push('Device in power saver mode - performance optimizations enabled');
    }

    if (this.stats.powerUsage.batteryLevel && this.stats.powerUsage.batteryLevel < 20) {
      suggestions.push('Low battery detected - consider enabling power saver mode');
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
      gpuMemoryUsage: 0,
      webglStats: {
        drawCalls: 0,
        textureMemory: 0,
        bufferMemory: 0,
        shaderPrograms: 0,
        activeTextures: 0,
        contextLostCount: 0,
        maxTextureSize: 0,
        maxRenderBufferSize: 0,
        vendorInfo: '',
        rendererInfo: '',
        extensions: [],
      },
      networkStats: {
        requestCount: 0,
        totalBytesTransferred: 0,
        averageResponseTime: 0,
        failedRequests: 0,
        cacheHitRatio: 0,
      },
      powerUsage: {
        powerMode: 'unknown',
      },
    };
    this.frameCount = 0;
    this.lastPerfCheck = 0;
    this.drawCallCounter = 0;
    this.networkRequests = [];
  }

  dispose(): void {
    // Clean up event listeners
    if (this.batteryManager) {
      this.batteryManager.removeEventListener('chargingchange', this.updatePowerStats);
      this.batteryManager.removeEventListener('levelchange', this.updatePowerStats);
    }

    if (this.contextLostListener && this.gl) {
      const canvas = this.gl.canvas as HTMLCanvasElement;
      canvas.removeEventListener('webglcontextlost', this.contextLostListener);
    }

    this.reset();
  }
}

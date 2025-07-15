/**
 * Text-to-3D Construction Platform - Progressive Model Loader
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { CacheManager } from './cache-manager';
import { Logger } from '../utils/logger';

interface LoadingChunk {
  id: string;
  offset: number;
  size: number;
  priority: 'high' | 'medium' | 'low';
  loaded: boolean;
  data?: ArrayBuffer;
}

interface StreamingRequest {
  url: string;
  totalSize: number;
  chunks: LoadingChunk[];
  onProgress?: (loaded: number, total: number) => void;
  onChunkLoaded?: (chunk: LoadingChunk) => void;
  onComplete?: (data: ArrayBuffer) => void;
  onError?: (error: Error) => void;
}

interface PreloadRequest {
  url: string;
  priority: number;
  estimatedSize: number;
  format: string;
}

export class ProgressiveLoader {
  private static instance: ProgressiveLoader;
  private cacheManager: CacheManager;
  private activeStreams = new Map<string, StreamingRequest>();
  private preloadQueue: PreloadRequest[] = [];
  private maxConcurrentLoads = 3;
  private currentLoads = 0;
  private chunkSize = 256 * 1024; // 256KB chunks
  private networkMonitor = {
    speed: 0, // bytes per second
    latency: 0, // milliseconds
    lastUpdate: 0,
  };

  static getInstance(): ProgressiveLoader {
    if (!ProgressiveLoader.instance) {
      ProgressiveLoader.instance = new ProgressiveLoader();
    }
    return ProgressiveLoader.instance;
  }

  constructor() {
    this.cacheManager = CacheManager.getInstance();
    this.startNetworkMonitoring();
    this.startPreloadProcessor();
  }

  async loadModelProgressively(
    url: string,
    options: {
      priority?: 'high' | 'medium' | 'low';
      preload?: boolean;
      streaming?: boolean;
      onProgress?: (loaded: number, total: number) => void;
      onFirstChunk?: (chunk: ArrayBuffer) => void;
      onComplete?: (data: ArrayBuffer) => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<ArrayBuffer> {
    try {
      // Check cache first
      const cached = await this.cacheManager.getCachedModel(url);
      if (cached) {
        Logger.log(`Model loaded from cache: ${url}`);
        options.onComplete?.(cached);
        return cached;
      }

      // Determine loading strategy based on options and network conditions
      const strategy = this.determineLoadingStrategy(options);

      switch (strategy) {
        case 'stream':
          return await this.streamModel(url, options);
        case 'progressive':
          return await this.loadProgressiveChunks(url, options);
        case 'standard':
        default:
          return await this.loadStandard(url, options);
      }
    } catch (error) {
      Logger.error('Progressive loading failed:', error);
      options.onError?.(error as Error);
      throw error;
    }
  }

  private determineLoadingStrategy(options: any): 'stream' | 'progressive' | 'standard' {
    // Use streaming for slow connections or large files
    if (this.networkMonitor.speed < 1024 * 1024 || options.streaming) { // < 1MB/s
      return 'stream';
    }

    // Use progressive loading for medium-sized files
    if (options.priority === 'high' || this.networkMonitor.speed < 5 * 1024 * 1024) { // < 5MB/s
      return 'progressive';
    }

    // Use standard loading for fast connections
    return 'standard';
  }

  private async streamModel(
    url: string,
    options: any
  ): Promise<ArrayBuffer> {
    Logger.log(`Streaming model: ${url}`);

    return new Promise(async (resolve, reject) => {
      try {
        // Get content length
        const headResponse = await fetch(url, { method: 'HEAD' });
        const totalSize = parseInt(headResponse.headers.get('content-length') || '0');

        if (totalSize === 0) {
          // Fallback to standard loading
          return resolve(await this.loadStandard(url, options));
        }

        // Create streaming request
        const streamRequest: StreamingRequest = {
          url,
          totalSize,
          chunks: this.createChunks(totalSize),
          onProgress: options.onProgress,
          onComplete: resolve,
          onError: reject,
          onChunkLoaded: options.onFirstChunk ? (chunk) => {
            if (chunk.id === 'chunk-0' && options.onFirstChunk) {
              options.onFirstChunk(chunk.data!);
            }
          } : undefined,
        };

        this.activeStreams.set(url, streamRequest);
        await this.processStreamingRequest(streamRequest);

      } catch (error) {
        reject(error);
      }
    });
  }

  private createChunks(totalSize: number): LoadingChunk[] {
    const chunks: LoadingChunk[] = [];
    let offset = 0;
    let chunkIndex = 0;

    while (offset < totalSize) {
      const size = Math.min(this.chunkSize, totalSize - offset);
      
      // First few chunks are high priority for preview
      let priority: 'high' | 'medium' | 'low' = 'medium';
      if (chunkIndex < 3) priority = 'high';
      else if (chunkIndex > 10) priority = 'low';

      chunks.push({
        id: `chunk-${chunkIndex}`,
        offset,
        size,
        priority,
        loaded: false,
      });

      offset += size;
      chunkIndex++;
    }

    return chunks;
  }

  private async processStreamingRequest(request: StreamingRequest): Promise<void> {
    // Sort chunks by priority
    const sortedChunks = [...request.chunks].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Load chunks with concurrency control
    const loadPromises: Promise<void>[] = [];

    for (const chunk of sortedChunks) {
      if (this.currentLoads >= this.maxConcurrentLoads) {
        await Promise.race(loadPromises);
      }

      const loadPromise = this.loadChunk(request.url, chunk)
        .then(() => {
          this.currentLoads--;
          request.onChunkLoaded?.(chunk);
          this.updateProgress(request);
        })
        .catch((error) => {
          this.currentLoads--;
          Logger.error(`Failed to load chunk ${chunk.id}:`, error);
        });

      loadPromises.push(loadPromise);
      this.currentLoads++;
    }

    // Wait for all chunks to complete
    await Promise.all(loadPromises);

    // Assemble final data
    const finalData = this.assembleChunks(request.chunks);
    
    // Cache the complete model
    await this.cacheManager.cacheModel(request.url, finalData, {
      url: request.url,
      format: this.getFormatFromUrl(request.url),
      size: finalData.byteLength,
      triangles: 0, // Would be calculated by model processor
      lastAccessed: Date.now(),
      downloadCount: 1,
    });

    this.activeStreams.delete(request.url);
    request.onComplete?.(finalData);
  }

  private async loadChunk(url: string, chunk: LoadingChunk): Promise<void> {
    const startTime = performance.now();

    try {
      const response = await fetch(url, {
        headers: {
          Range: `bytes=${chunk.offset}-${chunk.offset + chunk.size - 1}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      chunk.data = await response.arrayBuffer();
      chunk.loaded = true;

      // Update network monitoring
      const duration = performance.now() - startTime;
      this.updateNetworkStats(chunk.size, duration);

      Logger.log(`Loaded chunk ${chunk.id}: ${chunk.size} bytes in ${duration.toFixed(1)}ms`);

    } catch (error) {
      Logger.error(`Failed to load chunk ${chunk.id}:`, error);
      throw error;
    }
  }

  private assembleChunks(chunks: LoadingChunk[]): ArrayBuffer {
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const result = new Uint8Array(totalSize);
    let offset = 0;

    // Sort chunks by their original offset
    const sortedChunks = [...chunks].sort((a, b) => a.offset - b.offset);

    for (const chunk of sortedChunks) {
      if (chunk.data) {
        result.set(new Uint8Array(chunk.data), offset);
        offset += chunk.size;
      }
    }

    return result.buffer;
  }

  private updateProgress(request: StreamingRequest): void {
    const loadedChunks = request.chunks.filter(chunk => chunk.loaded);
    const loadedSize = loadedChunks.reduce((sum, chunk) => sum + chunk.size, 0);
    
    request.onProgress?.(loadedSize, request.totalSize);
  }

  private async loadProgressiveChunks(
    url: string,
    options: any
  ): Promise<ArrayBuffer> {
    Logger.log(`Progressive loading: ${url}`);

    // Load first chunk immediately for preview
    const firstChunkSize = Math.min(this.chunkSize, 1024 * 1024); // Max 1MB for first chunk
    const firstChunk = await this.loadRangeRequest(url, 0, firstChunkSize);
    
    options.onFirstChunk?.(firstChunk);

    // Get total size
    const headResponse = await fetch(url, { method: 'HEAD' });
    const totalSize = parseInt(headResponse.headers.get('content-length') || '0');

    if (firstChunkSize >= totalSize) {
      // Small file, first chunk is everything
      options.onComplete?.(firstChunk);
      return firstChunk;
    }

    // Load remaining chunks
    const remainingSize = totalSize - firstChunkSize;
    const remainingData = await this.loadRangeRequest(url, firstChunkSize, remainingSize);

    // Combine chunks
    const finalData = new Uint8Array(totalSize);
    finalData.set(new Uint8Array(firstChunk), 0);
    finalData.set(new Uint8Array(remainingData), firstChunkSize);

    const result = finalData.buffer;
    options.onComplete?.(result);
    return result;
  }

  private async loadRangeRequest(url: string, offset: number, size: number): Promise<ArrayBuffer> {
    const response = await fetch(url, {
      headers: {
        Range: `bytes=${offset}-${offset + size - 1}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.arrayBuffer();
  }

  private async loadStandard(url: string, options: any): Promise<ArrayBuffer> {
    Logger.log(`Standard loading: ${url}`);

    const startTime = performance.now();
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const totalSize = parseInt(response.headers.get('content-length') || '0');
    const reader = response.body?.getReader();

    if (!reader || !totalSize) {
      // Simple loading without progress
      const data = await response.arrayBuffer();
      options.onComplete?.(data);
      return data;
    }

    // Loading with progress tracking
    const chunks: Uint8Array[] = [];
    let loadedSize = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        loadedSize += value.length;
        
        options.onProgress?.(loadedSize, totalSize);
      }
    } finally {
      reader.releaseLock();
    }

    // Combine chunks
    const finalData = new Uint8Array(loadedSize);
    let offset = 0;
    
    for (const chunk of chunks) {
      finalData.set(chunk, offset);
      offset += chunk.length;
    }

    const duration = performance.now() - startTime;
    this.updateNetworkStats(loadedSize, duration);

    const result = finalData.buffer;
    options.onComplete?.(result);
    return result;
  }

  private updateNetworkStats(bytes: number, duration: number): void {
    const speed = (bytes / (duration / 1000)); // bytes per second
    const now = Date.now();

    // Exponential moving average for smoothing
    const alpha = 0.3;
    this.networkMonitor.speed = this.networkMonitor.speed === 0 
      ? speed 
      : this.networkMonitor.speed * (1 - alpha) + speed * alpha;

    this.networkMonitor.latency = duration;
    this.networkMonitor.lastUpdate = now;
  }

  private startNetworkMonitoring(): void {
    // Periodic network quality assessment
    setInterval(async () => {
      try {
        const start = performance.now();
        const response = await fetch('data:text/plain,test', { method: 'HEAD' });
        const latency = performance.now() - start;
        
        if (response.ok) {
          this.networkMonitor.latency = latency;
        }
      } catch (error) {
        // Ignore network monitoring errors
      }
    }, 30000); // Every 30 seconds
  }

  private startPreloadProcessor(): void {
    setInterval(() => {
      this.processPreloadQueue();
    }, 1000); // Process preload queue every second
  }

  private async processPreloadQueue(): Promise<void> {
    if (this.preloadQueue.length === 0 || this.currentLoads >= this.maxConcurrentLoads) {
      return;
    }

    // Sort by priority (higher number = higher priority)
    this.preloadQueue.sort((a, b) => b.priority - a.priority);

    const request = this.preloadQueue.shift();
    if (!request) return;

    try {
      Logger.log(`Preloading model: ${request.url}`);
      await this.loadModelProgressively(request.url, {
        priority: 'low',
        preload: true,
      });
    } catch (error) {
      Logger.warn(`Preload failed for ${request.url}:`, error);
    }
  }

  preloadModel(url: string, priority: number = 1, estimatedSize?: number): void {
    // Don't preload if already cached or in queue
    if (this.preloadQueue.some(req => req.url === url)) {
      return;
    }

    this.preloadQueue.push({
      url,
      priority,
      estimatedSize: estimatedSize || 0,
      format: this.getFormatFromUrl(url),
    });

    Logger.log(`Model queued for preload: ${url} (priority: ${priority})`);
  }

  private getFormatFromUrl(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    const formatMap: Record<string, string> = {
      'glb': 'glb',
      'gltf': 'gltf',
      'fbx': 'fbx',
      'obj': 'obj',
    };
    return formatMap[extension || ''] || 'unknown';
  }

  getNetworkStats() {
    return {
      speed: this.networkMonitor.speed,
      latency: this.networkMonitor.latency,
      speedFormatted: this.formatSpeed(this.networkMonitor.speed),
      quality: this.getNetworkQuality(),
    };
  }

  private formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond < 1024) {
      return `${bytesPerSecond.toFixed(0)} B/s`;
    } else if (bytesPerSecond < 1024 * 1024) {
      return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    } else {
      return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
    }
  }

  private getNetworkQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const speedMBps = this.networkMonitor.speed / (1024 * 1024);
    
    if (speedMBps > 10) return 'excellent';
    if (speedMBps > 5) return 'good';
    if (speedMBps > 1) return 'fair';
    return 'poor';
  }

  cancelLoad(url: string): void {
    this.activeStreams.delete(url);
    this.preloadQueue = this.preloadQueue.filter(req => req.url !== url);
  }

  getActiveLoads(): string[] {
    return Array.from(this.activeStreams.keys());
  }

  getPreloadQueue(): PreloadRequest[] {
    return [...this.preloadQueue];
  }
}
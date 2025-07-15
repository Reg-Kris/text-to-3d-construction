/**
 * Text-to-3D Construction Platform - Texture Optimization Worker
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

interface TextureOptimizationTask {
  id: string;
  type: 'compress' | 'resize' | 'format' | 'quality' | 'generateMipmaps' | 'atlas';
  imageData: ImageData | ArrayBuffer;
  options: TextureOptimizationOptions;
}

interface TextureOptimizationOptions {
  targetFormat?: 'webp' | 'jpeg' | 'png' | 'ktx2' | 'basis';
  quality?: number; // 0-100
  maxWidth?: number;
  maxHeight?: number;
  generateMipmaps?: boolean;
  preserveAlpha?: boolean;
  compressionLevel?: number;
  targetSize?: number; // Target file size in bytes
  deviceCapabilities?: {
    webp: boolean;
    ktx2: boolean;
    basis: boolean;
    astc: boolean;
    etc2: boolean;
  };
}

interface OptimizationResult {
  id: string;
  success: boolean;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
  dimensions: { width: number; height: number };
  data: ArrayBuffer;
  mipmaps?: ArrayBuffer[];
  error?: string;
  processingTime: number;
}

class TextureOptimizer {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  public processingQueue: TextureOptimizationTask[] = [];
  public isProcessing = false;

  constructor() {
    this.canvas = new OffscreenCanvas(1, 1);
    this.ctx = this.canvas.getContext('2d')!;
    this.startProcessingLoop();
  }

  async optimizeTexture(task: TextureOptimizationTask): Promise<OptimizationResult> {
    const startTime = performance.now();
    
    try {
      // Convert input to ImageData
      let imageData: ImageData;
      let originalSize: number;

      if (task.imageData instanceof ImageData) {
        imageData = task.imageData;
        originalSize = imageData.width * imageData.height * 4;
      } else {
        const result = await this.arrayBufferToImageData(task.imageData);
        imageData = result.imageData;
        originalSize = task.imageData.byteLength;
      }

      // Apply optimizations based on task type
      let optimizedData: ArrayBuffer;
      let format: string;
      let mipmaps: ArrayBuffer[] | undefined;

      switch (task.type) {
        case 'compress':
          ({ data: optimizedData, format } = await this.compressTexture(imageData, task.options));
          break;
        case 'resize':
          ({ data: optimizedData, format } = await this.resizeTexture(imageData, task.options));
          break;
        case 'format':
          ({ data: optimizedData, format } = await this.convertFormat(imageData, task.options));
          break;
        case 'quality':
          ({ data: optimizedData, format } = await this.adjustQuality(imageData, task.options));
          break;
        case 'generateMipmaps':
          ({ data: optimizedData, format, mipmaps } = await this.generateMipmaps(imageData, task.options));
          break;
        case 'atlas':
          ({ data: optimizedData, format } = await this.createTextureAtlas(imageData, task.options));
          break;
        default:
          throw new Error(`Unknown optimization type: ${task.type}`);
      }

      const endTime = performance.now();
      const compressionRatio = optimizedData.byteLength / originalSize;

      return {
        id: task.id,
        success: true,
        originalSize,
        optimizedSize: optimizedData.byteLength,
        compressionRatio,
        format,
        dimensions: { width: imageData.width, height: imageData.height },
        data: optimizedData,
        mipmaps,
        processingTime: endTime - startTime,
      };
    } catch (error) {
      return {
        id: task.id,
        success: false,
        originalSize: 0,
        optimizedSize: 0,
        compressionRatio: 1,
        format: 'error',
        dimensions: { width: 0, height: 0 },
        data: new ArrayBuffer(0),
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: performance.now() - startTime,
      };
    }
  }

  private async arrayBufferToImageData(buffer: ArrayBuffer): Promise<{
    imageData: ImageData;
    format: string;
  }> {
    // Create a blob from the array buffer
    const blob = new Blob([buffer]);
    
    // Create an image bitmap
    const imageBitmap = await createImageBitmap(blob);
    
    // Set canvas size and draw the image
    this.canvas.width = imageBitmap.width;
    this.canvas.height = imageBitmap.height;
    this.ctx.drawImage(imageBitmap, 0, 0);
    
    // Get image data
    const imageData = this.ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
    
    // Try to detect format from the first few bytes
    const uint8Array = new Uint8Array(buffer.slice(0, 8));
    let format = 'unknown';
    
    if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
      format = 'png';
    } else if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
      format = 'jpeg';
    } else if (uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && uint8Array[10] === 0x42 && uint8Array[11] === 0x50) {
      format = 'webp';
    }
    
    imageBitmap.close();
    
    return { imageData, format };
  }

  private async compressTexture(
    imageData: ImageData,
    options: TextureOptimizationOptions
  ): Promise<{ data: ArrayBuffer; format: string }> {
    // Choose best format based on device capabilities and image characteristics
    const targetFormat = this.chooseBestFormat(imageData, options);
    
    // Resize if needed
    let processedImageData = imageData;
    if (options.maxWidth || options.maxHeight) {
      processedImageData = await this.resizeImageData(imageData, options);
    }
    
    // Convert to target format
    return await this.convertToFormat(processedImageData, targetFormat, options);
  }

  private async resizeTexture(
    imageData: ImageData,
    options: TextureOptimizationOptions
  ): Promise<{ data: ArrayBuffer; format: string }> {
    const resizedImageData = await this.resizeImageData(imageData, options);
    const format = options.targetFormat || 'png';
    return await this.convertToFormat(resizedImageData, format, options);
  }

  private async convertFormat(
    imageData: ImageData,
    options: TextureOptimizationOptions
  ): Promise<{ data: ArrayBuffer; format: string }> {
    const format = options.targetFormat || 'webp';
    return await this.convertToFormat(imageData, format, options);
  }

  private async adjustQuality(
    imageData: ImageData,
    options: TextureOptimizationOptions
  ): Promise<{ data: ArrayBuffer; format: string }> {
    const format = options.targetFormat || 'jpeg';
    const quality = options.quality || 85;
    
    return await this.convertToFormat(imageData, format, { ...options, quality });
  }

  private async generateMipmaps(
    imageData: ImageData,
    options: TextureOptimizationOptions
  ): Promise<{ data: ArrayBuffer; format: string; mipmaps: ArrayBuffer[] }> {
    const mipmaps: ArrayBuffer[] = [];
    let currentImageData = imageData;
    let level = 0;
    
    // Generate mipmaps until we reach 1x1 or a minimum size
    while (currentImageData.width > 1 && currentImageData.height > 1 && level < 10) {
      level++;
      
      // Resize to half the dimensions
      const newWidth = Math.max(1, Math.floor(currentImageData.width / 2));
      const newHeight = Math.max(1, Math.floor(currentImageData.height / 2));
      
      currentImageData = await this.resizeImageData(currentImageData, {
        maxWidth: newWidth,
        maxHeight: newHeight,
      });
      
      // Convert to specified format
      const { data } = await this.convertToFormat(
        currentImageData,
        options.targetFormat || 'png',
        options
      );
      
      mipmaps.push(data);
    }
    
    // Convert original to specified format
    const { data, format } = await this.convertToFormat(
      imageData,
      options.targetFormat || 'png',
      options
    );
    
    return { data, format, mipmaps };
  }

  private async createTextureAtlas(
    imageData: ImageData,
    options: TextureOptimizationOptions
  ): Promise<{ data: ArrayBuffer; format: string }> {
    // This would combine multiple textures into a single atlas
    // For now, just return the original image
    const format = options.targetFormat || 'png';
    return await this.convertToFormat(imageData, format, options);
  }

  private async resizeImageData(
    imageData: ImageData,
    options: TextureOptimizationOptions
  ): Promise<ImageData> {
    const { width: originalWidth, height: originalHeight } = imageData;
    
    // Calculate new dimensions
    let newWidth = originalWidth;
    let newHeight = originalHeight;
    
    if (options.maxWidth && newWidth > options.maxWidth) {
      const ratio = options.maxWidth / newWidth;
      newWidth = options.maxWidth;
      newHeight = Math.floor(newHeight * ratio);
    }
    
    if (options.maxHeight && newHeight > options.maxHeight) {
      const ratio = options.maxHeight / newHeight;
      newHeight = options.maxHeight;
      newWidth = Math.floor(newWidth * ratio);
    }
    
    // Ensure power of 2 dimensions for GPU optimization
    newWidth = this.nearestPowerOfTwo(newWidth);
    newHeight = this.nearestPowerOfTwo(newHeight);
    
    if (newWidth === originalWidth && newHeight === originalHeight) {
      return imageData;
    }
    
    // Resize using canvas
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;
    
    // Use high-quality scaling
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    // Create temporary canvas for source image
    const sourceCanvas = new OffscreenCanvas(originalWidth, originalHeight);
    const sourceCtx = sourceCanvas.getContext('2d')!;
    sourceCtx.putImageData(imageData, 0, 0);
    
    // Draw resized image
    this.ctx.drawImage(sourceCanvas, 0, 0, originalWidth, originalHeight, 0, 0, newWidth, newHeight);
    
    return this.ctx.getImageData(0, 0, newWidth, newHeight);
  }

  private async convertToFormat(
    imageData: ImageData,
    format: string,
    options: TextureOptimizationOptions
  ): Promise<{ data: ArrayBuffer; format: string }> {
    // Set canvas size and draw image data
    this.canvas.width = imageData.width;
    this.canvas.height = imageData.height;
    this.ctx.putImageData(imageData, 0, 0);
    
    // Convert to blob with specified format and quality
    let mimeType: string;
    let quality: number | undefined;
    
    switch (format) {
      case 'webp':
        mimeType = 'image/webp';
        quality = (options.quality || 85) / 100;
        break;
      case 'jpeg':
        mimeType = 'image/jpeg';
        quality = (options.quality || 85) / 100;
        break;
      case 'png':
        mimeType = 'image/png';
        break;
      default:
        mimeType = 'image/png';
        format = 'png';
    }
    
    const blob = await this.canvas.convertToBlob({
      type: mimeType,
      quality,
    });
    
    // Convert blob to array buffer
    const arrayBuffer = await blob.arrayBuffer();
    
    return { data: arrayBuffer, format };
  }

  private chooseBestFormat(
    imageData: ImageData,
    options: TextureOptimizationOptions
  ): string {
    if (options.targetFormat) {
      return options.targetFormat;
    }
    
    const hasAlpha = this.hasTransparency(imageData);
    const capabilities = options.deviceCapabilities;
    
    // Choose format based on device capabilities and image characteristics
    if (capabilities?.webp && (!hasAlpha || options.preserveAlpha !== false)) {
      return 'webp';
    } else if (hasAlpha && options.preserveAlpha !== false) {
      return 'png';
    } else {
      return 'jpeg';
    }
  }

  private hasTransparency(imageData: ImageData): boolean {
    const data = imageData.data;
    
    // Check alpha channel
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true;
      }
    }
    
    return false;
  }

  private nearestPowerOfTwo(value: number): number {
    return Math.pow(2, Math.round(Math.log2(value)));
  }

  private startProcessingLoop(): void {
    const processNext = async () => {
      if (this.processingQueue.length > 0 && !this.isProcessing) {
        this.isProcessing = true;
        const task = this.processingQueue.shift()!;
        const result = await this.optimizeTexture(task);
        
        self.postMessage({
          type: 'TEXTURE_OPTIMIZED',
          result,
        });
        
        this.isProcessing = false;
      }
      
      requestAnimationFrame(processNext);
    };
    
    requestAnimationFrame(processNext);
  }

  // Batch optimization for multiple textures
  async optimizeBatch(tasks: TextureOptimizationTask[]): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];
    
    for (const task of tasks) {
      const result = await this.optimizeTexture(task);
      results.push(result);
      
      // Send progress update
      self.postMessage({
        type: 'BATCH_PROGRESS',
        completed: results.length,
        total: tasks.length,
        currentResult: result,
      });
    }
    
    return results;
  }

  // Advanced compression using modern formats
  async compressToModernFormat(
    imageData: ImageData,
    options: TextureOptimizationOptions
  ): Promise<{ data: ArrayBuffer; format: string }> {
    const capabilities = options.deviceCapabilities;
    
    // Try to use the most efficient format available
    if (capabilities?.ktx2) {
      return await this.compressToKTX2(imageData, options);
    } else if (capabilities?.basis) {
      return await this.compressToBasis(imageData, options);
    } else if (capabilities?.webp) {
      return await this.convertToFormat(imageData, 'webp', options);
    } else {
      return await this.convertToFormat(imageData, 'jpeg', options);
    }
  }

  private async compressToKTX2(
    imageData: ImageData,
    options: TextureOptimizationOptions
  ): Promise<{ data: ArrayBuffer; format: string }> {
    // KTX2 compression would require a separate library
    // For now, fallback to WebP
    return await this.convertToFormat(imageData, 'webp', options);
  }

  private async compressToBasis(
    imageData: ImageData,
    options: TextureOptimizationOptions
  ): Promise<{ data: ArrayBuffer; format: string }> {
    // Basis compression would require the Basis library
    // For now, fallback to WebP
    return await this.convertToFormat(imageData, 'webp', options);
  }
}

// Worker instance
const optimizer = new TextureOptimizer();

// Handle messages from main thread
self.addEventListener('message', async (event) => {
  const { type, task, tasks } = event.data;

  switch (type) {
    case 'OPTIMIZE_TEXTURE':
      optimizer.processingQueue.push(task);
      break;

    case 'OPTIMIZE_BATCH':
      const results = await optimizer.optimizeBatch(tasks);
      self.postMessage({
        type: 'BATCH_COMPLETE',
        results,
      });
      break;

    case 'GET_QUEUE_STATUS':
      self.postMessage({
        type: 'QUEUE_STATUS',
        queueLength: optimizer.processingQueue.length,
        isProcessing: optimizer.isProcessing,
      });
      break;

    case 'CLEAR_QUEUE':
      optimizer.processingQueue.length = 0;
      self.postMessage({
        type: 'QUEUE_CLEARED',
      });
      break;

    default:
      console.warn('[TextureOptimizer] Unknown message type:', type);
  }
});

// Notify main thread that worker is ready
self.postMessage({
  type: 'WORKER_READY',
  capabilities: {
    formats: ['webp', 'jpeg', 'png'],
    compression: true,
    resizing: true,
    mipmaps: true,
    batch: true,
    qualityAdjustment: true,
  },
});
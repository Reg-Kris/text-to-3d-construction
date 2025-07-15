/**
 * Text-to-3D Construction Platform - Advanced Cache Manager
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { Logger } from '../utils/logger';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size in bytes
  compression?: boolean;
}

interface CachedItem {
  data: any;
  timestamp: number;
  ttl: number;
  size: number;
  version: string;
}

interface ModelCacheMetadata {
  url: string;
  format: string;
  size: number;
  triangles: number;
  lastAccessed: number;
  downloadCount: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private dbName = 'text-to-3d-cache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private memoryCache = new Map<string, CachedItem>();
  private cacheApi: Cache | null = null;
  private maxMemorySize = 50 * 1024 * 1024; // 50MB in memory
  private currentMemorySize = 0;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.initIndexedDB();
      await this.initCacheAPI();
      await this.cleanupExpiredCache();
      Logger.log('CacheManager initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize CacheManager:', error);
    }
  }

  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        Logger.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('models')) {
          const modelStore = db.createObjectStore('models', { keyPath: 'url' });
          modelStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          modelStore.createIndex('size', 'size', { unique: false });
        }

        if (!db.objectStoreNames.contains('textures')) {
          const textureStore = db.createObjectStore('textures', { keyPath: 'url' });
          textureStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  private async initCacheAPI(): Promise<void> {
    if ('caches' in window) {
      try {
        this.cacheApi = await caches.open('text-to-3d-v1');
        Logger.log('Browser Cache API initialized');
      } catch (error) {
        Logger.warn('Browser Cache API not available:', error);
      }
    }
  }

  async cacheModel(
    url: string,
    data: ArrayBuffer,
    metadata: ModelCacheMetadata,
    options: CacheOptions = {}
  ): Promise<void> {
    const key = this.generateCacheKey(url);
    const ttl = options.ttl || 24 * 60 * 60 * 1000; // 24 hours default
    const version = this.generateVersion();

    try {
      // Store in IndexedDB for persistence
      await this.storeInIndexedDB('models', {
        url: key,
        data,
        metadata,
        timestamp: Date.now(),
        ttl,
        version,
      });

      // Store metadata separately for quick access
      await this.storeInIndexedDB('metadata', {
        key,
        ...metadata,
        cachedAt: Date.now(),
        ttl,
        version,
      });

      // Store in Browser Cache API if available
      if (this.cacheApi) {
        const response = new Response(data, {
          headers: {
            'Content-Type': this.getContentType(metadata.format),
            'Cache-Control': `max-age=${ttl / 1000}`,
            'X-Cache-Version': version,
          },
        });
        await this.cacheApi.put(url, response);
      }

      Logger.log(`Model cached: ${url} (${this.formatBytes(data.byteLength)})`);
    } catch (error) {
      Logger.error('Failed to cache model:', error);
    }
  }

  async getCachedModel(url: string): Promise<ArrayBuffer | null> {
    const key = this.generateCacheKey(url);

    try {
      // Try memory cache first
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem && !this.isExpired(memoryItem)) {
        return memoryItem.data;
      }

      // Try Browser Cache API
      if (this.cacheApi) {
        const cachedResponse = await this.cacheApi.match(url);
        if (cachedResponse) {
          const data = await cachedResponse.arrayBuffer();
          this.addToMemoryCache(key, data, { ttl: 60 * 60 * 1000 }); // 1 hour in memory
          await this.updateLastAccessed(key);
          return data;
        }
      }

      // Try IndexedDB
      const cachedItem = await this.getFromIndexedDB('models', key);
      if (cachedItem && !this.isExpired(cachedItem)) {
        this.addToMemoryCache(key, cachedItem.data, { ttl: 60 * 60 * 1000 });
        await this.updateLastAccessed(key);
        return cachedItem.data;
      }

      return null;
    } catch (error) {
      Logger.error('Failed to get cached model:', error);
      return null;
    }
  }

  async cacheTexture(url: string, data: ArrayBuffer, options: CacheOptions = {}): Promise<void> {
    const key = this.generateCacheKey(url);
    const ttl = options.ttl || 7 * 24 * 60 * 60 * 1000; // 7 days default

    try {
      await this.storeInIndexedDB('textures', {
        url: key,
        data: options.compression ? await this.compressData(data) : data,
        timestamp: Date.now(),
        ttl,
        compressed: !!options.compression,
      });

      Logger.log(`Texture cached: ${url} (${this.formatBytes(data.byteLength)})`);
    } catch (error) {
      Logger.error('Failed to cache texture:', error);
    }
  }

  async getCachedTexture(url: string): Promise<ArrayBuffer | null> {
    const key = this.generateCacheKey(url);

    try {
      const cachedItem = await this.getFromIndexedDB('textures', key);
      if (cachedItem && !this.isExpired(cachedItem)) {
        const data = cachedItem.compressed 
          ? await this.decompressData(cachedItem.data)
          : cachedItem.data;
        
        await this.updateLastAccessed(key);
        return data;
      }
      return null;
    } catch (error) {
      Logger.error('Failed to get cached texture:', error);
      return null;
    }
  }

  async getCacheStats(): Promise<{
    totalSize: number;
    modelCount: number;
    textureCount: number;
    memoryUsage: number;
    oldestItem: number;
    newestItem: number;
  }> {
    try {
      const models = await this.getAllFromStore('models');
      const textures = await this.getAllFromStore('textures');

      const totalSize = [...models, ...textures].reduce((sum, item) => {
        return sum + (item.data?.byteLength || 0);
      }, 0);

      const timestamps = [...models, ...textures]
        .map(item => item.timestamp)
        .filter(Boolean);

      return {
        totalSize,
        modelCount: models.length,
        textureCount: textures.length,
        memoryUsage: this.currentMemorySize,
        oldestItem: Math.min(...timestamps) || 0,
        newestItem: Math.max(...timestamps) || 0,
      };
    } catch (error) {
      Logger.error('Failed to get cache stats:', error);
      return {
        totalSize: 0,
        modelCount: 0,
        textureCount: 0,
        memoryUsage: this.currentMemorySize,
        oldestItem: 0,
        newestItem: 0,
      };
    }
  }

  async clearExpiredCache(): Promise<void> {
    try {
      const now = Date.now();
      
      // Clear expired models
      const models = await this.getAllFromStore('models');
      for (const model of models) {
        if (this.isExpired(model)) {
          await this.deleteFromIndexedDB('models', model.url);
        }
      }

      // Clear expired textures
      const textures = await this.getAllFromStore('textures');
      for (const texture of textures) {
        if (this.isExpired(texture)) {
          await this.deleteFromIndexedDB('textures', texture.url);
        }
      }

      // Clear memory cache
      for (const [key, item] of this.memoryCache.entries()) {
        if (this.isExpired(item)) {
          this.memoryCache.delete(key);
          this.currentMemorySize -= item.size;
        }
      }

      Logger.log('Expired cache cleared');
    } catch (error) {
      Logger.error('Failed to clear expired cache:', error);
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      // Clear IndexedDB
      if (this.db) {
        const transaction = this.db.transaction(['models', 'textures', 'metadata'], 'readwrite');
        await Promise.all([
          this.clearObjectStore(transaction.objectStore('models')),
          this.clearObjectStore(transaction.objectStore('textures')),
          this.clearObjectStore(transaction.objectStore('metadata')),
        ]);
      }

      // Clear Browser Cache API
      if (this.cacheApi) {
        const keys = await this.cacheApi.keys();
        await Promise.all(keys.map(key => this.cacheApi!.delete(key)));
      }

      // Clear memory cache
      this.memoryCache.clear();
      this.currentMemorySize = 0;

      Logger.log('All cache cleared');
    } catch (error) {
      Logger.error('Failed to clear all cache:', error);
    }
  }

  private async cleanupExpiredCache(): Promise<void> {
    await this.clearExpiredCache();
    
    // Schedule periodic cleanup
    setInterval(() => {
      this.clearExpiredCache();
    }, 60 * 60 * 1000); // Every hour
  }

  private addToMemoryCache(key: string, data: any, options: CacheOptions = {}): void {
    const size = data.byteLength || JSON.stringify(data).length;
    const ttl = options.ttl || 60 * 60 * 1000; // 1 hour default

    // Check if adding this item would exceed memory limit
    if (this.currentMemorySize + size > this.maxMemorySize) {
      this.evictLRUItems(size);
    }

    const item: CachedItem = {
      data,
      timestamp: Date.now(),
      ttl,
      size,
      version: this.generateVersion(),
    };

    this.memoryCache.set(key, item);
    this.currentMemorySize += size;
  }

  private evictLRUItems(spaceNeeded: number): void {
    const sortedEntries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    let freedSpace = 0;
    for (const [key, item] of sortedEntries) {
      this.memoryCache.delete(key);
      this.currentMemorySize -= item.size;
      freedSpace += item.size;

      if (freedSpace >= spaceNeeded) {
        break;
      }
    }
  }

  private async storeInIndexedDB(storeName: string, data: any): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getFromIndexedDB(storeName: string, key: string): Promise<any> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromIndexedDB(storeName: string, key: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllFromStore(storeName: string): Promise<any[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async clearObjectStore(store: IDBObjectStore): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async updateLastAccessed(key: string): Promise<void> {
    try {
      const metadata = await this.getFromIndexedDB('metadata', key);
      if (metadata) {
        metadata.lastAccessed = Date.now();
        await this.storeInIndexedDB('metadata', metadata);
      }
    } catch (error) {
      Logger.warn('Failed to update last accessed time:', error);
    }
  }

  private isExpired(item: CachedItem): boolean {
    return Date.now() > item.timestamp + item.ttl;
  }

  private generateCacheKey(url: string): string {
    return btoa(url).replace(/[+/=]/g, '');
  }

  private generateVersion(): string {
    return Date.now().toString(36);
  }

  private getContentType(format: string): string {
    const contentTypes: Record<string, string> = {
      'glb': 'model/gltf-binary',
      'gltf': 'model/gltf+json',
      'fbx': 'application/octet-stream',
      'obj': 'text/plain',
    };
    return contentTypes[format.toLowerCase()] || 'application/octet-stream';
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async compressData(data: ArrayBuffer): Promise<ArrayBuffer> {
    // Simple compression using CompressionStream if available
    if ('CompressionStream' in window) {
      try {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new Uint8Array(data));
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }
        
        return compressed.buffer;
      } catch (error) {
        Logger.warn('Compression failed, storing uncompressed:', error);
      }
    }
    return data;
  }

  private async decompressData(data: ArrayBuffer): Promise<ArrayBuffer> {
    if ('DecompressionStream' in window) {
      try {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new Uint8Array(data));
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }
        
        return decompressed.buffer;
      } catch (error) {
        Logger.warn('Decompression failed:', error);
      }
    }
    return data;
  }
}
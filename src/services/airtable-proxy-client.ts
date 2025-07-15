/**
 * Text-to-3D Construction Platform - Airtable Proxy Client
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 *
 * Proxy-enabled Airtable client to avoid CORS issues
 */

import { ApiClient } from '../api-client';
import { logger } from '../utils/logger';

export interface AirtableRecord {
  id?: string;
  fields: Record<string, any>;
  createdTime?: string;
}

export interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

export interface OptimisticUpdate {
  id: string;
  table: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  pending: boolean;
  retryCount: number;
  originalData?: any;
}

export interface BatchOperation {
  id: string;
  table: string;
  operations: Array<{
    type: 'create' | 'update' | 'delete';
    recordId?: string;
    fields?: Record<string, any>;
  }>;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
  retryCount: number;
}

export interface SyncState {
  lastSync: number;
  pendingUpdates: Map<string, OptimisticUpdate>;
  syncInProgress: boolean;
  connectionState: 'online' | 'offline' | 'syncing';
}

export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  etag?: string;
}

export class AirtableProxyClient {
  private static cache = new Map<string, CacheEntry>();
  private static syncState: SyncState = {
    lastSync: 0,
    pendingUpdates: new Map(),
    syncInProgress: false,
    connectionState: 'online',
  };
  private static batchQueue: BatchOperation[] = [];
  private static eventListeners = new Map<string, Set<Function>>();
  private static maxRetries = 3;
  private static batchDelay = 2000; // 2 seconds
  private static batchTimer: number | null = null;
  /**
   * Get records from a table with optional filtering
   */
  static async getRecords(
    tableName: string,
    options: {
      filterByFormula?: string;
      sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
      maxRecords?: number;
      pageSize?: number;
      offset?: string;
      fields?: string[];
    } = {},
  ): Promise<AirtableResponse> {
    const params = new URLSearchParams();

    if (options.filterByFormula) {
      params.append('filterByFormula', options.filterByFormula);
    }

    if (options.sort) {
      options.sort.forEach((sort, index) => {
        params.append(`sort[${index}][field]`, sort.field);
        params.append(`sort[${index}][direction]`, sort.direction);
      });
    }

    if (options.maxRecords) {
      params.append('maxRecords', options.maxRecords.toString());
    }

    if (options.pageSize) {
      params.append('pageSize', options.pageSize.toString());
    }

    if (options.offset) {
      params.append('offset', options.offset);
    }

    if (options.fields) {
      options.fields.forEach((field) => {
        params.append('fields[]', field);
      });
    }

    const path = `/${tableName}?${params.toString()}`;
    const response = await ApiClient.airtableGet<AirtableResponse>(path);

    if (!response.success) {
      throw new Error(
        `Failed to get ${tableName} records: ${response.error || response.message}`,
      );
    }

    return response.data;
  }

  /**
   * Create a new record
   */
  static async createRecord(
    tableName: string,
    fields: Record<string, any>,
  ): Promise<AirtableRecord> {
    const path = `/${tableName}`;
    const response = await ApiClient.airtablePost<AirtableRecord>(path, {
      fields,
    });

    if (!response.success) {
      throw new Error(
        `Failed to create ${tableName} record: ${response.error || response.message}`,
      );
    }

    return response.data;
  }

  /**
   * Update an existing record
   */
  static async updateRecord(
    tableName: string,
    recordId: string,
    fields: Record<string, any>,
  ): Promise<AirtableRecord> {
    const path = `/${tableName}/${recordId}`;
    const response = await ApiClient.airtablePatch<AirtableRecord>(path, {
      fields,
    });

    if (!response.success) {
      throw new Error(
        `Failed to update ${tableName} record: ${response.error || response.message}`,
      );
    }

    return response.data;
  }

  /**
   * Get a single record by ID
   */
  static async getRecord(
    tableName: string,
    recordId: string,
  ): Promise<AirtableRecord> {
    const path = `/${tableName}/${recordId}`;
    const response = await ApiClient.airtableGet<AirtableRecord>(path);

    if (!response.success) {
      throw new Error(
        `Failed to get ${tableName} record: ${response.error || response.message}`,
      );
    }

    return response.data;
  }

  /**
   * Create multiple records in batch
   */
  static async createRecords(
    tableName: string,
    records: Array<{ fields: Record<string, any> }>,
  ): Promise<AirtableRecord[]> {
    const path = `/${tableName}`;
    const response = await ApiClient.airtablePost<{
      records: AirtableRecord[];
    }>(path, {
      records,
    });

    if (!response.success) {
      throw new Error(
        `Failed to create ${tableName} records: ${response.error || response.message}`,
      );
    }

    return response.data.records;
  }

  /**
   * Test connection to Airtable
   */
  static async testConnection(): Promise<boolean> {
    try {
      await this.getRecords('Projects', { maxRecords: 1 });
      return true;
    } catch (error) {
      console.error('Airtable proxy connection test failed:', error);
      return false;
    }
  }

  /**
   * Get records with pagination support
   */
  static async getAllRecords(
    tableName: string,
    options: {
      filterByFormula?: string;
      sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
      fields?: string[];
    } = {},
  ): Promise<AirtableRecord[]> {
    const allRecords: AirtableRecord[] = [];
    let offset: string | undefined;

    do {
      const response = await this.getRecords(tableName, {
        ...options,
        pageSize: 100, // Max page size for Airtable
        offset,
      });

      allRecords.push(...response.records);
      offset = response.offset;
    } while (offset);

    return allRecords;
  }

  /**
   * Delete a record
   */
  static async deleteRecord(tableName: string, recordId: string): Promise<void> {
    const path = `/${tableName}/${recordId}`;
    const response = await ApiClient.airtableDelete(path);

    if (!response.success) {
      throw new Error(
        `Failed to delete ${tableName} record: ${response.error || response.message}`,
      );
    }
  }

  // Enhanced Methods with Optimistic Updates and Batch Operations

  /**
   * Create record with optimistic update
   */
  static async createRecordOptimistic(
    tableName: string,
    fields: Record<string, any>,
    optimistic: boolean = true
  ): Promise<AirtableRecord> {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (optimistic) {
      // Apply optimistic update immediately
      const optimisticRecord: AirtableRecord = {
        id: tempId,
        fields,
        createdTime: new Date().toISOString(),
      };

      this.addOptimisticUpdate({
        id: tempId,
        table: tableName,
        operation: 'create',
        data: optimisticRecord,
        timestamp: Date.now(),
        pending: true,
        retryCount: 0,
      });

      // Emit optimistic update event
      this.emit('optimistic-create', { table: tableName, record: optimisticRecord });

      // Schedule actual API call
      this.queueBatchOperation({
        id: tempId,
        table: tableName,
        operations: [{ type: 'create', fields }],
        priority: 'medium',
        timestamp: Date.now(),
        retryCount: 0,
      });

      return optimisticRecord;
    }

    // Non-optimistic fallback
    return await this.createRecord(tableName, fields);
  }

  /**
   * Update record with optimistic update
   */
  static async updateRecordOptimistic(
    tableName: string,
    recordId: string,
    fields: Record<string, any>,
    optimistic: boolean = true
  ): Promise<AirtableRecord> {
    if (optimistic) {
      // Get current record for rollback
      const originalRecord = await this.getCachedRecord(tableName, recordId);
      
      // Apply optimistic update
      const optimisticRecord: AirtableRecord = {
        id: recordId,
        fields: { ...originalRecord?.fields, ...fields },
        createdTime: originalRecord?.createdTime,
      };

      this.addOptimisticUpdate({
        id: recordId,
        table: tableName,
        operation: 'update',
        data: optimisticRecord,
        timestamp: Date.now(),
        pending: true,
        retryCount: 0,
        originalData: originalRecord,
      });

      // Update cache
      this.updateCache(`${tableName}:${recordId}`, optimisticRecord);

      // Emit optimistic update event
      this.emit('optimistic-update', { table: tableName, record: optimisticRecord });

      // Schedule actual API call
      this.queueBatchOperation({
        id: `update_${recordId}_${Date.now()}`,
        table: tableName,
        operations: [{ type: 'update', recordId, fields }],
        priority: 'medium',
        timestamp: Date.now(),
        retryCount: 0,
      });

      return optimisticRecord;
    }

    // Non-optimistic fallback
    return await this.updateRecord(tableName, recordId, fields);
  }

  /**
   * Delete record with optimistic update
   */
  static async deleteRecordOptimistic(
    tableName: string,
    recordId: string,
    optimistic: boolean = true
  ): Promise<void> {
    if (optimistic) {
      // Get current record for rollback
      const originalRecord = await this.getCachedRecord(tableName, recordId);

      this.addOptimisticUpdate({
        id: recordId,
        table: tableName,
        operation: 'delete',
        data: null,
        timestamp: Date.now(),
        pending: true,
        retryCount: 0,
        originalData: originalRecord,
      });

      // Remove from cache
      this.removeFromCache(`${tableName}:${recordId}`);

      // Emit optimistic delete event
      this.emit('optimistic-delete', { table: tableName, recordId });

      // Schedule actual API call
      this.queueBatchOperation({
        id: `delete_${recordId}_${Date.now()}`,
        table: tableName,
        operations: [{ type: 'delete', recordId }],
        priority: 'medium',
        timestamp: Date.now(),
        retryCount: 0,
      });

      return;
    }

    // Non-optimistic fallback
    return await this.deleteRecord(tableName, recordId);
  }

  /**
   * Batch operations with automatic batching
   */
  static async batchOperations(
    tableName: string,
    operations: Array<{
      type: 'create' | 'update' | 'delete';
      recordId?: string;
      fields?: Record<string, any>;
    }>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<AirtableRecord[]> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (priority === 'high') {
      // Execute immediately for high priority
      return await this.executeBatchOperations(tableName, operations);
    }

    // Queue for batching
    this.queueBatchOperation({
      id: batchId,
      table: tableName,
      operations,
      priority,
      timestamp: Date.now(),
      retryCount: 0,
    });

    // Return optimistic results
    return operations.map((op, index) => ({
      id: op.recordId || `temp_${batchId}_${index}`,
      fields: op.fields || {},
    }));
  }

  /**
   * Execute batch operations immediately
   */
  private static async executeBatchOperations(
    tableName: string,
    operations: Array<{
      type: 'create' | 'update' | 'delete';
      recordId?: string;
      fields?: Record<string, any>;
    }>
  ): Promise<AirtableRecord[]> {
    const results: AirtableRecord[] = [];

    // Group operations by type for efficiency
    const createOps = operations.filter(op => op.type === 'create');
    const updateOps = operations.filter(op => op.type === 'update');
    const deleteOps = operations.filter(op => op.type === 'delete');

    try {
      // Execute creates in batch
      if (createOps.length > 0) {
        const createRecords = createOps.map(op => ({ fields: op.fields! }));
        const chunks = this.chunkArray(createRecords, 10); // Airtable limit: 10 per batch

        for (const chunk of chunks) {
          const created = await this.createRecords(tableName, chunk);
          results.push(...created);
        }
      }

      // Execute updates individually (Airtable limitation)
      for (const op of updateOps) {
        if (op.recordId && op.fields) {
          const updated = await this.updateRecord(tableName, op.recordId, op.fields);
          results.push(updated);
        }
      }

      // Execute deletes individually
      for (const op of deleteOps) {
        if (op.recordId) {
          await this.deleteRecord(tableName, op.recordId);
        }
      }

      logger.info(`Batch operations completed: ${operations.length} operations on ${tableName}`);
      return results;

    } catch (error) {
      logger.error('Batch operations failed:', undefined, error);
      throw error;
    }
  }

  /**
   * Get records with intelligent caching
   */
  static async getRecordsCached(
    tableName: string,
    options: {
      filterByFormula?: string;
      sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
      maxRecords?: number;
      pageSize?: number;
      offset?: string;
      fields?: string[];
      cacheTTL?: number;
      forceRefresh?: boolean;
    } = {},
  ): Promise<AirtableResponse> {
    const cacheKey = this.generateCacheKey(tableName, options);
    const cached = this.getFromCache(cacheKey);

    if (cached && !options.forceRefresh) {
      logger.info(`Cache hit for ${tableName} query`);
      return cached;
    }

    // Fetch from API
    const response = await this.getRecords(tableName, options);
    
    // Cache the response
    this.setCache(cacheKey, response, options.cacheTTL || 300000); // 5 minutes default

    return response;
  }

  /**
   * Real-time sync management
   */
  static async syncPendingUpdates(): Promise<void> {
    if (this.syncState.syncInProgress) {
      logger.info('Sync already in progress, skipping');
      return;
    }

    this.syncState.syncInProgress = true;
    this.syncState.connectionState = 'syncing';
    this.emit('sync-start');

    try {
      const updates = Array.from(this.syncState.pendingUpdates.values());
      const failed: OptimisticUpdate[] = [];

      for (const update of updates) {
        try {
          await this.applySyncUpdate(update);
          this.syncState.pendingUpdates.delete(update.id);
          this.emit('sync-success', update);
        } catch (error) {
          logger.error(`Sync failed for update ${update.id}:`, undefined, error);
          
          update.retryCount++;
          if (update.retryCount >= this.maxRetries) {
            // Rollback optimistic update
            await this.rollbackOptimisticUpdate(update);
            this.syncState.pendingUpdates.delete(update.id);
            this.emit('sync-failed', update);
          } else {
            failed.push(update);
          }
        }
      }

      // Update retry counts for failed updates
      failed.forEach(update => {
        this.syncState.pendingUpdates.set(update.id, update);
      });

      this.syncState.lastSync = Date.now();
      this.syncState.connectionState = failed.length > 0 ? 'offline' : 'online';
      
      logger.info(`Sync completed: ${updates.length - failed.length}/${updates.length} successful`);

    } finally {
      this.syncState.syncInProgress = false;
      this.emit('sync-end', this.syncState);
    }
  }

  /**
   * Process batch queue
   */
  private static processBatchQueue(): void {
    if (this.batchQueue.length === 0) return;

    // Group by table and priority
    const groups = new Map<string, BatchOperation[]>();
    
    this.batchQueue.forEach(batch => {
      const key = `${batch.table}_${batch.priority}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(batch);
    });

    // Process each group
    groups.forEach(async (batches, key) => {
      const [tableName] = key.split('_');
      const allOperations = batches.flatMap(batch => batch.operations);
      
      try {
        await this.executeBatchOperations(tableName, allOperations);
        
        // Remove processed batches
        batches.forEach(batch => {
          const index = this.batchQueue.findIndex(b => b.id === batch.id);
          if (index >= 0) {
            this.batchQueue.splice(index, 1);
          }
        });

        logger.info(`Processed batch for ${tableName}: ${allOperations.length} operations`);
        
      } catch (error) {
        logger.error(`Batch processing failed for ${tableName}:`, undefined, error);
        
        // Increment retry count
        batches.forEach(batch => {
          batch.retryCount++;
          if (batch.retryCount >= this.maxRetries) {
            const index = this.batchQueue.findIndex(b => b.id === batch.id);
            if (index >= 0) {
              this.batchQueue.splice(index, 1);
            }
          }
        });
      }
    });
  }

  // Helper methods

  private static addOptimisticUpdate(update: OptimisticUpdate): void {
    this.syncState.pendingUpdates.set(update.id, update);
  }

  private static queueBatchOperation(batch: BatchOperation): void {
    this.batchQueue.push(batch);
    
    // Clear existing timer and set new one
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.batchTimer = setTimeout(() => {
      this.processBatchQueue();
    }, this.batchDelay);
  }

  private static async applySyncUpdate(update: OptimisticUpdate): Promise<void> {
    switch (update.operation) {
      case 'create':
        await this.createRecord(update.table, update.data.fields);
        break;
      case 'update':
        await this.updateRecord(update.table, update.id, update.data.fields);
        break;
      case 'delete':
        await this.deleteRecord(update.table, update.id);
        break;
    }
  }

  private static async rollbackOptimisticUpdate(update: OptimisticUpdate): Promise<void> {
    const cacheKey = `${update.table}:${update.id}`;
    
    if (update.operation === 'delete' && update.originalData) {
      // Restore deleted record to cache
      this.setCache(cacheKey, update.originalData);
    } else if (update.operation === 'update' && update.originalData) {
      // Restore original data
      this.setCache(cacheKey, update.originalData);
    } else if (update.operation === 'create') {
      // Remove optimistic create
      this.removeFromCache(cacheKey);
    }

    this.emit('rollback', { update, table: update.table });
  }

  private static async getCachedRecord(tableName: string, recordId: string): Promise<AirtableRecord | null> {
    const cacheKey = `${tableName}:${recordId}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const record = await this.getRecord(tableName, recordId);
      this.setCache(cacheKey, record);
      return record;
    } catch (error) {
      return null;
    }
  }

  private static generateCacheKey(tableName: string, options: any): string {
    const optionsStr = JSON.stringify(options, Object.keys(options).sort());
    return `${tableName}:${btoa(optionsStr)}`;
  }

  private static getFromCache(key: string): any {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private static setCache(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private static updateCache(key: string, data: any): void {
    const existing = this.cache.get(key);
    if (existing) {
      existing.data = data;
      existing.timestamp = Date.now();
    }
  }

  private static removeFromCache(key: string): void {
    this.cache.delete(key);
  }

  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private static emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          logger.error(`Event listener error for ${event}:`, undefined, error);
        }
      });
    }
  }

  // Public API for event management

  static on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  static off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  static getSyncState(): SyncState {
    return { ...this.syncState };
  }

  static getCacheStats(): {
    size: number;
    entries: string[];
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
      hitRate: 0, // Would need to track hits/misses
    };
  }

  static clearCache(): void {
    this.cache.clear();
    logger.info('Airtable cache cleared');
  }

  static flushBatchQueue(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.processBatchQueue();
  }

  // Initialize periodic sync
  static startPeriodicSync(interval: number = 30000): void {
    setInterval(() => {
      if (this.syncState.pendingUpdates.size > 0) {
        this.syncPendingUpdates();
      }
    }, interval);
  }
}

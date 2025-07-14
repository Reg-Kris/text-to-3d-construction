/**
 * Text-to-3D Construction Platform - Airtable Proxy Client
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 *
 * Proxy-enabled Airtable client to avoid CORS issues
 */

import { ApiClient } from '../api-client';
import { API_CONFIG } from '../config';

export interface AirtableRecord {
  id?: string;
  fields: Record<string, any>;
  createdTime?: string;
}

export interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

export class AirtableProxyClient {
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

    const path = `/${API_CONFIG.AIRTABLE_BASE_ID}/${tableName}?${params.toString()}`;
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
    const path = `/${API_CONFIG.AIRTABLE_BASE_ID}/${tableName}`;
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
    const path = `/${API_CONFIG.AIRTABLE_BASE_ID}/${tableName}/${recordId}`;
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
    const path = `/${API_CONFIG.AIRTABLE_BASE_ID}/${tableName}/${recordId}`;
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
    const path = `/${API_CONFIG.AIRTABLE_BASE_ID}/${tableName}`;
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
}

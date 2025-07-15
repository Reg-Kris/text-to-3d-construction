/**
 * Text-to-3D Construction Platform - Airtable Base Connection
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { ApiClient } from '../api-client';

export class AirtableBase {
  /**
   * @deprecated Direct Airtable connections are deprecated for security.
   * Use AirtableProxyClient for all Airtable operations instead.
   */
  static initializeBase(): never {
    throw new Error(
      'Direct Airtable connections are no longer supported for security reasons. ' +
      'Please use AirtableProxyClient via the secure proxy API.'
    );
  }

  static getBase(): never {
    return this.initializeBase();
  }

  static async testConnection(): Promise<boolean> {
    try {
      // Test connection via proxy instead
      const response = await ApiClient.airtableGet('/Projects?maxRecords=1');
      return response.success;
    } catch (error) {
      console.error('Airtable proxy connection test failed:', error);
      return false;
    }
  }

  static resetConnection(): void {
    // No-op since we don't maintain direct connections anymore
    console.warn('resetConnection() is deprecated - proxy connections are stateless');
  }
}

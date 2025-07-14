/**
 * Text-to-3D Construction Platform - Airtable Base Connection
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import Airtable from 'airtable';
import { API_CONFIG } from '../config';

export class AirtableBase {
  private static base: Airtable.Base | null = null;

  static initializeBase(): Airtable.Base {
    if (!this.base) {
      Airtable.configure({
        apiKey: API_CONFIG.AIRTABLE_API_KEY,
      });
      this.base = Airtable.base(API_CONFIG.AIRTABLE_BASE_ID);
    }
    return this.base;
  }

  static getBase(): Airtable.Base {
    return this.initializeBase();
  }

  static async testConnection(): Promise<boolean> {
    try {
      const base = this.initializeBase();
      await base('Projects').select({ maxRecords: 1 }).firstPage();
      return true;
    } catch (error) {
      console.error('Airtable connection test failed:', error);
      return false;
    }
  }

  static resetConnection(): void {
    this.base = null;
  }
}

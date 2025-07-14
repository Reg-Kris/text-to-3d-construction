/**
 * Text-to-3D Construction Platform - Download Service
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { AirtableBase } from './airtable-base';
import { ProjectService } from './project-service';
import { DownloadRecord } from '../types';

export class DownloadService {
  static async recordDownload(download: Omit<DownloadRecord, 'id' | 'downloaded_at'>): Promise<void> {
    const base = AirtableBase.getBase();
    
    const downloadData = {
      ...download,
      downloaded_at: new Date().toISOString()
    };

    try {
      await base('Downloads').create(downloadData);
      
      // Increment download count in Projects table
      if (download.project_id) {
        const project = await ProjectService.getProject(download.project_id);
        if (project) {
          await ProjectService.updateProject(download.project_id, {
            download_count: (project.download_count || 0) + 1
          });
        }
      }
    } catch (error) {
      console.error('Failed to record download:', error);
      // Don't throw error for download tracking - it's not critical
    }
  }

  static async getDownloadHistory(userEmail: string, limit: number = 50): Promise<DownloadRecord[]> {
    const base = AirtableBase.getBase();
    
    try {
      const records = await base('Downloads')
        .select({
          filterByFormula: `{user_email} = '${userEmail}'`,
          maxRecords: limit,
          sort: [{ field: 'downloaded_at', direction: 'desc' }]
        })
        .all();

      return records.map(record => ({
        id: record.id,
        ...record.fields
      })) as DownloadRecord[];
    } catch (error) {
      console.error('Failed to fetch download history:', error);
      return [];
    }
  }

  static async getDownloadStats(userEmail: string): Promise<{
    totalDownloads: number;
    formatBreakdown: Record<string, number>;
    recentDownloads: DownloadRecord[];
  }> {
    const base = AirtableBase.getBase();
    
    try {
      const records = await base('Downloads')
        .select({
          filterByFormula: `{user_email} = '${userEmail}'`,
          sort: [{ field: 'downloaded_at', direction: 'desc' }]
        })
        .all();

      const downloads = records.map(record => ({
        id: record.id,
        ...record.fields
      })) as DownloadRecord[];

      const formatBreakdown: Record<string, number> = {};
      downloads.forEach(download => {
        formatBreakdown[download.format] = (formatBreakdown[download.format] || 0) + 1;
      });

      return {
        totalDownloads: downloads.length,
        formatBreakdown,
        recentDownloads: downloads.slice(0, 10)
      };
    } catch (error) {
      console.error('Failed to fetch download stats:', error);
      return {
        totalDownloads: 0,
        formatBreakdown: {},
        recentDownloads: []
      };
    }
  }

  static async getGlobalDownloadStats(): Promise<{
    totalDownloads: number;
    popularFormats: Record<string, number>;
    deviceBreakdown: Record<string, number>;
  }> {
    const base = AirtableBase.getBase();
    
    try {
      const records = await base('Downloads')
        .select({
          maxRecords: 10000, // Limit for performance
          sort: [{ field: 'downloaded_at', direction: 'desc' }]
        })
        .all();

      const downloads = records.map(record => ({
        id: record.id,
        ...record.fields
      })) as DownloadRecord[];

      const popularFormats: Record<string, number> = {};
      const deviceBreakdown: Record<string, number> = {};

      downloads.forEach(download => {
        popularFormats[download.format] = (popularFormats[download.format] || 0) + 1;
        deviceBreakdown[download.device_type] = (deviceBreakdown[download.device_type] || 0) + 1;
      });

      return {
        totalDownloads: downloads.length,
        popularFormats,
        deviceBreakdown
      };
    } catch (error) {
      console.error('Failed to fetch global download stats:', error);
      return {
        totalDownloads: 0,
        popularFormats: {},
        deviceBreakdown: {}
      };
    }
  }

  static async deleteDownloadRecord(id: string): Promise<void> {
    const base = AirtableBase.getBase();
    
    try {
      await base('Downloads').destroy(id);
    } catch (error) {
      console.error('Failed to delete download record:', error);
      throw new Error('Failed to delete download record from database');
    }
  }

  static async getDownloadsByProject(projectId: string): Promise<DownloadRecord[]> {
    const base = AirtableBase.getBase();
    
    try {
      const records = await base('Downloads')
        .select({
          filterByFormula: `{project_id} = '${projectId}'`,
          sort: [{ field: 'downloaded_at', direction: 'desc' }]
        })
        .all();

      return records.map(record => ({
        id: record.id,
        ...record.fields
      })) as DownloadRecord[];
    } catch (error) {
      console.error('Failed to fetch downloads by project:', error);
      return [];
    }
  }
}
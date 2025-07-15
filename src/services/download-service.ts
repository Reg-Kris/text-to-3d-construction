/**
 * Text-to-3D Construction Platform - Download Service
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { ApiClient } from '../api-client';
import { ProjectService } from './project-service';
import { DownloadRecord } from '../types';

export class DownloadService {
  static async recordDownload(
    download: Omit<DownloadRecord, 'id' | 'downloaded_at'>,
  ): Promise<void> {
    const downloadData = {
      fields: {
        ...download,
        downloaded_at: new Date().toISOString(),
      },
    };

    try {
      await ApiClient.airtablePost('/Downloads', downloadData);

      // Increment download count in Projects table
      if (download.project_id) {
        const project = await ProjectService.getProject(download.project_id);
        if (project) {
          await ProjectService.updateProject(download.project_id, {
            download_count: (project.download_count || 0) + 1,
          });
        }
      }
    } catch (error) {
      console.error('Failed to record download:', error);
      // Don't throw error for download tracking - it's not critical
    }
  }

  static async getDownloadHistory(
    userEmail: string,
    limit: number = 50,
  ): Promise<DownloadRecord[]> {
    try {
      const response = await ApiClient.airtableGet(
        `/Downloads?filterByFormula={user_email}='${userEmail}'&maxRecords=${limit}&sort[0][field]=downloaded_at&sort[0][direction]=desc`
      );

      if (!response.success || !response.data.records) {
        return [];
      }

      return response.data.records.map((record: any) => ({
        id: record.id,
        ...record.fields,
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
    try {
      const response = await ApiClient.airtableGet(
        `/Downloads?filterByFormula={user_email}='${userEmail}'&sort[0][field]=downloaded_at&sort[0][direction]=desc`
      );

      if (!response.success || !response.data.records) {
        return {
          totalDownloads: 0,
          formatBreakdown: {},
          recentDownloads: [],
        };
      }

      const downloads = response.data.records.map((record: any) => ({
        id: record.id,
        ...record.fields,
      })) as DownloadRecord[];

      const formatBreakdown: Record<string, number> = {};
      downloads.forEach((download) => {
        formatBreakdown[download.format] =
          (formatBreakdown[download.format] || 0) + 1;
      });

      return {
        totalDownloads: downloads.length,
        formatBreakdown,
        recentDownloads: downloads.slice(0, 10),
      };
    } catch (error) {
      console.error('Failed to fetch download stats:', error);
      return {
        totalDownloads: 0,
        formatBreakdown: {},
        recentDownloads: [],
      };
    }
  }

  static async getGlobalDownloadStats(): Promise<{
    totalDownloads: number;
    popularFormats: Record<string, number>;
    deviceBreakdown: Record<string, number>;
  }> {
    try {
      const response = await ApiClient.airtableGet(
        `/Downloads?maxRecords=10000&sort[0][field]=downloaded_at&sort[0][direction]=desc`
      );

      if (!response.success || !response.data.records) {
        return {
          totalDownloads: 0,
          popularFormats: {},
          deviceBreakdown: {},
        };
      }

      const downloads = response.data.records.map((record: any) => ({
        id: record.id,
        ...record.fields,
      })) as DownloadRecord[];

      const popularFormats: Record<string, number> = {};
      const deviceBreakdown: Record<string, number> = {};

      downloads.forEach((download) => {
        popularFormats[download.format] =
          (popularFormats[download.format] || 0) + 1;
        deviceBreakdown[download.device_type] =
          (deviceBreakdown[download.device_type] || 0) + 1;
      });

      return {
        totalDownloads: downloads.length,
        popularFormats,
        deviceBreakdown,
      };
    } catch (error) {
      console.error('Failed to fetch global download stats:', error);
      return {
        totalDownloads: 0,
        popularFormats: {},
        deviceBreakdown: {},
      };
    }
  }

  static async deleteDownloadRecord(id: string): Promise<void> {
    try {
      const response = await ApiClient.airtableDelete(`/Downloads/${id}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete download record');
      }
    } catch (error) {
      console.error('Failed to delete download record:', error);
      throw new Error('Failed to delete download record from database');
    }
  }

  static async getDownloadsByProject(
    projectId: string,
  ): Promise<DownloadRecord[]> {
    try {
      const response = await ApiClient.airtableGet(
        `/Downloads?filterByFormula={project_id}='${projectId}'&sort[0][field]=downloaded_at&sort[0][direction]=desc`
      );

      if (!response.success || !response.data.records) {
        return [];
      }

      return response.data.records.map((record: any) => ({
        id: record.id,
        ...record.fields,
      })) as DownloadRecord[];
    } catch (error) {
      console.error('Failed to fetch downloads by project:', error);
      return [];
    }
  }
}

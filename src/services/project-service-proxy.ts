/**
 * Text-to-3D Construction Platform - Project Service (Proxy-Enabled)
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { AirtableProxyClient } from './airtable-proxy-client';
import { ProjectRecord } from '../types';

export class ProjectServiceProxy {
  static async createProject(
    record: Omit<ProjectRecord, 'id' | 'created_at' | 'download_count'>,
  ): Promise<ProjectRecord> {
    const projectData = {
      user_email: record.user_email,
      prompt: record.prompt,
      status: record.status,
      device_type: record.device_type,
      art_style: record.art_style,
      created_at: new Date().toISOString(),
      download_count: 0,
      ...(record.polygon_count && { polygon_count: record.polygon_count }),
      ...(record.generation_time_seconds && {
        generation_time_seconds: record.generation_time_seconds,
      }),
      ...(record.thumbnail_url && { thumbnail_url: record.thumbnail_url }),
    };

    try {
      const createdRecord = await AirtableProxyClient.createRecord(
        'Projects',
        projectData,
      );
      return {
        id: createdRecord.id!,
        user_email: createdRecord.fields.user_email,
        prompt: createdRecord.fields.prompt,
        status: createdRecord.fields.status,
        device_type: createdRecord.fields.device_type,
        art_style: createdRecord.fields.art_style,
        created_at: createdRecord.fields.created_at,
        download_count: createdRecord.fields.download_count || 0,
        polygon_count: createdRecord.fields.polygon_count,
        generation_time_seconds: createdRecord.fields.generation_time_seconds,
        thumbnail_url: createdRecord.fields.thumbnail_url,
      };
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  }

  static async updateProject(
    id: string,
    updates: Partial<ProjectRecord>,
  ): Promise<ProjectRecord> {
    try {
      const updatedRecord = await AirtableProxyClient.updateRecord(
        'Projects',
        id,
        updates,
      );
      return {
        id: updatedRecord.id!,
        user_email: updatedRecord.fields.user_email,
        prompt: updatedRecord.fields.prompt,
        status: updatedRecord.fields.status,
        device_type: updatedRecord.fields.device_type,
        art_style: updatedRecord.fields.art_style,
        created_at: updatedRecord.fields.created_at,
        download_count: updatedRecord.fields.download_count || 0,
        polygon_count: updatedRecord.fields.polygon_count,
        generation_time_seconds: updatedRecord.fields.generation_time_seconds,
        thumbnail_url: updatedRecord.fields.thumbnail_url,
      };
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  }

  static async getUserProjects(userEmail: string): Promise<ProjectRecord[]> {
    try {
      const response = await AirtableProxyClient.getAllRecords('Projects', {
        filterByFormula: `{user_email} = "${userEmail}"`,
        sort: [{ field: 'created_at', direction: 'desc' }],
      });

      return response.map((record) => ({
        id: record.id!,
        user_email: record.fields.user_email,
        prompt: record.fields.prompt,
        status: record.fields.status,
        device_type: record.fields.device_type,
        art_style: record.fields.art_style,
        created_at: record.fields.created_at,
        download_count: record.fields.download_count || 0,
        polygon_count: record.fields.polygon_count,
        generation_time_seconds: record.fields.generation_time_seconds,
        thumbnail_url: record.fields.thumbnail_url,
      }));
    } catch (error) {
      console.error('Failed to get user projects:', error);
      return [];
    }
  }

  static async getProject(id: string): Promise<ProjectRecord | null> {
    try {
      const record = await AirtableProxyClient.getRecord('Projects', id);
      return {
        id: record.id!,
        user_email: record.fields.user_email,
        prompt: record.fields.prompt,
        status: record.fields.status,
        device_type: record.fields.device_type,
        art_style: record.fields.art_style,
        created_at: record.fields.created_at,
        download_count: record.fields.download_count || 0,
        polygon_count: record.fields.polygon_count,
        generation_time_seconds: record.fields.generation_time_seconds,
        thumbnail_url: record.fields.thumbnail_url,
      };
    } catch (error) {
      console.error('Failed to get project:', error);
      return null;
    }
  }

  static async getProjectAnalytics(userEmail?: string): Promise<{
    totalProjects: number;
    successfulProjects: number;
    failedProjects: number;
    totalGenerationTime: number;
    averageGenerationTime: number;
    deviceBreakdown: Record<string, number>;
    styleBreakdown: Record<string, number>;
  }> {
    try {
      const filterFormula = userEmail
        ? `{user_email} = "${userEmail}"`
        : undefined;

      const projects = await AirtableProxyClient.getAllRecords('Projects', {
        filterByFormula: filterFormula,
        fields: [
          'status',
          'generation_time_seconds',
          'device_type',
          'art_style',
        ],
      });

      const totalProjects = projects.length;
      const successfulProjects = projects.filter(
        (p) => p.fields.status === 'completed',
      ).length;
      const failedProjects = projects.filter(
        (p) => p.fields.status === 'failed',
      ).length;

      const generationTimes = projects
        .filter((p) => p.fields.generation_time_seconds)
        .map((p) => p.fields.generation_time_seconds);

      const totalGenerationTime = generationTimes.reduce(
        (sum, time) => sum + time,
        0,
      );
      const averageGenerationTime =
        generationTimes.length > 0
          ? totalGenerationTime / generationTimes.length
          : 0;

      const deviceBreakdown: Record<string, number> = {};
      const styleBreakdown: Record<string, number> = {};

      projects.forEach((project) => {
        const device = project.fields.device_type || 'unknown';
        const style = project.fields.art_style || 'unknown';

        deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;
        styleBreakdown[style] = (styleBreakdown[style] || 0) + 1;
      });

      return {
        totalProjects,
        successfulProjects,
        failedProjects,
        totalGenerationTime,
        averageGenerationTime,
        deviceBreakdown,
        styleBreakdown,
      };
    } catch (error) {
      console.error('Failed to get project analytics:', error);
      return {
        totalProjects: 0,
        successfulProjects: 0,
        failedProjects: 0,
        totalGenerationTime: 0,
        averageGenerationTime: 0,
        deviceBreakdown: {},
        styleBreakdown: {},
      };
    }
  }
}

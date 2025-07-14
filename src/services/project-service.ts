/**
 * Text-to-3D Construction Platform - Project Service
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { AirtableBase } from './airtable-base';
import { ProjectRecord } from '../types';

export class ProjectService {
  static async createProject(record: Omit<ProjectRecord, 'id' | 'created_at' | 'download_count'>): Promise<ProjectRecord> {
    const base = AirtableBase.getBase();
    
    const projectData = {
      user_email: record.user_email,
      prompt: record.prompt,
      status: record.status,
      device_type: record.device_type,
      art_style: record.art_style,
      created_at: new Date().toISOString(),
      download_count: 0,
      ...(record.polygon_count && { polygon_count: record.polygon_count }),
      ...(record.generation_time_seconds && { generation_time_seconds: record.generation_time_seconds }),
      ...(record.thumbnail_url && { thumbnail_url: record.thumbnail_url })
    };

    try {
      const createdRecord = await base('Projects').create(projectData);
      return {
        id: createdRecord.id,
        ...projectData
      } as ProjectRecord;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw new Error('Failed to save project to database');
    }
  }

  static async updateProject(id: string, updates: Partial<ProjectRecord>): Promise<ProjectRecord> {
    const base = AirtableBase.getBase();
    
    // Convert nested objects to strings for Airtable
    const airtableUpdates: any = { ...updates };
    if (updates.model_urls) {
      airtableUpdates.model_urls = JSON.stringify(updates.model_urls);
    }
    if (updates.file_sizes) {
      airtableUpdates.file_sizes = JSON.stringify(updates.file_sizes);
    }
    
    try {
      const updatedRecord = await base('Projects').update(id, airtableUpdates);
      const fields = updatedRecord.fields as any;
      
      return {
        id: updatedRecord.id,
        ...fields,
        // Parse JSON strings back to objects
        model_urls: fields.model_urls ? JSON.parse(fields.model_urls) : undefined,
        file_sizes: fields.file_sizes ? JSON.parse(fields.file_sizes) : undefined
      } as ProjectRecord;
    } catch (error) {
      console.error('Failed to update project:', error);
      throw new Error('Failed to update project in database');
    }
  }

  static async getUserProjects(userEmail: string, limit: number = 20): Promise<ProjectRecord[]> {
    const base = AirtableBase.getBase();
    
    try {
      const records = await base('Projects')
        .select({
          filterByFormula: `{user_email} = '${userEmail}'`,
          maxRecords: limit,
          sort: [{ field: 'created_at', direction: 'desc' }]
        })
        .all();

      return records.map(record => ({
        id: record.id,
        ...record.fields,
        // Parse JSON strings back to objects if they exist
        model_urls: record.fields.model_urls ? JSON.parse(record.fields.model_urls as string) : undefined,
        file_sizes: record.fields.file_sizes ? JSON.parse(record.fields.file_sizes as string) : undefined
      })) as ProjectRecord[];
    } catch (error) {
      console.error('Failed to fetch user projects:', error);
      throw new Error('Failed to load project history');
    }
  }

  static async getProject(id: string): Promise<ProjectRecord | null> {
    const base = AirtableBase.getBase();
    
    try {
      const record = await base('Projects').find(id);
      return {
        id: record.id,
        ...record.fields,
        // Parse JSON strings back to objects if they exist
        model_urls: record.fields.model_urls ? JSON.parse(record.fields.model_urls as string) : undefined,
        file_sizes: record.fields.file_sizes ? JSON.parse(record.fields.file_sizes as string) : undefined
      } as ProjectRecord;
    } catch (error) {
      console.error('Failed to fetch project:', error);
      return null;
    }
  }

  static async deleteProject(id: string): Promise<void> {
    const base = AirtableBase.getBase();
    
    try {
      await base('Projects').destroy(id);
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw new Error('Failed to delete project from database');
    }
  }

  static async getProjectAnalytics(): Promise<{
    totalProjects: number;
    successRate: number;
    avgGenerationTime: number;
    popularDeviceTypes: Record<string, number>;
  }> {
    const base = AirtableBase.getBase();
    
    try {
      const records = await base('Projects')
        .select({
          maxRecords: 1000, // Limit for performance
          sort: [{ field: 'created_at', direction: 'desc' }]
        })
        .all();

      const projects = records.map(record => ({
        id: record.id,
        ...record.fields,
        // Parse JSON strings back to objects if they exist
        model_urls: record.fields.model_urls ? JSON.parse(record.fields.model_urls as string) : undefined,
        file_sizes: record.fields.file_sizes ? JSON.parse(record.fields.file_sizes as string) : undefined
      })) as ProjectRecord[];
      
      const totalProjects = projects.length;
      const completedProjects = projects.filter(p => p.status === 'completed').length;
      const successRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;
      
      const validGenerationTimes = projects
        .filter(p => p.generation_time_seconds && p.generation_time_seconds > 0)
        .map(p => p.generation_time_seconds!);
      const avgGenerationTime = validGenerationTimes.length > 0 
        ? validGenerationTimes.reduce((a, b) => a + b, 0) / validGenerationTimes.length 
        : 0;

      const deviceTypes: Record<string, number> = {};
      projects.forEach(project => {
        deviceTypes[project.device_type] = (deviceTypes[project.device_type] || 0) + 1;
      });

      return {
        totalProjects,
        successRate,
        avgGenerationTime,
        popularDeviceTypes: deviceTypes
      };
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      return {
        totalProjects: 0,
        successRate: 0,
        avgGenerationTime: 0,
        popularDeviceTypes: {}
      };
    }
  }
}
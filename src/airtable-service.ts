/**
 * Text-to-3D Construction Platform - Airtable Service (Main Export)
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { AirtableBase } from './services/airtable-base';
import { ProjectService } from './services/project-service';
import { DownloadService } from './services/download-service';

export { AirtableBase } from './services/airtable-base';
export { ProjectService } from './services/project-service';
export { DownloadService } from './services/download-service';

// Legacy compatibility - re-export the combined service
export class AirtableService {
  // Project operations
  static createProject = ProjectService.createProject;
  static updateProject = ProjectService.updateProject;
  static getUserProjects = ProjectService.getUserProjects;
  static getProject = ProjectService.getProject;
  static deleteProject = ProjectService.deleteProject;
  static getProjectAnalytics = ProjectService.getProjectAnalytics;

  // Download operations
  static recordDownload = DownloadService.recordDownload;
  static getDownloadHistory = DownloadService.getDownloadHistory;
  static getDownloadStats = DownloadService.getDownloadStats;
  static getGlobalDownloadStats = DownloadService.getGlobalDownloadStats;
  static deleteDownloadRecord = DownloadService.deleteDownloadRecord;
  static getDownloadsByProject = DownloadService.getDownloadsByProject;

  // Base operations
  static testConnection = AirtableBase.testConnection;
  static resetConnection = AirtableBase.resetConnection;
}

// Type definitions
export interface ProjectRecord {
  id?: string;
  user_email: string;
  prompt: string;
  created_at: string;
  status: 'generating' | 'completed' | 'failed';
  model_urls?: {
    glb?: string;
    fbx?: string;
    obj?: string;
    usdz?: string;
  };
  file_sizes?: {
    glb_size?: number;
    fbx_size?: number;
    obj_size?: number;
    usdz_size?: number;
  };
  download_count: number;
  polygon_count?: number;
  generation_time_seconds?: number;
  device_type: 'mobile' | 'tablet' | 'desktop';
  art_style: string;
  thumbnail_url?: string;
}

export interface DownloadRecord {
  id?: string;
  project_id: string;
  user_email: string;
  format: string;
  downloaded_at: string;
  file_size?: number;
  device_type: string;
}
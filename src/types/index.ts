/**
 * Text-to-3D Construction Platform - Type Definitions
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import type { User } from '../auth';
import type { MeshyTask, GenerationRequest } from '../meshy-api';
import type { ProjectRecord, DownloadRecord } from '../airtable-service';
import type { ModelInfo, ViewerConfig } from '../three-viewer';
import type { DeviceInfo } from '../device-utils';

export interface AppState {
  currentUser: User | null;
  currentTask: MeshyTask | null;
  currentProject: ProjectRecord | null;
  generationStartTime: number;
  isGenerating: boolean;
  isLoading: boolean;
}

export interface QualitySettings {
  quality: 'low' | 'medium' | 'high';
  prioritizeSpeed: boolean;
}

export interface ViewerSettings {
  viewMode: 'perspective' | 'top' | 'front' | 'side';
  lodEnabled: boolean;
  lodLevel: number;
  shadowsEnabled: boolean;
}

// Re-export commonly used types
export type { User } from '../auth';
export type { MeshyTask, GenerationRequest } from '../meshy-api';
export type { ProjectRecord, DownloadRecord } from '../airtable-service';
export type { ModelInfo, ViewerConfig } from '../three-viewer';
export type { DeviceInfo } from '../device-utils';
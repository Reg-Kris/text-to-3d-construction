/**
 * Airtable API Mock Handlers
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { http, HttpResponse } from 'msw';
import { ProjectRecord, DownloadRecord } from '../../../airtable-service';

const mockProjectId = 'rec_test_project_123';
const mockDownloadId = 'rec_test_download_456';

export const airtableHandlers = [
  // Create project
  http.post('/.netlify/functions/airtable-proxy', async ({ request }) => {
    const body = await request.json();
    
    if (body?.path?.includes('/Projects')) {
      const projectData = body.body?.records?.[0]?.fields;
      
      const mockProject: ProjectRecord = {
        id: mockProjectId,
        user_email: projectData?.user_email || 'test@example.com',
        prompt: projectData?.prompt || 'Test prompt',
        status: 'generating',
        device_type: projectData?.device_type || 'desktop',
        art_style: projectData?.art_style || 'realistic',
        polygon_count: projectData?.polygon_count || 30000,
        created_at: new Date().toISOString(),
        download_count: 0,
      };
      
      return HttpResponse.json({
        success: true,
        status: 201,
        data: {
          records: [
            {
              id: mockProjectId,
              fields: mockProject,
              createdTime: new Date().toISOString(),
            }
          ]
        }
      });
    }
    
    // Create download record
    if (body?.path?.includes('/Downloads')) {
      const downloadData = body.body?.records?.[0]?.fields;
      
      const mockDownload: DownloadRecord = {
        id: mockDownloadId,
        project_id: downloadData?.project_id || mockProjectId,
        user_email: downloadData?.user_email || 'test@example.com',
        format: downloadData?.format || 'glb',
        file_size: downloadData?.file_size || 1024,
        download_url: downloadData?.download_url || 'https://example.com/model.glb',
        created_at: new Date().toISOString(),
      };
      
      return HttpResponse.json({
        success: true,
        status: 201,
        data: {
          records: [
            {
              id: mockDownloadId,
              fields: mockDownload,
              createdTime: new Date().toISOString(),
            }
          ]
        }
      });
    }
    
    return HttpResponse.json({
      success: false,
      status: 404,
      error: 'Not found'
    });
  }),

  // Get project
  http.get('/.netlify/functions/airtable-proxy', ({ request }) => {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    
    if (projectId === mockProjectId) {
      const mockProject: ProjectRecord = {
        id: mockProjectId,
        user_email: 'test@example.com',
        prompt: 'Test prompt',
        status: 'completed',
        device_type: 'desktop',
        art_style: 'realistic',
        polygon_count: 30000,
        created_at: new Date().toISOString(),
        download_count: 1,
      };
      
      return HttpResponse.json({
        success: true,
        status: 200,
        data: {
          records: [
            {
              id: mockProjectId,
              fields: mockProject,
              createdTime: new Date().toISOString(),
            }
          ]
        }
      });
    }
    
    return HttpResponse.json({
      success: false,
      status: 404,
      error: 'Project not found'
    });
  }),

  // Update project
  http.patch('/.netlify/functions/airtable-proxy', async ({ request }) => {
    const body = await request.json();
    
    if (body?.path?.includes('/Projects')) {
      const updateData = body.body?.records?.[0]?.fields;
      
      const updatedProject: ProjectRecord = {
        id: mockProjectId,
        user_email: 'test@example.com',
        prompt: 'Test prompt',
        status: updateData?.status || 'completed',
        device_type: 'desktop',
        art_style: 'realistic',
        polygon_count: 30000,
        created_at: new Date().toISOString(),
        download_count: updateData?.download_count || 1,
      };
      
      return HttpResponse.json({
        success: true,
        status: 200,
        data: {
          records: [
            {
              id: mockProjectId,
              fields: updatedProject,
              createdTime: new Date().toISOString(),
            }
          ]
        }
      });
    }
    
    return HttpResponse.json({
      success: false,
      status: 404,
      error: 'Not found'
    });
  }),

  // Error scenarios
  http.post('/.netlify/functions/airtable-proxy-error', () => {
    return HttpResponse.json({
      success: false,
      status: 500,
      error: 'Internal server error'
    }, { status: 500 });
  }),

  // Rate limit scenario
  http.post('/.netlify/functions/airtable-proxy-ratelimit', () => {
    return HttpResponse.json({
      success: false,
      status: 429,
      error: 'Rate limit exceeded'
    }, { status: 429 });
  }),
];

export const createMockProject = (overrides: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id: mockProjectId,
  user_email: 'test@example.com',
  prompt: 'Test prompt',
  status: 'generating',
  device_type: 'desktop',
  art_style: 'realistic',
  polygon_count: 30000,
  created_at: new Date().toISOString(),
  download_count: 0,
  ...overrides,
});

export const createMockDownload = (overrides: Partial<DownloadRecord> = {}): DownloadRecord => ({
  id: mockDownloadId,
  project_id: mockProjectId,
  user_email: 'test@example.com',
  format: 'glb',
  file_size: 1024,
  download_url: 'https://example.com/model.glb',
  created_at: new Date().toISOString(),
  ...overrides,
});
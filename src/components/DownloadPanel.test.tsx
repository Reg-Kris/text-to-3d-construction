/**
 * DownloadPanel Component Tests
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { DownloadPanel } from './DownloadPanel';
import { theme } from '../theme';
import { vi } from 'vitest';
import type { MeshyTask } from '../types';

const mockTask: MeshyTask = {
  id: 'test-task-123',
  status: 'SUCCEEDED',
  model_urls: {
    glb: 'https://cdn.meshy.ai/test/model.glb',
    obj: 'https://cdn.meshy.ai/test/model.obj',
    fbx: 'https://cdn.meshy.ai/test/model.fbx',
    gltf: 'https://cdn.meshy.ai/test/model.gltf',
    usd: 'https://cdn.meshy.ai/test/model.usd',
  },
  created_at: '2024-01-01T00:00:00Z',
  task_error: null,
  finished_at: '2024-01-01T00:01:00Z',
  progress: 100,
  started_at: '2024-01-01T00:00:30Z',
  thumbnail_url: 'https://cdn.meshy.ai/test/thumb.jpg',
  video_url: 'https://cdn.meshy.ai/test/video.mp4',
};

const mockProps = {
  task: mockTask,
  onDownload: vi.fn(),
  onDownloadForEngine: vi.fn(),
  onDownloadAll: vi.fn(),
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('DownloadPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders download panel with task information', () => {
    renderWithTheme(<DownloadPanel {...mockProps} />);
    
    expect(screen.getByText('Download Options')).toBeInTheDocument();
    expect(screen.getByText('Available Formats (5)')).toBeInTheDocument();
    expect(screen.getByText('GLB')).toBeInTheDocument();
    expect(screen.getByText('OBJ')).toBeInTheDocument();
    expect(screen.getByText('FBX')).toBeInTheDocument();
    expect(screen.getByText('GLTF')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
  });

  it('displays model information when task is successful', () => {
    renderWithTheme(<DownloadPanel {...mockProps} />);
    
    expect(screen.getByText('Model ID: test-task-123')).toBeInTheDocument();
    expect(screen.getByText('Status: SUCCEEDED')).toBeInTheDocument();
    expect(screen.getByText(/Created: /)).toBeInTheDocument();
  });

  it('handles individual format downloads', () => {
    renderWithTheme(<DownloadPanel {...mockProps} />);
    
    const glbButton = screen.getByText('Download GLB');
    fireEvent.click(glbButton);
    
    expect(mockProps.onDownload).toHaveBeenCalledWith(
      'https://cdn.meshy.ai/test/model.glb',
      'glb'
    );
  });

  it('handles engine-specific downloads', () => {
    renderWithTheme(<DownloadPanel {...mockProps} />);
    
    const unityButton = screen.getByText('For Unity');
    fireEvent.click(unityButton);
    
    expect(mockProps.onDownloadForEngine).toHaveBeenCalledWith('unity');
  });

  it('opens engine options dialog', async () => {
    renderWithTheme(<DownloadPanel {...mockProps} />);
    
    const engineOptionsButton = screen.getByText('Engine Options');
    fireEvent.click(engineOptionsButton);
    
    await waitFor(() => {
      expect(screen.getByText('Engine-Specific Downloads')).toBeInTheDocument();
      expect(screen.getByText('Unreal Engine')).toBeInTheDocument();
      expect(screen.getByText('Unity')).toBeInTheDocument();
      expect(screen.getByText('Blender')).toBeInTheDocument();
    });
  });

  it('handles download all formats', async () => {
    renderWithTheme(<DownloadPanel {...mockProps} />);
    
    const downloadAllButton = screen.getByRole('button', { name: /download all formats/i });
    fireEvent.click(downloadAllButton);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/This will download all available formats for your model/)).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByText('Download All');
    fireEvent.click(confirmButton);
    
    expect(mockProps.onDownloadAll).toHaveBeenCalled();
  });

  it('shows correct format icons and descriptions', () => {
    renderWithTheme(<DownloadPanel {...mockProps} />);
    
    // Test format chips are displayed
    expect(screen.getByText('GLB')).toBeInTheDocument();
    expect(screen.getByText('OBJ')).toBeInTheDocument();
    expect(screen.getByText('FBX')).toBeInTheDocument();
  });

  it('handles task without model URLs', () => {
    const taskWithoutUrls = {
      ...mockTask,
      model_urls: {},
    };
    
    renderWithTheme(<DownloadPanel {...mockProps} task={taskWithoutUrls} />);
    
    expect(screen.getByText('Available Formats (0)')).toBeInTheDocument();
  });

  it('handles partial model URLs', () => {
    const taskWithPartialUrls = {
      ...mockTask,
      model_urls: {
        glb: 'https://cdn.meshy.ai/test/model.glb',
        obj: 'https://cdn.meshy.ai/test/model.obj',
      },
    };
    
    renderWithTheme(<DownloadPanel {...mockProps} task={taskWithPartialUrls} />);
    
    expect(screen.getByText('Available Formats (2)')).toBeInTheDocument();
    expect(screen.getByText('GLB')).toBeInTheDocument();
    expect(screen.getByText('OBJ')).toBeInTheDocument();
    expect(screen.queryByText('FBX')).not.toBeInTheDocument();
  });

  it('closes dialogs when clicking close buttons', async () => {
    renderWithTheme(<DownloadPanel {...mockProps} />);
    
    // Open engine dialog
    const engineOptionsButton = screen.getByRole('button', { name: /engine options/i });
    fireEvent.click(engineOptionsButton);
    
    await waitFor(() => {
      expect(screen.getByText('Engine-Specific Downloads')).toBeInTheDocument();
    });
    
    // Close dialog
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Engine-Specific Downloads')).not.toBeInTheDocument();
    });
  });

  it('handles engine downloads from dialog', async () => {
    renderWithTheme(<DownloadPanel {...mockProps} />);
    
    // Open engine dialog
    const engineOptionsButton = screen.getByText('Engine Options');
    fireEvent.click(engineOptionsButton);
    
    await waitFor(() => {
      expect(screen.getByText('Engine-Specific Downloads')).toBeInTheDocument();
    });
    
    // Click Unity download in dialog
    const unityDownloadButton = screen.getAllByText('Download')[0]; // First download button in dialog
    fireEvent.click(unityDownloadButton);
    
    expect(mockProps.onDownloadForEngine).toHaveBeenCalledWith('unreal');
  });
});
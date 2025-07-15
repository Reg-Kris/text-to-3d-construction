/**
 * ModelViewer Component Tests
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { ModelViewer } from './ModelViewer';
import { theme } from '../theme';
import { vi } from 'vitest';
import type { MeshyTask } from '../types';

const mockTask: MeshyTask = {
  id: 'task-123',
  status: 'SUCCEEDED',
  model_urls: {
    glb: 'https://cdn.meshy.ai/test/model.glb',
  },
  created_at: '2024-01-01T00:00:00Z',
  task_error: null,
  finished_at: '2024-01-01T00:01:00Z',
  progress: 100,
  started_at: '2024-01-01T00:00:30Z',
  thumbnail_url: 'https://cdn.meshy.ai/test/thumb.jpg',
  video_url: 'https://cdn.meshy.ai/test/video.mp4',
};

const mockModelInfo = {
  vertices: 15000,
  faces: 8000,
  materials: 3,
  fileSize: '2.5 MB',
};

const mockProps = {
  task: mockTask,
  modelInfo: mockModelInfo,
  onViewerAction: vi.fn(),
  isLoading: false,
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ModelViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      renderWithTheme(
        <ModelViewer {...mockProps} task={null} isLoading={true} />
      );
      
      expect(screen.getByText('Loading 3D model...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows placeholder when no task and not loading', () => {
      renderWithTheme(
        <ModelViewer {...mockProps} task={null} isLoading={false} />
      );
      
      expect(screen.getByText('Generate a model to view it here')).toBeInTheDocument();
    });
  });

  describe('Model Display', () => {
    it('renders viewer container when task has GLB model', () => {
      renderWithTheme(<ModelViewer {...mockProps} />);
      
      // Check that viewer container is present
      const viewerContainer = document.querySelector('[id="viewer-container"]');
      expect(viewerContainer).toBeTruthy();
    });

    it('shows placeholder when task has no GLB model', () => {
      const taskWithoutGLB = {
        ...mockTask,
        model_urls: { obj: 'https://cdn.meshy.ai/test/model.obj' },
      };
      
      renderWithTheme(
        <ModelViewer {...mockProps} task={taskWithoutGLB} />
      );
      
      expect(screen.getByText('Generate a model to view it here')).toBeInTheDocument();
    });
  });

  describe('View Controls', () => {
    it('renders view mode buttons', () => {
      renderWithTheme(<ModelViewer {...mockProps} />);
      
      expect(screen.getByText('3D')).toBeInTheDocument();
      expect(screen.getByText('Top')).toBeInTheDocument();
      expect(screen.getByText('Front')).toBeInTheDocument();
      expect(screen.getByText('Side')).toBeInTheDocument();
    });

    it('handles view mode changes', () => {
      renderWithTheme(<ModelViewer {...mockProps} />);
      
      const topViewButton = screen.getByText('Top');
      fireEvent.click(topViewButton);
      
      expect(mockProps.onViewerAction).toHaveBeenCalledWith('setViewMode', 'top');
    });

    it('shows active view mode', () => {
      renderWithTheme(<ModelViewer {...mockProps} />);
      
      const perspectiveButton = screen.getByText('3D');
      expect(perspectiveButton).toHaveClass('MuiButton-contained');
    });
  });

  describe('Camera Controls', () => {
    it('renders camera control buttons', () => {
      renderWithTheme(<ModelViewer {...mockProps} />);
      
      expect(screen.getByLabelText('Reset Camera')).toBeInTheDocument();
      expect(screen.getByLabelText('Toggle Auto-Rotate')).toBeInTheDocument();
      expect(screen.getByLabelText('Take Screenshot')).toBeInTheDocument();
    });

    it('handles reset camera action', () => {
      renderWithTheme(<ModelViewer {...mockProps} />);
      
      const resetButton = screen.getByLabelText('Reset Camera');
      fireEvent.click(resetButton);
      
      expect(mockProps.onViewerAction).toHaveBeenCalledWith('resetCamera');
    });

    it('handles auto-rotate toggle', () => {
      renderWithTheme(<ModelViewer {...mockProps} />);
      
      const rotateButton = screen.getByLabelText('Toggle Auto-Rotate');
      fireEvent.click(rotateButton);
      
      expect(mockProps.onViewerAction).toHaveBeenCalledWith('toggleAutoRotate');
    });

    it('handles screenshot action', () => {
      renderWithTheme(<ModelViewer {...mockProps} />);
      
      const screenshotButton = screen.getByLabelText('Take Screenshot');
      fireEvent.click(screenshotButton);
      
      expect(mockProps.onViewerAction).toHaveBeenCalledWith('takeScreenshot');
    });
  });

  describe('Lighting Controls', () => {
    it('renders lighting control sliders', () => {
      renderWithTheme(<ModelViewer {...mockProps} />);
      
      expect(screen.getByText('Exposure')).toBeInTheDocument();
      expect(screen.getByText('Shadow Intensity')).toBeInTheDocument();
    });

    it('handles exposure changes', () => {
      renderWithTheme(<ModelViewer {...mockProps} />);
      
      const exposureSlider = screen.getAllByRole('slider')[0];
      fireEvent.change(exposureSlider, { target: { value: '1.5' } });
      
      expect(mockProps.onViewerAction).toHaveBeenCalledWith('setExposure', 1.5);
    });

    it('handles shadow intensity changes', () => {
      renderWithTheme(<ModelViewer {...mockProps} />);
      
      const shadowSlider = screen.getAllByRole('slider')[1];
      fireEvent.change(shadowSlider, { target: { value: '0.8' } });
      
      expect(mockProps.onViewerAction).toHaveBeenCalledWith('setShadowIntensity', 0.8);
    });
  });

  describe('Model Information', () => {
    it('displays model info chips', () => {
      renderWithTheme(<ModelViewer {...mockProps} />);
      
      expect(screen.getByText('15,000 vertices')).toBeInTheDocument();
      expect(screen.getByText('8,000 faces')).toBeInTheDocument();
      expect(screen.getByText('3 materials')).toBeInTheDocument();
      expect(screen.getByText('2.5 MB')).toBeInTheDocument();
    });

    it('handles missing model info gracefully', () => {
      renderWithTheme(<ModelViewer {...mockProps} modelInfo={null} />);
      
      // Should not crash and still render the viewer
      expect(screen.getByText('3D')).toBeInTheDocument();
    });

    it('handles partial model info', () => {
      const partialModelInfo = {
        vertices: 5000,
        fileSize: '1.2 MB',
      };
      
      renderWithTheme(<ModelViewer {...mockProps} modelInfo={partialModelInfo} />);
      
      expect(screen.getByText('5,000 vertices')).toBeInTheDocument();
      expect(screen.getByText('1.2 MB')).toBeInTheDocument();
      expect(screen.queryByText('faces')).not.toBeInTheDocument();
      expect(screen.queryByText('materials')).not.toBeInTheDocument();
    });
  });

  describe('Viewer Container', () => {
    it('sets correct container ID for GoogleModelViewer integration', () => {
      renderWithTheme(<ModelViewer {...mockProps} />);
      
      // The container should have the correct ID for integration
      const container = document.querySelector('[id="viewer-container"]');
      expect(container).toBeTruthy();
    });

    it('applies correct styling to viewer container', () => {
      renderWithTheme(<ModelViewer {...mockProps} />);
      
      // Check that viewer container has proper styling
      const viewerContainer = document.querySelector('[id="viewer-container"]');
      
      if (viewerContainer) {
        const styles = window.getComputedStyle(viewerContainer);
        expect(styles.backgroundColor).toBe('#2a2a2a');
      }
    });
  });

  describe('Responsive Behavior', () => {
    it('renders controls in responsive grid', () => {
      renderWithTheme(<ModelViewer {...mockProps} />);
      
      // Check that view controls are present
      expect(screen.getByText('3D')).toBeInTheDocument();
      expect(screen.getByText('Top')).toBeInTheDocument();
      
      // Check that camera controls are present
      expect(screen.getByLabelText('Reset Camera')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing task gracefully', () => {
      renderWithTheme(<ModelViewer {...mockProps} task={null} />);
      
      expect(screen.getByText('Generate a model to view it here')).toBeInTheDocument();
    });

    it('handles task with empty model_urls', () => {
      const taskWithEmptyUrls = {
        ...mockTask,
        model_urls: {},
      };
      
      renderWithTheme(<ModelViewer {...mockProps} task={taskWithEmptyUrls} />);
      
      expect(screen.getByText('Generate a model to view it here')).toBeInTheDocument();
    });
  });
});
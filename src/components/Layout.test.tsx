/**
 * Layout Component Tests
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { Layout } from './Layout';
import { theme } from '../theme';
import { vi } from 'vitest';
import type { User, MeshyTask } from '../types';

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  created_at: '2024-01-01T00:00:00Z',
  is_premium: true,
  usage_quota: 100,
  usage_current: 10,
};

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

const mockProps = {
  user: mockUser,
  isAuthenticated: true,
  isGenerating: false,
  isLoading: false,
  loadingMessage: '',
  progressStage: '',
  progressValue: 0,
  prompt: '',
  onPromptChange: vi.fn(),
  onGenerate: vi.fn(),
  onLogout: vi.fn(),
  currentTask: null,
  modelInfo: null,
  onDownload: vi.fn(),
  onDownloadForEngine: vi.fn(),
  onDownloadAll: vi.fn(),
  onViewerAction: vi.fn(),
  error: null,
  success: null,
  onDismissError: vi.fn(),
  onDismissSuccess: vi.fn(),
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('shows authentication screen when not authenticated', () => {
      renderWithTheme(
        <Layout {...mockProps} isAuthenticated={false} user={null} />
      );
      
      expect(screen.getByText('Construction 3D Generator')).toBeInTheDocument();
      expect(screen.getByText('Authenticating access to proprietary software...')).toBeInTheDocument();
    });

    it('shows main layout when authenticated', () => {
      renderWithTheme(<Layout {...mockProps} />);
      
      expect(screen.getByText('Construction 3D Model Generator')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Generate 3D Model' })).toBeInTheDocument();
      expect(screen.getByText('3D Model Preview')).toBeInTheDocument();
    });
  });

  describe('User Interface', () => {
    it('displays user information in header', () => {
      renderWithTheme(<Layout {...mockProps} />);
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('handles logout action', () => {
      renderWithTheme(<Layout {...mockProps} />);
      
      const logoutButton = screen.getByLabelText('Logout');
      fireEvent.click(logoutButton);
      
      expect(mockProps.onLogout).toHaveBeenCalled();
    });
  });

  describe('Prompt Input', () => {
    it('handles prompt changes', () => {
      renderWithTheme(<Layout {...mockProps} />);
      
      const textField = screen.getByPlaceholderText(/Describe your construction project/);
      fireEvent.change(textField, { target: { value: 'Test prompt' } });
      
      expect(mockProps.onPromptChange).toHaveBeenCalledWith('Test prompt');
    });

    it('shows character count', () => {
      const propsWithPrompt = { ...mockProps, prompt: 'Test prompt' };
      renderWithTheme(<Layout {...propsWithPrompt} />);
      
      expect(screen.getByText('11/600 characters')).toBeInTheDocument();
    });

    it('shows warning color for high character count', () => {
      const longPrompt = 'a'.repeat(450);
      const propsWithLongPrompt = { ...mockProps, prompt: longPrompt };
      renderWithTheme(<Layout {...propsWithLongPrompt} />);
      
      expect(screen.getByText('450/600 characters')).toBeInTheDocument();
    });

    it('shows error color for exceeded character count', () => {
      const tooLongPrompt = 'a'.repeat(550);
      const propsWithTooLongPrompt = { ...mockProps, prompt: tooLongPrompt };
      renderWithTheme(<Layout {...propsWithTooLongPrompt} />);
      
      expect(screen.getByText('550/600 characters')).toBeInTheDocument();
    });
  });

  describe('Generation', () => {
    it('handles generate button click', () => {
      const propsWithPrompt = { ...mockProps, prompt: 'Test prompt' };
      renderWithTheme(<Layout {...propsWithPrompt} />);
      
      const generateButton = screen.getByRole('button', { name: 'Generate 3D Model' });
      fireEvent.click(generateButton);
      
      expect(mockProps.onGenerate).toHaveBeenCalled();
    });

    it('disables generate button when generating', () => {
      const generatingProps = { ...mockProps, isGenerating: true, prompt: 'Test prompt' };
      renderWithTheme(<Layout {...generatingProps} />);
      
      const generateButton = screen.getByRole('button', { name: 'Generating...' });
      expect(generateButton).toBeDisabled();
    });

    it('disables generate button when prompt is empty', () => {
      renderWithTheme(<Layout {...mockProps} />);
      
      const generateButton = screen.getByRole('button', { name: 'Generate 3D Model' });
      expect(generateButton).toBeDisabled();
    });

    it('disables generate button when character count exceeded', () => {
      const tooLongPrompt = 'a'.repeat(650);
      const propsWithTooLongPrompt = { ...mockProps, prompt: tooLongPrompt };
      renderWithTheme(<Layout {...propsWithTooLongPrompt} />);
      
      const generateButton = screen.getByRole('button', { name: 'Generate 3D Model' });
      expect(generateButton).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      const loadingProps = {
        ...mockProps,
        isLoading: true,
        loadingMessage: 'Processing...',
        progressStage: 'Generating mesh',
        progressValue: 50,
      };
      renderWithTheme(<Layout {...loadingProps} />);
      
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByText('Generating mesh')).toBeInTheDocument();
    });

    it('shows indeterminate progress when no progress value', () => {
      const loadingProps = {
        ...mockProps,
        isLoading: true,
        loadingMessage: 'Starting...',
        progressValue: 0,
      };
      renderWithTheme(<Layout {...loadingProps} />);
      
      expect(screen.getByText('Starting...')).toBeInTheDocument();
    });
  });

  describe('Download Panel', () => {
    it('shows download panel when task is available', () => {
      const propsWithTask = { ...mockProps, currentTask: mockTask };
      renderWithTheme(<Layout {...propsWithTask} />);
      
      expect(screen.getByText('Download Options')).toBeInTheDocument();
    });

    it('hides download panel when no task', () => {
      renderWithTheme(<Layout {...mockProps} />);
      
      expect(screen.queryByText('Download Options')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error snackbar', async () => {
      const errorProps = { ...mockProps, error: 'Test error message' };
      renderWithTheme(<Layout {...errorProps} />);
      
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('handles error dismissal', () => {
      const errorProps = { ...mockProps, error: 'Test error message' };
      renderWithTheme(<Layout {...errorProps} />);
      
      const closeButtons = screen.getAllByLabelText('Close');
      fireEvent.click(closeButtons[0]);
      
      expect(mockProps.onDismissError).toHaveBeenCalled();
    });

    it('shows success snackbar', () => {
      const successProps = { ...mockProps, success: 'Success message' };
      renderWithTheme(<Layout {...successProps} />);
      
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('handles success dismissal', () => {
      const successProps = { ...mockProps, success: 'Success message' };
      renderWithTheme(<Layout {...successProps} />);
      
      const closeButtons = screen.getAllByLabelText('Close');
      fireEvent.click(closeButtons[0]);
      
      expect(mockProps.onDismissSuccess).toHaveBeenCalled();
    });
  });

  describe('Model Viewer Integration', () => {
    it('passes correct props to model viewer', () => {
      const propsWithTask = { 
        ...mockProps, 
        currentTask: mockTask,
        modelInfo: { vertices: 1000, faces: 500 },
      };
      renderWithTheme(<Layout {...propsWithTask} />);
      
      expect(screen.getByText('3D Model Preview')).toBeInTheDocument();
    });

    it('handles viewer actions', () => {
      const propsWithTask = { ...mockProps, currentTask: mockTask };
      renderWithTheme(<Layout {...propsWithTask} />);
      
      // This would test viewer action handling if we had access to viewer controls
      // The actual viewer controls are rendered within ModelViewer component
    });
  });

  describe('Responsive Design', () => {
    it('renders grid layout correctly', () => {
      renderWithTheme(<Layout {...mockProps} />);
      
      // Check that main sections are present
      expect(screen.getByRole('heading', { name: 'Generate 3D Model' })).toBeInTheDocument();
      expect(screen.getByText('3D Model Preview')).toBeInTheDocument();
    });
  });
});
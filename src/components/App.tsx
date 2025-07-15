/**
 * Main React App Component
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '../theme';
import { Layout } from './Layout';
import { ConstructionApp } from '../core/app';
import { AppState } from '../types';

export const App: React.FC = () => {
  const [constructionApp] = useState(() => new ConstructionApp());
  const [appState, setAppState] = useState<AppState>({
    currentUser: null,
    currentTask: null,
    currentProject: null,
    generationStartTime: 0,
    isGenerating: false,
    isLoading: false,
  });

  const [prompt, setPrompt] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progressStage, setProgressStage] = useState('');
  const [progressValue, setProgressValue] = useState(0);
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Initialize the app and check authentication
    const checkAuth = async () => {
      const user = constructionApp.getCurrentUser();
      if (user) {
        setIsAuthenticated(true);
        setAppState(prev => ({ ...prev, currentUser: user }));
      }
    };

    checkAuth();

    // Set up window resize handler
    const handleResize = () => {
      constructionApp.onWindowResize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      constructionApp.disposeViewer();
    };
  }, [constructionApp]);

  const handleGenerateModel = async () => {
    if (!prompt.trim()) {
      setError('Please enter a construction description');
      return;
    }

    if (prompt.length > 600) {
      setError('Description must be 600 characters or less');
      return;
    }

    setError(null);
    setSuccess(null);
    setAppState(prev => ({ ...prev, isGenerating: true }));
    setLoadingMessage('Initializing generation...');

    try {
      // Call the existing generation logic
      await constructionApp.generateModel();

      // Update state with current task
      const currentTask = constructionApp.getCurrentTask();
      const currentProject = constructionApp.getCurrentProject();
      
      setAppState(prev => ({
        ...prev,
        currentTask,
        currentProject,
        isGenerating: false,
      }));

      if (currentTask) {
        setSuccess('3D model generated successfully!');
        // Get model info from the viewer
        const stats = constructionApp.getViewerStats();
        setModelInfo(stats);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate model');
      setAppState(prev => ({ ...prev, isGenerating: false }));
    } finally {
      setLoadingMessage('');
      setProgressStage('');
      setProgressValue(0);
    }
  };

  const handleDownload = async (url: string, extension: string) => {
    try {
      await constructionApp.downloadModel(url, extension);
      setSuccess(`${extension.toUpperCase()} file downloaded successfully!`);
    } catch (error) {
      setError('Failed to download model. Please try again.');
    }
  };

  const handleDownloadForEngine = async (engine: 'unreal' | 'unity' | 'blender') => {
    try {
      await constructionApp.downloadForEngine(engine);
      setSuccess(`Model downloaded and optimized for ${engine.charAt(0).toUpperCase() + engine.slice(1)}!`);
    } catch (error) {
      setError(`Failed to download model for ${engine}. Please try again.`);
    }
  };

  const handleDownloadAll = async () => {
    try {
      await constructionApp.downloadAllFormats();
      setSuccess('All formats downloaded successfully!');
    } catch (error) {
      setError('Failed to download all formats. Please try again.');
    }
  };

  const handleViewerAction = (action: string, ...args: any[]) => {
    try {
      switch (action) {
        case 'setViewMode':
          constructionApp.setViewMode(args[0]);
          break;
        case 'resetCamera':
          constructionApp.resetCamera();
          break;
        case 'takeScreenshot':
          constructionApp.takeScreenshot();
          break;
        case 'toggleAutoRotate':
          constructionApp.toggleAutoRotate();
          break;
        case 'setExposure':
          constructionApp.setExposure(args[0]);
          break;
        case 'setShadowIntensity':
          constructionApp.setShadowIntensity(args[0]);
          break;
        default:
          console.warn('Unknown viewer action:', action);
      }
    } catch (error) {
      setError('Failed to execute viewer action');
    }
  };

  const handleLogout = () => {
    constructionApp.logout();
  };

  const handleDismissError = () => {
    setError(null);
  };

  const handleDismissSuccess = () => {
    setSuccess(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Layout
        user={appState.currentUser}
        isAuthenticated={isAuthenticated}
        isGenerating={appState.isGenerating}
        isLoading={!!loadingMessage}
        loadingMessage={loadingMessage}
        progressStage={progressStage}
        progressValue={progressValue}
        prompt={prompt}
        onPromptChange={setPrompt}
        onGenerate={handleGenerateModel}
        onLogout={handleLogout}
        currentTask={appState.currentTask}
        modelInfo={modelInfo}
        onDownload={handleDownload}
        onDownloadForEngine={handleDownloadForEngine}
        onDownloadAll={handleDownloadAll}
        onViewerAction={handleViewerAction}
        error={error}
        success={success}
        onDismissError={handleDismissError}
        onDismissSuccess={handleDismissSuccess}
      />
    </ThemeProvider>
  );
};
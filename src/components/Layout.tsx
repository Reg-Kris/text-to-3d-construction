/**
 * Main Layout Component
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Card,
  CardContent,
  TextField,
  Box,
  LinearProgress,
  Alert,
  Snackbar,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Person as PersonIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { ModelViewer } from './ModelViewer';
import { DownloadPanel } from './DownloadPanel';
import type { User, MeshyTask } from '../types';

interface LayoutProps {
  user: User | null;
  isAuthenticated: boolean;
  isGenerating: boolean;
  isLoading: boolean;
  loadingMessage: string;
  progressStage: string;
  progressValue: number;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  onLogout: () => void;
  currentTask: MeshyTask | null;
  modelInfo: any;
  onDownload: (url: string, extension: string) => void;
  onDownloadForEngine: (engine: 'unreal' | 'unity' | 'blender') => void;
  onDownloadAll: () => void;
  onViewerAction: (action: string, ...args: any[]) => void;
  error: string | null;
  success: string | null;
  onDismissError: () => void;
  onDismissSuccess: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  user,
  isAuthenticated,
  isGenerating,
  isLoading,
  loadingMessage,
  progressStage,
  progressValue,
  prompt,
  onPromptChange,
  onGenerate,
  onLogout,
  currentTask,
  modelInfo,
  onDownload,
  onDownloadForEngine,
  onDownloadAll,
  onViewerAction,
  error,
  success,
  onDismissError,
  onDismissSuccess,
}) => {
  const charCount = prompt.length;
  const maxChars = 600;
  
  const getCharCountColor = () => {
    if (charCount > 500) return 'error';
    if (charCount > 400) return 'warning';
    return 'text.secondary';
  };

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'background.default',
        }}
      >
        <Card sx={{ maxWidth: 400, p: 4, textAlign: 'center' }}>
          <CardContent>
            <BuildIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Construction 3D Generator
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Authenticating access to proprietary software...
            </Typography>
            <LinearProgress />
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <BuildIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Construction 3D Model Generator
          </Typography>
          
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                avatar={<Avatar><PersonIcon /></Avatar>}
                label={user.name || user.email}
                variant="outlined"
                size="small"
              />
              <Tooltip title="Logout">
                <IconButton color="inherit" onClick={onLogout}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ flex: 1, py: 4 }}>
        <Grid container spacing={4}>
          {/* Input Section */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Generate 3D Model
                </Typography>
                
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  value={prompt}
                  onChange={(e) => onPromptChange(e.target.value)}
                  placeholder="Describe your construction project...&#10;Example: 2-bedroom prefab cabin with solar panels&#10;Max 600 characters"
                  disabled={isGenerating}
                  sx={{ mb: 2 }}
                  inputProps={{ maxLength: maxChars }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" color={getCharCountColor()}>
                    {charCount}/{maxChars} characters
                  </Typography>
                </Box>
                
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={onGenerate}
                  disabled={isGenerating || !prompt.trim() || charCount > maxChars}
                  sx={{ mb: 2 }}
                >
                  {isGenerating ? 'Generating...' : 'Generate 3D Model'}
                </Button>
                
                {isLoading && (
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {loadingMessage}
                    </Typography>
                    <LinearProgress 
                      variant={progressValue > 0 ? 'determinate' : 'indeterminate'}
                      value={progressValue}
                      sx={{ mb: 1 }}
                    />
                    {progressStage && (
                      <Typography variant="caption" color="text.secondary">
                        {progressStage}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Model Viewer Section */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ height: '100%', minHeight: 400 }}>
              <CardContent sx={{ height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                  3D Model Preview
                </Typography>
                
                <ModelViewer
                  task={currentTask}
                  modelInfo={modelInfo}
                  onViewerAction={onViewerAction}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Download Section */}
          {currentTask && (
            <Grid size={{ xs: 12 }}>
              <DownloadPanel
                task={currentTask}
                onDownload={onDownload}
                onDownloadForEngine={onDownloadForEngine}
                onDownloadAll={onDownloadAll}
              />
            </Grid>
          )}
        </Grid>
      </Container>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={onDismissError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={onDismissError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={onDismissSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={onDismissSuccess} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};
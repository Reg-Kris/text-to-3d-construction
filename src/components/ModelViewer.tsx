/**
 * React Model Viewer Component
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  ButtonGroup,
  Button,
  Slider,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  Refresh as RefreshIcon,
  RotateRight as RotateIcon,
  ViewInAr as ViewInArIcon,
} from '@mui/icons-material';
import type { MeshyTask } from '../types';

interface ModelViewerProps {
  task: MeshyTask | null;
  modelInfo: any;
  onViewerAction: (action: string, ...args: any[]) => void;
  isLoading: boolean;
}

export const ModelViewer: React.FC<ModelViewerProps> = ({
  task,
  modelInfo,
  onViewerAction,
  isLoading,
}) => {
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const [exposure, setExposure] = useState(1.0);
  const [shadowIntensity, setShadowIntensity] = useState(0.3);
  const [viewMode, setViewMode] = useState<'perspective' | 'top' | 'front' | 'side'>('perspective');

  useEffect(() => {
    // The viewer container will be managed by the existing GoogleModelViewer
    // We just need to provide the container reference
    if (viewerContainerRef.current && task?.model_urls?.glb) {
      viewerContainerRef.current.id = 'viewer-container';
    }
  }, [task]);

  const handleViewModeChange = (mode: 'perspective' | 'top' | 'front' | 'side') => {
    setViewMode(mode);
    onViewerAction('setViewMode', mode);
  };

  const handleExposureChange = (value: number) => {
    setExposure(value);
    onViewerAction('setExposure', value);
  };

  const handleShadowIntensityChange = (value: number) => {
    setShadowIntensity(value);
    onViewerAction('setShadowIntensity', value);
  };

  const handleScreenshot = () => {
    onViewerAction('takeScreenshot');
  };

  const handleResetCamera = () => {
    onViewerAction('resetCamera');
  };

  const handleToggleAutoRotate = () => {
    onViewerAction('toggleAutoRotate');
  };

  if (!task || !task.model_urls?.glb) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 300,
          backgroundColor: 'background.paper',
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
        }}
      >
        {isLoading ? (
          <>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography color="text.secondary">
              Loading 3D model...
            </Typography>
          </>
        ) : (
          <>
            <ViewInArIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography color="text.secondary">
              Generate a model to view it here
            </Typography>
          </>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%' }}>
      {/* Model Viewer Container */}
      <Box
        ref={viewerContainerRef}
        sx={{
          height: 300,
          backgroundColor: '#2a2a2a',
          borderRadius: 1,
          border: 1,
          borderColor: 'divider',
          mb: 2,
          position: 'relative',
          overflow: 'hidden',
        }}
      />

      {/* Viewer Controls */}
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={1} alignItems="center">
          <Grid size={{ xs: 12, sm: 6 }}>
            <ButtonGroup size="small" variant="outlined" fullWidth>
              <Button
                onClick={() => handleViewModeChange('perspective')}
                variant={viewMode === 'perspective' ? 'contained' : 'outlined'}
              >
                3D
              </Button>
              <Button
                onClick={() => handleViewModeChange('top')}
                variant={viewMode === 'top' ? 'contained' : 'outlined'}
              >
                Top
              </Button>
              <Button
                onClick={() => handleViewModeChange('front')}
                variant={viewMode === 'front' ? 'contained' : 'outlined'}
              >
                Front
              </Button>
              <Button
                onClick={() => handleViewModeChange('side')}
                variant={viewMode === 'side' ? 'contained' : 'outlined'}
              >
                Side
              </Button>
            </ButtonGroup>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Tooltip title="Reset Camera">
                <IconButton onClick={handleResetCamera} size="small">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Toggle Auto-Rotate">
                <IconButton onClick={handleToggleAutoRotate} size="small">
                  <RotateIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Take Screenshot">
                <IconButton onClick={handleScreenshot} size="small">
                  <CameraIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Lighting Controls */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary">
                Exposure
              </Typography>
              <Slider
                value={exposure}
                onChange={(_, value) => handleExposureChange(value as number)}
                min={0.1}
                max={3.0}
                step={0.1}
                size="small"
                sx={{ ml: 1 }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary">
                Shadow Intensity
              </Typography>
              <Slider
                value={shadowIntensity}
                onChange={(_, value) => handleShadowIntensityChange(value as number)}
                min={0.0}
                max={1.0}
                step={0.1}
                size="small"
                sx={{ ml: 1 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Model Info */}
      {modelInfo && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {modelInfo.vertices && (
            <Chip
              label={`${modelInfo.vertices.toLocaleString()} vertices`}
              size="small"
              variant="outlined"
            />
          )}
          {modelInfo.faces && (
            <Chip
              label={`${modelInfo.faces.toLocaleString()} faces`}
              size="small"
              variant="outlined"
            />
          )}
          {modelInfo.materials && (
            <Chip
              label={`${modelInfo.materials} materials`}
              size="small"
              variant="outlined"
            />
          )}
          {modelInfo.fileSize && (
            <Chip
              label={`${modelInfo.fileSize}`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      )}
    </Box>
  );
};
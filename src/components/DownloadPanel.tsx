/**
 * Download Panel Component
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Grid,
} from '@mui/material';
import {
  Download as DownloadIcon,
  GetApp as GetAppIcon,
  Folder as FolderIcon,
  Code as CodeIcon,
  Archive as ArchiveIcon,
  SportsEsports as UnityIcon,
  ThreeDRotation as BlenderIcon,
  ViewInAr as ThreeDRotationIcon,
} from '@mui/icons-material';
import type { MeshyTask } from '../types';

interface DownloadPanelProps {
  task: MeshyTask;
  onDownload: (url: string, extension: string) => void;
  onDownloadForEngine: (engine: 'unreal' | 'unity' | 'blender') => void;
  onDownloadAll: () => void;
}

export const DownloadPanel: React.FC<DownloadPanelProps> = ({
  task,
  onDownload,
  onDownloadForEngine,
  onDownloadAll,
}) => {
  const [showEngineDialog, setShowEngineDialog] = useState(false);
  const [showAllFormatsDialog, setShowAllFormatsDialog] = useState(false);

  const modelUrls = task.model_urls || {};
  const availableFormats = Object.keys(modelUrls).filter(key => modelUrls[key as keyof typeof modelUrls]);

  const getFormatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'glb':
      case 'gltf':
        return <ThreeDRotationIcon sx={{ color: 'primary.main' }} />;
      case 'obj':
        return <CodeIcon sx={{ color: 'secondary.main' }} />;
      case 'fbx':
        return <UnityIcon sx={{ color: 'warning.main' }} />;
      case 'usd':
      case 'usda':
      case 'usdc':
        return <BlenderIcon sx={{ color: 'info.main' }} />;
      default:
        return <ArchiveIcon sx={{ color: 'text.secondary' }} />;
    }
  };

  const getFormatDescription = (format: string) => {
    switch (format.toLowerCase()) {
      case 'glb':
        return 'Binary glTF - Best for web and mobile';
      case 'gltf':
        return 'glTF - Standard for 3D web content';
      case 'obj':
        return 'OBJ - Universal 3D format';
      case 'fbx':
        return 'FBX - Autodesk format for animation';
      case 'usd':
      case 'usda':
      case 'usdc':
        return 'USD - Universal Scene Description';
      default:
        return 'Generic 3D model format';
    }
  };

  const getEngineIcon = (engine: string) => {
    switch (engine) {
      case 'unreal':
        return <CodeIcon sx={{ color: 'primary.main' }} />;
      case 'unity':
        return <UnityIcon sx={{ color: 'warning.main' }} />;
      case 'blender':
        return <BlenderIcon sx={{ color: 'info.main' }} />;
      default:
        return <FolderIcon />;
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Download Options
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Available Formats ({availableFormats.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {availableFormats.map((format) => (
              <Chip
                key={format}
                label={format.toUpperCase()}
                variant="outlined"
                size="small"
                color="primary"
              />
            ))}
          </Box>
        </Box>

        <Grid container spacing={2}>
          {/* Individual Format Downloads */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" gutterBottom>
              Individual Formats
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {availableFormats.map((format) => (
                <Button
                  key={format}
                  variant="outlined"
                  startIcon={getFormatIcon(format)}
                  onClick={() => onDownload(modelUrls[format as keyof typeof modelUrls] || '', format)}
                  size="small"
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Download {format.toUpperCase()}
                </Button>
              ))}
            </Box>
          </Grid>

          {/* Engine-Specific Downloads */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" gutterBottom>
              Engine-Specific
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={getEngineIcon('unreal')}
                onClick={() => onDownloadForEngine('unreal')}
                size="small"
                fullWidth
                sx={{ justifyContent: 'flex-start' }}
              >
                For Unreal Engine
              </Button>
              <Button
                variant="outlined"
                startIcon={getEngineIcon('unity')}
                onClick={() => onDownloadForEngine('unity')}
                size="small"
                fullWidth
                sx={{ justifyContent: 'flex-start' }}
              >
                For Unity
              </Button>
              <Button
                variant="outlined"
                startIcon={getEngineIcon('blender')}
                onClick={() => onDownloadForEngine('blender')}
                size="small"
                fullWidth
                sx={{ justifyContent: 'flex-start' }}
              >
                For Blender
              </Button>
            </Box>
          </Grid>

          {/* Batch Downloads */}
          <Grid size={{ xs: 12 }}>
            <Divider sx={{ my: 2 }} />
            <ButtonGroup variant="contained" fullWidth>
              <Button
                onClick={() => setShowAllFormatsDialog(true)}
                startIcon={<GetAppIcon />}
                sx={{ flex: 1 }}
              >
                Download All Formats
              </Button>
              <Button
                onClick={() => setShowEngineDialog(true)}
                startIcon={<FolderIcon />}
                sx={{ flex: 1 }}
              >
                Engine Options
              </Button>
            </ButtonGroup>
          </Grid>
        </Grid>

        {/* Model Info */}
        {task.status === 'SUCCEEDED' && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Model ID: {task.id}
            </Typography>
            <br />
            <Typography variant="caption" color="text.secondary">
              Status: {task.status}
            </Typography>
            {task.created_at && (
              <>
                <br />
                <Typography variant="caption" color="text.secondary">
                  Created: {new Date(task.created_at).toLocaleString()}
                </Typography>
              </>
            )}
          </Box>
        )}
      </CardContent>

      {/* Engine Options Dialog */}
      <Dialog open={showEngineDialog} onClose={() => setShowEngineDialog(false)}>
        <DialogTitle>Engine-Specific Downloads</DialogTitle>
        <DialogContent>
          <List>
            <ListItem>
              <ListItemIcon>{getEngineIcon('unreal')}</ListItemIcon>
              <ListItemText
                primary="Unreal Engine"
                secondary="Optimized FBX with materials and textures"
              />
              <Button
                variant="outlined"
                onClick={() => {
                  onDownloadForEngine('unreal');
                  setShowEngineDialog(false);
                }}
              >
                Download
              </Button>
            </ListItem>
            <ListItem>
              <ListItemIcon>{getEngineIcon('unity')}</ListItemIcon>
              <ListItemText
                primary="Unity"
                secondary="FBX with Unity-compatible materials"
              />
              <Button
                variant="outlined"
                onClick={() => {
                  onDownloadForEngine('unity');
                  setShowEngineDialog(false);
                }}
              >
                Download
              </Button>
            </ListItem>
            <ListItem>
              <ListItemIcon>{getEngineIcon('blender')}</ListItemIcon>
              <ListItemText
                primary="Blender"
                secondary="GLB with Blender-optimized materials"
              />
              <Button
                variant="outlined"
                onClick={() => {
                  onDownloadForEngine('blender');
                  setShowEngineDialog(false);
                }}
              >
                Download
              </Button>
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEngineDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* All Formats Dialog */}
      <Dialog open={showAllFormatsDialog} onClose={() => setShowAllFormatsDialog(false)}>
        <DialogTitle>Download All Formats</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will download all available formats for your model:
          </Typography>
          <List>
            {availableFormats.map((format) => (
              <ListItem key={format}>
                <ListItemIcon>{getFormatIcon(format)}</ListItemIcon>
                <ListItemText
                  primary={format.toUpperCase()}
                  secondary={getFormatDescription(format)}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAllFormatsDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              onDownloadAll();
              setShowAllFormatsDialog(false);
            }}
            startIcon={<DownloadIcon />}
          >
            Download All
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
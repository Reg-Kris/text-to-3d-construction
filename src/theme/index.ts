/**
 * Material-UI Dark Theme Configuration
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#0d7cf5',
      light: '#4da3ff',
      dark: '#0056b3',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#28a745',
      light: '#5cbf6b',
      dark: '#1e7e34',
      contrastText: '#ffffff',
    },
    error: {
      main: '#dc3545',
      light: '#e57373',
      dark: '#b71c1c',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ffc107',
      light: '#ffeb3b',
      dark: '#ff8f00',
      contrastText: '#000000',
    },
    info: {
      main: '#17a2b8',
      light: '#4fc3f7',
      dark: '#0288d1',
      contrastText: '#ffffff',
    },
    success: {
      main: '#28a745',
      light: '#4caf50',
      dark: '#1b5e20',
      contrastText: '#ffffff',
    },
    background: {
      default: '#1a1a1a',
      paper: '#2a2a2a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
      disabled: '#666666',
    },
    divider: '#444444',
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
    },
    button: {
      textTransform: 'none',
      fontSize: '0.875rem',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          },
        },
        containedPrimary: {
          backgroundColor: '#0d7cf5',
          '&:hover': {
            backgroundColor: '#0056b3',
          },
        },
        containedSecondary: {
          backgroundColor: '#28a745',
          '&:hover': {
            backgroundColor: '#1e7e34',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#2a2a2a',
          borderRadius: 12,
          border: '1px solid #444444',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#2a2a2a',
          borderBottom: '1px solid #444444',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#2a2a2a',
            '& fieldset': {
              borderColor: '#444444',
            },
            '&:hover fieldset': {
              borderColor: '#0d7cf5',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#0d7cf5',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#2a2a2a',
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: '#444444',
          color: '#ffffff',
          '&.MuiChip-colorPrimary': {
            backgroundColor: '#0d7cf5',
          },
          '&.MuiChip-colorSecondary': {
            backgroundColor: '#28a745',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: '#444444',
          borderRadius: 4,
        },
        bar: {
          backgroundColor: '#0d7cf5',
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#0d7cf5',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#b0b0b0',
          '&:hover': {
            backgroundColor: 'rgba(13, 124, 245, 0.1)',
            color: '#0d7cf5',
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#444444',
          color: '#ffffff',
          fontSize: '0.75rem',
          borderRadius: 4,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#2a2a2a',
          backgroundImage: 'none',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        standardError: {
          backgroundColor: '#dc3545',
          color: '#ffffff',
        },
        standardWarning: {
          backgroundColor: '#ffc107',
          color: '#000000',
        },
        standardInfo: {
          backgroundColor: '#17a2b8',
          color: '#ffffff',
        },
        standardSuccess: {
          backgroundColor: '#28a745',
          color: '#ffffff',
        },
      },
    },
  },
});
/**
 * Theme Configuration Tests
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { theme } from './index';

describe('Theme Configuration', () => {
  it('creates a valid Material-UI theme', () => {
    expect(theme).toBeDefined();
    expect(theme.palette).toBeDefined();
    expect(theme.typography).toBeDefined();
    expect(theme.components).toBeDefined();
  });

  describe('Palette Configuration', () => {
    it('sets dark mode', () => {
      expect(theme.palette.mode).toBe('dark');
    });

    it('defines primary color', () => {
      expect(theme.palette.primary.main).toBe('#0d7cf5');
      expect(theme.palette.primary.light).toBe('#4da3ff');
      expect(theme.palette.primary.dark).toBe('#0056b3');
      expect(theme.palette.primary.contrastText).toBe('#ffffff');
    });

    it('defines secondary color', () => {
      expect(theme.palette.secondary.main).toBe('#28a745');
      expect(theme.palette.secondary.light).toBe('#5cbf6b');
      expect(theme.palette.secondary.dark).toBe('#1e7e34');
      expect(theme.palette.secondary.contrastText).toBe('#ffffff');
    });

    it('defines error color', () => {
      expect(theme.palette.error.main).toBe('#dc3545');
      expect(theme.palette.error.light).toBe('#e57373');
      expect(theme.palette.error.dark).toBe('#b71c1c');
      expect(theme.palette.error.contrastText).toBe('#ffffff');
    });

    it('defines warning color', () => {
      expect(theme.palette.warning.main).toBe('#ffc107');
      expect(theme.palette.warning.light).toBe('#ffeb3b');
      expect(theme.palette.warning.dark).toBe('#ff8f00');
      expect(theme.palette.warning.contrastText).toBe('#000000');
    });

    it('defines info color', () => {
      expect(theme.palette.info.main).toBe('#17a2b8');
      expect(theme.palette.info.light).toBe('#4fc3f7');
      expect(theme.palette.info.dark).toBe('#0288d1');
      expect(theme.palette.info.contrastText).toBe('#ffffff');
    });

    it('defines success color', () => {
      expect(theme.palette.success.main).toBe('#28a745');
      expect(theme.palette.success.light).toBe('#4caf50');
      expect(theme.palette.success.dark).toBe('#1b5e20');
      expect(theme.palette.success.contrastText).toBe('#ffffff');
    });

    it('defines background colors', () => {
      expect(theme.palette.background.default).toBe('#1a1a1a');
      expect(theme.palette.background.paper).toBe('#2a2a2a');
    });

    it('defines text colors', () => {
      expect(theme.palette.text.primary).toBe('#ffffff');
      expect(theme.palette.text.secondary).toBe('#b0b0b0');
      expect(theme.palette.text.disabled).toBe('#666666');
    });

    it('defines divider color', () => {
      expect(theme.palette.divider).toBe('#444444');
    });
  });

  describe('Typography Configuration', () => {
    it('sets font family', () => {
      expect(theme.typography.fontFamily).toBe('"Roboto", "Helvetica", "Arial", sans-serif');
    });

    it('defines heading styles', () => {
      expect(theme.typography.h1.fontSize).toBe('2.5rem');
      expect(theme.typography.h1.fontWeight).toBe(600);
      expect(theme.typography.h1.lineHeight).toBe(1.2);

      expect(theme.typography.h2.fontSize).toBe('2rem');
      expect(theme.typography.h2.fontWeight).toBe(600);
      expect(theme.typography.h2.lineHeight).toBe(1.3);

      expect(theme.typography.h3.fontSize).toBe('1.75rem');
      expect(theme.typography.h3.fontWeight).toBe(600);
      expect(theme.typography.h3.lineHeight).toBe(1.3);

      expect(theme.typography.h4.fontSize).toBe('1.5rem');
      expect(theme.typography.h4.fontWeight).toBe(600);
      expect(theme.typography.h4.lineHeight).toBe(1.4);

      expect(theme.typography.h5.fontSize).toBe('1.25rem');
      expect(theme.typography.h5.fontWeight).toBe(600);
      expect(theme.typography.h5.lineHeight).toBe(1.4);

      expect(theme.typography.h6.fontSize).toBe('1rem');
      expect(theme.typography.h6.fontWeight).toBe(600);
      expect(theme.typography.h6.lineHeight).toBe(1.5);
    });

    it('defines body text styles', () => {
      expect(theme.typography.body1.fontSize).toBe('1rem');
      expect(theme.typography.body1.lineHeight).toBe(1.5);

      expect(theme.typography.body2.fontSize).toBe('0.875rem');
      expect(theme.typography.body2.lineHeight).toBe(1.43);
    });

    it('defines button text styles', () => {
      expect(theme.typography.button.textTransform).toBe('none');
      expect(theme.typography.button.fontSize).toBe('0.875rem');
      expect(theme.typography.button.fontWeight).toBe(500);
    });
  });

  describe('Shape Configuration', () => {
    it('sets border radius', () => {
      expect(theme.shape.borderRadius).toBe(8);
    });
  });

  describe('Spacing Configuration', () => {
    it('sets spacing unit', () => {
      expect(theme.spacing(1)).toBe('8px');
      expect(theme.spacing(2)).toBe('16px');
      expect(theme.spacing(3)).toBe('24px');
    });
  });

  describe('Component Overrides', () => {
    it('overrides button styles', () => {
      const buttonOverrides = theme.components?.MuiButton?.styleOverrides?.root;
      expect(buttonOverrides).toBeDefined();
      
      if (typeof buttonOverrides === 'object') {
        expect(buttonOverrides.borderRadius).toBe(8);
        expect(buttonOverrides.textTransform).toBe('none');
        expect(buttonOverrides.fontWeight).toBe(500);
        expect(buttonOverrides.boxShadow).toBe('none');
      }
    });

    it('overrides card styles', () => {
      const cardOverrides = theme.components?.MuiCard?.styleOverrides?.root;
      expect(cardOverrides).toBeDefined();
      
      if (typeof cardOverrides === 'object') {
        expect(cardOverrides.backgroundColor).toBe('#2a2a2a');
        expect(cardOverrides.borderRadius).toBe(12);
        expect(cardOverrides.border).toBe('1px solid #444444');
      }
    });

    it('overrides app bar styles', () => {
      const appBarOverrides = theme.components?.MuiAppBar?.styleOverrides?.root;
      expect(appBarOverrides).toBeDefined();
      
      if (typeof appBarOverrides === 'object') {
        expect(appBarOverrides.backgroundColor).toBe('#2a2a2a');
        expect(appBarOverrides.borderBottom).toBe('1px solid #444444');
      }
    });

    it('overrides text field styles', () => {
      const textFieldOverrides = theme.components?.MuiTextField?.styleOverrides?.root;
      expect(textFieldOverrides).toBeDefined();
    });

    it('overrides paper styles', () => {
      const paperOverrides = theme.components?.MuiPaper?.styleOverrides?.root;
      expect(paperOverrides).toBeDefined();
      
      if (typeof paperOverrides === 'object') {
        expect(paperOverrides.backgroundColor).toBe('#2a2a2a');
        expect(paperOverrides.borderRadius).toBe(8);
      }
    });

    it('overrides chip styles', () => {
      const chipOverrides = theme.components?.MuiChip?.styleOverrides?.root;
      expect(chipOverrides).toBeDefined();
      
      if (typeof chipOverrides === 'object') {
        expect(chipOverrides.backgroundColor).toBe('#444444');
        expect(chipOverrides.color).toBe('#ffffff');
      }
    });

    it('overrides progress bar styles', () => {
      const linearProgressOverrides = theme.components?.MuiLinearProgress?.styleOverrides?.root;
      const circularProgressOverrides = theme.components?.MuiCircularProgress?.styleOverrides?.root;
      
      expect(linearProgressOverrides).toBeDefined();
      expect(circularProgressOverrides).toBeDefined();
      
      if (typeof linearProgressOverrides === 'object') {
        expect(linearProgressOverrides.backgroundColor).toBe('#444444');
        expect(linearProgressOverrides.borderRadius).toBe(4);
      }
      
      if (typeof circularProgressOverrides === 'object') {
        expect(circularProgressOverrides.color).toBe('#0d7cf5');
      }
    });

    it('overrides icon button styles', () => {
      const iconButtonOverrides = theme.components?.MuiIconButton?.styleOverrides?.root;
      expect(iconButtonOverrides).toBeDefined();
      
      if (typeof iconButtonOverrides === 'object') {
        expect(iconButtonOverrides.color).toBe('#b0b0b0');
      }
    });

    it('overrides tooltip styles', () => {
      const tooltipOverrides = theme.components?.MuiTooltip?.styleOverrides?.tooltip;
      expect(tooltipOverrides).toBeDefined();
      
      if (typeof tooltipOverrides === 'object') {
        expect(tooltipOverrides.backgroundColor).toBe('#444444');
        expect(tooltipOverrides.color).toBe('#ffffff');
        expect(tooltipOverrides.fontSize).toBe('0.75rem');
        expect(tooltipOverrides.borderRadius).toBe(4);
      }
    });

    it('overrides dialog styles', () => {
      const dialogOverrides = theme.components?.MuiDialog?.styleOverrides?.paper;
      expect(dialogOverrides).toBeDefined();
      
      if (typeof dialogOverrides === 'object') {
        expect(dialogOverrides.backgroundColor).toBe('#2a2a2a');
        expect(dialogOverrides.backgroundImage).toBe('none');
      }
    });

    it('overrides alert styles', () => {
      const alertOverrides = theme.components?.MuiAlert?.styleOverrides?.root;
      expect(alertOverrides).toBeDefined();
      
      if (typeof alertOverrides === 'object') {
        expect(alertOverrides.borderRadius).toBe(8);
      }
    });
  });

  describe('Theme Consistency', () => {
    it('uses consistent color values across components', () => {
      const primaryColor = '#0d7cf5';
      const backgroundColor = '#2a2a2a';
      
      expect(theme.palette.primary.main).toBe(primaryColor);
      expect(theme.palette.background.paper).toBe(backgroundColor);
      
      const cardOverrides = theme.components?.MuiCard?.styleOverrides?.root;
      if (typeof cardOverrides === 'object') {
        expect(cardOverrides.backgroundColor).toBe(backgroundColor);
      }
    });

    it('uses consistent spacing values', () => {
      const borderRadius = 8;
      
      expect(theme.shape.borderRadius).toBe(borderRadius);
      
      const buttonOverrides = theme.components?.MuiButton?.styleOverrides?.root;
      if (typeof buttonOverrides === 'object') {
        expect(buttonOverrides.borderRadius).toBe(borderRadius);
      }
    });
  });
});
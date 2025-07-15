/**
 * Text-to-3D Construction Platform - Monitoring Provider
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import React, { useEffect, ReactNode } from 'react';
import { monitoring } from '../services/monitoring';
import { IS_DEVELOPMENT } from '../config';

interface MonitoringProviderProps {
  children: ReactNode;
}

export const MonitoringProvider: React.FC<MonitoringProviderProps> = ({ children }) => {
  useEffect(() => {
    // Initialize monitoring service
    monitoring.trackUserAction('app_start', 'application', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        monitoring.trackUserAction('page_focus', 'application');
      } else {
        monitoring.trackUserAction('page_blur', 'application');
      }
    };

    // Track page unload
    const handleBeforeUnload = () => {
      monitoring.trackUserAction('app_exit', 'application', {
        timestamp: new Date().toISOString(),
      });
    };

    // Track memory usage periodically
    const trackMemoryUsage = () => {
      monitoring.trackMemoryUsage('application');
    };

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Track memory usage every 30 seconds in development, 5 minutes in production
    const memoryInterval = setInterval(trackMemoryUsage, IS_DEVELOPMENT ? 30000 : 300000);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(memoryInterval);
    };
  }, []);

  return <>{children}</>;
};
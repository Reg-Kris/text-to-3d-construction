/**
 * Text-to-3D Construction Platform - Logging Service
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { IS_DEVELOPMENT } from '../config';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = IS_DEVELOPMENT ? LogLevel.DEBUG : LogLevel.WARN;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, message: string, context?: string, data?: any) {
    // Only log if level is high enough
    if (level < this.logLevel) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      data,
    };

    // Add to memory logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // In development, also log to console
    if (IS_DEVELOPMENT) {
      const prefix = context ? `[${context}]` : '';
      const logMethod = this.getConsoleMethod(level);
      
      if (data) {
        logMethod(`${prefix} ${message}`, data);
      } else {
        logMethod(`${prefix} ${message}`);
      }
    }

    // In production, critical errors should still go to console
    if (!IS_DEVELOPMENT && level === LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, data || '');
    }
  }

  private getConsoleMethod(level: LogLevel) {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }

  debug(message: string, context?: string, data?: any) {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  info(message: string, context?: string, data?: any) {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: string, data?: any) {
    this.log(LogLevel.WARN, message, context, data);
  }

  error(message: string, context?: string, data?: any) {
    this.log(LogLevel.ERROR, message, context, data);
  }

  // Performance monitoring
  time(label: string) {
    if (IS_DEVELOPMENT) {
      console.time(label);
    }
  }

  timeEnd(label: string) {
    if (IS_DEVELOPMENT) {
      console.timeEnd(label);
    }
  }

  // Get logs for debugging or reporting
  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Set log level dynamically
  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
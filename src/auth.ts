/**
 * Text-to-3D Construction Platform - Authentication Service
 * Copyright © 2024 Kris. All rights reserved.
 * PROPRIETARY SOFTWARE - NOT OPEN SOURCE
 */

import { API_CONFIG } from './config';

export interface User {
  email: string;
  name: string;
  authenticated: boolean;
}

export class AuthService {
  private static currentUser: User | null = null;

  static async authenticate(): Promise<User | null> {
    // Simple email prompt for now (can be enhanced with OAuth later)
    const email = prompt(
      'Enter your email address to access the 3D Construction Platform:',
    );

    if (!email) {
      return null;
    }

    // Check if email is in whitelist
    if (!API_CONFIG.AUTHORIZED_EMAILS.includes(email.toLowerCase())) {
      alert(
        'Access denied. Your email is not authorized to use this application.',
      );
      return null;
    }

    // Create user object
    const user: User = {
      email: email.toLowerCase(),
      name: email.split('@')[0], // Extract name from email
      authenticated: true,
    };

    this.currentUser = user;

    // Store in localStorage for session persistence
    localStorage.setItem('construction_3d_user', JSON.stringify(user));

    return user;
  }

  static getCurrentUser(): User | null {
    if (this.currentUser) {
      return this.currentUser;
    }

    // Try to restore from localStorage
    const stored = localStorage.getItem('construction_3d_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        if (
          user.authenticated &&
          API_CONFIG.AUTHORIZED_EMAILS.includes(user.email)
        ) {
          this.currentUser = user;
          return user;
        }
      } catch (error) {
        console.error('Failed to restore user session:', error);
      }
    }

    return null;
  }

  static logout(): void {
    this.currentUser = null;
    localStorage.removeItem('construction_3d_user');
  }

  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }
}

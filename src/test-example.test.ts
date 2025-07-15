/**
 * Simple Test Example
 * Copyright © 2024 Kristopher Gerasimov. All rights reserved.
 */

import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle promises', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should handle mocked functions', () => {
    const mockFn = vi.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});
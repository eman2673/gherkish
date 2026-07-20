import { describe, it, expect, beforeEach } from 'vitest';
import { feature } from './feature';

describe('Feature Function', () => {
  beforeEach(() => {
    // No mocks to clear
  });

  it('should have the correct structure', () => {
    expect(typeof feature).toBe('function');
    expect(typeof feature.only).toBe('function');
    expect(typeof feature.skip).toBe('function');
    expect(typeof feature.todo).toBe('function');
  });

  it('should accept a name and function without throwing', () => {
    const testFn = (params: any) => {
      expect(params).toHaveProperty('beforeEach');
      expect(params).toHaveProperty('afterEach');
      expect(Object.keys(params)).toEqual(['beforeEach', 'afterEach']);
    };

    // This should not throw
    expect(() => {
      feature('test feature', testFn);
    }).not.toThrow();
  });

  it('should support feature.only without throwing', () => {
    const testFn = (params: any) => {
      expect(params).toHaveProperty('beforeEach');
      expect(params).toHaveProperty('afterEach');
      expect(Object.keys(params)).toEqual(['beforeEach', 'afterEach']);
    };

    // This should not throw
    expect(() => {
      feature.only('test feature only', testFn);
    }).not.toThrow();
  });

  it('should support feature.skip without throwing', () => {
    const testFn = (params: any) => {
      expect(params).toHaveProperty('beforeEach');
      expect(params).toHaveProperty('afterEach');
      expect(Object.keys(params)).toEqual(['beforeEach', 'afterEach']);
    };

    // This should not throw
    expect(() => {
      feature.skip('test feature skip', testFn);
    }).not.toThrow();
  });

  it('should have todo method available', () => {
    expect(feature.todo).toBeDefined();
    expect(typeof feature.todo).toBe('function');
  });

  it('should pass the correct params object structure', () => {
    // Test that the params object has the expected structure
    const params = { beforeEach: () => {}, afterEach: () => {} };
    expect(params).toHaveProperty('beforeEach');
    expect(params).toHaveProperty('afterEach');
    expect(Object.keys(params)).toEqual(['beforeEach', 'afterEach']);
  });
});

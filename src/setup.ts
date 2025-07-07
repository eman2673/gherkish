import { vi } from 'vitest';

// Mock the context module - this must be hoisted and set up before any imports
const mockContext = vi.hoisted(() => ({
  getStore: vi.fn(),
  run: vi.fn(),
}));
const mockUseCtx = vi.hoisted(() => vi.fn());
const mockSetContext = vi.hoisted(() => vi.fn());

// Set up the mock before any imports
vi.mock('./utils/context', () => ({
  context: mockContext,
  useCtx: mockUseCtx,
  setContext: mockSetContext,
  Context: vi.fn(),
}));

export { mockContext, mockUseCtx, mockSetContext };

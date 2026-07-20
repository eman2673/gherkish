import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from './http.client';
import type { HttpMethod } from './http.client';

// Mock fetch globally
global.fetch = vi.fn();

describe('HttpClient', () => {
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Registration', () => {
    it('should register and retrieve API configurations', () => {
      const apiConfig = {
        baseUrl: 'https://api.example.com',
        defaultHeaders: { 'X-API-Key': 'test' },
      };

      httpClient.add('test-api', apiConfig);
      const retrieved = httpClient.getApi('test-api');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-api');
      expect(retrieved?.baseUrl).toBe('https://api.example.com');
    });

    it('should return undefined for unregistered APIs', () => {
      const retrieved = httpClient.getApi('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('sendRequest', () => {
    it('should throw error for unregistered API', async () => {
      await expect(httpClient.sendRequest('unregistered', '/test')).rejects.toThrow(
        "API 'unregistered' not registered",
      );
    });

    it('should make successful GET request', async () => {
      const mockResponse = { success: true, data: 'test' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(''),
      } as any);

      httpClient.add('test', { baseUrl: 'https://api.example.com' });

      const response = await httpClient.sendRequest('test', '/users');

      expect(fetch).toHaveBeenCalledWith(
        'https:/api.example.com/users',
        expect.objectContaining({
          method: 'GET',
          headers: [],
        }),
      );

      expect(response.data).toEqual(mockResponse);
      expect(response.status).toBe(200);
    });

    it('should make successful POST request with JSON data', async () => {
      const mockResponse = { id: 1, name: 'Test User' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(''),
      } as any);

      httpClient.add('test', { baseUrl: 'https://api.example.com' });

      const postData = { name: 'Test User', email: 'test@example.com' };
      const response = await httpClient.sendRequest('test', '/users', 'POST', { data: postData });

      expect(fetch).toHaveBeenCalledWith(
        'https:/api.example.com/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
          headers: expect.arrayContaining([['Content-Type', 'application/json']]),
        }),
      );

      expect(response.data).toEqual(mockResponse);
      expect(response.status).toBe(201);
    });

    it('should handle form data requests', async () => {
      const mockResponse = { success: true };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(''),
      } as any);

      httpClient.add('test', { baseUrl: 'https://api.example.com' });

      const formData = { name: 'Test User', file: 'test-file.txt' };
      const response = await httpClient.sendRequest('test', '/upload', 'POST', { form: formData });

      expect(fetch).toHaveBeenCalledWith(
        'https:/api.example.com/upload',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
          headers: [],
        }),
      );

      expect(response.data).toEqual(mockResponse);
    });

    it('should handle query parameters', async () => {
      const mockResponse = { results: [] };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(''),
      } as any);

      httpClient.add('test', { baseUrl: 'https://api.example.com' });

      const params = { page: 1, limit: 10, search: 'test' };
      const response = await httpClient.sendRequest('test', '/users', 'GET', { params });

      expect(fetch).toHaveBeenCalledWith(
        'https:/api.example.com/users?page=1&limit=10&search=test',
        expect.objectContaining({
          method: 'GET',
          headers: [],
        }),
      );

      expect(response.data).toEqual(mockResponse);
    });

    it('should handle custom headers', async () => {
      const mockResponse = { success: true };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(''),
      } as any);

      httpClient.add('test', {
        baseUrl: 'https://api.example.com',
        defaultHeaders: { 'X-API-Key': 'default-key' },
      });

      const customHeaders = { Authorization: 'Bearer token', 'X-Custom': 'value' };
      const response = await httpClient.sendRequest('test', '/users', 'GET', {
        headers: customHeaders,
      });

      expect(fetch).toHaveBeenCalledWith(
        'https:/api.example.com/users',
        expect.objectContaining({
          method: 'GET',
          headers: expect.arrayContaining([
            ['X-API-Key', 'default-key'],
            ['Authorization', 'Bearer token'],
            ['X-Custom', 'value'],
          ]),
        }),
      );

      expect(response.data).toEqual(mockResponse);
    });

    it('should handle non-JSON responses', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'text/plain']]),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('plain text response'),
      } as any);

      httpClient.add('test', { baseUrl: 'https://api.example.com' });

      const response = await httpClient.sendRequest('test', '/text');

      expect(response.data).toBe('plain text response');
    });

    it('should add mute sentry header when requested', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
      } as any);

      httpClient.add('test', { baseUrl: 'https://api.example.com' });

      await httpClient.sendRequest('test', '/test', 'GET', { muteSentry: true });

      expect(fetch).toHaveBeenCalledWith(
        'https:/api.example.com/test',
        expect.objectContaining({
          headers: expect.arrayContaining([['X-Mute-Sentry', 'true']]),
        }),
      );
    });

    it('should handle request timeouts', async () => {
      vi.mocked(fetch).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        });
      });

      httpClient.add('test', { baseUrl: 'https://api.example.com' });

      await expect(httpClient.sendRequest('test', '/slow')).rejects.toThrow('AbortError');
    });

    it('should handle API hooks', async () => {
      const mockResponse = { success: true };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(''),
      } as any);

      const beforeHook = vi.fn((config) => ({
        ...config,
        headers: [...config.headers, ['X-Hook', 'before']],
      }));
      const afterHook = vi.fn((response) => ({
        ...response,
        data: { ...response.data, modified: true },
      }));

      httpClient.add('test', {
        baseUrl: 'https://api.example.com',
        before: beforeHook,
        after: afterHook,
      });

      const response = await httpClient.sendRequest('test', '/users');

      expect(beforeHook).toHaveBeenCalled();
      expect(afterHook).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(
        'https:/api.example.com/users',
        expect.objectContaining({
          headers: expect.arrayContaining([['X-Hook', 'before']]),
        }),
      );
      expect(response.data.modified).toBe(true);
    });
  });

  describe('Context Management', () => {
    it('should handle context updates gracefully when no context is available', async () => {
      const mockResponse = { success: true };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(mockResponse),
        text: () => Promise.resolve(''),
      } as any);

      httpClient.add('test', { baseUrl: 'https://api.example.com' });

      // This should work without throwing an error even when no context is available
      const response = await httpClient.sendRequest('test', '/test');

      expect(response.data).toEqual(mockResponse);
      expect(response.status).toBe(200);
    });
  });
});

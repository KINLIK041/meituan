import {Platform} from 'react-native';

const DEFAULT_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8080'
    : 'http://localhost:8080';

const API_BASE_URL = DEFAULT_BASE_URL;

const DEFAULT_TIMEOUT = 30_000;

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json; charset=utf-8',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new ApiError(errorText, response.status);
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new ApiError('请求超时', 408);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  health(): Promise<{status: string; service: string}> {
    return this.get('/api/route/health');
  },

  planRoute(query: string, sessionId: string | null = null) {
    return this.post<{
      sessionId: string;
      routes: any[];
      warning: string | null;
      recommendedRoute: any | null;
      explanation: string;
    }>('/api/route/plan', {query, sessionId});
  },

  adjustRoute(sessionId: string, adjustment: string) {
    return this.post<{
      sessionId: string;
      routes: any[];
      warning: string | null;
      recommendedRoute: any | null;
      explanation: string;
    }>('/api/route/adjust', {sessionId, adjustment});
  },

  compareRoutes(sessionId: string) {
    return this.get<{
      sessionId: string;
      routes: any[];
      comparisonHtml: string;
    }>(`/api/route/compare/${sessionId}`);
  },
};

export {ApiError};

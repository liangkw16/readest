import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const env = process.env as Record<string, string | undefined>;
const serverConfigKeys = [
  'NODE_ENV',
  'NEXT_PUBLIC_APP_PLATFORM',
  'API_BASE_URL',
  'NEXT_PUBLIC_API_BASE_URL',
  'SITE_URL',
  'NODE_BASE_URL',
  'NEXT_PUBLIC_NODE_BASE_URL',
] as const;
const originalValues = Object.fromEntries(serverConfigKeys.map((key) => [key, env[key]]));

beforeEach(() => {
  vi.resetModules();
  delete window.__READEST_RUNTIME_CONFIG;
  for (const key of serverConfigKeys) delete env[key];
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of serverConfigKeys) {
    const originalValue = originalValues[key];
    if (originalValue === undefined) delete env[key];
    else env[key] = originalValue;
  }
});

describe('official service egress', () => {
  test('stays on same-origin routes when no server is configured', async () => {
    env['NODE_ENV'] = 'production';
    env['NEXT_PUBLIC_APP_PLATFORM'] = 'tauri';

    const { getAPIBaseUrl, getBaseUrl, getNodeAPIBaseUrl, getNodeBaseUrl } = await import(
      '@/services/environment'
    );
    const { getServerRuntimeConfig } = await import('@/services/runtimeConfig');

    expect(getBaseUrl()).toBe('');
    expect(getAPIBaseUrl()).toBe('/api');
    expect(getNodeBaseUrl()).toBe('');
    expect(getNodeAPIBaseUrl()).toBe('/api');
    expect(getServerRuntimeConfig()).toMatchObject({
      apiBaseUrl: undefined,
      nodeBaseUrl: undefined,
    });
    expect(getServerRuntimeConfig()).not.toHaveProperty('supabaseUrl');
    expect(getServerRuntimeConfig()).not.toHaveProperty('supabaseAnonKey');
  });
});

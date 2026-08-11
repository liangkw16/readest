import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/environment', () => ({
  getAPIBaseUrl: () => '/api',
}));

import { searchMetadata } from '@/libs/metadata';

const result = {
  metadata: { title: 'Kindred', author: 'Octavia E. Butler' },
  providerName: 'open-library',
  providerLabel: 'Open Library',
  confidence: 1,
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () =>
    Response.json({ success: true, data: [result], timestamp: new Date(0).toISOString() }),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('local-first metadata client', () => {
  it('uses the same-origin API without requesting or sending Readest authentication', async () => {
    await expect(searchMetadata({ title: 'Kindred' })).resolves.toEqual([result]);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/metadata/search');
    expect(new Headers((init as RequestInit).headers).has('authorization')).toBe(false);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
}));

vi.mock('@/services/metadata/service', () => ({
  MetadataService: class {
    search = mocks.search;
  },
}));

import { POST } from '@/app/api/metadata/search/route';

const makeRequest = (origin: string | null = 'https://reader.example', clientId = '192.0.2.10') => {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-forwarded-for': clientId,
  };
  if (origin) headers['origin'] = origin;
  return new NextRequest('https://reader.example/api/metadata/search', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'The Left Hand of Darkness' }),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search.mockResolvedValue([
    {
      metadata: { title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin' },
      providerName: 'open-library',
      providerLabel: 'Open Library',
      confidence: 1,
    },
  ]);
});

describe('local-first metadata search route', () => {
  it('accepts a same-origin request without a Readest bearer token', async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: [{ metadata: { title: 'The Left Hand of Darkness' } }],
    });
  });

  it.each([
    null,
    'https://evil.example',
    'http://reader.example',
  ])('rejects a non-same-origin request (%s)', async (origin) => {
    const response = await POST(makeRequest(origin, '192.0.2.13'));

    expect(response.status).toBe(403);
    expect(mocks.search).not.toHaveBeenCalled();
  });

  it('rejects requests beyond the per-client concurrency budget', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mocks.search.mockImplementationOnce(async () => {
      await gate;
      return [];
    });
    mocks.search.mockImplementationOnce(async () => {
      await gate;
      return [];
    });
    mocks.search.mockImplementationOnce(async () => {
      await gate;
      return [];
    });
    mocks.search.mockResolvedValue([]);

    const inflight = [
      POST(makeRequest(undefined, '192.0.2.11')),
      POST(makeRequest(undefined, '192.0.2.11')),
      POST(makeRequest(undefined, '192.0.2.11')),
    ];
    await vi.waitFor(() => expect(mocks.search).toHaveBeenCalledTimes(3));

    const rejected = await POST(makeRequest(undefined, '192.0.2.11'));
    expect(rejected.status).toBe(429);

    release();
    await Promise.all(inflight);
  });

  it('rate-limits repeated requests from the same client', async () => {
    const responses = [];
    for (let index = 0; index < 61; index++) {
      responses.push(await POST(makeRequest(undefined, '192.0.2.12')));
    }

    expect(responses.slice(0, 60).every((response) => response.status === 200)).toBe(true);
    expect(responses[60]!.status).toBe(429);
    expect(responses[60]!.headers.get('retry-after')).not.toBeNull();
    expect(mocks.search).toHaveBeenCalledTimes(60);
  });
});

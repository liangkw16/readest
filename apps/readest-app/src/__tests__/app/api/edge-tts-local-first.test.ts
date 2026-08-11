import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  createWithBoundaries: vi.fn(),
}));

vi.mock('@/libs/edgeTTS', () => ({
  EdgeSpeechTTS: class {
    static voices = [{ id: 'en-US-AriaNeural', name: 'Aria', lang: 'en-US' }];
    createWithBoundaries = mocks.createWithBoundaries;
  },
  serializeWordBoundaries: vi.fn(() => '[]'),
  WORD_BOUNDARIES_HEADER: 'X-TTS-Word-Boundaries',
}));

import { GET, POST } from '@/app/api/tts/edge/route';

const makeRequest = (origin: string | null = 'https://reader.example', clientId = '192.0.2.20') => {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-forwarded-for': clientId,
  };
  if (origin) headers['origin'] = origin;
  return new NextRequest('https://reader.example/api/tts/edge', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      input: 'hello',
      voice: 'en-US-AriaNeural',
      speed: 1,
    }),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createWithBoundaries.mockImplementation(async () => ({
    response: new Response(new Uint8Array([1, 2, 3])),
    boundaries: [],
  }));
});

describe('local-first Edge TTS route', () => {
  it('accepts a same-origin request without a Readest bearer token', async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it.each([
    null,
    'https://evil.example',
    'http://reader.example',
  ])('rejects a non-same-origin synthesis request (%s)', async (origin) => {
    const response = await POST(makeRequest(origin, '192.0.2.23'));

    expect(response.status).toBe(403);
    expect(mocks.createWithBoundaries).not.toHaveBeenCalled();
  });

  it('requires the voices endpoint to be same-origin without requiring an account', async () => {
    const sameOrigin = await GET(
      new NextRequest('https://reader.example/api/tts/edge?lang=en', {
        headers: { origin: 'https://reader.example', 'x-forwarded-for': '192.0.2.24' },
      }),
    );
    const crossOrigin = await GET(
      new NextRequest('https://reader.example/api/tts/edge', {
        headers: { origin: 'https://evil.example', 'x-forwarded-for': '192.0.2.25' },
      }),
    );

    expect(sameOrigin.status).toBe(200);
    await expect(sameOrigin.json()).resolves.toEqual({
      voices: [{ id: 'en-US-AriaNeural', name: 'Aria', language: 'en-US' }],
    });
    expect(crossOrigin.status).toBe(403);
  });

  it('rejects requests beyond the per-client concurrency budget', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    for (let index = 0; index < 3; index++) {
      mocks.createWithBoundaries.mockImplementationOnce(async () => {
        await gate;
        return { response: new Response(new Uint8Array([1])), boundaries: [] };
      });
    }
    mocks.createWithBoundaries.mockImplementation(async () => ({
      response: new Response(new Uint8Array([1])),
      boundaries: [],
    }));

    const inflight = [
      POST(makeRequest(undefined, '192.0.2.21')),
      POST(makeRequest(undefined, '192.0.2.21')),
      POST(makeRequest(undefined, '192.0.2.21')),
    ];
    await vi.waitFor(() => expect(mocks.createWithBoundaries).toHaveBeenCalledTimes(3));

    const rejected = await POST(makeRequest(undefined, '192.0.2.21'));
    expect(rejected.status).toBe(429);

    release();
    await Promise.all(inflight);
  });

  it('rate-limits repeated synthesis from the same client', async () => {
    const responses = [];
    for (let index = 0; index < 61; index++) {
      responses.push(await POST(makeRequest(undefined, '192.0.2.22')));
    }

    expect(responses.slice(0, 60).every((response) => response.status === 200)).toBe(true);
    expect(responses[60]!.status).toBe(429);
    expect(responses[60]!.headers.get('retry-after')).not.toBeNull();
    expect(mocks.createWithBoundaries).toHaveBeenCalledTimes(60);
  });
});

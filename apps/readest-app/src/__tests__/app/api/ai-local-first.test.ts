import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const model = vi.fn((id: string) => ({ id }));
  const embeddingModel = vi.fn((id: string) => ({ id }));
  return {
    model,
    embeddingModel,
    createGateway: vi.fn(() => Object.assign(model, { embeddingModel })),
    streamText: vi.fn(() => ({ toTextStreamResponse: () => new Response('ok') })),
    embed: vi.fn(async () => ({ embedding: [1, 2] })),
    embedMany: vi.fn(async () => ({ embeddings: [[1, 2]] })),
  };
});

vi.mock('ai', () => ({
  createGateway: mocks.createGateway,
  streamText: mocks.streamText,
  embed: mocks.embed,
  embedMany: mocks.embedMany,
}));

const chatRoute = await import('@/app/api/ai/chat/route');
const embedRoute = await import('@/app/api/ai/embed/route');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('local-first AI proxy routes', () => {
  it('accepts a user-supplied gateway key without a Readest bearer token', async () => {
    const response = await chatRoute.POST(
      new Request('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'hello' }],
          apiKey: 'user-key',
          model: 'provider/model',
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.createGateway).toHaveBeenCalledWith({ apiKey: 'user-key' });
  });

  it('rejects chat when the user did not supply a key', async () => {
    const response = await chatRoute.POST(
      new Request('http://localhost/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it('embeds with a user-supplied key without official auth', async () => {
    const response = await embedRoute.POST(
      new Request('http://localhost/api/ai/embed', {
        method: 'POST',
        body: JSON.stringify({ texts: ['hello'], single: true, apiKey: 'user-key' }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ embedding: [1, 2] });
  });
});

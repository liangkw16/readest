import { describe, expect, it } from 'vitest';
import type { Book } from '@/types/book';
import type { AppService } from '@/types/system';
import { getPublicCoverUrl, isPublicImageUrl } from '@/utils/cover';

const makeBook = (coverImageUrl?: string): Book =>
  ({ hash: 'book-hash', title: 'T', author: 'A', coverImageUrl }) as Book;

describe('isPublicImageUrl', () => {
  it('accepts public http(s) URLs and rejects local URLs', () => {
    expect(isPublicImageUrl('https://example.com/c.png')).toBe(true);
    expect(isPublicImageUrl('http://example.com/c.png')).toBe(true);
    expect(isPublicImageUrl('http://localhost:3000/c.png')).toBe(false);
    expect(isPublicImageUrl('http://127.0.0.1/c.png')).toBe(false);
    expect(isPublicImageUrl('https://asset.localhost/c.png')).toBe(false);
    expect(isPublicImageUrl('data:image/png;base64,AAAA')).toBe(false);
  });
});

describe('getPublicCoverUrl', () => {
  it('reuses a public metadata URL', async () => {
    const service = {} as AppService;

    await expect(
      getPublicCoverUrl(makeBook('https://example.com/cover.jpg'), service),
    ).resolves.toBe('https://example.com/cover.jpg');
  });

  it('keeps local covers local', async () => {
    const service = {} as AppService;

    await expect(
      getPublicCoverUrl(makeBook('https://asset.localhost/cover.png'), service),
    ).resolves.toBeUndefined();
    await expect(getPublicCoverUrl(makeBook(), service)).resolves.toBeUndefined();
  });
});

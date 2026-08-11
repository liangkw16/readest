import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Book } from '@/types/book';
import type { AppService } from '@/types/system';

const invokeMock = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

import { updateDiscordPresence } from '@/utils/discord';

const book = {
  hash: 'bookhash1234',
  title: 'Lord of the Flies',
  author: 'William Golding',
} as Book;

beforeEach(() => {
  invokeMock.mockReset().mockResolvedValue(undefined);
});

describe('local-only Discord presence', () => {
  it('uses the bundled icon and never publishes the local cover', async () => {
    const appService = { isDesktopApp: true } as AppService;

    await updateDiscordPresence(book, 1234, appService);

    expect(invokeMock).toHaveBeenCalledWith('update_book_presence', {
      presence: {
        bookHash: book.hash,
        title: book.title,
        author: book.author,
        coverUrl: null,
        sessionStart: 1234,
      },
    });
  });

  it('does nothing outside the desktop runtime', async () => {
    await updateDiscordPresence(book, 1234, { isDesktopApp: false } as AppService);
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import type { Book } from '@/types/book';
import type { EnvConfigType } from '@/services/environment';
import type { AppService } from '@/types/system';

/**
 * A manually opened cloud-only book is recovered exclusively through the
 * user's configured file-sync backend. Official Readest transfer queues and
 * upload actions are deliberately absent from this hook.
 */

const routing = vi.hoisted(() => ({
  backends: [] as ('webdav' | 'gdrive' | 's3' | 'onedrive')[],
}));

const runFileBookDownload = vi.hoisted(() => vi.fn(async () => true));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation:
    () =>
    (text: string, params?: Record<string, string | number>): string => {
      if (!params) return text;
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
        text,
      );
    },
}));

vi.mock('@/services/sync/cloudSyncProvider', () => ({
  getActiveFileSyncBackends: () => routing.backends,
}));

vi.mock('@/services/sync/file/runLibrarySync', () => ({
  runFileBookDownload,
}));

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ settings: {} }),
  },
}));

const { useBookTransferActions } = await import('@/app/library/hooks/useBookTransferActions');
const { eventDispatcher } = await import('@/utils/event');

const envConfig: EnvConfigType = { getAppService: async () => ({}) as AppService };

const makeBook = (over: Partial<Book> = {}): Book => ({
  hash: 'book-1',
  format: 'EPUB',
  title: 'Title',
  author: 'Author',
  createdAt: 1000,
  updatedAt: 1000,
  ...over,
});

const setup = () => {
  const updateBook = vi.fn(async (_envConfig: EnvConfigType, _book: Book) => {});
  const { result } = renderHook(() => useBookTransferActions(envConfig, updateBook));
  return { result, updateBook };
};

beforeEach(() => {
  vi.clearAllMocks();
  routing.backends = [];
});

describe('useBookTransferActions file-only recovery', () => {
  it('downloads through a configured file backend even when legacy uploadedAt is present', async () => {
    routing.backends = ['webdav'];

    const { result, updateBook } = setup();
    const book = makeBook({ uploadedAt: 12345 });
    const ok = await result.current.handleBookDownload(book);

    expect(runFileBookDownload).toHaveBeenCalledWith(envConfig, book);
    expect(updateBook).toHaveBeenCalledWith(envConfig, book);
    expect(ok).toBe(true);
    expect(result.current).not.toHaveProperty('handleBookUpload');
  });

  it('returns false without touching a transfer service when no file backend is enabled', async () => {
    const dispatchSpy = vi.spyOn(eventDispatcher, 'dispatch');
    const { result, updateBook } = setup();
    const ok = await result.current.handleBookDownload(makeBook());

    expect(ok).toBe(false);
    expect(runFileBookDownload).not.toHaveBeenCalled();
    expect(updateBook).not.toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalledWith(
      'toast',
      expect.objectContaining({
        type: 'info',
        message: 'Configure and enable a file sync provider to download this book',
      }),
    );
  });

  it('reports a file-backend failure and does not update the book', async () => {
    routing.backends = ['s3'];
    runFileBookDownload.mockResolvedValueOnce(false);
    const dispatchSpy = vi.spyOn(eventDispatcher, 'dispatch');

    const { result, updateBook } = setup();
    const book = makeBook();
    const ok = await result.current.handleBookDownload(book);

    expect(runFileBookDownload).toHaveBeenCalledWith(envConfig, book);
    expect(updateBook).not.toHaveBeenCalled();
    expect(ok).toBe(false);
    expect(dispatchSpy).toHaveBeenCalledWith(
      'toast',
      expect.objectContaining({ type: 'error', message: 'Failed to download book: Title' }),
    );
  });
});

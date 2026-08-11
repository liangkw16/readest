import { describe, expect, test, vi } from 'vitest';
import { deleteLocalBook } from '@/services/localBookDeleteService';
import type { Book, BookFormat } from '@/types/book';
import type { FileSystem } from '@/types/system';

const book = (overrides: Partial<Book> = {}): Book => ({
  hash: 'abc123',
  format: 'EPUB' as BookFormat,
  title: 'Test Book',
  author: 'Author',
  createdAt: 1,
  updatedAt: 1,
  deletedAt: null,
  uploadedAt: null,
  downloadedAt: 1,
  coverDownloadedAt: 1,
  ...overrides,
});

const fileSystem = (): FileSystem =>
  ({
    exists: vi.fn().mockResolvedValue(true),
    removeFile: vi.fn().mockResolvedValue(undefined),
    removeDir: vi.fn().mockResolvedValue(undefined),
  }) as unknown as FileSystem;

describe('deleteLocalBook', () => {
  test('removes a managed copy and marks it unavailable locally', async () => {
    const fs = fileSystem();
    const item = book();

    await deleteLocalBook(fs, item, 'local');

    expect(fs.removeFile).toHaveBeenCalledWith('abc123/Test Book.epub', 'Books');
    expect(item.downloadedAt).toBeNull();
  });

  test('never removes a user-owned in-place source file', async () => {
    const fs = fileSystem();
    const item = book({ filePath: '/Users/me/Books/original.epub' });

    await deleteLocalBook(fs, item, 'local');

    expect(fs.removeFile).not.toHaveBeenCalledWith('/Users/me/Books/original.epub', 'None');
  });

  test('purge removes app-owned sidecars and the TTS cache', async () => {
    const fs = fileSystem();
    const item = book();

    await deleteLocalBook(fs, item, 'purge');

    expect(fs.removeDir).toHaveBeenCalledWith('abc123', 'Books', true);
    expect(fs.removeDir).toHaveBeenCalledWith('tts-cache/abc123', 'Cache', true);
  });

  test('a stale cloud-only request does not touch local files', async () => {
    const fs = fileSystem();

    await deleteLocalBook(fs, book(), 'cloud');

    expect(fs.removeFile).not.toHaveBeenCalled();
    expect(fs.removeDir).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from 'vitest';

import { getBookContextMenuItemIds } from '@/app/library/utils/libraryUtils';
import { buildFeedBookUrl } from '@/services/rss/feedBookUrl';
import { Book } from '@/types/book';

const createBook = (overrides: Partial<Book> = {}): Book => ({
  hash: 'hash-1',
  format: 'EPUB',
  title: 'Test Book',
  author: 'Test Author',
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

describe('getBookContextMenuItemIds', () => {
  it('keeps a local downloaded book menu free of official transfer actions', () => {
    const book = createBook({ downloadedAt: 1 });
    expect(getBookContextMenuItemIds(book)).toEqual([
      'select',
      'group',
      'markFinished',
      'markAbandoned',
      'showDetails',
      'showInFinder',
      'searchGoodreads',
      'delete',
    ]);
  });

  it('offers sendNearby for a local book only when LocalSend is enabled', () => {
    const local = createBook({ downloadedAt: 1 });
    expect(getBookContextMenuItemIds(local, { localSend: true })).toContain('sendNearby');
    expect(getBookContextMenuItemIds(local)).not.toContain('sendNearby');
    // Cloud-only books have no local file to send.
    const cloudOnly = createBook({ uploadedAt: 1 });
    expect(getBookContextMenuItemIds(cloudOnly, { localSend: true })).not.toContain('sendNearby');
  });

  it('shows markUnread + markAbandoned + clearStatus for a finished book', () => {
    const book = createBook({ downloadedAt: 1, readingStatus: 'finished' });
    expect(getBookContextMenuItemIds(book)).toEqual([
      'select',
      'group',
      'markUnread',
      'markAbandoned',
      'clearStatus',
      'showDetails',
      'showInFinder',
      'searchGoodreads',
      'delete',
    ]);
  });

  it('shows "Mark as Finished" + "Clear Status" for an unread book', () => {
    const book = createBook({ downloadedAt: 1, readingStatus: 'unread' });
    expect(getBookContextMenuItemIds(book)).toEqual([
      'select',
      'group',
      'markFinished',
      'markAbandoned',
      'clearStatus',
      'showDetails',
      'showInFinder',
      'searchGoodreads',
      'delete',
    ]);
  });

  it('hides markAbandoned but offers markFinished + clearStatus for an abandoned book', () => {
    const book = createBook({ downloadedAt: 1, readingStatus: 'abandoned' });
    expect(getBookContextMenuItemIds(book)).toEqual([
      'select',
      'group',
      'markFinished',
      'clearStatus',
      'showDetails',
      'showInFinder',
      'searchGoodreads',
      'delete',
    ]);
  });

  it('ignores legacy remote-storage timestamps when building local actions', () => {
    const book = createBook({ uploadedAt: 1 });
    expect(getBookContextMenuItemIds(book)).toEqual([
      'select',
      'group',
      'markFinished',
      'markAbandoned',
      'showDetails',
      'showInFinder',
      'searchGoodreads',
      'delete',
    ]);
  });

  it('returns local actions for an in-place book', () => {
    const book = createBook({ filePath: '/some/external/file.epub' });
    expect(getBookContextMenuItemIds(book)).toEqual([
      'select',
      'group',
      'markFinished',
      'markAbandoned',
      'showDetails',
      'showInFinder',
      'searchGoodreads',
      'delete',
    ]);
  });

  it('returns local actions for a fileless feed book', () => {
    const book = createBook({
      downloadedAt: 1,
      url: buildFeedBookUrl('https://www.saastr.com/feed/'),
    });
    expect(getBookContextMenuItemIds(book)).toEqual([
      'select',
      'group',
      'markFinished',
      'markAbandoned',
      'showDetails',
      'showInFinder',
      'searchGoodreads',
      'delete',
    ]);
  });

  it('produces the same order on repeated calls and never duplicates an item (issue #4389)', () => {
    const book = createBook({ downloadedAt: 1, uploadedAt: 1, readingStatus: 'finished' });
    const first = getBookContextMenuItemIds(book);
    const second = getBookContextMenuItemIds(book);
    expect(second).toEqual(first);
    expect(new Set(first).size).toBe(first.length);
  });
});

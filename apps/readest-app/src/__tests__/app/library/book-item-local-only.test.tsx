import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import BookItem from '@/app/library/components/BookItem';
import type { Book } from '@/types/book';

vi.mock('next/navigation', () => ({
  useRouter: () => {
    throw new Error('BookItem must not route to official login');
  },
}));

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ appService: { isMobile: false, hasContextMenu: false } }),
}));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (text: string) => text,
}));

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: () => ({ settings: { librarySkeuomorphicCovers: false } }),
}));

vi.mock('@/hooks/useResponsiveSize', () => ({
  useResponsiveSize: (size: number) => size,
}));

vi.mock('@/components/BookCover', () => ({
  __esModule: true,
  default: () => <div data-testid='book-cover' />,
}));

vi.mock('@/app/library/components/ReadingProgress', () => ({
  __esModule: true,
  default: () => <div data-testid='reading-progress' />,
}));

afterEach(() => cleanup());

const book: Book = {
  hash: 'book-hash',
  title: 'Local Book',
  author: 'Author',
  format: 'EPUB',
  createdAt: 1,
  updatedAt: 1,
};

describe('BookItem local-only actions', () => {
  it('renders local metadata controls without account, cloud, or transfer UI', () => {
    const showBookDetailsModal = vi.fn();
    render(
      <BookItem
        book={book}
        mode='grid'
        coverFit='crop'
        isSelectMode={false}
        bookSelected={false}
        showBookDetailsModal={showBookDetailsModal}
        showTimeRemaining={false}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Upload Book' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Download Book' })).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Show Book Details' }));
    expect(showBookDetailsModal).toHaveBeenCalledWith(book);
  });
});

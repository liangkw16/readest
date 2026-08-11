import { invoke } from '@tauri-apps/api/core';
import type { Book } from '@/types/book';
import type { AppService } from '@/types/system';

/**
 * Update Discord Rich Presence without publishing local book data or covers.
 * Discord falls back to the bundled `book_icon` asset on the native side.
 */
export const updateDiscordPresence = async (
  book: Book,
  sessionStart: number,
  appService: AppService,
): Promise<void> => {
  if (!appService?.isDesktopApp) return;

  try {
    await invoke('update_book_presence', {
      presence: {
        bookHash: book.hash,
        title: book.title,
        author: book.author || null,
        coverUrl: null,
        sessionStart,
      },
    });
  } catch (error) {
    console.warn('Failed to update Discord presence:', error);
  }
};

export const clearDiscordPresence = async (appService: AppService): Promise<void> => {
  if (!appService?.isDesktopApp) return;

  try {
    await invoke('clear_book_presence');
  } catch (error) {
    console.warn('Failed to clear Discord presence:', error);
  }
};

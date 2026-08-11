import { useCallback } from 'react';
import type { Book } from '@/types/book';
import type { EnvConfigType } from '@/services/environment';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/store/settingsStore';
import { eventDispatcher } from '@/utils/event';
import { getActiveFileSyncBackends } from '@/services/sync/cloudSyncProvider';
import { runFileBookDownload } from '@/services/sync/file/runLibrarySync';

/**
 * Recover a locally missing book from the user's configured file-sync storage.
 * Uploads are handled by normal FileSyncProvider convergence; this hook has no
 * official Readest queue, account, entitlement, or explicit upload path.
 */
export const useBookTransferActions = (
  envConfig: EnvConfigType,
  updateBook: (envConfig: EnvConfigType, book: Book) => Promise<void>,
) => {
  const _ = useTranslation();

  const handleBookDownload = useCallback(
    async (book: Book) => {
      const settingsNow = useSettingsStore.getState().settings;
      const backends = getActiveFileSyncBackends(settingsNow);
      if (backends.length === 0) {
        eventDispatcher.dispatch('toast', {
          type: 'info',
          timeout: 5000,
          message: _('Configure and enable a file sync provider to download this book'),
        });
        return false;
      }

      let ok = false;
      try {
        ok = await runFileBookDownload(envConfig, book);
        if (ok) await updateBook(envConfig, book);
      } catch {
        ok = false;
      }

      eventDispatcher.dispatch('toast', {
        type: ok ? 'info' : 'error',
        timeout: 2000,
        message: ok
          ? _('Book downloaded: {{title}}', { title: book.title })
          : _('Failed to download book: {{title}}', { title: book.title }),
      });
      return ok;
    },
    [_, envConfig, updateBook],
  );

  return { handleBookDownload };
};

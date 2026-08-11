import { useCallback, useRef } from 'react';

import { useEnv } from '@/context/EnvContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/store/settingsStore';
import { getActiveFileSyncBackends } from '@/services/sync/cloudSyncProvider';
import { runFileLibrarySyncPass } from '@/services/sync/file/runLibrarySync';
import { eventDispatcher } from '@/utils/event';

/**
 * Manual library sync for the local-first build.
 *
 * `FileSyncProvider` is the only remote-storage seam here. The hook never
 * constructs an account-backed sync client.
 */
export const useBooksSync = () => {
  const _ = useTranslation();
  const { envConfig } = useEnv();
  const isSyncingRef = useRef(false);

  const runSync = useCallback(
    async (verbose: boolean) => {
      const settings = useSettingsStore.getState().settings;
      if (getActiveFileSyncBackends(settings).length === 0 || isSyncingRef.current) return;

      isSyncingRef.current = true;
      try {
        const result = await runFileLibrarySyncPass(envConfig, _);
        if (verbose) {
          eventDispatcher.dispatch('toast', {
            type: result ? 'info' : 'error',
            message: result
              ? _('{{count}} book(s) synced', { count: result.booksSynced })
              : _('Sync failed'),
          });
        }
      } finally {
        isSyncingRef.current = false;
      }
    },
    [_, envConfig],
  );

  // `fullRefresh` remains in the public signature because pull-to-refresh and
  // BackupWindow call this hook. File sync is already a convergent full pass,
  // so the value has no special meaning for a user-owned backend.
  const pullLibrary = useCallback(
    async (_fullRefresh = false, verbose = false) => runSync(verbose),
    [runSync],
  );

  const pushLibrary = useCallback(async () => runSync(false), [runSync]);

  return { pullLibrary, pushLibrary };
};

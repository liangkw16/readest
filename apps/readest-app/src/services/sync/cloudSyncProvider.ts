import type { SystemSettings } from '@/types/settings';
import type { FileSyncBackendKind } from '@/services/sync/file/providerRegistry';

/** Settings slice key for a user-owned file-sync backend kind. */
export const settingsKeyForBackend = (
  kind: FileSyncBackendKind,
): 'webdav' | 'googleDrive' | 's3' | 'onedrive' | 'icloud' =>
  kind === 'gdrive' ? 'googleDrive' : kind;

/** Human-readable provider name (product names — deliberately untranslated). */
export const cloudProviderDisplayName = (kind: FileSyncBackendKind): string =>
  kind === 'gdrive'
    ? 'Google Drive'
    : kind === 'webdav'
      ? 'WebDAV'
      : kind === 's3'
        ? 'S3'
        : kind === 'onedrive'
          ? 'OneDrive'
          : 'iCloud';

/**
 * The user-owned backends the user has switched on, in a STABLE order that
 * every loop, list, and sync pass in the app relies on.
 */
export const getEnabledFileSyncBackends = (
  settings: SystemSettings | null | undefined,
): FileSyncBackendKind[] => {
  const enabled: FileSyncBackendKind[] = [];
  if (settings?.webdav?.enabled) enabled.push('webdav');
  if (settings?.googleDrive?.enabled) enabled.push('gdrive');
  if (settings?.s3?.enabled) enabled.push('s3');
  if (settings?.onedrive?.enabled) enabled.push('onedrive');
  if (settings?.icloud?.enabled) enabled.push('icloud');
  return enabled;
};

/** Comma-joined product names, for the "Synced via {{provider}}" copy. */
export const cloudProvidersDisplayName = (kinds: FileSyncBackendKind[]): string =>
  kinds.map(cloudProviderDisplayName).join(', ');

/** The user-owned file-sync backends selected by the user. */
export const getActiveFileSyncBackends = (
  settings: SystemSettings | null | undefined,
): FileSyncBackendKind[] => getEnabledFileSyncBackends(settings);

/**
 * One-time upgrade migration helper (appService migrate20260706): users
 * who already had WebDAV/Drive enabled before provider selection shipped
 * become selected on upgrade. With `syncBooks` at its old `false` default,
 * their books would back up nowhere. Flip syncBooks on for every enabled
 * user-owned backend.
 * Mutates `settings` in place (the migration runner saves the same
 * snapshot afterwards) and returns whether anything changed.
 */
export const applySyncBooksAutoEnable = (settings: SystemSettings): boolean => {
  let changed = false;
  for (const kind of getEnabledFileSyncBackends(settings)) {
    // A switch (rather than a generically-keyed write) keeps each branch's
    // settings slice type intact; `settings[key] = { ...slice, syncBooks }`
    // does not typecheck when `key` is a union of literal keys.
    switch (kind) {
      case 'webdav':
        if (settings.webdav && !settings.webdav.syncBooks) {
          settings.webdav = { ...settings.webdav, syncBooks: true };
          changed = true;
        }
        break;
      case 'gdrive':
        if (settings.googleDrive && !settings.googleDrive.syncBooks) {
          settings.googleDrive = { ...settings.googleDrive, syncBooks: true };
          changed = true;
        }
        break;
      case 's3':
        if (settings.s3 && !settings.s3.syncBooks) {
          settings.s3 = { ...settings.s3, syncBooks: true };
          changed = true;
        }
        break;
      case 'onedrive':
        if (settings.onedrive && !settings.onedrive.syncBooks) {
          settings.onedrive = { ...settings.onedrive, syncBooks: true };
          changed = true;
        }
        break;
      case 'icloud':
        if (settings.icloud && !settings.icloud.syncBooks) {
          settings.icloud = { ...settings.icloud, syncBooks: true };
          changed = true;
        }
        break;
    }
  }
  return changed;
};

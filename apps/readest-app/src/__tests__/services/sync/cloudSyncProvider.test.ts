import { describe, expect, test } from 'vitest';
import type { SystemSettings } from '@/types/settings';
import {
  applySyncBooksAutoEnable,
  cloudProviderDisplayName,
  cloudProvidersDisplayName,
  getActiveFileSyncBackends,
  getEnabledFileSyncBackends,
  settingsKeyForBackend,
} from '@/services/sync/cloudSyncProvider';

const settings = (partial: Partial<SystemSettings>): SystemSettings => partial as SystemSettings;

describe('user-owned file-sync providers', () => {
  test('lists only enabled backends in stable priority order', () => {
    const value = settings({
      icloud: { enabled: true },
      onedrive: { enabled: true },
      s3: { enabled: true },
      googleDrive: { enabled: true },
      webdav: { enabled: true },
    } as Partial<SystemSettings>);

    expect(getEnabledFileSyncBackends(value)).toEqual([
      'webdav',
      'gdrive',
      's3',
      'onedrive',
      'icloud',
    ]);
    expect(getActiveFileSyncBackends(value)).toEqual([
      'webdav',
      'gdrive',
      's3',
      'onedrive',
      'icloud',
    ]);
  });

  test('returns no provider when none of the user backends is enabled', () => {
    expect(getActiveFileSyncBackends(settings({}))).toEqual([]);
  });

  test('maps backend kinds to settings slices', () => {
    expect(settingsKeyForBackend('webdav')).toBe('webdav');
    expect(settingsKeyForBackend('gdrive')).toBe('googleDrive');
    expect(settingsKeyForBackend('s3')).toBe('s3');
    expect(settingsKeyForBackend('onedrive')).toBe('onedrive');
    expect(settingsKeyForBackend('icloud')).toBe('icloud');
  });

  test('exposes user-facing names without an official cloud fallback', () => {
    expect(cloudProviderDisplayName('webdav')).toBe('WebDAV');
    expect(cloudProviderDisplayName('gdrive')).toBe('Google Drive');
    expect(cloudProviderDisplayName('s3')).toBe('S3');
    expect(cloudProviderDisplayName('onedrive')).toBe('OneDrive');
    expect(cloudProviderDisplayName('icloud')).toBe('iCloud');
    expect(cloudProvidersDisplayName(['webdav', 'gdrive'])).toBe('WebDAV, Google Drive');
  });
});

describe('applySyncBooksAutoEnable', () => {
  test('enables book sync for every enabled backend', () => {
    const value = settings({
      webdav: { enabled: true, syncBooks: false },
      googleDrive: { enabled: true, syncBooks: false },
      s3: { enabled: true, syncBooks: false },
      onedrive: { enabled: true, syncBooks: false },
      icloud: { enabled: true, syncBooks: false },
    } as Partial<SystemSettings>);

    expect(applySyncBooksAutoEnable(value)).toBe(true);
    expect(value.webdav.syncBooks).toBe(true);
    expect(value.googleDrive.syncBooks).toBe(true);
    expect(value.s3.syncBooks).toBe(true);
    expect(value.onedrive.syncBooks).toBe(true);
    expect(value.icloud.syncBooks).toBe(true);
  });

  test('is a no-op when no backend is enabled or all enabled backends already sync books', () => {
    expect(applySyncBooksAutoEnable(settings({}))).toBe(false);
    expect(
      applySyncBooksAutoEnable(
        settings({ webdav: { enabled: true, syncBooks: true } } as Partial<SystemSettings>),
      ),
    ).toBe(false);
  });
});

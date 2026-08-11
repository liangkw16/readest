import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const envConfig = vi.hoisted(() => ({}));
const routing = vi.hoisted(() => ({ backends: [] as string[] }));
const runFileLibrarySyncPass = vi.hoisted(() =>
  vi.fn(async (): Promise<{ booksSynced: number } | null> => ({ booksSynced: 1 })),
);

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({ envConfig }),
}));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation:
    () =>
    (text: string, params?: Record<string, string | number>): string => {
      if (!params) return text;
      return Object.entries(params).reduce(
        (message, [key, value]) => message.replace(`{{${key}}}`, String(value)),
        text,
      );
    },
}));

vi.mock('@/services/sync/cloudSyncProvider', () => ({
  getActiveFileSyncBackends: () => routing.backends,
}));

vi.mock('@/services/sync/file/runLibrarySync', () => ({ runFileLibrarySyncPass }));

vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ settings: {} }),
  },
}));

const { useBooksSync } = await import('@/app/library/hooks/useBooksSync');
const { eventDispatcher } = await import('@/utils/event');

beforeEach(() => {
  vi.clearAllMocks();
  routing.backends = [];
});

describe('useBooksSync in the local-first build', () => {
  it('runs a user-configured file backend without consulting auth or native sync', async () => {
    routing.backends = ['webdav'];
    const { result } = renderHook(() => useBooksSync());

    await act(async () => {
      await result.current.pullLibrary(false, false);
    });

    expect(runFileLibrarySyncPass).toHaveBeenCalledOnce();
  });

  it('does not contact any server when no user-owned backend is configured', async () => {
    const { result } = renderHook(() => useBooksSync());

    await act(async () => {
      await result.current.pullLibrary(false, true);
      await result.current.pushLibrary();
    });

    expect(runFileLibrarySyncPass).not.toHaveBeenCalled();
  });

  it('uses the same convergent file pass for push requests', async () => {
    routing.backends = ['s3'];
    const { result } = renderHook(() => useBooksSync());

    await act(async () => {
      await result.current.pushLibrary();
    });

    expect(runFileLibrarySyncPass).toHaveBeenCalledOnce();
  });

  it('reports the file-pass result for a verbose manual sync', async () => {
    routing.backends = ['gdrive'];
    runFileLibrarySyncPass.mockResolvedValueOnce({ booksSynced: 3 });
    const dispatchSpy = vi.spyOn(eventDispatcher, 'dispatch');
    const { result } = renderHook(() => useBooksSync());

    await act(async () => {
      await result.current.pullLibrary(false, true);
    });

    expect(dispatchSpy).toHaveBeenCalledWith('toast', {
      type: 'info',
      message: '3 book(s) synced',
    });
  });

  it('reports failure when every configured backend fails', async () => {
    routing.backends = ['onedrive'];
    runFileLibrarySyncPass.mockResolvedValueOnce(null);
    const dispatchSpy = vi.spyOn(eventDispatcher, 'dispatch');
    const { result } = renderHook(() => useBooksSync());

    await act(async () => {
      await result.current.pullLibrary(false, true);
    });

    expect(dispatchSpy).toHaveBeenCalledWith('toast', {
      type: 'error',
      message: 'Sync failed',
    });
  });
});

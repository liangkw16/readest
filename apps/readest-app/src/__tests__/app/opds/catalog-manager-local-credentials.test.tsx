import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = {
    catalogs: [],
    getAvailableCatalogs: vi.fn(() => []),
    loadCustomOPDSCatalogs: vi.fn().mockResolvedValue(undefined),
    saveCustomOPDSCatalogs: vi.fn().mockResolvedValue(undefined),
    addCatalog: vi.fn(),
    updateCatalog: vi.fn(),
    removeCatalog: vi.fn(),
  };
  const store = Object.assign(
    vi.fn((selector: (value: typeof state) => unknown) => selector(state)),
    {
      getState: vi.fn(() => state),
    },
  );

  return {
    ensurePassphraseUnlocked: vi.fn().mockResolvedValue(undefined),
    envConfig: { id: 'local-env' },
    state,
    store,
    validateOPDSURL: vi.fn().mockResolvedValue({ isValid: true }),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/context/EnvContext', () => ({
  useEnv: () => ({
    envConfig: mocks.envConfig,
    appService: { isOnlineCatalogsAccessible: false },
  }),
}));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (value: string) => value,
}));

vi.mock('@/services/environment', () => ({
  isWebAppPlatform: () => false,
}));

vi.mock('@/store/customOPDSStore', () => ({
  useCustomOPDSStore: mocks.store,
}));

vi.mock('@/services/sync/passphraseGate', () => ({
  ensurePassphraseUnlocked: mocks.ensurePassphraseUnlocked,
}));

vi.mock('@/app/opds/utils/opdsUtils', () => ({
  getUnaddedPopularCatalogs: () => [],
  validateOPDSURL: mocks.validateOPDSURL,
}));

vi.mock('@/services/opds', () => ({
  deleteSubscriptionState: vi.fn(),
  loadSubscriptionState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/ModalPortal', () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

import { CatalogManager } from '@/app/opds/components/CatalogManager';

describe('CatalogManager local credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.catalogs = [];
    mocks.state.getAvailableCatalogs.mockReturnValue([]);
    mocks.validateOPDSURL.mockResolvedValue({ isValid: true });
  });

  it('saves an authenticated OPDS catalog locally without a sync passphrase prompt', async () => {
    const { container } = render(<CatalogManager />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Your First Catalog' }));
    fireEvent.change(screen.getByPlaceholderText('My Calibre Library'), {
      target: { value: 'Private Calibre' },
    });
    fireEvent.change(screen.getByPlaceholderText('https://example.com/opds'), {
      target: { value: 'https://calibre.example.test/opds' },
    });
    fireEvent.change(screen.getByPlaceholderText('Username'), {
      target: { value: 'reader' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'local-secret' },
    });

    const form = container.querySelector('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mocks.state.addCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Private Calibre',
          url: 'https://calibre.example.test/opds',
          username: 'reader',
          password: 'local-secret',
        }),
      );
    });

    expect(mocks.ensurePassphraseUnlocked).not.toHaveBeenCalled();
    expect(mocks.state.saveCustomOPDSCatalogs).toHaveBeenCalledWith(mocks.envConfig);
  });
});

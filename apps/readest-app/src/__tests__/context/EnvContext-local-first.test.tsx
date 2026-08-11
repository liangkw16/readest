import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  enableLocalStoreAutoPersist: vi.fn(),
  getAppService: vi.fn(),
}));

vi.mock('@/services/environment', () => ({
  default: {
    getAppService: mocks.getAppService,
  },
}));

vi.mock('@/services/localPersistEnv', () => ({
  enableLocalStoreAutoPersist: mocks.enableLocalStoreAutoPersist,
}));

import { EnvProvider, useEnv } from '@/context/EnvContext';

const AppServiceProbe = () => {
  const { appService } = useEnv();
  return <span>{appService ? 'local-service-ready' : 'waiting'}</span>;
};

describe('EnvProvider local-first boot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppService.mockResolvedValue({
      loadSettings: vi.fn().mockResolvedValue({ replicaDeviceId: 'legacy-device' }),
    });
  });

  it('exposes the local app service without starting the account replica runtime', async () => {
    render(
      <EnvProvider>
        <AppServiceProbe />
      </EnvProvider>,
    );

    expect(await screen.findByText('local-service-ready')).toBeTruthy();
    await waitFor(() => expect(mocks.getAppService).toHaveBeenCalledOnce());

    expect(mocks.enableLocalStoreAutoPersist).toHaveBeenCalled();
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { CloudProviderRow } from '@/components/settings/IntegrationsPanel';

const ProviderIcon = () => <svg aria-hidden='true' />;

afterEach(() => {
  cleanup();
});

describe('sync storage entry points', () => {
  test('an unconfigured provider has no disabled checkbox but still opens its settings', () => {
    const onOpen = vi.fn();

    render(
      <CloudProviderRow
        icon={ProviderIcon}
        title='WebDAV'
        status='Not connected'
        checked={false}
        canToggle={false}
        onToggle={vi.fn()}
        onOpen={onOpen}
        toggleLabel='Sync with WebDAV'
      />,
    );

    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /WebDAV.*Not connected/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  test('a configured provider keeps its inline checkbox', () => {
    render(
      <CloudProviderRow
        icon={ProviderIcon}
        title='WebDAV'
        status='Configured'
        checked={false}
        canToggle
        onToggle={vi.fn()}
        onOpen={vi.fn()}
        toggleLabel='Sync with WebDAV'
      />,
    );

    expect(
      (screen.getByRole('checkbox', { name: 'Sync with WebDAV' }) as HTMLInputElement).disabled,
    ).toBe(false);
  });

  test('the settings menu does not add a separate sync storage shortcut', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/library/components/SettingsMenu.tsx'),
      'utf8',
    );

    expect(source).not.toContain('Configure Sync Storage');
    expect(source).not.toContain("label={_('Sync Storage')}");
  });
});

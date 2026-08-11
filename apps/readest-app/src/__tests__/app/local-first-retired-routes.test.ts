import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const appRoot = process.cwd();

const routeRoots = ['src/app/auth', 'src/app/user', 'src/app/send', 'src/app/s'] as const;

const retiredServerRoots = [
  'src/app/api/share',
  'src/app/api/stripe',
  'src/app/api/apple',
  'src/app/api/google',
  'src/pages/api/storage',
  'src/pages/api/sync',
  'src/pages/api/send',
  'src/pages/api/user',
  'src/pages/api/deepl',
  'src/libs/payment',
] as const;

const sourceFilesUnder = (relativeRoot: string): string[] => {
  const root = resolve(appRoot, relativeRoot);
  if (!existsSync(root)) return [];

  return readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const path = resolve(root, entry.name);
      if (entry.isDirectory()) {
        return sourceFilesUnder(relative(appRoot, path));
      }
      return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
    })
    .sort();
};

describe('retired official account, send, and share routes', () => {
  test('only keeps inert top-level route shells', () => {
    const inventory = Object.fromEntries(
      routeRoots.map((root) => [
        root,
        sourceFilesUnder(root).map((path) => relative(resolve(appRoot, root), path)),
      ]),
    );

    expect(inventory).toEqual({
      'src/app/auth': ['page.tsx'],
      'src/app/user': ['page.tsx'],
      'src/app/send': ['page.tsx'],
      'src/app/s': ['page.tsx'],
    });
  });

  test('route shells cannot reach official account services', () => {
    const guardedFiles = routeRoots.flatMap(sourceFilesUnder);
    const forbidden = [
      '@/context/AuthContext',
      '@/utils/supabase',
      '@supabase/',
      '@/libs/payment',
      '@/hooks/useQuotaStats',
      '@/hooks/useAvailablePlans',
      '@/utils/fetch',
      '@/libs/share',
      '@/libs/user',
      'getAPIBaseUrl',
      '/send/inbox',
      '/send/address',
      '/api/share',
      'web.readest.com',
    ];

    const violations = guardedFiles.flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return forbidden
        .filter((needle) => source.includes(needle))
        .map((needle) => `${relative(appRoot, path)}: ${needle}`);
    });

    expect(violations).toEqual([]);
  });

  test('removes unused official UI and background controllers', () => {
    const removedLeaves = [
      'src/components/settings/integrations/SendToReadestForm.tsx',
      'src/hooks/useInboxDrainer.ts',
      'src/hooks/useUserActions.ts',
    ];

    expect(removedLeaves.filter((path) => existsSync(resolve(appRoot, path)))).toEqual([]);
  });

  test('keeps native OAuth outside the retired account route', () => {
    const nativeAuthPath = resolve(appRoot, 'src/services/sync/providers/oauth/nativeAuth.ts');
    expect(existsSync(nativeAuthPath)).toBe(true);

    for (const path of [
      'src/services/sync/providers/oauth/oauthAndroid.ts',
      'src/services/sync/providers/oauth/oauthIos.ts',
    ]) {
      const source = readFileSync(resolve(appRoot, path), 'utf8');
      expect(source).toContain("from './nativeAuth'");
      expect(source).not.toContain('@/app/auth/');
    }
  });
});

describe('retired official server, account, and payment leaves', () => {
  test('removes official account and web-domain handlers from native manifests', () => {
    const nativeConfigs = [
      'src-tauri/tauri.conf.json',
      'src-tauri/Info-ios.plist',
      'src-tauri/gen/android/app/src/main/AndroidManifest.xml',
      'src-tauri/capabilities/default.json',
    ];

    const violations = nativeConfigs.flatMap((path) => {
      const source = readFileSync(resolve(appRoot, path), 'utf8');
      return ['auth-callback', 'web.readest.com', 'https://*.readest.com']
        .filter((needle) => source.includes(needle))
        .map((needle) => `${path}: ${needle}`);
    });

    expect(violations).toEqual([]);
  });

  test('removes official server routes, clients, and workers', () => {
    const retiredFiles = [
      ...retiredServerRoots.flatMap(sourceFilesUnder),
      'src/pages/api/sync.ts',
      'src/libs/share.ts',
      'src/libs/shareImport.ts',
      'src/libs/shareServer.ts',
      'src/libs/storage.ts',
      'src/libs/user.ts',
      'src/services/cloudService.ts',
      'src/services/deleteLibraryService.ts',
      'src/services/send/inboxDrainer.ts',
      'src/services/send/sendAddress.ts',
      'src/services/send/devicePrefs.ts',
      'src/hooks/useAvailablePlans.ts',
      'src/app/library/components/ShareBookDialog.tsx',
      'src/utils/iap.ts',
      'src/types/payment.ts',
      'src/utils/object.ts',
      'src/utils/r2.ts',
      'src/utils/s3.ts',
      'src/utils/storage.ts',
    ].filter((path) => existsSync(resolve(appRoot, path)));

    expect(retiredFiles.map((path) => relative(appRoot, resolve(appRoot, path)))).toEqual([]);
    for (const path of [
      'workers/iap-reconcile/package.json',
      'workers/iap-reconcile/wrangler.toml',
      'workers/iap-reconcile/src/index.ts',
      'workers/send-email/package.json',
      'workers/send-email/wrangler.toml',
      'workers/send-email/src/index.ts',
      'extensions/send-to-readest/package.json',
      'extensions/send-to-readest/manifest.json',
      'extensions/send-to-readest/src/background/service-worker.ts',
    ]) {
      expect(existsSync(resolve(appRoot, path))).toBe(false);
    }
  });

  test('unregisters retired official workspaces', () => {
    const workspaceSource = readFileSync(resolve(appRoot, '../../pnpm-workspace.yaml'), 'utf8');
    const lockSource = readFileSync(resolve(appRoot, '../../pnpm-lock.yaml'), 'utf8');

    for (const workspace of [
      'apps/readest-app/workers/iap-reconcile',
      'apps/readest-app/workers/send-email',
      'apps/readest-app/extensions/send-to-readest',
    ]) {
      expect(workspaceSource).not.toContain(workspace);
      expect(lockSource).not.toContain(`${workspace}:`);
    }
  });

  test('keeps local conversion, BYO integrations, and explicit URL downloads', () => {
    const requiredFiles = [
      'src/libs/download.ts',
      'src/services/send/conversion/conversionWorker.ts',
      'src/services/send/clipSignIn.ts',
      'src/services/novel/novelImport.ts',
      'src/services/rss/articleIngest.ts',
      'src/app/api/ai/chat/route.ts',
      'src/app/api/azure-translate/route.ts',
      'src/app/api/yandex-translate/route.ts',
      'src/app/api/metadata/search/route.ts',
      'src/app/api/opds/proxy/route.ts',
      'src/app/api/hardcover/graphql/route.ts',
      'src/pages/api/kosync.ts',
      'src/pages/api/bookorbit.ts',
      'src/services/sync/providers/oauth/nativeAuth.ts',
    ];

    expect(requiredFiles.filter((path) => !existsSync(resolve(appRoot, path)))).toEqual([]);

    const downloadSource = readFileSync(resolve(appRoot, 'src/libs/download.ts'), 'utf8');
    for (const forbidden of [
      'getAPIBaseUrl',
      'getUserID',
      'fetchWithAuth',
      '/storage/',
      '@/context/AuthContext',
    ]) {
      expect(downloadSource).not.toContain(forbidden);
    }

    const appServiceSource = readFileSync(resolve(appRoot, 'src/services/appService.ts'), 'utf8');
    expect(appServiceSource).not.toContain("from './cloudService'");
    expect(appServiceSource).not.toContain("from '@/libs/storage'");
    expect(appServiceSource).not.toContain('uploadFileToCloud');

    const systemTypesSource = readFileSync(resolve(appRoot, 'src/types/system.ts'), 'utf8');
    expect(systemTypesSource).not.toContain('uploadFileToCloud');

    const packageJson = JSON.parse(readFileSync(resolve(appRoot, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      scripts?: Record<string, string>;
    };
    for (const dependency of [
      '@googleapis/androidpublisher',
      '@aws-sdk/client-s3',
      '@aws-sdk/s3-request-presigner',
      '@stripe/react-stripe-js',
      '@stripe/stripe-js',
      'app-store-server-api',
      'stripe',
    ]) {
      expect(packageJson.dependencies?.[dependency]).toBeUndefined();
    }

    for (const script of ['build-browser-ext', 'i18n:extract:ext', 'test:extension']) {
      expect(packageJson.scripts?.[script]).toBeUndefined();
    }
    expect(packageJson.scripts?.['test:pr:web']).not.toContain('extension');

    const wranglerSource = readFileSync(resolve(appRoot, 'wrangler.toml'), 'utf8');
    expect(wranglerSource).not.toContain('IAP_WEBHOOK_AE');
    expect(wranglerSource).not.toContain('iap_webhooks');
  });
});

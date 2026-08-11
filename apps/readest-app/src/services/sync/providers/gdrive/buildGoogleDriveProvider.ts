/**
 * Assemble a ready-to-use Google Drive {@link FileSyncProvider} from the pieces
 * built in this folder: the env-baked OAuth client id, a CSP-bypassing native
 * `fetch`, the keychain token store, and the single-flight
 * {@link createGoogleDriveAuth}.
 *
 * Returns `null` when Drive cannot run here — no client id baked into the build,
 * or no secure token storage (web, or a Tauri keychain that failed to probe).
 * Callers treat `null` as "this backend is unavailable" rather than surfacing a
 * half-built provider that would fail on first use.
 */
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { isTauriAppPlatform, isWebAppPlatform } from '@/services/environment';
import type { FileSyncProvider } from '@/services/sync/file/provider';
import { createGoogleDriveProvider, type FetchFn } from './GoogleDriveProvider';
import { createGoogleDriveAuth } from './googleDriveAuth';
import { WebDriveAuth } from './WebDriveAuth';
import { createDriveTokenPersistence } from './driveTokenStore';

/**
 * User-supplied native Google OAuth client id. It is intentionally absent by
 * default so fork builds never use the upstream project's OAuth registration.
 * Native builders must also register the matching reverse-DNS redirect scheme
 * in their platform manifests.
 */
export const getGoogleClientId = (): string | undefined =>
  process.env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] || undefined;

/**
 * User-supplied Web-type Google OAuth client id. The configured OAuth app must
 * allow the deployment origin.
 */
export const getGoogleWebClientId = (): string | undefined =>
  process.env['NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID'] || undefined;

/** Native `fetch` bypasses the WebView CSP for the googleapis.com hosts. */
const resolveFetch = (): FetchFn =>
  (isTauriAppPlatform() ? tauriFetch : globalThis.fetch) as unknown as FetchFn;

export const buildGoogleDriveProvider = async (): Promise<FileSyncProvider | null> => {
  // Web: token from the full-page redirect flow, kept in sessionStorage, read by
  // WebDriveAuth. Buffered I/O (createGoogleDriveProvider omits the Tauri-only
  // streaming methods off-Tauri); the Drive REST API is CORS-enabled so plain
  // fetch works. No keychain.
  if (isWebAppPlatform()) {
    if (!getGoogleWebClientId()) return null;
    // Bind to the global so `this.fetchFn(...)` inside the provider doesn't call
    // window.fetch with the wrong receiver ("Illegal invocation").
    const fetchFn = globalThis.fetch.bind(globalThis) as unknown as FetchFn;
    return createGoogleDriveProvider(new WebDriveAuth(fetchFn), fetchFn);
  }

  const clientId = getGoogleClientId();
  if (!clientId) return null;

  // No ephemeral fallback for the refresh token: if secure storage is missing,
  // Drive is simply not available here.
  const persistence = await createDriveTokenPersistence();
  if (!persistence) return null;

  const fetchFn = resolveFetch();
  const auth = createGoogleDriveAuth({ clientId, fetchFn, persistence });
  return createGoogleDriveProvider(auth, fetchFn);
};

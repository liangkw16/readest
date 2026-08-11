import { isWebAppPlatform } from '@/services/environment';
import type { AppService } from '@/types/system';
import { tauriDownload, webDownload, type ProgressHandler } from '@/utils/transfer';

export interface DownloadFileParams {
  appService: AppService;
  dst: string;
  url: string;
  headers?: Record<string, string>;
  singleThreaded?: boolean;
  skipSslVerification?: boolean;
  onProgress?: ProgressHandler;
}

/** Download an explicit public or user-server URL to the app filesystem. */
export const downloadFile = async ({
  appService,
  dst,
  url,
  headers,
  singleThreaded,
  skipSslVerification,
  onProgress,
}: DownloadFileParams) => {
  if (isWebAppPlatform()) {
    const { headers: responseHeaders, blob } = await webDownload(url, onProgress, headers);
    await appService.writeFile(dst, 'None', await blob.arrayBuffer());
    return responseHeaders;
  }

  return tauriDownload(
    url,
    dst,
    onProgress,
    headers,
    undefined,
    singleThreaded,
    skipSslVerification,
  );
};

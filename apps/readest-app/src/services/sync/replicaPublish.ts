/**
 * Compatibility seam for stores that still publish mutation notifications.
 *
 * This local-first build does not connect an account replica backend, so
 * publishing metadata is intentionally a no-op. Keeping the async surface lets
 * local settings, dictionaries, fonts, textures, and OPDS stores remain
 * independent of the retired server implementation.
 */
export const publishReplicaUpsert = <T>(
  _kind: string,
  _record: T,
  _contentId: string,
  _reincarnation?: string,
): Promise<void> => Promise.resolve();

export const publishReplicaDelete = (_kind: string, _contentId: string): Promise<void> =>
  Promise.resolve();

export const publishReplicaManifest = (
  _kind: string,
  _contentId: string,
  _files: { filename: string; byteSize: number; partialMd5: string }[],
  _reincarnation?: string,
): Promise<void> => Promise.resolve();

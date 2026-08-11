import type { AppService } from '@/types/system';

interface ReplicaBinaryRecord {
  contentId?: string;
  name: string;
  reincarnation?: string;
}

/**
 * Compatibility seam for local asset stores.
 *
 * Dictionaries, fonts, and textures continue to be saved locally, but this
 * build has no account replica transfer backend. Binary publication therefore
 * completes as a deliberate no-op and never opens files or queues uploads.
 */
export const queueReplicaBinaryUpload = <T extends ReplicaBinaryRecord>(
  _kind: string,
  _record: T,
  _appService: AppService,
): Promise<string | null> => Promise.resolve(null);

export const queueDictionaryBinaryUpload = <T extends ReplicaBinaryRecord>(
  dict: T,
  appService: AppService,
): Promise<string | null> => queueReplicaBinaryUpload('dictionary', dict, appService);

import type { Book } from '@/types/book';
import type { AppService } from '@/types/system';

/** True when an existing metadata URL is usable by an external integration. */
export const isPublicImageUrl = (url?: string | null): url is string =>
  !!url && /^https?:\/\/(?!localhost|127\.|asset\.localhost)/.test(url);

/**
 * Return only a public URL the user already supplied with the book metadata.
 * Local covers remain local; this fork never uploads them to an official CDN.
 */
export const getPublicCoverUrl = async (
  book: Book,
  _appService: AppService | null,
): Promise<string | undefined> =>
  Promise.resolve(isPublicImageUrl(book.coverImageUrl) ? book.coverImageUrl : undefined);

import type { Book } from '@/types/book';
import type { DeleteAction, FileSystem } from '@/types/system';
import { getCoverFilename, getDir } from '@/utils/book';
import { resolveBookContentSource } from './bookContent';

/** Delete only app-owned local data. User-owned source files are never removed. */
export async function deleteLocalBook(
  fs: FileSystem,
  book: Book,
  deleteAction: DeleteAction,
): Promise<void> {
  if (deleteAction === 'cloud') return;

  const source = await resolveBookContentSource(fs, book);
  if (source.kind === 'managed' && deleteAction !== 'purge') {
    if (await fs.exists(source.path, source.base)) {
      await fs.removeFile(source.path, source.base);
    }
  }

  if (deleteAction === 'purge') {
    const dir = getDir(book);
    if (await fs.exists(dir, 'Books')) {
      await fs.removeDir(dir, 'Books', true);
    }

    const ttsCacheDir = `tts-cache/${book.hash}`;
    if (await fs.exists(ttsCacheDir, 'Cache')) {
      await fs.removeDir(ttsCacheDir, 'Cache', true);
    }
  }

  if (deleteAction === 'both' && (await fs.exists(getCoverFilename(book), 'Books'))) {
    await fs.removeFile(getCoverFilename(book), 'Books');
  }

  if (deleteAction === 'local' || deleteAction === 'purge') {
    book.downloadedAt = null;
  } else {
    book.deletedAt = Date.now();
    book.downloadedAt = null;
    book.coverDownloadedAt = null;
  }
}

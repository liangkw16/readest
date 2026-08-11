import libraryEn from '@/data/demo/library.en.json';
import libraryZh from '@/data/demo/library.zh.json';

interface DemoLibrary {
  library: string[];
}

// Empty by default: a self-hosted/local build must not silently fetch sample
// books from an official CDN. The hook remains as a compatibility seam for a
// deployment that replaces these bundled manifests with its own assets.
export const demoLibraries: Record<'en' | 'zh', DemoLibrary> = {
  en: libraryEn,
  zh: libraryZh,
};

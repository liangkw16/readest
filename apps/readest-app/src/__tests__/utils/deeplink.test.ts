import { describe, it, expect } from 'vitest';
import { buildAnnotationUrl } from '../../utils/deeplink';

describe('buildAnnotationUrl', () => {
  const link = { bookHash: 'abc', noteId: 'n1', cfi: '/6/4!/4/2' };

  it('builds the custom-scheme app URL when linkType is "app"', () => {
    const url = buildAnnotationUrl(link, 'app');
    expect(url.startsWith('readest://book/abc/annotation/n1')).toBe(true);
  });

  it('builds a same-origin web URL when linkType is "web"', () => {
    const url = buildAnnotationUrl(link, 'web');
    expect(new URL(url).origin).toBe(window.location.origin);
    expect(url).toContain('/o/book/abc/annotation/n1');
  });

  it('preserves the cfi query for both link types', () => {
    const encoded = encodeURIComponent(link.cfi);
    expect(buildAnnotationUrl(link, 'app')).toContain(`cfi=${encoded}`);
    expect(buildAnnotationUrl(link, 'web')).toContain(`cfi=${encoded}`);
  });

  it('omits the cfi query when no cfi is provided', () => {
    const url = buildAnnotationUrl({ bookHash: 'abc', noteId: 'n1' }, 'app');
    expect(url).toBe('readest://book/abc/annotation/n1');
  });
});

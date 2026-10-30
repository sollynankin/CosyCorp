import { describe, expect, it } from 'vitest';
import { buildWiki } from '../src/docs/wiki';
import onDisk from '../WIKI.md?raw';

describe('wiki', () => {
  it('builds without throwing and covers the main sections', () => {
    const wiki = buildWiki();
    for (const h of ['## Farming', '## Fishing', '## Villagers', '## Story', '## The Works', '## Shops']) expect(wiki).toContain(h);
    expect(wiki.length).toBeGreaterThan(20000);
  });

  it('WIKI.md is up to date (run `npm run wiki` after changing data or balance)', () => {
    expect(onDisk.replace(/\r\n/g, '\n')).toBe(buildWiki());
  });
});

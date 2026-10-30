// Not a test of behaviour: running it (npm run wiki) writes WIKI.md from the data tables.
// @ts-nocheck (node globals; this folder is outside the typechecked sources)
import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { buildWiki } from '../src/docs/wiki';

it('writes WIKI.md', () => {
  writeFileSync(new URL('../WIKI.md', import.meta.url), buildWiki());
});

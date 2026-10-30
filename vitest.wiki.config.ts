import { defineConfig } from 'vitest/config';

// `npm run wiki` regenerates WIKI.md from the game data (see scripts/wiki.test.ts).
export default defineConfig({
  test: { include: ['scripts/wiki.test.ts'], environment: 'node' },
});

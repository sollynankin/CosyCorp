# Cosycorp

A cozy 3D farming-life sim with a deterministic automation layer ("the Works"). Grow crops, befriend the
villagers of Hearthvale, wake the old Guild machines and keep the valley lit. TypeScript, Vite and Three.js,
with procedural art and audio (no asset files).

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run typecheck
npm run build
npm run wiki       # regenerate WIKI.md from the game data
```

- **[WIKI.md](WIKI.md)**: the player reference (crops, recipes, villagers, schedules, gifts, story, shops...), generated from the game's data.
- [DESIGN.md](DESIGN.md): the rules and the reasoning behind them.
- [CLAUDE.md](CLAUDE.md) / [HANDOFF.md](HANDOFF.md): contributor and agent notes, current status.

In the game: **J** opens the Journal (its *What next?* tab helps when you are stuck), **M** the map, **I** the backpack,
**B** build mode, **C** crafting. The mouse wheel changes tool; Ctrl + wheel zooms.

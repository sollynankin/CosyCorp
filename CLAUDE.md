# CLAUDE.md: Cosycorp

(The game was renamed from Hearthvale to Cosycorp. The valley town in the story is still called Hearthvale; the `hearthvale.*` browser storage keys are kept so old saves keep loading.)

A cozy 3D farming-life sim with a deterministic automation layer ("the Works"). Read `DESIGN.md` for the rules
(it is authoritative) and `HANDOFF.md` for current status and next tasks.

## Stack and commands

TypeScript (strict), Vite, Three.js for the 3D view, plain DOM/CSS for UI, Vitest. No engine or UI
framework.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest run: must stay green
npm run typecheck  # tsc --noEmit (also covers tests/)
npm run build      # typecheck + production build into dist/
```

Before you finish any change, run `npm test` and `npm run typecheck`.

## Layout

```
src/data/          typed content tables; balance.ts holds ALL numbers
src/world/         map definitions (ASCII) + map helpers (collision, paths, warps)
src/sim/           pure deterministic simulation (index.ts = public API)
src/render/        Three.js view, read-only over state; meshes/ = procedural mesh builders
src/ui/            DOM panels (hud, hotbar, inventory, dialogue, shops, report, menus)
src/game/          glue: Game (fixed-tick loop + command queue), input, save/load
tests/             Vitest sim tests; helpers.ts has fixtures
```

## The hard rules

1. **The sim is pure and deterministic.** In `src/sim/` and `src/world/` never touch the DOM, Three.js,
   `window`, `localStorage`, `Math.random()`, `Date.now()` or `performance`. Randomness comes only from
   `rngNext(state)`. Derived choices that must not consume RNG use `hash32(...)`. Sim and world modules must not
   import from `render/`, `ui/` or `game/`.
2. **Render and UI only read state.** They change it only by queueing commands through `game.send(cmd)`.
   Render-only state (particles, camera, interpolation, animal wander) lives in `src/render/`.
3. **GameState is plain JSON**: no classes, Maps, Sets, functions or `undefined` fields. Derived data
   (power, collision grids, NPC paths) goes in `DayContext` or a pure memo cache.
4. **Content is data.** Crops, items, recipes, villagers, dialogue, schedules, scenes, quests, festivals,
   machines and shop stock are table entries. Add code only for a genuinely new behaviour.
5. **Numbers live in `src/data/balance.ts`.** Don't hard-code balance values in logic or data tables.
6. **The belt model is snapshot-based** (DESIGN.md §5). Do not change `src/sim/transfer.ts` without reading §5
   and keeping `tests/belts.test.ts` green.
7. **Golden test** (`tests/golden.test.ts`): if it fails, find out why. If the change was an intended rule or
   balance change, re-derive the numbers, update them *and* the derivation comment, and say so in your
   summary. Never paste in new numbers just to make it pass.
8. **Story never soft-locks.** Keep `tests/story.test.ts` green. Dated beats must complete even if missed
   (DESIGN.md §0).

## Conventions

- Small modules, explicit types, named exports. Comment the *why*, not the what. Metric units in comments.
- Iterate entities in array order (id order). Scan areas with `tilesInRadius` (row-major).
- Directions: `0=N 1=E 2=S 3=W`; N is −y on the map, which is −z in the 3D world (`x → x`, `y → z`).
- Sim functions mutate the passed state. Commands return `{ ok: false, reason }` with a player-facing reason
  instead of throwing.
- UI: build DOM with `h()` from `src/ui/dom.ts`. Panels re-render from state.
- Meshes: builders in `src/render/meshes/` are pure functions returning `THREE.Object3D` or geometry. Share
  materials through `materials.ts` (`mat(color)`), never create a material per frame.

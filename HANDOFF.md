# HANDOFF: Hearthvale (work in progress)

Status: M1 and M2 are committed. M3 (automation) is partway done: only the sim side exists.

## Done
- M1: pure deterministic sim (10 Hz tick, a factory step per in-game minute), ASCII maps (farm, town, forest,
  lake, plus 10 generated mine floor layouts), movement and collision, hand farming, and a Three.js view with
  procedural instanced meshes, day/night lighting and weather and season particles.
- M2: shops, shipping bin, backpack, farmhouse (sleep), save/load (autosave plus export/import), end-of-day
  report, and all 12 crops in data.
- M3 (sim only, untested): placing, rotating and picking up machines (`src/sim/placement.ts`); the snapshot
  belt model (`src/sim/transfer.ts`); harvester, planter and crafter behaviour, plus dawn sprinklers
  (`src/sim/machines.ts`); power and heat; spoilage; machine interaction and chests.

## Next (in order)
1. M3 tests: belts (throughput cap and backpressure), harvester reach, sprinkler radius, power factor, and the
   golden layout coin total (`tests/golden.test.ts`).
2. M3 render and UI: machine meshes (`src/render/meshes/machines.ts`), belt items, build mode (B), the
   crafting panel (C), the Flow overlay (F) and the machine inspector panel.
3. Story unlocks for blueprints (`state.recipes`), then M4 to M7 as planned in DESIGN.md.

Stubs waiting to be filled in: `sim/fishing.ts`, `sim/fishingTick.ts`, `sim/mine.ts`, `sim/mapEnter.ts`,
`sim/hooks.ts`, `sim/villagers.ts`, `sim/festivalDays.ts` and `sim/storyWeather.ts`.

Stay on Opus until M3 to M5 are done (belt model, story state machine). Sonnet can take content and polish
after that.

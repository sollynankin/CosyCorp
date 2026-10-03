# HANDOFF: Hearthvale

Status: **M1 to M7 are built and committed.** 80 tests pass, `npm run typecheck` is clean, and `npm run build`
produces a working bundle. The game can be played from the title card to the Lantern Night finale; the
scripted story walk in `tests/story.test.ts` proves it.

Read `CLAUDE.md` (rules and commands) and `DESIGN.md` (the authoritative design, with the reasoning for each
system) before changing anything.

## What is built

| area | what works | where |
|---|---|---|
| Core | Pure deterministic sim, 10 Hz fixed tick, one factory step per in-game minute, seeded RNG, render interpolation, save/load (autosave each morning, export/import file, additive `migrate`) | `src/sim/`, `src/game/` |
| Calendar | 4 seasons × 14 days, 06:00 to 02:00, sun/rain/storm/snow, the forced Thaw Flood storm | `calendar.ts`, `weather.ts`, `storyWeather.ts` |
| Player | Energy, 6 tools with 3 tiers (Smithy upgrades), skills (farming, mining, fishing) | `tools.ts`, `shop.ts`, `skills.ts` |
| Farming | 12 crops and the Honeypear orchard tree, quality tiers, fertiliser, winter (hardy crops, Heaters, Greenhouse) | `farming.ts`, `data/crops.ts` |
| The Works | 17 machines: sprinklers, planters, harvesters, belts with throughput caps and backpressure, splitters, silos, 4 crafters, Market Chute, Water Wheel, Windmill, Heater, chests. Snapshot belt model, power sharing, overnight spoilage, efficiency report with bottleneck hints | `placement.ts`, `transfer.ts`, `machines.ts`, `power.ts`, `report.ts` |
| Build UI | Build mode (B) with ghost, drag-painted belts, rotate, pick up; crafting (C); machine inspector; chests; Flow overlay (F) with belt heatmap, jams, status rings, ranges and power coverage | `ui/build.ts`, `ui/works.ts`, `render/flowOverlay.ts` |
| Stretch goals | 5 seasonal goals; rewards are cosmetics (golden belts, yard bunting, farm lanterns, weathervane) and rare recipes (Harvest Medley, Fish Stew, Pumpkin Pie) | `data/goals.ts`, `sim/goals.ts` |
| Villagers | 8 villagers with procedural looks, schedules as a pure function of time (cross-map routes), 77 context-aware dialogue lines, gifts (loved/liked/neutral/disliked, birthdays, weekly cap), hearts, 2 to 3 heart events each, 2 romanceable with Ribbon Charm, Promise Lantern, ceremony and spouse morning visits | `data/villagers.ts`, `data/dialogue.ts`, `data/scenes.ts`, `sim/schedule.ts`, `sim/villagers.ts` |
| Story | Quest DAG: 10 main quests across the 6 beats, plus side arcs "The Heron" (Ilo) and "The Seed Library" (Saffi). Fixed-point state machine; dated beats complete even if missed | `data/quests.ts`, `data/storyScenes.ts`, `sim/quests.ts` |
| Town | 6 buildings (Town Hall, Almanac & Sundries, Smithy, Joinery, Kettle Inn, Works Hall), shop hours, keepers you can chat with at the counter, the weekly quest board | `world/maps/town.ts`, `data/shops.ts`, `sim/board.ts` |
| Festivals | Blossom Fair (seed-pod hunt), Glowfin Derby (fishing count), Harvest Weigh-in (exhibit and ribbons), Lantern Night (secret friend; the Y2 finale), with plaza dressing | `data/festivals.ts`, `sim/festival.ts` |
| World | Forest foraging, a 10-floor mine (ore by depth, hidden ladder, lift at 5 and 10, dust bunnies), fishing mini-game with 8 fish, chickens and cows (coop and barn from the Joinery, grazing or hay, petting, product quality), 8 cooking recipes in the farmhouse kitchen | `sim/mine.ts`, `sim/fishing.ts`, `sim/animals.ts` |
| Rendering | Three.js with instanced procedural meshes, day/night light curves, weather and season particles, a quality setting, villagers with name tags, portraits and machine icons rendered from the real meshes | `src/render/` |
| Tests | Determinism (including a whole-system tour with a save/load in the middle), crop growth by season, sprinkler radius, harvester reach, belt caps and backpressure, merges, splitters, golden layout (exact 14,931 coins, derivation in the file), relationship maths, dialogue selection, heart events, story walk (attentive and festival-skipping players), save/load round trip, mine, fishing, animals, goals | `tests/` |

## What is thin or stubbed

- **No audio.** The sim emits `sound` events (`bite`, `quest`, `ship`) that nothing plays yet.
- **No gamepad.** `InputSource` in `src/game/input.ts` is the extension point.
- **Animals are not drawn indoors.** On rainy days and in winter they stay "inside" and simply are not shown.
- **Mine fishing** (`MapDef.fishing = 'mine'`) has no fish and no water tiles.
- **Tool upgrades are instant** at the Smithy (Teo has no two-day wait).
- **Marriage** stops at the ceremony and morning visits, as the design scoped it.
- **No player name or appearance options.**

## Known issues

1. **Balance is untuned.** The numbers are reasoned, not playtested. Quest-board rewards pay double the ship
   price (`BOARD_REWARD_MULT = 2`), story delivery counts are guesses, and the story walk compresses two years
   of pacing because the scripted player hands everything over instantly. The first real playthrough will
   find the soft spots.
2. **Villagers ignore player-placed machines.** Forest villagers walk across the farm path and step over belts
   by design (DESIGN.md §9), which can look odd if you build on the path. NPCs and the player never block
   each other.
3. **Vite HMR can cache a stale transform** after rapid successive edits to one file (seen once: a
   `ReferenceError` for a symbol that was imported). Restart the dev server if a browser error contradicts
   the source.
4. **The production bundle is 826 kB** (231 kB gzipped), mostly Three.js. Vite warns about chunk size; it is
   harmless.
5. **In-app browser screenshots** in the Claude desktop pane cropped to the top-left of the page during this
   build (device pixel ratio 1.5). Setting `document.documentElement.style.zoom = '0.62'` and calling
   `renderer.resize()` makes the whole page visible. Remember to reset it.
6. Outside this repo: `C:\Users\solly\seasonal-workshop-farm\.claude\launch.json` still has a `hearthvale`
   dev-server entry from early in the build. This repo now has its own `.claude/launch.json`, so that entry
   can be deleted.

## Which model to use

**Default to Sonnet 5.5** for the work that is left: content, balance numbers, UI panels, meshes, CSS, audio,
input, and tests for behaviour that already exists. The architecture is settled and the invariants are guarded
by tests, so most changes are local.

**Switch to Opus 5.5** when either of these is true:

- The task changes an invariant system: the belt model (`sim/transfer.ts`), tick or factory ordering, RNG
  consumption, the quest state machine or dated beats (`sim/quests.ts`, `sim/festival.ts`), or save migration.
- One of the guard tests (`belts`, `golden`, `story`, `determinism`) fails and the cause isn't clear after
  one attempt.

Switch back to Sonnet once the guard tests are green again.

## Files to share with a new session

Always: `CLAUDE.md`, `DESIGN.md`, `HANDOFF.md`. Then, by task:

- Balance: `src/data/balance.ts`, `src/data/quests.ts`, `src/sim/board.ts`, `tests/golden.test.ts`
- Audio and input: `src/sim/context.ts` (the `SimEvent` list), `src/ui/app.ts`, `src/game/input.ts`, `src/main.ts`
- Story and villagers: `src/data/{villagers,dialogue,scenes,storyScenes,quests}.ts`, `tests/story.test.ts`
- Machines: `src/data/machines.ts`, `src/sim/{transfer,machines}.ts`, `tests/{belts,golden}.test.ts`

## First prompt for the next session (paste as is)

```
You're continuing Hearthvale (C:\Users\solly\hearthvale). Read CLAUDE.md, DESIGN.md and HANDOFF.md first.
Keep npm test and npm run typecheck green, and commit after each task.

1. Balance pass. Add tests/balance.test.ts: a scripted "reasonable player" (plants in season, builds the
   machines each beat unlocks, ships daily) playing two years. Record coins per season and the day each main
   quest completes. Tune src/data/balance.ts (BOARD_REWARD_MULT, machine costs, story delivery counts in
   data/quests.ts) so that coins grow roughly 2-3x per season in year 1 and every main beat is reachable
   about one season ahead of its dated deadline. Assert those bands. If the golden test moves, re-derive it
   and update its comment.
2. Procedural audio. Add src/ui/audio.ts using WebAudio only (no files): short synthesized sounds for the
   existing SimEvents (fx till/water/harvest/chop/mine/splash/poof/place/sparkle, sound bite/quest/ship,
   catch, escape) and a soft ambient loop that changes with weather and day/night. Add a volume slider to
   the Esc menu, saved in prefs. Audio must never touch src/sim.
3. Gamepad support. Implement a GamepadSource for the InputSource interface in src/game/input.ts: left
   stick moves, A uses, B interacts, X/Y cycle the hotbar, shoulders rotate the camera, Start opens the menu,
   and the fishing reel uses A held. Merge it with keyboard input so either works at any time.
```

# Hearthvale: Design

Hearthvale is a cozy 3D farming-life sim. Its automation layer is part of the story. This file holds the
authoritative rules and the reasoning behind each major system. If the code and this file disagree, one of
them is a bug: fix whichever is wrong and keep them in sync. Numbers live in `src/data/balance.ts`. This
file names the constant instead of repeating its value unless the value matters for understanding.

Units: 1 tile = 1 m. Character heights are given in metres. Time is in-game minutes unless it says ticks.

---

## 0. Premise and tone

You inherit **Penhallow Yard**, a run-down workshop-farm owned by your great-aunt Rosamund (Ros) Penhallow,
in **Hearthvale**, a small valley town on the River Tumble. Sixty years ago the Guild of Wheelwrights built
**the Works** there: water-wheels, belts and presses that ran the mill, the inn's ovens and the lantern line
along Kettle Street. Penhallow Yard was the Works' testing yard. Twelve years ago the Works stopped. The town
believes they broke. The truth (beat 4) is gentler and sadder: Odile Brask closed the sluice gates herself
after her husband Hollis, the last Sluice Keeper, died, because she could not bear to watch the wheels wear
out with nobody to mend them.

Restoring the Works is the main story, and it is also how you unlock the automation layer, so story
progress and optimisation progress are the same thing. The tone is warm, gently funny and low stakes. There
is no combat plot and no fail state.

### Main arc (two in-game years, 6 beats)

| # | beat | when | what unlocks |
|---|---|---|---|
| 1 | **Arrival** ("A Key and a Kettle") | Spring 1, Y1 | hand farming, tools |
| 2 | **First Harvest** | after shipping 5 crops | Sprinkler; quest "Gears and Grease" restores the yard's water-wheel (power), Conveyor, Harvester, Market Chute |
| 3 | **Blossom Fair** (first festival) | Spring 13, Y1 | quest "The Pressing Room": Jam Press, Preserver, Silo, Splitter, Seed Planter |
| 4 | **Why the Works failed** ("Down the Under-Sluice", "Open Them Together") | from Summer 1, Y1 | Hollis's logbook on mine floor 5; reopening the sluice: Mill, Swift Conveyor, Windmill, Heater, Pump Sprinkler, doubled water power |
| 5 | **The Thaw Flood** (setback) | Spring 4, Y2 | a storm snaps the Great Wheel's axle and silts the yard wheel (half water power) until "Rebuild the Great Wheel" is done, which also restores the Greenhouse |
| 6 | **Lantern Night** (finale) | Winter 13, Y2 | the town's festival lantern line runs on your Works |

Two **side arcs** belong to individual villagers:

- **Ilo, "The Heron"**: Ilo's late grandmother Marit's boat lies wrecked at the lake dock. Three scenes: the wreck
  (2 hearts), the repair (deliver wood and fibre), and the first sail (5 hearts). Reward: Sturdy Rod and the
  Glowfin can be caught from the boat dock.
- **Saffi, "The Seed Library"**: the valley's heirloom seed library was buried in the old flood. Three scenes:
  the key-tag (2 hearts), the Seed Tin found on mine floor 3, and the reopening (deliver 5 kinds of forage).
  Reward: Honeypear saplings (the orchard crop) and a recipe.

### Anti-soft-lock rules (story state machine)

The story is a DAG of quests (`src/data/quests.ts`), not a script. These rules keep it from locking:

1. A quest becomes **active** when all its `requires` quests are complete **and** the date has reached its
   `earliest` day (if it has one).
2. Every objective can be done in every season. Items a quest asks for can always be bought, foraged or
   mined, and the mine is always open.
3. **Dated beats never wait for the player.** A festival-attendance objective completes when you attend
   *or* when the festival day ends without you (a short "you missed it" scene plays the next morning).
4. **Setbacks are dated but gated.** The Thaw Flood triggers on Spring 4 of Y2 only if beat 4 is done.
   Otherwise it triggers the first morning after beat 4 completes, but not before Spring 4 of Y2.
5. The finale waits for "The Lantern Line". If that is not done by Winter 13 of Y2, the finale plays at the
   next Lantern Night. The game never ends: after the finale you keep playing.

`tests/story.test.ts` walks the whole main chain with a scripted player and asserts it reaches the finale.

---

## 1. Time

### Reasoning

The genre needs a running clock with a day you walk around in. The automation layer needs a deterministic,
cheap simulation that also runs while you are in town. We use **one fixed-rate tick** for everything that
moves (player, fishing bar, clock), and a coarser **factory step**, once per in-game minute, for farm machines
and belts. The belt model is only clean when time is discrete and coarse (see §5). Running it at 10 Hz would
cost ten times more and make every number awkward ("0.3 ticks per tile"). Minutes give human numbers: "a
harvester takes 4 minutes per crop".

### Rules

- `TICK_HZ` = 10 ticks per real second at 1x speed. `TICKS_PER_MINUTE` = 5, so 1 in-game minute = 0.5 s.
- A day runs from **06:00** to **02:00** (`DAY_MINUTES` = 1200), which is 10 real minutes.
- Every tick: player movement, the active tool or fishing state, and NPC positions (derived, §9).
- Every `TICKS_PER_MINUTE`-th tick the minute advances and one **factory step** runs (§4, §5).
- **Sleeping** (interact with the farmhouse door) or **passing out** at 02:00 ends the day. Remaining factory
  steps up to 02:00 run instantly (no player input), so going to bed early never loses production.
  Passing out (02:00, or 0 energy) wakes you at home with `PASS_OUT_ENERGY_FRAC` of your max energy. That is
  the only penalty.
- Overnight (`endDay`), in this order: shipping bin sale, spoilage, report, crop growth (§3), animals,
  calendar advance (season change, withering), story triggers, weather for tomorrow, new day setup.
- **Calendar:** 4 seasons × `DAYS_PER_SEASON` (14) days. `day` is a 0-based absolute counter. Year =
  `floor(day / 56) + 1`. Weekday = `day % 7` (Mon..Sun).
- **Rendering interpolates.** The game loop keeps the previous and current positions of every moving thing
  and draws at `alpha = accumulator / tickLength`. The sim never sees `alpha`.

## 2. Maps and the world

- Maps are ASCII grids in `src/world/maps/*.ts`. Each character maps through a legend to terrain plus an
  optional object (tree, rock, bush, weeds, fence). Buildings are listed with a footprint and a door.
  Warps are tiles that move you to another map.
- Maps: **Farm** (Penhallow Yard, 44 × 34), **Town** (Kettle Street, 6 buildings), **Forest** (Saffi's
  cottage, Odile's Sluice House, the mine entrance), **Lake** (dock, Ilo's hut), and the **Mine** (10
  generated floors). Layout: Town is east of the Farm, the Forest is south of the Farm, the Lake is north of
  the Town, and the Mine is entered from the Forest.
- Terrain: `grass`, `path`, `sand`, `floor` (wood or stone), `water` (blocks movement, fishable),
  `cliff` (blocks movement, drawn raised). On the farm, `grass` and `path` inside the yard boundary are
  tillable.
- **Building interiors are out of scope.** Each building is an exterior shell with a door. Interacting with a
  door opens that building's panel (shop, quest deliveries, sleep). Villagers who are "inside" are hidden,
  and shopkeepers can be talked to from their shop panel. This saves six interior maps.
- Dynamic objects (trees with hit points, rocks, weeds, forage, debris) live in `state.maps[id].objects`, a
  per-tile array. The farm starts strewn with weeds, twigs and stones to clear.
- **Collision:** the player is a circle (`PLAYER_RADIUS`) moving on the tile grid. Movement resolves X then Y
  against blocked tiles (water, cliffs, buildings, objects, machines, fences). Belts are walkable.

## 3. Farming

- **Till** (hoe) turns a tillable tile into soil. **Plant** puts a seed in empty soil if the crop's
  `seasons` include today's season (or the tile is heated or in the greenhouse, §6).
- **Water** (watering can) marks the soil watered for today. The can holds `CAN_CAPACITY[tier]` and refills
  at any water tile. Rain and storms water every outdoor soil tile at dawn. Sprinklers water their area at
  dawn (§4).
- **Growth is overnight.** At day end each crop on a watered tile gains `growthRate` days of growth (1
  normally, 0.5 for hardy crops on frozen soil). Unwatered crops stall but never die of thirst. Then every
  watered flag resets.
- **Stages:** `daysGrown / growthDays` < 1/3 is seed, < 2/3 is sprout, < 1 is growing, and ≥ 1 is ripe.
  A ripe crop with `regrowDays` returns to `growthDays − regrowDays` when harvested. Other crops are removed
  and leave the soil empty.
- **Harvest** (by hand with the scythe or interact, or by harvester) yields `harvestCount` items. Each item
  rolls a **quality**: gold with `QUALITY_GOLD_BASE + farmingLevel × QUALITY_GOLD_PER_LEVEL` (plus
  `FERTILIZER_GOLD_BONUS` on fertilised soil), else silver at twice that chance, else normal. Quality
  multiplies the sell price (`QUALITY_PRICE_MULT`). Machine-processed products are always normal quality.
- **Season change:** a crop survives only if the new season is in its `seasons`, or the new season is winter
  and the crop is hardy or its tile is heated or in the greenhouse. Otherwise it **withers**. A withered crop
  stays visible until it is scythed.
- Untended soil without a crop reverts to grass with probability `SOIL_REVERT_CHANCE` each night.
- **Orchard trees** (Honeypear) are planted from saplings, take `TREE_MATURE_DAYS` to mature (any season
  except winter counts), then fruit one item per day in their fruit season. Harvesters reach trees too.

**Energy:** `MAX_ENERGY` refills each morning. Tool use costs `TOOL_ENERGY[tool]`, scaled down by tool tier.
At 0 energy you pass out.

**Tools** (tier 0 Worn, 1 Copper, 2 Iron, upgraded at the Smithy): hoe, watering can, axe, pickaxe, scythe and
fishing rod. Tier raises the hoe/can area (1 tile, a row of 3, a row of 5), the can capacity, the axe and
pickaxe hit damage, and the rod's catch bar size. The scythe costs no energy.

**Skills:** farming, mining and fishing each have levels 0–5 from XP (`SKILL_XP_THRESHOLDS`). Farming raises
crop quality, mining gives extra ore chances, and fishing widens the catch bar. Nothing else.

## 4. Automation (the Works)

Machines are **items**: you craft them (or receive them from quests), then place them on the farm from the
hotbar or in **Build mode** (`B`, a cursor ghost with rotation and drag-painted belt lines). Picking a machine
up returns the item and its contents, so rearranging is never punished. Machines can only be placed on the
farm, on a free tile with no crop, object or building.

Directions: `0 = N, 1 = E, 2 = S, 3 = W` (N is −y). An entity's `dir` is its **front** (output side).
Radius is **Chebyshev** (square areas).

| kind | machines | behaviour (one factory step = 1 minute) |
|---|---|---|
| `sprinkler` | Sprinkler, Pump Sprinkler | at dawn, waters all soil within `radius`. Pump Sprinkler needs power at dawn |
| `planter` | Seed Planter | holds seeds in a hopper (insert by hand or by belt). Every `workMinutes` of progress, plants one seed on the first free plantable soil in `radius` |
| `harvester` | Harvester | every `workMinutes` of progress, harvests the first ripe crop or fruiting tree in `radius` into its output buffer |
| `belt` | Conveyor, Swift Conveyor | moves items (§5). Speed comes from the machine def |
| `splitter` | Splitter | belt that sends items front → right → left in round robin |
| `crafter` | Jam Press, Preserver, Mill, Cheese Press | input buffer, then work, then output buffer. The first recipe in data order whose inputs are present wins |
| `storage` | Silo | FIFO store, no spoilage, outputs to its front |
| `seller` | Market Chute | accepts one item per step from any side and sells it at `AUTO_SELL_MULT` of the ship price |
| `generator` | Water Wheel, Windmill | supplies power within its `radius` |
| `heater` | Heater | in winter, soil in `radius` counts as heated while powered |
| `chest` | Chest | a manual storage box (12 slots), not part of the flow |

**Scan order.** When a machine picks one tile from an area, it scans row-major (y, then x) and takes the
first eligible tile.

**Progress and power.** Progress accumulates by the machine's power factor each step and is capped at
`workMinutes` while nothing is eligible, so the machine acts the moment something becomes eligible.

**Status** is recorded every step: `working`, `idle` (nothing to do or missing input), `blocked` (output
full) or `unpowered`. The day report and the Flow overlay use it.

**Spoilage.** At day end, every raw crop, forage item, fish or animal product still on a belt or in a machine
buffer (except silos and chests) spoils. Silos are how you carry a harvest into winter.

## 5. Belts and item flow

### Reasoning

This is the riskiest system, so it uses a model that has already been tested in an earlier prototype:
**per-tile FIFO queues with snapshot transfers**. We rejected two alternatives. Continuous item positions
(Factorio-like) need topological update orders and cycle handling. Sequential slot moves make the result
depend on iteration order. With snapshots, every transfer decision in a step reads the state at the *start*
of that step, so the outcome never depends on the order entities are visited. Throughput is an explicit
number, so the player can reason about it. Rendering stays smooth because an item's position comes from its
age on the tile plus the tick fraction.

### Rules

- A belt tile holds a FIFO queue of at most `capacity` items. Each item stores `age` (steps on this tile),
  `from` (entry side, used only for drawing curves) and its quality.
- **Travel:** an item can leave only as the head of the queue with `age ≥ travelMinutes`.
- **Throughput cap:** a belt accepts at most one item per `entryInterval` steps. A Conveyor line therefore
  carries at most `1 / entryInterval` items per minute. One harvester on regrowing crops can fill a Conveyor;
  two cannot share one. The Swift Conveyor triples the cap.
- A belt accepts input from its back and both sides, never from its front. Head-on belts do not connect.
- **Merges:** when several sources offer to one receiver in the same step, it takes **one** item. The winner is
  the first offering side clockwise after the side it last accepted from (fair round robin).
- **Splitter:** accepts only from its back. Its head goes to the next output in the rotation front → right →
  left that can accept (snapshot). The pointer advances only on a successful transfer.
- **Machine outputs:** a machine with an output buffer offers at most one item per step to the entity in
  front of it. Silos offer their oldest item.
- **Receivers:** belts and splitters (above), crafters (any side except front, only ingredients they can use,
  if the per-item buffer has room), planters (seeds of their crop only, if the hopper has room), silos (any
  side except front, if not full) and Market Chutes (any side). Every receiver takes at most one item per
  step. Nothing is ever dropped on the ground.
- **Backpressure:** a full receiver refuses, so the source keeps its item. A belt whose head cannot leave
  fills up and refuses input in turn. This propagates upstream to a machine, which becomes `blocked`.

### Step algorithm

1. **Gather offers.** For each source in entity id order, using start-of-step state: if it has a ready item
   and its target can accept it, record `{source, target, side}`.
2. **Resolve.** For each target with offers, pick one by round robin over entry side.
3. **Apply.** Move each winning item. Update `lastEntry` and the round-robin pointer.
4. **Age.** Every item on a belt or splitter gains `age += 1`. A belt whose ready head did not leave records a
   `blocked` step (jams show in the overlay).

Capacity can never be exceeded: a target accepts only if it is below capacity at the start of the step, and
it takes at most one item per step.

### Factory step order

1. (Dawn only, minute 0) sprinklers water their areas.
2. Machines in entity id order: harvesters, planters, crafters (work and status).
3. Item transfers (above).
4. Belt aging and per-entity stats.

## 6. Seasons, weather and winter

- Weather per day: `sunny`, `rain`, `storm` (rain plus wind: windmills run at `STORM_WIND_MULT`, lightning
  flashes), `snow` (winter only, no watering). Tomorrow's weather is rolled each night from
  `season.weather` weights with the seeded RNG. Spring 1 of year 1 and festival days are always clear.
- **Winter is the hard season.** Outdoor soil is frozen: only **hardy** crops can be planted and they grow at
  `HARDY_WINTER_GROWTH`. A **heated** tile (within a powered Heater's radius) grows any crop at the heater's
  power factor. The **Greenhouse** (restored in beat 5) is a farm building whose 8 × 6 interior tiles are
  tillable and always count as heated, in any season.
- Stored inputs: silos keep autumn produce through winter, preserves never spoil, and crafters keep running.

## 7. Power

- **Water Wheel:** placed on a farm tile next to the stream. It supplies `powerSupply` (× the story water
  multiplier: 1 at first, 2 after "Open Them Together", 0.5 while silted after the Thaw Flood).
- **Windmill:** supplies `powerSupply` × the weather wind multiplier.
- A machine with `powerDraw > 0` is **connected** if it is within a generator's coverage `radius`. All
  connected machines share one pool: `factor = demand == 0 ? 1 : min(1, supply / demand)`. Connected
  machines run at `factor`, unconnected ones at 0.
- Power is derived from the layout and the weather (`DayContext`). It is rebuilt whenever the layout
  revision or the day changes, never stored in the save.

## 8. Economy

- **Shipping bin** (farm): items put in it sell overnight at `price(item, quality)`. The **Market Chute**
  sells instantly at `AUTO_SELL_MULT` of that price.
- **Shops** (town; each open at set hours on set weekdays): Almanac & Sundries (Wren: seasonal seeds, hay,
  fertiliser, saplings), Smithy (Teo: tool upgrades, buys and sells ore), Joinery (Bram: coop, barn,
  house and coop/barn upgrades), Kettle Inn (Pell: dishes and recipes), Works Hall (Odile: story deliveries,
  blueprints) and Town Hall (Maudie: quest board, festivals).
- **Recipes are learned.** Crafting recipes come from story beats and the Works Hall, and cooking recipes come
  from the Kettle Inn, friendship and side arcs. You craft from the Crafting tab (`C`) and cook at the
  farmhouse hearth.

## 9. Villagers and relationships

- 8 villagers (`src/data/villagers.ts`): Odile Brask, Maudie Fenn, Wren Halloway (romanceable), Teo Marsh
  (romanceable), Pell Aster, Bram Toller, Ilo Quill and Saffi Rook. Each has an `appearance` (height, build,
  colours, hair, accessory) that drives a distinct procedural mesh.
- **Schedules** are data: a list of variants, each with conditions (season, weather, weekday, festival) and a
  list of `{ time, map, x, y }` stops. The first matching variant wins, so put specific variants first.
  An NPC's position is a **pure function** of (day, minute, weather, schedule): they leave a stop at its
  `time`, walk the path to the next stop at `NPC_SPEED`, and stand there until the next time. Moving
  between maps works by walking to the map's exit and appearing at the other map's entry. Positions are never
  stored, so a schedule edit never breaks a save.
- **Friendship:** points 0–`MAX_POINTS` (`POINTS_PER_HEART` per heart, 10 hearts). Talking once a day gives
  `TALK_POINTS`. Gifts: one per day and `GIFTS_PER_WEEK` per week. The gift delta depends on the preference
  (`loved`, `liked`, `neutral`, `disliked`), × `BIRTHDAY_GIFT_MULT` on their birthday. Romanceable villagers
  cap at `DATING_CAP_HEARTS` (8) until you give a **Ribbon Charm** (sold at the Kettle Inn once you have 8
  hearts). That starts courting, and the cap lifts to 10. At 10 hearts, giving a **Promise Lantern** starts
  the 3-day lead-up to a small ceremony scene in the town square. Afterwards the spouse visits the farm each
  morning. Marriage-life extras are out of scope.
- **Heart events:** scenes (`src/data/scenes.ts`) with a trigger: villager, minimum hearts, map, time window,
  optional weather or flags. They play when you enter the map while the trigger holds. Each plays once.
- **Dialogue** (`src/data/dialogue.ts`): each line has conditions (`season`, `weather`, `minHearts`,
  `maxHearts`, `flags`, `notFlags`, `map`, `weekday`, `festival`, `courting`). Selection: among the lines whose
  conditions all hold, a hash of (day, villager) makes a **weighted** pick, weight `1 + DIALOGUE_SPECIFIC_WEIGHT
  × conditions`, so context-aware lines (weather, story, hearts) are much more likely than generic ones but
  never lock a villager into one line for a whole season. (The first version let the most specific line win
  outright; a test showed Maudie then said the same thing every day of spring.) The pick never consumes RNG,
  so talking never changes the future.

### How NPC movement is computed (reasoning)

Positions are derived, not simulated, so saves stay tiny and a schedule edit can never strand an NPC. The
cost is that NPCs cannot react to the player physically, which suits the genre. Concretely:

- A stop `{ time, map, x, y, hidden? }` means: at `time` the villager sets off from the previous stop toward
  this one. `hidden` stops are indoors (shop counters, homes): the villager is not drawn and cannot be talked
  to there; the shop panel greets you in their name instead.
- The route between two stops crosses maps by BFS over the warp graph (town ↔ farm ↔ forest, town ↔ lake).
  Forest villagers do walk across Penhallow Yard on the farm path. Each leg is a BFS path over the map's
  *static* walkability (terrain, decor, building footprints except doors, and the map's initial objects),
  memoised by endpoints. Player-placed machines are ignored: villagers step over belts rather than get stuck.
- NPCs do not block the player and the player does not block NPCs.
- Interaction finds a villager whose interpolated position is within `NPC_TALK_RADIUS` of the target tile.

### Relationship maths

`hearts = floor(points / POINTS_PER_HEART)`. Points are clamped to `[0, cap]` where cap is `MAX_POINTS`, or
`DATING_CAP_HEARTS × POINTS_PER_HEART` for a romanceable villager you are not courting. Gift delta =
`GIFT_POINTS[pref] × (birthday ? BIRTHDAY_GIFT_MULT : 1)`. Preference lookup order: loved, liked, disliked
(item id, then `tag:` entries), else neutral. Per-day flags reset each morning, the weekly gift count resets on
Monday morning. There is no friendship decay: a cozy game should not punish being busy.

## 10. Quests

- **Main story and side arcs** are `QuestDef`s with `requires`, `earliest`, objectives and rewards
  (`src/data/quests.ts`). Objective kinds: `ship` (items shipped since activation), `deliver` (hand items to a
  villager or the Works Hall), `reachFloor`, `pickup` (special story objects), `attend` (festival), `scene`
  (a scene has played), `hearts`, `power` (farm power supply at least N), `own` (machines placed). Rewards:
  coins, items, `blueprints`, `recipes`, `flags`, and an optional `scene` that plays on completion.
- **Quest board** (Town Hall): every Monday the RNG picks `BOARD_SIZE` requests from templates ("Pell would
  like 5 Tomatoes", in-season items only). Each has a deadline (the following Sunday) and a reward of coins
  plus friendship.

### The story state machine (reasoning)

Quests are evaluated, not scripted. Each morning and after every relevant action (shipping, delivering,
scene end, entering a map, placing a machine) `updateQuests` runs to a fixed point: activate every quest whose
`requires` are done and whose `earliest` day has come, recount objectives from state, complete the ones
that are satisfied (rewards apply immediately, a completion scene queues), and repeat until nothing
changes. Counting from state (e.g. `shippedTotal[item]` minus a snapshot taken at activation, `mineDeepest`,
`seenScenes`) means progress can never be lost or double-counted, and a save made mid-quest needs nothing
special. Deliveries are the one stored counter, because handing items over is an event.

The walk test (`tests/story.test.ts`) drives a scripted player who only does the obvious thing for each
active objective and asserts that the finale scene plays, for both an attentive and a festival-skipping
player.

## 11. Festivals

One per season. On festival day the town is decorated and the festival runs 10:00–16:00 (Lantern Night runs
17:00–23:00, because lanterns need the dark). Entering the town in that window starts it. Leaving ends it,
and the clock jumps to 22:00 if it is earlier. Villagers walk to their festival spots an hour before the start.
Timed activities (pod hunt, derby) last `FESTIVAL_ACTIVITY_MINUTES` from when you arrive; prizes are paid when
you leave.

| season | day | festival | activity |
|---|---|---|---|
| spring | 13 | Blossom Fair | seed-pod hunt: collect pods hidden around the square in 3 in-game hours |
| summer | 12 | Glowfin Derby | fishing contest at the town river: most fish in 3 in-game hours |
| autumn | 11 | Harvest Weigh-in | exhibit one item, scored by value × quality |
| winter | 13 | Lantern Night | social: give a gift to your secret friend; the Y2 finale |

## 12. Mining, foraging, fishing, animals (shallow by design)

- **Forest:** forage spawns each morning on marked spawn tiles (`FORAGE_PER_DAY`, season tables). Trees regrow
  from stumps after `TREE_REGROW_DAYS`.
- **Mine:** 10 floors. A floor is generated from `(seed, floor, day)`: rocks, ore by depth, and a ladder under
  one rock (or revealed after `LADDER_ROCK_LIMIT` rocks). **Dust bunnies** are the light monster mechanic:
  they drift toward you, and touching one costs `BUNNY_ENERGY` energy and bounces you back. Any tool swing
  poofs them into coal. They never chase you off a floor. Reaching floors 5 and 10 unlocks the lift.
- **Fishing:** cast at water. After a deterministic bite delay the catch mini-game starts: a fish marker moves
  along a vertical bar (behaviour per fish), and you hold a button to raise your catch zone. The catch meter
  fills while the zone overlaps the fish and drains otherwise. Full means caught, empty means it got away (no
  penalty beyond the cast energy). It runs in the sim tick with a `hold` input, so it is deterministic.
- **Animals:** a Coop (chickens) and a Barn (cows) are built from the Joinery on fixed farm plots. Each animal
  needs feeding (hay in the building's feeder, refilled from your inventory; on sunny days outside winter they
  graze instead) and likes being petted. A fed animal produces overnight (eggs daily, milk daily). Friendship
  from petting raises product quality. Products wait in the building's box until collected.

## 13. Efficiency report and stretch goals

The end-of-day report shows coins earned (shipping, chute, other), crops harvested by hand and by machine,
items spoiled, per-machine throughput and status split, power supply and demand, and a **score**:
`coins + PROCESSED_SCORE × crafted − SPOIL_SCORE × spoiled`, plus uptime (the share of powered machine
minutes spent working). There is no fail state.

Stretch goals (`src/data/goals.ts`) are optional and never block the story. Each season has one or two (e.g.
"earn 800 coins in one day with at most 15 machines"). Rewards are cosmetics (`state.rewards` flags read by
meshes) and rare recipes.

## 14. Flow overlay (`F`)

Dims the scenery and draws, flat on the ground: belt throughput as a heatmap (items moved today), blocked
belts in red, machine status rings (green working, amber idle, red blocked, grey unpowered), power coverage,
and sprinkler, harvester, planter and heater ranges. Optimisation decisions must always be possible
regardless of the 3D art.

## 15. Determinism and state

- `src/sim/` is pure: no DOM, no Three.js, no `Math.random`, no `Date.now`, no `performance`. Randomness comes
  from a mulberry32 RNG whose state is `GameState.rng`. Derived values that must not consume RNG (dialogue
  choice, NPC paths, mine layout) use `hash32` of stable inputs.
- `GameState` is plain JSON. Derived data (power, heat, coverage, collision grids, paths) lives in
  `DayContext` or pure memo caches keyed by stable inputs, and is never saved.
- Player input arrives as `Command`s. The game layer queues commands, and `step(state, ctx, commands)`
  applies them at the start of a tick. Same state + same command log = same result, which
  `tests/determinism.test.ts` checks.
- Save = `JSON.stringify(state)` plus `version`, in localStorage (autosave each morning) and as an
  exportable/importable file. `migrate()` upgrades old versions.

## 16. Rendering

- Three.js, one `WebGLRenderer`. Camera: perspective, FOV 30°, pitch about 52°, follows the player, and
  rotates in 90° steps (`[` and `]`) with easing. Wheel zooms. Warm hemisphere and sun light, PCF soft
  shadows from the sun only (one shadow map that follows the camera).
- **All meshes are procedural** (`src/render/meshes/`): one builder function per crop stage, machine, building,
  tree, character part and item. Builders return geometry and material keys so repeated things can be
  **instanced** (terrain tiles, soil, crops, trees, rocks, belt items).
- Day/night: light colour and intensity follow a keyframed curve over the day, lanterns and windows glow at
  night, and the sky colour follows the same curve.
- Seasons recolour grass, foliage and ground. Winter adds snow caps. Particles: petals (spring), fireflies
  (summer nights), leaves (autumn), snow (winter), rain and storm streaks.
- **Quality setting** (low, medium, high): shadow map size or off, pixel ratio, particle counts, and
  decoration density. It is a pure render setting.
- Render state that is not game state (particles, camera, animal wander, interpolation buffers) lives in
  `src/render/` only.

## 17. Extension points (not built)

Gamepad (implement `InputSource`), more maps (add a `MapDef` and a warp), building interiors (a map per
building, with the door warp replacing the panel), belt tiers (add a machine def), splitter filters, and more
festivals or heart events (data).

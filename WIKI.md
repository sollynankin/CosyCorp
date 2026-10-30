# Cosycorp Wiki

A player's reference for everything in Cosycorp: numbers, schedules, recipes, gifts and the story. It is
**generated from the game's own data tables** by `npm run wiki`, so it matches the game exactly. Do not edit
it by hand; change the data and regenerate.

For design reasoning read `DESIGN.md`. For a quick "what do I do next?" in the game, open the **Journal** (J) and
look at the **What next?** tab.

**Contents:** [Getting started](#getting-started) · [Controls](#controls) · [Time and weather](#time-and-weather) ·
[Player](#player) · [Farming](#farming) · [Foraging](#foraging) · [Mining](#mining) · [Fishing](#fishing) ·
[Animals](#animals) · [Items](#items) · [Recipes](#recipes) · [The Works](#the-works) · [Shops](#shops) ·
[Villagers](#villagers) · [Romance](#romance) · [Festivals](#festivals) · [Story](#story) · [Quest board](#quest-board) ·
[Stretch goals](#stretch-goals) · [Places](#places)

## Getting started

You inherit Penhallow Yard with 300g, six tools and 15 radish seeds. The first story quest is **First Harvest**:

1. Hotbar 1 is the Hoe: click grass near the farmhouse to till it into soil.
2. Hotbar 7 is Radish Seeds: select them and click the tilled soil. Radishes ripen in 3 days.
3. Hotbar 2 is the Watering Can: water the soil every day (it refills when you use it on any water, like the stream on the left).
4. Sleep in the farmhouse (E at the front door) to pass the night. When a radish is ripe, press E or right-click it to harvest.
5. The Shipping Bin is the brown box by the farmhouse: press E at its front and put 5 crops in. You are paid straight away.

After that the story asks for materials and machines in order (see [Story](#story)). Always-useful habits:

- Plant seeds that match the season (the Almanac & Sundries in town sells them) and ship your harvest.
- Talk to townspeople every day: friendship (hearts) unlocks scenes and gifts.
- Press B for build mode: sprinklers, harvesters and belts do the daily chores for you.
- Check the quest board in the town square for paid weekly jobs.

**If you ever feel stuck:** the Journal's **What next?** tab lists each active quest, what is still missing and where to
get it. Nothing in the story can soft-lock: dated events finish whether or not you attend.

## Controls

| Key | Does |
|---|---|
| WASD / arrow keys | Walk (relative to the camera) |
| Left click | Use the selected item on a tile (walks there if far) |
| Right click / E | Interact: talk, open doors, harvest, pick up |
| Space | Use the selected item on the tile in front of you |
| 1–0 | Pick a hotbar slot |
| Mouse wheel | Scroll through the hotbar; the item name shows above the bar |
| Ctrl + wheel | Zoom the camera |
| [ and ] | Rotate the camera |
| I or Tab | Backpack |
| J | Journal (What next?, quests, friends, goals) |
| M | Map |
| C | Crafting |
| B | Build mode: click to place, drag to paint belts, R to rotate, right click to pick up |
| F | Flow overlay (belt heat, jams, power coverage, ranges) |
| Esc | Close the top panel, or open the menu (save, quality, volume) |

The top-right buttons open the Journal, Backpack and Map. A controller works at any time alongside the keyboard
(left stick walk, A use, B interact, X/Y change slot, shoulders rotate, Start menu); the full list is in the Esc menu.

## Time and weather

- A year has 4 seasons of 14 days (Spring, Summer, Autumn, Winter); a week has 7 days (Mon, Tue, Wed, Thu, Fri, Sat, Sun).
- A day runs 06:00 to 02:00 (1200 in-game minutes). Menus and panels pause the clock.
- At 02:00 you pass out and wake at home with 60% energy; that is the only penalty.
- Overnight: leftover goods spoil, crops grow, animals produce, the story advances and tomorrow's weather is rolled.
- Rain waters outdoor soil at dawn. Snow does not (frozen ground).
- Storms: lightning and heavy rain. A windmill makes more power in rain and storms.

Weather chances for a new day:

| Season | Sunny | Rain | Storm | Snow |
|---|---|---|---|---|
| Spring | 60% | 32% | 8% | 0% |
| Summer | 72% | 16% | 12% | 0% |
| Autumn | 58% | 32% | 10% | 0% |
| Winter | 55% | 0% | 0% | 45% |

Festival days:

- **Blossom Fair**: Spring 13
- **Glowfin Derby**: Summer 12
- **Harvest Weigh-in**: Autumn 11
- **Lantern Night**: Winter 13

Shops close on certain weekdays and at night: see [Shops](#shops).

## Player

- **Energy:** 120 maximum. Tools cost energy per swing (below); eating restores it. Reaching 0 passes you out.
- **Reach:** you can use things on tiles within about 1.75 tiles of you.
- **Backpack:** 30 slots; the first 10 are the hotbar. A farmhouse box holds overflow.

### Tools

| Tool | Energy per use | Effect by tier (basic / tier 2 / tier 3) |
|---|---|---|
| Hoe | 2 | 1 / 3 / 5 tiles in a row |
| Watering Can | 2 | 1 / 3 / 5 tiles in a row |
| Axe | 3 | 1 / 2 / 3 damage per hit |
| Pickaxe | 3 | 1 / 2 / 3 damage per hit |
| Scythe | 0 |  |
| Fishing Rod | 4 |  |

Energy cost is multiplied by 1 / 0.85 / 0.7 at tiers 1 / 2 / 3 (the scythe costs nothing). The watering can holds 20 / 40 / 70 charges by tier and refills
from any water. Upgrade tools at **The Smithy** (the old tool is replaced at once):

- Tier 2: 400g + 5 Copper Ore
- Tier 3: 1200g + 5 Iron Ore

The fishing rod's catch zone is 24% / 30% / 36% of the bar by rod tier (rod upgrades come from the Ilo side story).

### Skills

Three skills level from use: **Farming** (+4 XP per harvest), **Mining** (+1 per stone, +5 per ore) and **Fishing** (+12 per fish).
Maximum level 5. XP needed in total: Level 1: 100 XP · Level 2: 300 XP · Level 3: 650 XP · Level 4: 1150 XP · Level 5: 1800 XP.

- Farming raises the chance of silver and gold crops (gold chance 2% + 3% per level, +10% with fertiliser; silver is up to three times as likely).
- Mining gives extra drops (+8% per level).
- Fishing raises the chance of gold fish (3% + 4% per level).

### Quality

Normal, Silver (★) and Gold (★★) goods sell for ×1 / ×1.25 / ×1.5.

### Chopping, breaking and cutting

- **Trees:** 10 wood when felled; the stump gives 4 more. Trees on the farm regrow from stumps after 6 days.
- **Boulders:** 8 stone. Small stones give 1.
- **Weeds:** cut with the scythe; 60% drop fibre.
- **Twigs:** 1 wood with the axe.

## Farming

1. **Till** grass or path with the **Hoe**. Tilled soil that stays empty and untended sometimes reverts to grass (15% a night).
2. **Plant** seeds on tilled soil (select the seeds, click the soil). Crops only grow in their seasons; out of season they wither.
3. **Water** every day with the Watering Can (rain does it for you; sprinklers do it at dawn).
4. **Harvest** ripe crops with E or a right click; crops that regrow keep producing on the schedule below.
5. **Ship** crops in the shipping bin beside the farmhouse. **The bin pays instantly**, at full price.

Crops grow overnight on watered tiles. Fertiliser (made from fibre and wood, or bought at the Almanac) raises quality. In winter only
hardy crops grow, at 50% speed; a **Heater** or the **Greenhouse** (restored by the Great Wheel quest) lets other crops grow.

| Crop | Seasons | Seed | Days to grow | Regrows | Yield | Sells | Energy | Est. profit per day* |
|---|---|---|---|---|---|---|---|---|
| Radish | Spring | 10g | 3 | once | 1 | 30g | 10 | 1g |
| Carrot | Spring, Autumn | 15g | 4 | once | 1 | 40g | 12 | 2g |
| Strawberry | Spring | 50g | 6 | every 3 | 1 | 70g | 15 | 11g |
| Pea | Spring, Summer | 30g | 5 | every 2 | 2 | 22g | 6 | 14g |
| Tomato | Summer | 40g | 6 | every 3 | 1 | 50g | 12 | 8g |
| Sweetcorn | Summer, Autumn | 60g | 8 | every 4 | 1 | 85g | 15 | 8g |
| Melon | Summer | 80g | 9 | once | 1 | 230g | 40 | 11g |
| Sunpepper | Summer | 35g | 5 | every 2 | 1 | 40g | 6 | 12g |
| Wheat | Summer, Autumn | 8g | 4 | once | 1 | 18g | 0 | 1g |
| Pumpkin | Autumn | 90g | 9 | once | 1 | 300g | 0 | 15g |
| Beetroot | Autumn | 20g | 5 | once | 1 | 75g | 15 | 4g |
| Frostkale | Autumn, Winter (survives winter) | 40g | 6 | once | 1 | 95g | 20 | 4g |

*Estimate over one 14-day season from planting day 1: (harvests × yield × sell price − seed) ÷ 14, normal quality, ignoring wasted days.

### Orchard

- **Honeypear Tree**: a Honeypear Sapling (600g at the Almanac once the Seed Library story is done) takes 20 days to mature and then bears Honeypear in Autumn (sells 120g).

## Foraging

Forage spots (sparkling bushes) refill every morning: 6 per day in the forest, 3 per day in the lake. Press E on them to pick up.

| Season | What grows |
|---|---|
| Spring | Wild Leek (×2 chance), Morel |
| Summer | Blackberry, Sweet Clover (×2 chance) |
| Autumn | Hazelnut, Chanterelle, Blackberry |
| Winter | Snowberry, Winter Root (×2 chance) |

| Forage | Sells | Energy |
|---|---|---|
| Wild Leek | 25g | 10 |
| Morel | 60g | 15 |
| Blackberry | 20g | 8 |
| Sweet Clover | 30g | 0 |
| Hazelnut | 35g | 12 |
| Chanterelle | 70g | 15 |
| Snowberry | 40g | 10 |
| Winter Root | 45g | 15 |

Foraged goods spoil overnight if left in the open, so use or ship them the same day.

## Mining

The mine is reached from the south end of the **Forest** and has 10 floors. Break rocks with the **Pickaxe** (2 hits for stone, 3 for ore at the basic tier). A ladder is hidden under
one of the rocks on each floor; it also appears on its own after a dozen rocks. Floors 1, 5, 10 have a lift stop so you can return quickly.
**Dust bunnies** hop toward you from 6 tiles away and cost 4 energy per bump; hit them with the pickaxe to scare them off.

| Floor | Rocks | Ore rocks | Ore mix | Dust bunnies (approx.) | Lift |
|---|---|---|---|---|---|
| 1 | 24 | 12% | Copper Ore 67%, Coal 33% | none | yes |
| 2 | 26 | 14% | Copper Ore 67%, Coal 33% | 1.2 |  |
| 3 | 28 | 16% | Copper Ore 50%, Coal 30%, Quartz 20% | 1.8 |  |
| 4 | 30 | 18% | Copper Ore 50%, Coal 30%, Quartz 20% | 2.4 |  |
| 5 | 32 | 20% | Copper Ore 25%, Iron Ore 33%, Coal 25%, Quartz 17% | 3.0 | yes |
| 6 | 34 | 22% | Copper Ore 25%, Iron Ore 33%, Coal 25%, Quartz 17% | 3.6 |  |
| 7 | 36 | 24% | Copper Ore 25%, Iron Ore 33%, Coal 25%, Quartz 17% | 4.2 |  |
| 8 | 38 | 26% | Iron Ore 42%, Coal 25%, Quartz 17%, Amethyst 17% | 4.8 |  |
| 9 | 40 | 28% | Iron Ore 42%, Coal 25%, Quartz 17%, Amethyst 17% | 5.4 |  |
| 10 | 42 | 30% | Iron Ore 42%, Coal 25%, Quartz 17%, Amethyst 17% | 6.0 | yes |

Quartz first appears on floor 3, iron on floor 5 and amethyst on floor 8. If you pass out in the mine you wake at home.

## Fishing

Yes, there is fishing. Select the **Fishing Rod** (hotbar 6), face water and use it. Wait for the bobber to dip, then play the catch bar:
hold the mouse button (or Space, or A on a pad) to lift the bar and keep the fish inside it. The stream on the farm is "river" water; the
lake north of the town is "lake" water.

| Fish | Where | Seasons | Time | Weather | Moves | Difficulty | Sells |
|---|---|---|---|---|---|---|---|
| Perch | River (farm stream), Lake | Any season | Any | Any | calm | 20% | 40g |
| Brook Trout | River (farm stream) | Spring, Summer, Autumn | 06:00–19:00 | Any | dart | 45% | 65g |
| Carp | Lake | Any season | Any | Any | sinker | 30% | 30g |
| Pike | Lake | Summer, Autumn, Winter | Any | Any | dart | 60% | 100g |
| Catfish | River (farm stream) | Spring, Summer, Autumn | Any | rain, storm | sinker | 55% | 120g |
| Bream | Lake | Spring, Summer | Any | Any | floater | 35% | 45g |
| Eel | River (farm stream), Lake | Autumn, Winter | 19:00–02:00 | Any | dart | 65% | 85g |
| Glowfin | River (farm stream) (+lake after the Heron story) | Summer | 18:00–02:00 | Any | floater | 80% | 400g |

Fish are also the key ingredient in Fish Stew, and the Glowfin Derby festival rewards catching many.

## Animals

Build the **Coop** and then the **Barn** at Toller Joinery, then buy animals there.

- **Coop:** 1200g + 100 wood + 40 stone; holds 4 chickens (350g each); eggs daily.
- **Barn:** 3000g + 180 wood + 80 stone (needs the Coop first); holds 3 cows (900g each); milk daily.
- Animals produce after 3 days. Feed them every day (they graze outdoors outside winter, otherwise they need hay from the feeder).
- **Pet** them daily for +30 friendship. Higher friendship means better product quality: silver at 400+, gold at 800+ (of 1000).
- Eggs sell for 40g, milk for 90g. Milk becomes cheese (230g) in a Cheese Press.

## Items

Sell prices are for normal quality. "Spoils overnight" means raw goods left on belts or in machine buffers rot (processed goods never do).
The shipping bin pays the full price; a Market Chute pays 90%.

### Where to get materials

- **Wood:** Chop trees with the Axe (hotbar 3). Trees on the farm grow back from stumps, and the forest has plenty.
- **Stone:** Break stones and boulders with the Pickaxe (hotbar 4). The farm has some; the mine has many more.
- **Fibre:** Cut weeds with the Scythe (hotbar 5): some drop fibre.
- **Copper Ore:** Mine rocks inside the mine (south of the Forest) with the Pickaxe. Copper shows up on every floor.
- **Iron Ore:** Iron starts appearing from mine floor 5. Break the rocks with the Pickaxe; the lift at floors 5 and 10 saves the walk down.
- **Quartz:** Quartz turns up from mine floor 3 down. Break the rocks with the Pickaxe.

### Crops

| Item | Sells | Energy | Spoils overnight | Notes |
|---|---|---|---|---|
| Radish | 30g | 10 | yes |  |
| Carrot | 40g | 12 | yes |  |
| Strawberry | 70g | 15 | yes |  |
| Pea Pod | 22g | 6 | yes |  |
| Tomato | 50g | 12 | yes |  |
| Sweetcorn | 85g | 15 | yes |  |
| Melon | 230g | 40 | yes |  |
| Sunpepper | 40g | 6 | yes |  |
| Wheat | 18g |  | yes |  |
| Pumpkin | 300g | 0 | yes |  |
| Beetroot | 75g | 15 | yes |  |
| Frostkale | 95g | 20 | yes |  |
| Honeypear | 120g | 30 | yes |  |

### Forages

| Item | Sells | Energy | Spoils overnight | Notes |
|---|---|---|---|---|
| Wild Leek | 25g | 10 | yes |  |
| Morel | 60g | 15 | yes |  |
| Blackberry | 20g | 8 | yes |  |
| Sweet Clover | 30g |  | yes |  |
| Hazelnut | 35g | 12 | yes |  |
| Chanterelle | 70g | 15 | yes |  |
| Snowberry | 40g | 10 | yes |  |
| Winter Root | 45g | 15 | yes |  |

### Animals

| Item | Sells | Energy | Spoils overnight | Notes |
|---|---|---|---|---|
| Egg | 40g | 15 | yes |  |
| Milk | 90g | 25 | yes |  |

### Fishs

| Item | Sells | Energy | Spoils overnight | Notes |
|---|---|---|---|---|
| Perch | 40g |  | yes |  |
| Brook Trout | 65g |  | yes |  |
| Carp | 30g |  | yes |  |
| Pike | 100g |  | yes |  |
| Catfish | 120g |  | yes |  |
| Bream | 45g |  | yes |  |
| Eel | 85g |  | yes |  |
| Glowfin | 400g |  | yes |  |

### Minerals

| Item | Sells | Energy | Spoils overnight | Notes |
|---|---|---|---|---|
| Stone | 2g |  |  |  |
| Coal | 15g |  |  |  |
| Copper Ore | 10g |  |  |  |
| Iron Ore | 20g |  |  |  |
| Quartz | 30g |  |  |  |
| Amethyst | 120g |  |  |  |

### Materials

| Item | Sells | Energy | Spoils overnight | Notes |
|---|---|---|---|---|
| Wood | 2g |  |  |  |
| Fibre | 1g |  |  |  |
| Hay | 10g |  |  |  |
| Fertiliser | 5g |  |  |  |
| Jar Lantern | 60g |  |  |  |

### Products

| Item | Sells | Energy | Spoils overnight | Notes |
|---|---|---|---|---|
| Strawberry Jam | 230g |  |  |  |
| Bramble Jam | 110g |  |  |  |
| Pear Butter | 330g |  |  |  |
| Pumpkin Butter | 680g |  |  |  |
| Melon Jam | 520g |  |  |  |
| Pickled Carrots | 160g |  |  |  |
| Pickled Beets | 270g |  |  |  |
| Pepper Relish | 150g |  |  |  |
| Tomato Passata | 180g |  |  |  |
| Kale Kraut | 320g |  |  |  |
| Radish Pickles | 150g |  |  |  |
| Corn Relish | 300g |  |  |  |
| Flour | 50g |  |  |  |
| Cheese | 230g |  |  |  |
| Harvest Medley | 600g |  |  |  |

### Dishs

| Item | Sells | Energy | Spoils overnight | Notes |
|---|---|---|---|---|
| Radish Salad | 110g | 40 |  |  |
| Tomato Soup | 160g | 50 |  |  |
| Corn Chowder | 260g | 70 |  |  |
| Pumpkin Pie | 480g | 90 |  |  |
| Fish Stew | 220g | 70 |  |  |
| Pancakes | 240g | 60 |  |  |
| Berry Tart | 300g | 70 |  |  |
| Mushroom Toast | 210g | 60 |  |  |

### Seeds

| Item | Sells | Energy | Spoils overnight | Notes |
|---|---|---|---|---|
| Radish Seeds | buy 10g |  |  | Plants Radish. |
| Carrot Seeds | buy 15g |  |  | Plants Carrot. |
| Strawberry Seeds | buy 50g |  |  | Plants Strawberry. |
| Pea Seeds | buy 30g |  |  | Plants Pea Pod. |
| Tomato Seeds | buy 40g |  |  | Plants Tomato. |
| Sweetcorn Seeds | buy 60g |  |  | Plants Sweetcorn. |
| Melon Seeds | buy 80g |  |  | Plants Melon. |
| Sunpepper Seeds | buy 35g |  |  | Plants Sunpepper. |
| Wheat Seeds | buy 8g |  |  | Plants Wheat. |
| Pumpkin Seeds | buy 90g |  |  | Plants Pumpkin. |
| Beetroot Seeds | buy 20g |  |  | Plants Beetroot. |
| Frostkale Seeds | buy 40g |  |  | Plants Frostkale. |

### Saplings

| Item | Sells | Energy | Spoils overnight | Notes |
|---|---|---|---|---|
| Honeypear Sapling | buy 600g |  |  |  |

### Specials

| Item | Sells | Energy | Spoils overnight | Notes |
|---|---|---|---|---|
| Ribbon Charm | — |  |  | Give to someone you love (8 hearts) to start courting. |
| Promise Lantern | — |  |  | Give to your sweetheart at 10 hearts. |
| Hollis's Logbook | — |  |  | Water-stained. The last entry is underlined twice. |
| Seed Tin | — |  |  | A dented tin with "Rook" scratched on the lid. |
| Coop | — |  |  | Bram builds a coop for up to 4 chickens on the plot north of the field. |
| Barn | — |  |  | Bram builds a barn for up to 3 cows next to the coop. |
| Chicken | — |  |  | Lays an egg every day it is fed. Lives in the coop. |
| Cow | — |  |  | Gives milk every day it is fed. Lives in the barn. |
| Seed Pod | — |  |  | A painted pod from the Blossom Fair hunt. |

## Recipes

### Crafting (press C)

Machines and tools you build yourself. Blueprints unlock through the story.

| Result | Ingredients | Unlocked by |
|---|---|---|
| Chest | 40 × Wood | Known |
| 5 × Fertiliser | 3 × Fibre, 1 × Wood | Known |
| 2 × Jar Lantern | 1 × Copper Ore, 1 × Quartz | quest "Open Them Together" |
| Sprinkler | 2 × Copper Ore, 5 × Stone | quest "First Harvest" |
| Pump Sprinkler | 2 × Iron Ore, 2 × Copper Ore, 1 × Quartz | quest "Open Them Together" |
| 4 × Conveyor | 2 × Wood, 2 × Fibre | quest "Gears and Grease" |
| 4 × Swift Conveyor | 4 × Conveyor, 1 × Iron Ore | quest "Open Them Together" |
| Splitter | 5 × Wood, 1 × Copper Ore | quest "The Pressing Room" |
| Harvester | 15 × Wood, 4 × Copper Ore, 10 × Stone | quest "Gears and Grease" |
| Seed Planter | 15 × Wood, 3 × Copper Ore | quest "The Pressing Room" |
| Silo | 50 × Wood, 40 × Stone | quest "The Pressing Room" |
| Jam Press | 30 × Wood, 3 × Copper Ore, 2 × Coal | quest "The Pressing Room" |
| Preserver | 30 × Wood, 1 × Iron Ore, 2 × Coal | quest "The Pressing Room" |
| Mill | 40 × Stone, 20 × Wood, 2 × Iron Ore | quest "Open Them Together" |
| Cheese Press | 30 × Wood, 20 × Stone, 2 × Copper Ore | known from the start |
| Market Chute | 25 × Wood, 2 × Copper Ore | quest "Gears and Grease" |
| Water Wheel | 60 × Wood, 20 × Stone, 5 × Copper Ore | quest "Gears and Grease" |
| Windmill | 60 × Wood, 20 × Fibre, 3 × Iron Ore | quest "Open Them Together" |
| Heater | 20 × Stone, 2 × Iron Ore, 5 × Coal | quest "Open Them Together" |

### Machine recipes (jam press, preserver, mill, cheese press)

A crafter starts the first recipe whose ingredients are all in its input buffer. Processed goods never spoil.

| Product | Machine | Ingredients | Time | Sells | Available |
|---|---|---|---|---|---|
| Harvest Medley | Preserver | 2 × Carrot, 2 × Beetroot, 2 × Sunpepper | 180 min | 600g | Stretch goal reward |
| Strawberry Jam | Jam Press | 3 × Strawberry | 60 min | 230g | Always |
| Bramble Jam | Jam Press | 4 × Blackberry | 60 min | 110g | Always |
| Pear Butter | Jam Press | 2 × Honeypear | 90 min | 330g | Always |
| Pumpkin Butter | Jam Press | 2 × Pumpkin | 120 min | 680g | Always |
| Melon Jam | Jam Press | 2 × Melon | 120 min | 520g | Always |
| Pickled Carrots | Preserver | 3 × Carrot | 90 min | 160g | Always |
| Pickled Beets | Preserver | 3 × Beetroot | 90 min | 270g | Always |
| Pepper Relish | Preserver | 3 × Sunpepper | 90 min | 150g | Always |
| Tomato Passata | Preserver | 3 × Tomato | 60 min | 180g | Always |
| Kale Kraut | Preserver | 3 × Frostkale | 120 min | 320g | Always |
| Radish Pickles | Preserver | 4 × Radish | 60 min | 150g | Always |
| Corn Relish | Preserver | 3 × Sweetcorn | 90 min | 300g | Always |
| Flour | Mill | 2 × Wheat | 15 min | 50g | Always |
| Cheese | Cheese Press | 1 × Milk | 120 min | 230g | Always |

### Cooking (the farmhouse kitchen)

| Dish | Ingredients | Sells | Energy | How to learn |
|---|---|---|---|---|
| Radish Salad | 2 × Radish, 1 × Wild Leek | 110g | 40 | Known |
| Tomato Soup | 2 × Tomato | 160g | 50 | buy at The Kettle Inn |
| Corn Chowder | 1 × Sweetcorn, 1 × Milk | 260g | 70 | buy at The Kettle Inn |
| Pumpkin Pie | 1 × Pumpkin, 1 × Flour, 1 × Egg | 480g | 90 | stretch goal "Run 6 or more powered machines at 80% uptime for a whole day" |
| Fish Stew | 2 × any fish, 1 × Carrot | 220g | 70 | stretch goal "Earn 900g in one day with at most 15 machines placed" |
| Pancakes | 1 × Flour, 1 × Egg, 1 × Milk | 240g | 60 | buy at The Kettle Inn |
| Berry Tart | 2 × Strawberry, 1 × Flour | 300g | 70 | Pell's heart event "The Recipe Box" |
| Mushroom Toast | 1 × any mushroom, 1 × Flour | 210g | 60 | quest "The Seed Library" |

## The Works

The Works is the farm's automation: machines you place in **Build mode (B)** that water, plant, harvest, move and process crops while you do other things.
Press **F** for the Flow overlay: belt heat, jams, machine status rings, ranges and power coverage. The end-of-day report names the biggest bottleneck.

**Power.** Generators supply power to machines within their range; a machine that draws power only works while the supply covers the draw. Water Wheels must touch the stream
(supply ×1 at the start, ×0.5 while silted after the Thaw Flood, ×2 once the Sluice is open). Windmills scale with weather
(sunny ×1, rain ×1.25, storm ×1.75, snow ×1).

**Belts.** Belts carry one item per entry interval, take a set time per tile, and have limited capacity. A full belt backs up behind it. The belt model is
snapshot-based; the rules are in DESIGN.md §5. Splitters share items between outputs.

| Machine | Kind | What it does | Stats | Craft cost | Blueprint from |
|---|---|---|---|---|---|
| Sprinkler | sprinkler | Waters the 3×3 around it every dawn. | range 1 | 2 × Copper Ore, 5 × Stone | quest "First Harvest" |
| Pump Sprinkler | sprinkler | Waters the 5×5 around it every dawn, if powered. | range 2, draws 2 power | 2 × Iron Ore, 2 × Copper Ore, 1 × Quartz | quest "Open Them Together" |
| Seed Planter | planter | Plants seeds from its hopper on free soil within 2 tiles. | range 2, draws 2 power, 3 min per job, capacity 60 | 15 × Wood, 3 × Copper Ore | quest "The Pressing Room" |
| Harvester | harvester | Picks ripe crops within 2 tiles and outputs them to its front. | range 2, draws 3 power, 4 min per job, output buffer 6 | 15 × Wood, 4 × Copper Ore, 10 × Stone | quest "Gears and Grease" |
| Conveyor | belt | Carries items forward. One item every 3 minutes. | capacity 3, 6 min per tile, one item every 3 min | 2 × Wood, 2 × Fibre | quest "Gears and Grease" |
| Swift Conveyor | belt | Carries items forward. One item every minute. | capacity 3, 2 min per tile, one item every 1 min | 4 × Conveyor, 1 × Iron Ore | quest "Open Them Together" |
| Splitter | splitter | Sends items front, right, left in turn. | capacity 2, 2 min per tile, one item every 1 min | 5 × Wood, 1 × Copper Ore | quest "The Pressing Room" |
| Jam Press | crafter | Presses fruit into jam and butter. | draws 4 power, buffer 12 per input, output buffer 4 | 30 × Wood, 3 × Copper Ore, 2 × Coal | quest "The Pressing Room" |
| Preserver | crafter | Pickles vegetables. Preserves never spoil. | draws 4 power, buffer 12 per input, output buffer 4 | 30 × Wood, 1 × Iron Ore, 2 × Coal | quest "The Pressing Room" |
| Mill | crafter | Grinds wheat into flour. | draws 3 power, buffer 12 per input, output buffer 6 | 40 × Stone, 20 × Wood, 2 × Iron Ore | quest "Open Them Together" |
| Cheese Press | crafter | Turns milk into cheese. | draws 3 power, buffer 8 per input, output buffer 4 | 30 × Wood, 20 × Stone, 2 × Copper Ore | known from the start |
| Silo | storage | Stores 240 items. Nothing spoils inside. Outputs to its front. | capacity 240 | 50 × Wood, 40 × Stone | quest "The Pressing Room" |
| Market Chute | seller | Sells anything fed into it, at 90% of the shipping price. |  | 25 × Wood, 2 × Copper Ore | quest "Gears and Grease" |
| Water Wheel | generator | Powers machines within 5 tiles. Must touch the stream. | range 5, supplies 12 power | 60 × Wood, 20 × Stone, 5 × Copper Ore | quest "Gears and Grease" |
| Windmill | generator | Powers machines within 4 tiles. Stronger in wind. | range 4, supplies 8 power | 60 × Wood, 20 × Fibre, 3 × Iron Ore | quest "Open Them Together" |
| Heater | heater | Keeps soil within 2 tiles warm in winter, if powered. | range 2, draws 4 power | 20 × Stone, 2 × Iron Ore, 5 × Coal | quest "Open Them Together" |
| Chest | chest | A box for 12 stacks. | capacity 12 | 40 × Wood | quest "Gears and Grease" |

Ideas: sprinklers on a grid to stop hand watering; a planter and a harvester sharing a belt; a silo to buffer a glut; a Market Chute at the end of the line to convert surplus into coins.

## Shops

All shops are in the town, east of the farm. Chat with the keeper at the counter for friendship points.

### Almanac & Sundries

Wren is at the counter. Open 09:00–18:00. Closed: Wed.

| Item | Price | Notes |
|---|---|---|
| Radish Seeds | 10g | Spring |
| Carrot Seeds | 15g | Spring/Autumn |
| Strawberry Seeds | 50g | Spring |
| Pea Seeds | 30g | Spring/Summer |
| Tomato Seeds | 40g | Summer |
| Sweetcorn Seeds | 60g | Summer/Autumn |
| Melon Seeds | 80g | Summer |
| Sunpepper Seeds | 35g | Summer |
| Wheat Seeds | 8g | Summer/Autumn |
| Pumpkin Seeds | 90g | Autumn |
| Beetroot Seeds | 20g | Autumn |
| Frostkale Seeds | 40g | Autumn |
| Frostkale Seeds | 40g | Winter |
| Fertiliser | 15g |  |
| Hay | 25g |  |
| Honeypear Sapling | 600g | after: seed library |

### The Smithy

Teo is at the counter. Open 09:00–16:00. Closed: Sun.

| Item | Price | Notes |
|---|---|---|
| Stone | 5g |  |
| Coal | 38g |  |
| Copper Ore | 25g |  |
| Iron Ore | 50g |  |

### Toller Joinery

Bram is at the counter. Open 09:00–17:00. Closed: Tue.

| Item | Price | Notes |
|---|---|---|
| Wood | 5g |  |
| Chest | 150g |  |
| Hay | 25g |  |
| Build coop | 1200g | + 100 Wood, 40 Stone |
| Build barn | 3000g | after: built coop; + 180 Wood, 80 Stone |
| Chicken | 350g | after: built coop |
| Cow | 900g | after: built barn |

### The Kettle Inn

Pell is at the counter. Open 12:00–00:00. Closed: never.

| Item | Price | Notes |
|---|---|---|
| Radish Salad | 140g |  |
| Tomato Soup | 200g | Summer/Autumn |
| Pancakes | 260g |  |
| Recipe: Tomato Soup | 300g |  |
| Recipe: Pancakes | 400g |  |
| Recipe: Corn Chowder | 500g |  |
| Ribbon Charm | 500g | after: eight hearts romance |
| Promise Lantern | 2000g | after: courting |

The **Quest Board** in the town square posts weekly paid jobs; the **Works Hall** is where story deliveries are handed over (it is not a shop).

## Villagers

Eight villagers live around Hearthvale. Friendship is measured in hearts (10 maximum, 250 points each).

- **Talk** once a day: +20 points.
- **Gifts** (select an item and use it on them): loved +80, liked +45, neutral +20, disliked -20.
  Maximum 2 gifts per week each; **birthday gifts count ×5**. Gift preferences are fixed (below); an item with the tag "any fish" counts for every fish.
- **Heart events** are short scenes that play by themselves when you enter a place at the right time with enough hearts.
- Schedules change with weather, weekday and story state; the table below lists the usual day, with coordinates in tiles (x, y).

### Odile Brask

Widow of the last Sluice Keeper. Lives in the Sluice House in Brackenwood.
**Birthday:** Autumn 9 · **Romanceable:** no

| | Gifts |
|---|---|
| Loves | Honeypear, Pear Butter, Kale Kraut |
| Likes | Hazelnut, Wild Leek, Tomato Soup, any fish |
| Dislikes | Coal, Quartz, Jar Lantern |

**Usual day:** 06:00 Forest (34, 9) indoors → 08:30 Forest (37, 11) → 11:00 Town (23, 23) → 14:00 Town (25, 18) → 17:00 Forest (34, 9) indoors

Other days:
- *rain/storm/snow:* 06:00 Forest (34, 9) indoors → 13:00 Forest (34, 10) → 14:30 Forest (34, 9) indoors

Heart events:
- **The Teaspoon**: 2+ hearts, on forest, 09:00–16:00
- **Roses at Dusk**: sunny, 5+ hearts, on forest, 17:00–21:00

### Maudie Fenn

Keeps the Town Hall, the quest board and the festival calendar.
**Birthday:** Spring 9 · **Romanceable:** no

| | Gifts |
|---|---|
| Loves | Pancakes, Berry Tart, Strawberry Jam |
| Likes | Sweet Clover, Cheese, Egg, Honeypear |
| Dislikes | Catfish, Eel, Coal |

**Usual day:** 06:00 Town (23, 8) indoors → 08:00 Town (27, 11) → 09:30 Town (23, 8) indoors → 13:00 Town (20, 14) → 14:00 Town (23, 8) indoors → 18:30 Town (36, 19) indoors → 21:00 Town (23, 8) indoors

Other days:
- *Sun:* 06:00 Town (23, 8) indoors → 10:00 Town (21, 12) → 12:00 Town (36, 19) indoors → 15:00 Town (27, 19) → 18:00 Town (23, 8) indoors

Heart events:
- **Four Pages**: sunny, 2+ hearts, on town, 09:00–17:00
- **The Birthday Book**: 5+ hearts, on town, 18:00–22:00

### Wren Halloway

Runs Almanac & Sundries. Draws every plant she sells.
**Birthday:** Summer 6 · **Romanceable:** yes

| | Gifts |
|---|---|
| Loves | Morel, Chanterelle, Melon, Honeypear |
| Likes | Sweet Clover, Strawberry, Pumpkin Pie, any mushroom |
| Dislikes | Pickled Beets, Stone, Iron Ore |

**Usual day:** 06:00 Town (9, 12) indoors → 08:00 Town (9, 13) → 08:40 Town (9, 12) indoors → 18:10 Town (21, 18) → 19:30 Town (36, 19) indoors → 22:00 Town (9, 12) indoors

Other days:
- *married to you:* 06:00 Town (9, 12) indoors → 06:10 Farm (12, 8) → 09:30 Town (9, 12) indoors → 18:10 Town (21, 18) → 19:30 Town (9, 12) indoors
- *Wed:* 06:00 Town (9, 12) indoors → 10:00 Forest (14, 12) → 13:00 Forest (27, 14) → 16:00 Town (9, 12) indoors
- *rain/storm/snow:* 06:00 Town (9, 12) indoors → 18:10 Town (36, 19) indoors → 21:00 Town (9, 12) indoors

Heart events:
- **The Sketchbook**: 2+ hearts, on town, 08:00–17:00
- **Drawing the Wheel**: 5+ hearts, after: yard_wheel, on farm, 09:00–16:00
- **Lamplight**: 8+ hearts, on town, 19:00–23:30

### Teo Marsh

The smith. Talks to engines more easily than to people.
**Birthday:** Winter 4 · **Romanceable:** yes

| | Gifts |
|---|---|
| Loves | Corn Chowder, Quartz, Amethyst, Fish Stew |
| Likes | Copper Ore, Iron Ore, Pancakes, Sweetcorn |
| Dislikes | Sweet Clover, Strawberry Jam, Fibre |

**Usual day:** 06:00 Town (8, 19) indoors → 07:30 Town (7, 18) → 08:20 Town (8, 19) indoors → 16:20 Town (43, 18) → 18:30 Town (36, 19) indoors → 21:30 Town (8, 19) indoors

Other days:
- *married to you:* 06:00 Town (8, 19) indoors → 06:10 Farm (13, 8) → 09:30 Town (8, 19) indoors → 18:30 Town (36, 19) indoors → 21:30 Town (8, 19) indoors
- *Sat:* 06:00 Town (8, 19) indoors → 09:00 Lake (20, 17) → 13:00 Lake (26, 20) → 16:00 Town (8, 19) indoors

Heart events:
- **Practice**: 2+ hearts, on town, 08:00–16:00
- **River Noise**: 5+ hearts, on town, 18:00–23:00
- **A Good Bearing**: 8+ hearts, after: yard_wheel, on farm, 07:00–12:00

### Pell Aster

Keeps the Kettle Inn. Hears everything, repeats most of it.
**Birthday:** Summer 11 · **Romanceable:** no

| | Gifts |
|---|---|
| Loves | Cheese, Harvest Medley, Pumpkin |
| Likes | any fish, Tomato, Egg, Milk |
| Dislikes | Radish, Fibre, Stone |

**Usual day:** 06:00 Town (36, 19) indoors → 09:00 Town (26, 16) → 10:30 Town (36, 19) indoors

Heart events:
- **Taste Test**: 2+ hearts, on town, 12:00–20:00
- **The Recipe Box**: 5+ hearts, on town, 20:00–23:59

### Bram Toller

Joiner. Built half the town and Ros's farmhouse door.
**Birthday:** Autumn 3 · **Romanceable:** no

| | Gifts |
|---|---|
| Loves | Hazelnut, Bramble Jam, Pickled Carrots |
| Likes | Blackberry, Corn Relish, Beetroot, Cheese |
| Dislikes | Snowberry, Melon Jam, Quartz |

**Usual day:** 06:00 Town (37, 12) indoors → 07:00 Town (38, 14) → 08:30 Town (37, 12) indoors → 12:00 Town (29, 20) → 13:00 Town (37, 12) indoors → 17:30 Town (36, 19) indoors → 20:00 Town (37, 12) indoors

Other days:
- *rain/storm/snow:* 06:00 Town (37, 12) indoors → 17:30 Town (36, 19) indoors → 20:00 Town (37, 12) indoors

Heart events:
- **The Sticky Door**: 2+ hearts, on farm, 07:00–11:00
- **Two Initials**: sunny, 5+ hearts, on town, 12:00–18:00

### Ilo Quill

Fishes Stillmere every day. Lives in the hut on the east shore.
**Birthday:** Spring 5 · **Romanceable:** no

| | Gifts |
|---|---|
| Loves | Glowfin, Pike, Berry Tart, Blackberry |
| Likes | any fish, Snowberry, Pancakes, Hazelnut |
| Dislikes | Kale Kraut, Frostkale, Beetroot |

**Usual day:** 06:00 Lake (32, 21) indoors → 06:30 Lake (20, 18) → 12:00 Lake (24, 19) → 13:00 Lake (20, 16) → 18:00 Town (43, 17) → 20:00 Lake (32, 21) indoors

Other days:
- *storm/snow:* 06:00 Lake (32, 21) indoors → 11:00 Town (36, 19) indoors → 15:00 Lake (32, 21) indoors

Heart events:
- **The Heron**: 2+ hearts, before: heron_wreck, on lake, 07:00–18:00
- **First Sail**: 5+ hearts, after: heron_mended, before: heron_sailed, on lake, 08:00–18:00

### Saffi Rook

Forager and seed-saver. Her cottage is in the heart of Brackenwood.
**Birthday:** Winter 10 · **Romanceable:** no

| | Gifts |
|---|---|
| Loves | Sweet Clover, Snowberry, Winter Root, Wild Leek |
| Likes | any mushroom, Mushroom Toast, Honeypear, Hazelnut |
| Dislikes | Coal, Catfish, Flour |

**Usual day:** 06:00 Forest (8, 10) indoors → 07:30 Forest (5, 14) → 10:00 Forest (25, 21) → 14:00 Forest (8, 11) → 16:00 Forest (8, 10) indoors

Other days:
- *rain:* 06:00 Forest (8, 10) indoors → 07:00 Forest (15, 20) → 11:00 Forest (31, 23) → 15:00 Forest (8, 10) indoors
- *Thu:* 06:00 Forest (8, 10) indoors → 09:00 Town (11, 14) → 11:00 Town (9, 12) indoors → 13:00 Forest (8, 10) indoors

Heart events:
- **The Key-Tag**: 2+ hearts, before: seed_library_key, on forest, 08:00–17:00
- **Under the Beeches**: 4+ hearts, on forest, 09:00–15:00

## Romance

Romanceable villagers: **Wren Halloway and Teo Marsh**.

1. Reach 8 hearts to be offered a **Ribbon Charm** at The Kettle Inn (500g, listed in the Inn's stock once you qualify).
2. Giving the charm starts courting. While courting, friendship is capped at 8 hearts until you propose.
3. Buy the **Promise Lantern** (2000g at the Inn) and give it to propose.
4. The ceremony follows 3 days later. After marriage your spouse visits the farm in the mornings.

Marriage stops at the ceremony and morning visits; there are no children or household chores.

## Festivals

One festival per season, held in the town square. Villagers gather an hour before the start. Leaving a festival skips the clock to 22:00 if it is earlier.

| Festival | Date | Hours | What happens |
|---|---|---|---|
| Blossom Fair | Spring 13 | 10:00–16:00 | Seed-pod hunt! Find the pods hidden around the square within three hours. Press E on a pod to pick it up. |
| Glowfin Derby | Summer 12 | 10:00–16:00 | Catch as many fish as you can from the town river in three hours. |
| Harvest Weigh-in | Autumn 11 | 10:00–16:00 | Exhibit your proudest produce. Judged on value and quality. Press E at the judging table (the fountain). |
| Lantern Night | Winter 13 | 17:00–23:00 | Lanterns along Kettle Street. Give a gift to your secret friend tonight for a warm surprise. |

- **Blossom Fair:** 12 seed pods are hidden around the plaza; 40g each.
- **Glowfin Derby:** 60g per fish caught within the three hours.
- **Harvest Weigh-in:** exhibit your best produce against three rivals; prizes 1200g / 600g / 250g for 1st / 2nd / 3rd.
- **Lantern Night:** a secret friend is picked for you; a gift to them gives +120 friendship. This is the finale of the main story.

Festival dates are fixed story beats: the main story completes even if you miss them.

## Story

The main story has 10 quests in order, plus two optional side arcs ("The Heron" with Ilo and "The Seed Library" with Saffi).
Every objective can be done in any season. Dated beats complete whether or not you attend, so the story can never lock.
Starts: Spring 1, Year 1. Great Wheel quest begins Spring 4, Year 2 (the Thaw Flood). The finale is Winter 13, Year 2.

### A Key and a Kettle

Settle in at Penhallow Yard.

- **Starts after:** the beginning
- **Do:** Watch the scene
- **Reward:** A scene and story progress

### First Harvest

Grow something and ship 5 crops from the bin by the farmhouse.

- **Starts after:** A Key and a Kettle
- **Do:** Ship 5 crops
- **Reward:** 1 × Sprinkler; blueprints: Sprinkler

**How:**
1. Hotbar 1 is the Hoe: click grass near the farmhouse to till it into soil.
2. Hotbar 7 is Radish Seeds: select them and click the tilled soil. Radishes ripen in 3 days.
3. Hotbar 2 is the Watering Can: water the soil every day (it refills when you use it on any water, like the stream on the left).
4. Sleep in the farmhouse (E at the front door) to pass the night. When a radish is ripe, press E or right-click it to harvest.
5. The Shipping Bin is the brown box by the farmhouse: press E at its front and put 5 crops in. You are paid straight away.

### Gears and Grease

Bring Odile the parts to restore the yard's Guild water-wheel. Deliver at the Works Hall.

- **Starts after:** First Harvest
- **Do:** Hand over 40 Wood to the Works Hall; Hand over 25 Stone to the Works Hall; Hand over 5 Copper Ore to the Works Hall
- **Reward:** 1 × Water Wheel; 8 × Conveyor; blueprints: Water Wheel, Conveyor, Harvester, Market Chute, Chest; +100 friendship with Odile

**How:**
1. Odile runs the Works Hall, the big building at the bottom of the town (east of the farm, through the gate on the right edge).
2. Collect 40 wood, 25 stone and 5 copper ore (see below for where) and keep them in your backpack.
3. Stand at the Works Hall door, press E, and use "Hand over" on the quest.

### The Blossom Fair

Hearthvale's spring fair is on Spring 13 in the town square, 10:00 to 16:00.

- **Starts after:** A Key and a Kettle
- **Do:** Blossom Fair (Spring 13)
- **Reward:** +50 friendship with Maudie

**How:**
1. This one needs no gathering: be in the town square on Spring 13 between 10:00 and 16:00.
2. Even if you miss it, the story carries on. But the fair is fun: take part in the seed-pod hunt.

### The Pressing Room

Get the yard's power running and bring 20 crops of any kind to the Works Hall to test the old presses.

- **Starts after:** Gears and Grease, The Blossom Fair
- **Do:** Keep 6 power running on the farm; Hand over 20 any crop to the Works Hall
- **Reward:** blueprints: Jam Press, Preserver, Silo, Splitter, Seed Planter; +100 friendship with Teo, +50 friendship with Odile

**How:**
1. Open Build mode (B) and place the Water Wheel on the stream at the left edge of the farm. It must touch the water. That gives the farm power.
2. Bring any 20 crops (radishes are fine) to the Works Hall and hand them over.
3. Machines near the Water Wheel (within 5 tiles) get power. Press F to see power coverage.

### Down the Under-Sluice

The old sluice tunnels run into the mine. Something of Hollis's is said to be on the fifth floor.

- **Starts after:** The Pressing Room; not before Summer 1, Year 1
- **Do:** Reach mine floor 5; Find the Hollis's Logbook
- **Reward:** A scene and story progress

**How:**
1. Go south from the farm into the Forest, then through the cave mouth at the bottom into the mine.
2. Each floor has a hidden ladder under a rock: break rocks with the Pickaxe to find it. Reach floor 5.
3. On floor 5, look for the leather logbook on a ledge and pick it up (E). Bring food and rest if your energy runs low: you wake up at home if you pass out.
4. This quest starts on Summer 1 at the earliest.

### Open Them Together

Talk to Odile, and bring metal for the gate mechanism to the Works Hall.

- **Starts after:** Down the Under-Sluice
- **Do:** Reach 2 hearts with Odile; Hand over 10 Copper Ore to the Works Hall; Hand over 5 Iron Ore to the Works Hall
- **Reward:** blueprints: Mill, Swift Conveyor, Windmill, Heater, Pump Sprinkler, Jar Lantern; +200 friendship with Odile

**How:**
1. Talk to Odile in the town (the Works Hall) most days, and give her gifts she likes, to reach 2 hearts.
2. Hand 10 copper ore and 5 iron ore over at the Works Hall (iron comes from mine floor 5 and below).

### Rebuild the Great Wheel

The Thaw Flood snapped the Great Wheel's axle and silted your wheel. Bring Bram timber, stone and iron.

- **Starts after:** Open Them Together; not before Spring 4, Year 2
- **Do:** Hand over 80 Wood to the Works Hall; Hand over 40 Stone to the Works Hall; Hand over 10 Iron Ore to the Works Hall
- **Reward:** +150 friendship with Bram

**How:**
1. After the Thaw Flood storm (early Spring, Year 2) your wheel is silted. Bram wants timber, stone and iron.
2. Hand 80 wood, 40 stone and 10 iron ore over at the Works Hall.

### The Lantern Line

Craft 20 lanterns for Kettle Street and keep at least 30 power running on the farm.

- **Starts after:** Rebuild the Great Wheel
- **Do:** Hand over 20 Jar Lantern to the Works Hall; Keep 30 power running on the farm
- **Reward:** +100 friendship with Maudie

**How:**
1. Press C to open crafting and make Lanterns (1 copper ore + 1 quartz each). You need 20.
2. Also keep at least 30 power running on the farm: more Water Wheels and Windmills (build mode, B).
3. Hand the lanterns over at the Works Hall.

### Lantern Night

Light the lanterns on Lantern Night, Winter 13.

- **Starts after:** The Lantern Line; not before Winter 1, Year 2
- **Do:** Lantern Night (Winter 13)
- **Reward:** A scene and story progress

**How:**
1. Be in the town on Winter 13 of Year 2 for Lantern Night. Nothing to gather.

### The Heron (side story)

Help Ilo raise and patch Gran Marit's boat. Ilo needs wood and fibre.

- **Starts after:** event: heron wreck
- **Do:** Hand over 40 Wood to Ilo; Hand over 20 Fibre to Ilo
- **Reward:** +100 friendship with Ilo

**How:**
1. Ilo lives at the lake (north of town). Becoming friends with Ilo (2 hearts) sets this off: talk to them and give gifts.
2. Then bring 40 wood and 20 fibre to Ilo.

### First Sail (side story)

Become good friends with Ilo (5 hearts) and visit the lake.

- **Starts after:** The Heron
- **Do:** Sail the Heron with Ilo (5 hearts, then visit the lake)
- **Reward:** rod upgraded to tier 1

**How:**
1. Reach 5 hearts with Ilo, then visit the lake and talk to them.

### Where the Quartz Grows (side story)

Find Saffi's mother's Seed Tin on the third floor of the mine.

- **Starts after:** event: seed library key
- **Do:** Reach mine floor 3; Find the Seed Tin
- **Reward:** A scene and story progress

**How:**
1. Saffi lives in the forest. Become friends with Saffi (2 hearts) to hear about her mother's Seed Tin.
2. Then reach floor 3 of the mine and pick up the tin.

### The Seed Library (side story)

Bring Saffi the tin and five different kinds of forage to restock the library.

- **Starts after:** Where the Quartz Grows
- **Do:** Hand over 1 Seed Tin to Saffi; Hand Saffi 5 different kinds of forage
- **Reward:** 2 × Honeypear Sapling; recipes: Mushroom Toast (recipe); +150 friendship with Saffi

## Quest board

The board in the town square posts 3 jobs per week (they run until Sunday). Each asks for a number of an item and pays
**2× the item's sell price** (at least 60g) plus 60 friendship with the requester. Hand the goods over at the board.

## Stretch goals

Optional challenges for people who enjoy optimising the Works. They never block the story. Rewards are cosmetics and rare recipes. Check progress in the Journal.

| Season | Challenge | Reward |
|---|---|---|
| Spring | Sell 400g through Market Chutes in one day | Brass-bright conveyor rails |
| Spring | Machines harvest 30 crops in one day with nothing spoiled | Recipe: Harvest Medley (Preserver) |
| Summer | Earn 900g in one day with at most 15 machines placed | Bunting over Penhallow Yard |
| Autumn | Run 6 or more powered machines at 80% uptime for a whole day | Lanterns along the farm path |
| Winter | Machines craft 40 goods this winter | A brass heron weathervane on the farmhouse |

## Places

The world: the **farm** (Penhallow Yard) is the hub. The **town** is east of it, the **forest** south, with the **mine** below the forest, and the **lake** north of the town.
Open the Map (M) to see each area with your position.

### Penhallow Yard

Size 44×34 tiles. Leads to: Town, Forest. Fishing: river.

| Building | Top-left tile | Size | Notes |
|---|---|---|---|
| Farmhouse | (7, 2) | 6×5 |  |
| Shipping Bin | (14, 6) | 2×1 |  |
| Coop | (28, 3) | 5×4 | built later (built coop) |
| Barn | (35, 2) | 7×5 | built later (built barn) |

### Hearthvale

Size 48×34 tiles. Leads to: Farm, Lake. Fishing: river.

| Building | Top-left tile | Size | Notes |
|---|---|---|---|
| Town Hall | (20, 3) | 8×6 |  |
| Almanac & Sundries | (6, 8) | 7×5 |  |
| The Smithy | (6, 19) | 6×5 |  |
| Toller Joinery | (34, 8) | 7×5 |  |
| The Kettle Inn | (33, 19) | 9×6 |  |
| Works Hall | (20, 24) | 8×6 |  |

### Brackenwood

Size 44×34 tiles. Leads to: Farm, the Mine. Fishing: river.

| Building | Top-left tile | Size | Notes |
|---|---|---|---|
| Saffi's Cottage | (6, 6) | 6×5 |  |
| Sluice House | (32, 5) | 6×5 |  |

### Stillmere

Size 40×28 tiles. Leads to: Town. Fishing: lake.

| Building | Top-left tile | Size | Notes |
|---|---|---|---|
| Ilo's Hut | (30, 18) | 5×4 |  |

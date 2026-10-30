// Builds WIKI.md, the player-facing reference, straight from the content tables and balance numbers, so it
// can never drift from the game. `npm run wiki` writes it; tests/wiki.test.ts fails when WIKI.md is stale.
// Pure: no DOM, no fs.
import {
  ANIMAL_GOLD_AT, ANIMAL_MATURE_DAYS, ANIMAL_SILVER_AT, AUTO_SELL_MULT, BARN_CAPACITY, BIRTHDAY_GIFT_MULT, BOARD_MIN_REWARD, BOARD_POINTS,
  BOARD_REWARD_MULT, BOARD_SIZE, BUILD_BARN_COST, BUILD_COOP_COST, BUNNIES_PER_FLOOR, BUNNY_ENERGY, BUNNY_SIGHT, CAN_CAPACITY, CHICKEN_PRICE,
  COOP_CAPACITY, COW_PRICE, CROP_BALANCE, DATING_CAP_HEARTS, DAY_MINUTES, DAYS_PER_SEASON, ENGAGEMENT_DAYS, FERTILIZER_GOLD_BONUS,
  FISH_GOLD_BASE, FISH_GOLD_PER_LEVEL, FISH_ZONE_SIZE, FORAGE_PER_DAY, GIFT_POINTS, GIFTS_PER_WEEK, HARDY_WINTER_GROWTH, HOTBAR_SLOTS,
  INVENTORY_SLOTS, ITEM_ENERGY, ITEM_VALUE, LIFT_FLOORS, MACHINE_BALANCE, MAX_ENERGY, MAX_HEARTS, MAX_SKILL_LEVEL, MINE_ORE_CHANCE,
  MINE_ORE_HP, MINE_ORE_TABLE, MINE_ROCK_HP, MINE_ROCKS_BASE, MINE_ROCKS_PER_FLOOR, MINING_BONUS_PER_LEVEL, PASS_OUT_ENERGY_FRAC, POD_COUNT,
  POD_PRIZE, POINTS_PER_HEART, QUALITY_GOLD_BASE, QUALITY_GOLD_PER_LEVEL, QUALITY_PRICE_MULT, REACH, SAPLING_PRICE, SECRET_FRIEND_POINTS,
  SHOP_PRICES, SKILL_XP_THRESHOLDS, START_COINS, STUMP_WOOD, TALK_POINTS, TOOL_AREA, TOOL_DAMAGE, TOOL_ENERGY, TOOL_TIER_ENERGY_MULT, TOOL_UPGRADE_COST,
  TREE_MATURE_DAYS, TREE_REGROW_DAYS, TREE_WOOD, BOULDER_STONE, DERBY_FISH_PRIZE, WEIGHIN_PRIZES, WEEDS_FIBER_CHANCE, WIND_MULT, XP_FISH,
  XP_HARVEST, XP_ORE, XP_STONE, WATER_MULT_RESTORED, WATER_MULT_SILTED, WATER_MULT_START, SOIL_REVERT_CHANCE, PET_POINTS,
} from '../data/balance';
import { CROPS, getCrop, getItem, getVillager, hasItem, ITEMS, MACHINES, RECIPES, SEASONS, TREES, VILLAGERS } from '../data';
import { FESTIVALS } from '../data/festivals';
import { FISH } from '../data/fish';
import { FORAGE_TABLE } from '../data/forage';
import { GOALS } from '../data/goals';
import { IDLE_TIPS, ITEM_SOURCES, QUEST_HINTS } from '../data/hints';
import { dayOf, QUESTS } from '../data/quests';
import { SCENES } from '../data/scenes';
import { SHOPS } from '../data/shops';
import { WEEKDAYS } from '../data/seasons';
import type { Conditions, Objective, QuestRewards, RecipeInput, SeasonId } from '../data/types';
import { STATIC_MAPS } from '../world';

// ---- small helpers -----------------------------------------------------------------------------------

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const SEASON_IDS: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];

function esc(s: string): string {
  return s.replace(/\|/g, '\\|');
}

function table(headers: string[], rows: (string | number)[][]): string {
  const lines = [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`];
  for (const r of rows) lines.push(`| ${r.map((c) => esc(String(c))).join(' | ')} |`);
  return lines.join('\n');
}

function itemName(id: string): string {
  if (id.startsWith('tag:')) return `any ${id.slice(4)}`;
  if (hasItem(id)) return getItem(id).name;
  const rec = RECIPES.find((r) => r.id === id);
  if (rec) return `${itemName(rec.output.item)} (recipe)`;
  return id.replace(/_/g, ' ');
}

function seasonList(seasons: SeasonId[]): string {
  return seasons.length === 4 ? 'Any season' : seasons.map(cap).join(', ');
}

function dayLabel(day: number): string {
  const perYear = DAYS_PER_SEASON * 4;
  const year = Math.floor(day / perYear) + 1;
  const rem = day % perYear;
  return `${cap(SEASON_IDS[Math.floor(rem / DAYS_PER_SEASON)])} ${(rem % DAYS_PER_SEASON) + 1}, Year ${year}`;
}

function inputsText(inputs: RecipeInput[]): string {
  return inputs.map((i) => `${i.count} × ${i.item ? itemName(i.item) : `any ${i.tag}`}`).join(', ');
}

function sell(id: string, q: 0 | 1 | 2 = 0): number {
  return Math.round((ITEM_VALUE[id] ?? 0) * QUALITY_PRICE_MULT[q]);
}

const firstName = (id: string): string => getVillager(id).name.split(' ')[0];

function conditionsText(c: Conditions | undefined): string {
  if (!c) return 'Default';
  const parts: string[] = [];
  if (c.season) parts.push(c.season.map(cap).join('/'));
  if (c.weather) parts.push(c.weather.join('/'));
  if (c.weekday) parts.push(c.weekday.map((d) => WEEKDAYS[d]).join('/'));
  if (c.festival) parts.push('festival day');
  if (c.married) parts.push('married to you');
  if (c.courting) parts.push('courting you');
  if (c.minHearts !== undefined) parts.push(`${c.minHearts}+ hearts`);
  if (c.maxHearts !== undefined) parts.push(`under ${c.maxHearts} hearts`);
  if (c.flags) parts.push(`after: ${c.flags.join(', ')}`);
  if (c.notFlags) parts.push(`before: ${c.notFlags.join(', ')}`);
  if (c.map) parts.push(`on ${c.map}`);
  return parts.length ? parts.join(', ') : 'Default';
}

function objectiveText(o: Objective): string {
  switch (o.kind) {
    case 'ship':
      return `Ship ${o.count} ${o.item ? itemName(o.item) : `${o.category}s`}`;
    case 'deliver':
      return `Hand over ${o.count} ${o.item ? itemName(o.item) : `any ${o.category}`} to ${o.to === 'works' ? 'the Works Hall' : firstName(o.to)}`;
    case 'deliverKinds':
      return `Hand ${firstName(o.to)} ${o.kinds} different kinds of ${o.category}`;
    case 'reachFloor':
      return `Reach mine floor ${o.floor}`;
    case 'pickup':
      return `Find the ${itemName(o.item)}`;
    case 'attend': {
      const f = FESTIVALS.find((x) => x.id === o.festival);
      return `${f?.name ?? o.festival} (${f ? `${cap(f.season)} ${f.day}` : ''})`;
    }
    case 'scene':
      return 'Watch the scene';
    case 'hearts':
      return `Reach ${o.hearts} hearts with ${firstName(o.villager)}`;
    case 'power':
      return `Keep ${o.supply} power running on the farm`;
    case 'own':
      return `Place ${o.count} ${o.machine.replace(/_/g, ' ')}`;
    case 'flag':
      return o.flag === 'heron_sailed' ? 'Sail the Heron with Ilo (5 hearts, then visit the lake)' : o.flag;
  }
}

function rewardsText(r: QuestRewards): string {
  const parts: string[] = [];
  if (r.coins) parts.push(`${r.coins}g`);
  for (const i of r.items ?? []) parts.push(`${i.n} × ${itemName(i.item)}`);
  if (r.blueprints?.length) parts.push(`blueprints: ${r.blueprints.map((b) => itemName(b.replace('craft_', ''))).join(', ')}`);
  if (r.recipes?.length) parts.push(`recipes: ${r.recipes.map(itemName).join(', ')}`);
  if (r.points) parts.push(Object.entries(r.points).map(([v, p]) => `+${p} friendship with ${firstName(v)}`).join(', '));
  if (r.tools) parts.push(Object.entries(r.tools).map(([t, n]) => `${t} upgraded to tier ${n}`).join(', '));
  return parts.length ? parts.join('; ') : 'A scene and story progress';
}

/** Every way a recipe can be learned, found by scanning the content tables. */
function learnedFrom(recipeId: string): string {
  const out: string[] = [];
  for (const q of QUESTS) if (q.rewards.recipes?.includes(recipeId)) out.push(`quest "${q.title}"`);
  for (const g of GOALS) if (g.recipes?.includes(recipeId)) out.push(`stretch goal "${g.title}"`);
  for (const sc of SCENES) if (sc.effects?.recipes?.includes(recipeId) && sc.villager) out.push(`${firstName(sc.villager)}'s heart event "${sc.title}"`);
  for (const sh of SHOPS) if (sh.stock.some((e) => e.recipe === recipeId)) out.push(`buy at ${sh.name}`);
  return out.join('; ');
}

function blueprintFrom(item: string): string {
  const id = `craft_${item}`;
  const quest = QUESTS.find((q) => q.rewards.blueprints?.includes(id));
  return quest ? `quest "${quest.title}"` : 'known from the start';
}

// ---- sections ----------------------------------------------------------------------------------------

function intro(): string {
  return `# Cosycorp Wiki

A player's reference for everything in Cosycorp: numbers, schedules, recipes, gifts and the story. It is
**generated from the game's own data tables** by \`npm run wiki\`, so it matches the game exactly. Do not edit
it by hand; change the data and regenerate.

For design reasoning read \`DESIGN.md\`. For a quick "what do I do next?" in the game, open the **Journal** (J) and
look at the **What next?** tab.

**Contents:** [Getting started](#getting-started) · [Controls](#controls) · [Time and weather](#time-and-weather) ·
[Player](#player) · [Farming](#farming) · [Foraging](#foraging) · [Mining](#mining) · [Fishing](#fishing) ·
[Animals](#animals) · [Items](#items) · [Recipes](#recipes) · [The Works](#the-works) · [Shops](#shops) ·
[Villagers](#villagers) · [Romance](#romance) · [Festivals](#festivals) · [Story](#story) · [Quest board](#quest-board) ·
[Stretch goals](#stretch-goals) · [Places](#places)`;
}

function gettingStarted(): string {
  const steps = QUEST_HINTS.first_harvest.map((s, i) => `${i + 1}. ${s}`).join('\n');
  return `## Getting started

You inherit Penhallow Yard with ${START_COINS}g, six tools and 15 radish seeds. The first story quest is **First Harvest**:

${steps}

After that the story asks for materials and machines in order (see [Story](#story)). Always-useful habits:

${IDLE_TIPS.map((t) => `- ${t}`).join('\n')}

**If you ever feel stuck:** the Journal's **What next?** tab lists each active quest, what is still missing and where to
get it. Nothing in the story can soft-lock: dated events finish whether or not you attend.`;
}

function controls(): string {
  const rows: [string, string][] = [
    ['WASD / arrow keys', 'Walk (relative to the camera)'],
    ['Left click', 'Use the selected item on a tile (walks there if far)'],
    ['Right click / E', 'Interact: talk, open doors, harvest, pick up'],
    ['Space', 'Use the selected item on the tile in front of you'],
    ['1–0', 'Pick a hotbar slot'],
    ['Mouse wheel', 'Scroll through the hotbar; the item name shows above the bar'],
    ['Ctrl + wheel', 'Zoom the camera'],
    ['[ and ]', 'Rotate the camera'],
    ['I or Tab', 'Backpack'],
    ['J', 'Journal (What next?, quests, friends, goals)'],
    ['M', 'Map'],
    ['C', 'Crafting'],
    ['B', 'Build mode: click to place, drag to paint belts, R to rotate, right click to pick up'],
    ['F', 'Flow overlay (belt heat, jams, power coverage, ranges)'],
    ['Esc', 'Close the top panel, or open the menu (save, quality, volume)'],
  ];
  return `## Controls

${table(['Key', 'Does'], rows)}

The top-right buttons open the Journal, Backpack and Map. A controller works at any time alongside the keyboard
(left stick walk, A use, B interact, X/Y change slot, shoulders rotate, Start menu); the full list is in the Esc menu.`;
}

function timeAndWeather(): string {
  const rows = SEASONS.map((s) => [s.name, `${s.weather.sunny}%`, `${s.weather.rain}%`, `${s.weather.storm}%`, `${s.weather.snow}%`]);
  const fest = FESTIVALS.map((f) => `- **${f.name}**: ${cap(f.season)} ${f.day}`).join('\n');
  return `## Time and weather

- A year has 4 seasons of ${DAYS_PER_SEASON} days (Spring, Summer, Autumn, Winter); a week has 7 days (${WEEKDAYS.join(', ')}).
- A day runs 06:00 to 02:00 (${DAY_MINUTES} in-game minutes). Menus and panels pause the clock.
- At 02:00 you pass out and wake at home with ${Math.round(PASS_OUT_ENERGY_FRAC * 100)}% energy; that is the only penalty.
- Overnight: leftover goods spoil, crops grow, animals produce, the story advances and tomorrow's weather is rolled.
- Rain waters outdoor soil at dawn. Snow does not (frozen ground).
- Storms: lightning and heavy rain. A windmill makes more power in rain and storms.

Weather chances for a new day:

${table(['Season', 'Sunny', 'Rain', 'Storm', 'Snow'], rows)}

Festival days:

${fest}

Shops close on certain weekdays and at night: see [Shops](#shops).`;
}

function player(): string {
  const toolNames = ['Hoe', 'Watering Can', 'Axe', 'Pickaxe', 'Scythe', 'Fishing Rod'];
  const toolIds = ['hoe', 'can', 'axe', 'pickaxe', 'scythe', 'rod'] as const;
  const toolRows = toolIds.map((id, i) => [
    toolNames[i],
    `${TOOL_ENERGY[id]}`,
    id === 'hoe' || id === 'can' ? `1 / ${TOOL_AREA[1]} / ${TOOL_AREA[2]} tiles in a row` : id === 'axe' || id === 'pickaxe' ? `${TOOL_DAMAGE.join(' / ')} damage per hit` : '',
  ]);
  const upgrades = TOOL_UPGRADE_COST.slice(1).map((u, i) => `- Tier ${i + 2}: ${u.coins}g + ${u.count} ${itemName(u.item)}`).join('\n');
  const skills = SKILL_XP_THRESHOLDS.map((x, i) => `Level ${i + 1}: ${x} XP`).join(' · ');
  return `## Player

- **Energy:** ${MAX_ENERGY} maximum. Tools cost energy per swing (below); eating restores it. Reaching 0 passes you out.
- **Reach:** you can use things on tiles within about ${REACH} tiles of you.
- **Backpack:** ${INVENTORY_SLOTS} slots; the first ${HOTBAR_SLOTS} are the hotbar. A farmhouse box holds overflow.

### Tools

${table(['Tool', 'Energy per use', 'Effect by tier (basic / tier 2 / tier 3)'], toolRows)}

Energy cost is multiplied by ${TOOL_TIER_ENERGY_MULT.join(' / ')} at tiers 1 / 2 / 3 (the scythe costs nothing). The watering can holds ${CAN_CAPACITY.join(' / ')} charges by tier and refills
from any water. Upgrade tools at **The Smithy** (the old tool is replaced at once):

${upgrades}

The fishing rod's catch zone is ${FISH_ZONE_SIZE.map((z) => `${Math.round(z * 100)}%`).join(' / ')} of the bar by rod tier (rod upgrades come from the Ilo side story).

### Skills

Three skills level from use: **Farming** (+${XP_HARVEST} XP per harvest), **Mining** (+${XP_STONE} per stone, +${XP_ORE} per ore) and **Fishing** (+${XP_FISH} per fish).
Maximum level ${MAX_SKILL_LEVEL}. XP needed in total: ${skills}.

- Farming raises the chance of silver and gold crops (gold chance ${Math.round(QUALITY_GOLD_BASE * 100)}% + ${Math.round(QUALITY_GOLD_PER_LEVEL * 100)}% per level, +${Math.round(FERTILIZER_GOLD_BONUS * 100)}% with fertiliser; silver is up to three times as likely).
- Mining gives extra drops (+${Math.round(MINING_BONUS_PER_LEVEL * 100)}% per level).
- Fishing raises the chance of gold fish (${Math.round(FISH_GOLD_BASE * 100)}% + ${Math.round(FISH_GOLD_PER_LEVEL * 100)}% per level).

### Quality

Normal, Silver (★) and Gold (★★) goods sell for ×${QUALITY_PRICE_MULT.join(' / ×')}.

### Chopping, breaking and cutting

- **Trees:** ${TREE_WOOD} wood when felled; the stump gives ${STUMP_WOOD} more. Trees on the farm regrow from stumps after ${TREE_REGROW_DAYS} days.
- **Boulders:** ${BOULDER_STONE} stone. Small stones give 1.
- **Weeds:** cut with the scythe; ${Math.round(WEEDS_FIBER_CHANCE * 100)}% drop fibre.
- **Twigs:** 1 wood with the axe.`;
}

function farming(): string {
  const rows = CROPS.map((c) => {
    const b = CROP_BALANCE[c.id];
    const harvests = b.regrowDays ? 1 + Math.floor((DAYS_PER_SEASON - b.growthDays) / b.regrowDays) : 1;
    const total = harvests * b.harvestCount * sell(c.harvestItem) - b.seedPrice;
    return [
      c.name,
      seasonList(c.seasons) + (c.hardy ? ' (survives winter)' : ''),
      `${b.seedPrice}g`,
      b.growthDays,
      b.regrowDays ? `every ${b.regrowDays}` : 'once',
      b.harvestCount,
      `${sell(c.harvestItem)}g`,
      `${ITEM_ENERGY[c.harvestItem] ?? 0}`,
      `${Math.round(total / DAYS_PER_SEASON)}g`,
    ];
  });
  const trees = TREES.map((t) => `- **${t.name}**: a ${itemName(t.saplingItem)} (${SAPLING_PRICE}g at the Almanac once the Seed Library story is done) takes ${TREE_MATURE_DAYS} days to mature and then bears ${itemName(t.fruitItem)} in ${t.fruitSeasons.map(cap).join(', ')} (sells ${sell(t.fruitItem)}g).`).join('\n');
  return `## Farming

1. **Till** grass or path with the **Hoe**. Tilled soil that stays empty and untended sometimes reverts to grass (${Math.round(SOIL_REVERT_CHANCE * 100)}% a night).
2. **Plant** seeds on tilled soil (select the seeds, click the soil). Crops only grow in their seasons; out of season they wither.
3. **Water** every day with the Watering Can (rain does it for you; sprinklers do it at dawn).
4. **Harvest** ripe crops with E or a right click; crops that regrow keep producing on the schedule below.
5. **Ship** crops in the shipping bin beside the farmhouse. **The bin pays instantly**, at full price.

Crops grow overnight on watered tiles. Fertiliser (made from fibre and wood, or bought at the Almanac) raises quality. In winter only
hardy crops grow, at ${Math.round(HARDY_WINTER_GROWTH * 100)}% speed; a **Heater** or the **Greenhouse** (restored by the Great Wheel quest) lets other crops grow.

${table(['Crop', 'Seasons', 'Seed', 'Days to grow', 'Regrows', 'Yield', 'Sells', 'Energy', 'Est. profit per day*'], rows)}

*Estimate over one ${DAYS_PER_SEASON}-day season from planting day 1: (harvests × yield × sell price − seed) ÷ ${DAYS_PER_SEASON}, normal quality, ignoring wasted days.

### Orchard

${trees}`;
}

function foraging(): string {
  const rows = SEASON_IDS.map((s) => {
    const counts = new Map<string, number>();
    for (const id of FORAGE_TABLE[s]) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [cap(s), [...counts].map(([id, n]) => `${itemName(id)}${n > 1 ? ` (×${n} chance)` : ''}`).join(', ')];
  });
  const items = Object.values(FORAGE_TABLE).flat();
  const uniq = [...new Set(items)].map((id) => [itemName(id), `${sell(id)}g`, `${ITEM_ENERGY[id] ?? 0}`]);
  return `## Foraging

Forage spots (sparkling bushes) refill every morning: ${Object.entries(FORAGE_PER_DAY).filter(([, n]) => n > 0).map(([m, n]) => `${n} per day in the ${m}`).join(', ')}. Press E on them to pick up.

${table(['Season', 'What grows'], rows)}

${table(['Forage', 'Sells', 'Energy'], uniq)}

Foraged goods spoil overnight if left in the open, so use or ship them the same day.`;
}

function mining(): string {
  const floors: (string | number)[][] = [];
  for (let f = 1; f <= 10; f++) {
    const band = [...MINE_ORE_TABLE].reverse().find((b) => f >= b.from)!;
    const total = band.ores.reduce((a, [, w]) => a + w, 0);
    floors.push([
      f,
      MINE_ROCKS_BASE + MINE_ROCKS_PER_FLOOR * f,
      `${Math.round(MINE_ORE_CHANCE[f] * 100)}%`,
      band.ores.map(([id, w]) => `${itemName(id)} ${Math.round((w / total) * 100)}%`).join(', '),
      f === 1 ? 'none' : (BUNNIES_PER_FLOOR * f).toFixed(1),
      LIFT_FLOORS.includes(f) ? 'yes' : '',
    ]);
  }
  return `## Mining

The mine is reached from the south end of the **Forest** and has 10 floors. Break rocks with the **Pickaxe** (${MINE_ROCK_HP} hits for stone, ${MINE_ORE_HP} for ore at the basic tier). A ladder is hidden under
one of the rocks on each floor; it also appears on its own after a dozen rocks. Floors ${LIFT_FLOORS.join(', ')} have a lift stop so you can return quickly.
**Dust bunnies** hop toward you from ${BUNNY_SIGHT} tiles away and cost ${BUNNY_ENERGY} energy per bump; hit them with the pickaxe to scare them off.

${table(['Floor', 'Rocks', 'Ore rocks', 'Ore mix', 'Dust bunnies (approx.)', 'Lift'], floors)}

Quartz first appears on floor 3, iron on floor 5 and amethyst on floor 8. If you pass out in the mine you wake at home.`;
}

function fishing(): string {
  const rows = FISH.map((f) => [
    itemName(f.item),
    f.where.map((w) => (w === 'river' ? 'River (farm stream)' : 'Lake')).join(', ') + (f.lakeFlag ? ' (+lake after the Heron story)' : ''),
    seasonList(f.seasons),
    f.from && f.to ? `${f.from}–${f.to}` : 'Any',
    f.weather ? f.weather.join(', ') : 'Any',
    f.behaviour,
    `${Math.round(f.difficulty * 100)}%`,
    `${sell(f.item)}g`,
  ]);
  return `## Fishing

Yes, there is fishing. Select the **Fishing Rod** (hotbar 6), face water and use it. Wait for the bobber to dip, then play the catch bar:
hold the mouse button (or Space, or A on a pad) to lift the bar and keep the fish inside it. The stream on the farm is "river" water; the
lake north of the town is "lake" water.

${table(['Fish', 'Where', 'Seasons', 'Time', 'Weather', 'Moves', 'Difficulty', 'Sells'], rows)}

Fish are also the key ingredient in Fish Stew, and the Glowfin Derby festival rewards catching many.`;
}

function animals(): string {
  return `## Animals

Build the **Coop** and then the **Barn** at Toller Joinery, then buy animals there.

- **Coop:** ${BUILD_COOP_COST.coins}g + ${BUILD_COOP_COST.wood} wood + ${BUILD_COOP_COST.stone} stone; holds ${COOP_CAPACITY} chickens (${CHICKEN_PRICE}g each); eggs daily.
- **Barn:** ${BUILD_BARN_COST.coins}g + ${BUILD_BARN_COST.wood} wood + ${BUILD_BARN_COST.stone} stone (needs the Coop first); holds ${BARN_CAPACITY} cows (${COW_PRICE}g each); milk daily.
- Animals produce after ${ANIMAL_MATURE_DAYS} days. Feed them every day (they graze outdoors outside winter, otherwise they need hay from the feeder).
- **Pet** them daily for +${PET_POINTS} friendship. Higher friendship means better product quality: silver at ${ANIMAL_SILVER_AT}+, gold at ${ANIMAL_GOLD_AT}+ (of 1000).
- Eggs sell for ${sell('egg')}g, milk for ${sell('milk')}g. Milk becomes cheese (${sell('cheese')}g) in a Cheese Press.`;
}

function items(): string {
  const cats: string[] = [];
  const order = ['crop', 'forage', 'animal', 'fish', 'mineral', 'material', 'product', 'dish', 'seed', 'sapling', 'special'];
  for (const cat of order) {
    const list = ITEMS.filter((i) => i.category === cat);
    if (!list.length) continue;
    const rows = list.map((i) => [
      i.name,
      ITEM_VALUE[i.id] ? `${ITEM_VALUE[i.id]}g` : i.plants && CROP_BALANCE[i.plants] ? `buy ${CROP_BALANCE[i.plants].seedPrice}g` : i.category === 'sapling' ? `buy ${SAPLING_PRICE}g` : '—',
      ITEM_ENERGY[i.id] ?? '',
      i.spoils ? 'yes' : '',
      i.description ?? (CROPS.some((c) => c.id === i.plants) ? `Plants ${itemName(getCrop(i.plants!).harvestItem)}.` : ''),
    ]);
    cats.push(`### ${cap(cat)}s\n\n${table(['Item', 'Sells', 'Energy', 'Spoils overnight', 'Notes'], rows)}`);
  }
  const src = Object.entries(ITEM_SOURCES).map(([id, t]) => `- **${itemName(id)}:** ${t}`).join('\n');
  return `## Items

Sell prices are for normal quality. "Spoils overnight" means raw goods left on belts or in machine buffers rot (processed goods never do).
The shipping bin pays the full price; a Market Chute pays ${Math.round(AUTO_SELL_MULT * 100)}%.

### Where to get materials

${src}

${cats.join('\n\n')}`;
}

function recipes(): string {
  const machineRows = RECIPES.filter((r) => !['craft', 'cook'].includes(r.station)).map((r) => [
    itemName(r.output.item),
    itemName(r.station),
    inputsText(r.inputs),
    `${r.workMinutes ?? ''} min`,
    `${sell(r.output.item)}g`,
    r.requiresReward ? 'Stretch goal reward' : 'Always',
  ]);
  const craftRows = RECIPES.filter((r) => r.station === 'craft').map((r) => [
    `${r.output.count > 1 ? `${r.output.count} × ` : ''}${itemName(r.output.item)}`,
    inputsText(r.inputs),
    r.learned ? 'Known' : blueprintFrom(r.output.item),
  ]);
  const cookRows = RECIPES.filter((r) => r.station === 'cook').map((r) => [
    itemName(r.output.item),
    inputsText(r.inputs),
    `${sell(r.output.item)}g`,
    ITEM_ENERGY[r.output.item] ?? '',
    r.learned ? 'Known' : learnedFrom(r.id) || '—',
  ]);
  return `## Recipes

### Crafting (press C)

Machines and tools you build yourself. Blueprints unlock through the story.

${table(['Result', 'Ingredients', 'Unlocked by'], craftRows)}

### Machine recipes (jam press, preserver, mill, cheese press)

A crafter starts the first recipe whose ingredients are all in its input buffer. Processed goods never spoil.

${table(['Product', 'Machine', 'Ingredients', 'Time', 'Sells', 'Available'], machineRows)}

### Cooking (the farmhouse kitchen)

${table(['Dish', 'Ingredients', 'Sells', 'Energy', 'How to learn'], cookRows)}`;
}

function works(): string {
  const rows = MACHINES.map((m) => {
    const b = MACHINE_BALANCE[m.id];
    const cost = RECIPES.find((r) => r.station === 'craft' && r.output.item === m.item);
    const stats: string[] = [];
    if (b.radius) stats.push(`range ${b.radius}`);
    if (b.powerDraw) stats.push(`draws ${b.powerDraw} power`);
    if (b.powerSupply) stats.push(`supplies ${b.powerSupply} power`);
    if (b.workMinutes) stats.push(`${b.workMinutes} min per job`);
    if (b.capacity) stats.push(`capacity ${b.capacity}`);
    if (b.travelMinutes) stats.push(`${b.travelMinutes} min per tile`);
    if (b.entryInterval) stats.push(`one item every ${b.entryInterval} min`);
    if (b.bufferPerItem) stats.push(`buffer ${b.bufferPerItem} per input`);
    if (b.outputBuffer) stats.push(`output buffer ${b.outputBuffer}`);
    return [m.name, m.kind, m.description, stats.join(', '), cost ? inputsText(cost.inputs) : '—', cost ? blueprintFrom(m.item) : ''];
  });
  return `## The Works

The Works is the farm's automation: machines you place in **Build mode (B)** that water, plant, harvest, move and process crops while you do other things.
Press **F** for the Flow overlay: belt heat, jams, machine status rings, ranges and power coverage. The end-of-day report names the biggest bottleneck.

**Power.** Generators supply power to machines within their range; a machine that draws power only works while the supply covers the draw. Water Wheels must touch the stream
(supply ×${WATER_MULT_START} at the start, ×${WATER_MULT_SILTED} while silted after the Thaw Flood, ×${WATER_MULT_RESTORED} once the Sluice is open). Windmills scale with weather
(${Object.entries(WIND_MULT).map(([w, m]) => `${w} ×${m}`).join(', ')}).

**Belts.** Belts carry one item per entry interval, take a set time per tile, and have limited capacity. A full belt backs up behind it. The belt model is
snapshot-based; the rules are in DESIGN.md §5. Splitters share items between outputs.

${table(['Machine', 'Kind', 'What it does', 'Stats', 'Craft cost', 'Blueprint from'], rows)}

Ideas: sprinklers on a grid to stop hand watering; a planter and a harvester sharing a belt; a silo to buffer a glut; a Market Chute at the end of the line to convert surplus into coins.`;
}

function shops(): string {
  const parts = SHOPS.map((s) => {
    const closed = s.closed.length ? s.closed.map((d) => WEEKDAYS[d]).join(', ') : 'never';
    const rows = s.stock.map((e) => {
      const notes: string[] = [];
      if (e.seasons) notes.push(e.seasons.map(cap).join('/'));
      if (e.requiresFlag) notes.push(`after: ${e.requiresFlag.replace(/_/g, ' ')}`);
      if (e.materials) notes.push(`+ ${e.materials.map((m) => `${m.n} ${itemName(m.item)}`).join(', ')}`);
      const name = e.service ? cap(e.item.replace(/_/g, ' ')) : e.recipe ? `Recipe: ${itemName(e.recipe.replace('cook_', ''))}` : itemName(e.item);
      return [name, `${e.price}g`, notes.join('; ')];
    });
    return `### ${s.name}\n\n${firstName(s.keeper)} is at the counter. Open ${s.open}–${s.close}. Closed: ${closed}.\n\n${table(['Item', 'Price', 'Notes'], rows)}`;
  });
  return `## Shops

All shops are in the town, east of the farm. Chat with the keeper at the counter for friendship points.

${parts.join('\n\n')}

The **Quest Board** in the town square posts weekly paid jobs; the **Works Hall** is where story deliveries are handed over (it is not a shop).`;
}

function villagers(): string {
  const parts = VILLAGERS.map((v) => {
    const first = (v.schedule.find((s) => !s.when) ?? v.schedule[v.schedule.length - 1]);
    const routine = first.stops.map((s) => `${s.time} ${cap(s.map)} (${s.x}, ${s.y})${s.hidden ? ' indoors' : ''}`).join(' → ');
    const special = v.schedule.filter((s) => s.when).map((s) => `- *${conditionsText(s.when)}:* ${s.stops.map((p) => `${p.time} ${cap(p.map)} (${p.x}, ${p.y})${p.hidden ? ' indoors' : ''}`).join(' → ')}`).join('\n');
    const events = SCENES.filter((sc) => sc.villager === v.id && sc.trigger).map((sc) => `- **${sc.title}**: ${conditionsText(sc.trigger)}${sc.trigger?.from ? `, ${sc.trigger.from}–${sc.trigger.to}` : ''}`).join('\n');
    const names = (list: string[]) => list.map(itemName).join(', ') || '—';
    return `### ${v.name}

${v.role}
**Birthday:** ${cap(v.birthday.season)} ${v.birthday.day} · **Romanceable:** ${v.romanceable ? 'yes' : 'no'}

| | Gifts |
|---|---|
| Loves | ${esc(names(v.loves))} |
| Likes | ${esc(names(v.likes))} |
| Dislikes | ${esc(names(v.dislikes))} |

**Usual day:** ${routine}${special ? `\n\nOther days:\n${special}` : ''}${events ? `\n\nHeart events:\n${events}` : ''}`;
  });
  return `## Villagers

Eight villagers live around Hearthvale. Friendship is measured in hearts (${MAX_HEARTS} maximum, ${POINTS_PER_HEART} points each).

- **Talk** once a day: +${TALK_POINTS} points.
- **Gifts** (select an item and use it on them): loved +${GIFT_POINTS.loved}, liked +${GIFT_POINTS.liked}, neutral +${GIFT_POINTS.neutral}, disliked ${GIFT_POINTS.disliked}.
  Maximum ${GIFTS_PER_WEEK} gifts per week each; **birthday gifts count ×${BIRTHDAY_GIFT_MULT}**. Gift preferences are fixed (below); an item with the tag "any fish" counts for every fish.
- **Heart events** are short scenes that play by themselves when you enter a place at the right time with enough hearts.
- Schedules change with weather, weekday and story state; the table below lists the usual day, with coordinates in tiles (x, y).

${parts.join('\n\n')}`;
}

function romance(): string {
  const who = VILLAGERS.filter((v) => v.romanceable).map((v) => v.name).join(' and ');
  return `## Romance

Romanceable villagers: **${who}**.

1. Reach 8 hearts to be offered a **Ribbon Charm** at The Kettle Inn (${SHOP_PRICES.ribbon_charm}g, listed in the Inn's stock once you qualify).
2. Giving the charm starts courting. While courting, friendship is capped at ${DATING_CAP_HEARTS} hearts until you propose.
3. Buy the **Promise Lantern** (${SHOP_PRICES.promise_lantern}g at the Inn) and give it to propose.
4. The ceremony follows ${ENGAGEMENT_DAYS} days later. After marriage your spouse visits the farm in the mornings.

Marriage stops at the ceremony and morning visits; there are no children or household chores.`;
}

function festivals(): string {
  const rows = FESTIVALS.map((f) => [f.name, `${cap(f.season)} ${f.day}`, `${f.start}–${f.end}`, f.blurb]);
  return `## Festivals

One festival per season, held in the town square. Villagers gather an hour before the start. Leaving a festival skips the clock to 22:00 if it is earlier.

${table(['Festival', 'Date', 'Hours', 'What happens'], rows)}

- **Blossom Fair:** ${POD_COUNT} seed pods are hidden around the plaza; ${POD_PRIZE}g each.
- **Glowfin Derby:** ${DERBY_FISH_PRIZE}g per fish caught within the three hours.
- **Harvest Weigh-in:** exhibit your best produce against three rivals; prizes ${WEIGHIN_PRIZES.join('g / ')}g for 1st / 2nd / 3rd.
- **Lantern Night:** a secret friend is picked for you; a gift to them gives +${SECRET_FRIEND_POINTS} friendship. This is the finale of the main story.

Festival dates are fixed story beats: the main story completes even if you miss them.`;
}

function story(): string {
  const parts = QUESTS.map((q) => {
    const reqs = [...q.requires.map((r) => QUESTS.find((x) => x.id === r)?.title ?? r), ...(q.requiresFlags ?? []).map((f) => `event: ${f.replace(/_/g, ' ')}`)];
    const hints = QUEST_HINTS[q.id];
    return `### ${q.title}${q.arc === 'side' ? ' (side story)' : ''}

${q.summary}

- **Starts after:** ${reqs.length ? reqs.join(', ') : 'the beginning'}${q.earliest !== undefined ? `; not before ${dayLabel(q.earliest)}` : ''}
- **Do:** ${q.objectives.map(objectiveText).join('; ')}
- **Reward:** ${rewardsText(q.rewards)}${hints ? `\n\n**How:**\n${hints.map((h, i) => `${i + 1}. ${h}`).join('\n')}` : ''}`;
  });
  return `## Story

The main story has ${QUESTS.filter((q) => q.arc === 'main').length} quests in order, plus two optional side arcs ("The Heron" with Ilo and "The Seed Library" with Saffi).
Every objective can be done in any season. Dated beats complete whether or not you attend, so the story can never lock.
Starts: ${dayLabel(dayOf(1, 0, 1))}. Great Wheel quest begins ${dayLabel(dayOf(2, 0, 4))} (the Thaw Flood). The finale is ${dayLabel(dayOf(2, 3, 13))}.

${parts.join('\n\n')}`;
}

function board(): string {
  return `## Quest board

The board in the town square posts ${BOARD_SIZE} jobs per week (they run until Sunday). Each asks for a number of an item and pays
**${BOARD_REWARD_MULT}× the item's sell price** (at least ${BOARD_MIN_REWARD}g) plus ${BOARD_POINTS} friendship with the requester. Hand the goods over at the board.`;
}

function goals(): string {
  const rows = GOALS.map((g) => [cap(g.season), g.title, g.rewardText]);
  return `## Stretch goals

Optional challenges for people who enjoy optimising the Works. They never block the story. Rewards are cosmetics and rare recipes. Check progress in the Journal.

${table(['Season', 'Challenge', 'Reward'], rows)}`;
}

function places(): string {
  const parts = STATIC_MAPS.map((m) => {
    const rows = m.buildings.map((b) => [b.name, `(${b.x}, ${b.y})`, `${b.w}×${b.h}`, b.requiresFlag ? `built later (${b.requiresFlag.replace(/_/g, ' ')})` : '']);
    const warps = [...new Set(m.warps.map((w) => w.to))].map((t) => (t.startsWith('mine') ? 'the Mine' : cap(t))).join(', ');
    return `### ${m.name}

Size ${m.rows[0].length}×${m.rows.length} tiles. Leads to: ${warps || 'nowhere'}.${m.fishing ? ` Fishing: ${m.fishing}.` : ''}

${rows.length ? table(['Building', 'Top-left tile', 'Size', 'Notes'], rows) : ''}`;
  });
  return `## Places

The world: the **farm** (Penhallow Yard) is the hub. The **town** is east of it, the **forest** south, with the **mine** below the forest, and the **lake** north of the town.
Open the Map (M) to see each area with your position.

${parts.join('\n\n')}`;
}

/** The whole wiki as one Markdown string. */
export function buildWiki(): string {
  return (
    [intro(), gettingStarted(), controls(), timeAndWeather(), player(), farming(), foraging(), mining(), fishing(), animals(), items(), recipes(), works(), shops(), villagers(), romance(), festivals(), story(), board(), goals(), places()].join('\n\n') + '\n'
  );
}

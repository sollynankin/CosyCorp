// The main story and the two side arcs as a quest DAG (DESIGN.md §0, §10). Rules that keep it from
// soft-locking: every objective can be done in any season (deliveries take materials or "any crop"), dated
// beats complete even if missed (`attend`), and setbacks are dated but gated by `requires`.
import { DAYS_PER_SEASON, DAYS_PER_YEAR } from './balance';
import type { QuestDef } from './types';

/** Absolute day for (year, season index 0..3, day of season 1..14). */
export const dayOf = (year: number, season: number, dom: number): number => (year - 1) * DAYS_PER_YEAR + season * DAYS_PER_SEASON + dom - 1;

export const QUESTS: QuestDef[] = [
  // ---- Main arc --------------------------------------------------------------------------------------
  {
    id: 'arrival', title: 'A Key and a Kettle', arc: 'main', villager: 'maudie',
    summary: 'Settle in at Penhallow Yard.',
    requires: [],
    onStart: { scene: 'arrival' },
    objectives: [{ kind: 'scene', scene: 'arrival' }],
    rewards: { flags: ['arrived'] },
  },
  {
    id: 'first_harvest', title: 'First Harvest', arc: 'main',
    summary: 'Grow something and ship 5 crops from the bin by the farmhouse.',
    requires: ['arrival'],
    objectives: [{ kind: 'ship', category: 'crop', count: 5 }],
    rewards: { blueprints: ['craft_sprinkler'], items: [{ item: 'sprinkler', n: 1 }], scene: 'first_harvest' },
  },
  {
    id: 'gears', title: 'Gears and Grease', arc: 'main', villager: 'odile',
    summary: 'Bring Odile the parts to restore the yard\'s Guild water-wheel. Deliver at the Works Hall.',
    requires: ['first_harvest'],
    objectives: [
      { kind: 'deliver', to: 'works', item: 'wood', count: 40 },
      { kind: 'deliver', to: 'works', item: 'stone', count: 25 },
      { kind: 'deliver', to: 'works', item: 'copper_ore', count: 5 },
    ],
    rewards: {
      items: [{ item: 'water_wheel', n: 1 }, { item: 'conveyor', n: 8 }],
      blueprints: ['craft_water_wheel', 'craft_conveyor', 'craft_harvester', 'craft_market_chute', 'craft_chest'],
      flags: ['yard_wheel'],
      points: { odile: 100 },
      scene: 'yard_wheel',
    },
  },
  {
    id: 'blossom', title: 'The Blossom Fair', arc: 'main', villager: 'maudie',
    summary: 'Hearthvale\'s spring fair is on Spring 13 in the town square, 10:00 to 16:00.',
    requires: ['arrival'],
    objectives: [{ kind: 'attend', festival: 'blossom' }],
    rewards: { points: { maudie: 50 } },
  },
  {
    id: 'pressing', title: 'The Pressing Room', arc: 'main', villager: 'teo',
    summary: 'Get the yard\'s power running and bring 20 crops of any kind to the Works Hall to test the old presses.',
    requires: ['gears', 'blossom'],
    objectives: [
      { kind: 'power', supply: 6 },
      { kind: 'deliver', to: 'works', category: 'crop', count: 20 },
    ],
    rewards: {
      blueprints: ['craft_jam_press', 'craft_preserver', 'craft_silo', 'craft_splitter', 'craft_seed_planter'],
      flags: ['pressing_room'],
      points: { teo: 100, odile: 50 },
      scene: 'pressing_room',
    },
  },
  {
    id: 'undersluice', title: 'Down the Under-Sluice', arc: 'main', villager: 'odile',
    summary: 'The old sluice tunnels run into the mine. Something of Hollis\'s is said to be on the fifth floor.',
    requires: ['pressing'],
    earliest: dayOf(1, 1, 1),
    objectives: [{ kind: 'reachFloor', floor: 5 }, { kind: 'pickup', item: 'logbook' }],
    rewards: { scene: 'logbook' },
  },
  {
    id: 'open_together', title: 'Open Them Together', arc: 'main', villager: 'odile',
    summary: 'Talk to Odile, and bring metal for the gate mechanism to the Works Hall.',
    requires: ['undersluice'],
    objectives: [
      { kind: 'hearts', villager: 'odile', hearts: 2 },
      { kind: 'deliver', to: 'works', item: 'copper_ore', count: 10 },
      { kind: 'deliver', to: 'works', item: 'iron_ore', count: 5 },
    ],
    rewards: {
      blueprints: ['craft_mill', 'craft_swift_conveyor', 'craft_windmill', 'craft_heater', 'craft_pump_sprinkler', 'craft_lantern'],
      flags: ['sluice_open'],
      points: { odile: 200 },
      scene: 'open_together',
    },
  },
  {
    id: 'great_wheel', title: 'Rebuild the Great Wheel', arc: 'main', villager: 'bram',
    summary: 'The Thaw Flood snapped the Great Wheel\'s axle and silted your wheel. Bring Bram timber, stone and iron.',
    requires: ['open_together'],
    earliest: dayOf(2, 0, 4),
    onStart: { flags: ['silted'], scene: 'thaw_flood' },
    objectives: [
      { kind: 'deliver', to: 'works', item: 'wood', count: 80 },
      { kind: 'deliver', to: 'works', item: 'stone', count: 40 },
      { kind: 'deliver', to: 'works', item: 'iron_ore', count: 10 },
    ],
    rewards: { flags: ['great_wheel', 'greenhouse'], removeFlags: ['silted'], points: { bram: 150 }, scene: 'great_wheel' },
  },
  {
    id: 'lantern_line', title: 'The Lantern Line', arc: 'main', villager: 'maudie',
    summary: 'Craft 20 lanterns for Kettle Street and keep at least 30 power running on the farm.',
    requires: ['great_wheel'],
    objectives: [
      { kind: 'deliver', to: 'works', item: 'lantern', count: 20 },
      { kind: 'power', supply: 30 },
    ],
    rewards: { flags: ['lantern_line'], points: { maudie: 100 }, scene: 'lantern_line' },
  },
  {
    id: 'finale', title: 'Lantern Night', arc: 'main', villager: 'odile',
    summary: 'Light the lanterns on Lantern Night, Winter 13.',
    requires: ['lantern_line'],
    earliest: dayOf(2, 3, 1),
    objectives: [{ kind: 'attend', festival: 'lantern' }],
    rewards: { scene: 'finale' },
  },

  // ---- Side arc: Ilo, "The Heron" --------------------------------------------------------------------
  {
    id: 'heron_mend', title: 'The Heron', arc: 'side', villager: 'ilo',
    summary: 'Help Ilo raise and patch Gran Marit\'s boat. Ilo needs wood and fibre.',
    requires: [],
    requiresFlags: ['heron_wreck'],
    objectives: [
      { kind: 'deliver', to: 'ilo', item: 'wood', count: 40 },
      { kind: 'deliver', to: 'ilo', item: 'fiber', count: 20 },
    ],
    rewards: { points: { ilo: 100 }, scene: 'heron_mended' },
  },
  {
    id: 'heron_sail', title: 'First Sail', arc: 'side', villager: 'ilo',
    summary: 'Become good friends with Ilo (5 hearts) and visit the lake.',
    requires: ['heron_mend'],
    objectives: [{ kind: 'flag', flag: 'heron_sailed' }],
    rewards: { tools: { rod: 1 }, flags: ['glowfin_dock'], scene: 'heron_reward' },
  },

  // ---- Side arc: Saffi, "The Seed Library" ------------------------------------------------------------
  {
    id: 'seed_tin', title: 'Where the Quartz Grows', arc: 'side', villager: 'saffi',
    summary: 'Find Saffi\'s mother\'s Seed Tin on the third floor of the mine.',
    requires: [],
    requiresFlags: ['seed_library_key'],
    objectives: [{ kind: 'reachFloor', floor: 3 }, { kind: 'pickup', item: 'seed_tin' }],
    rewards: { scene: 'seed_tin' },
  },
  {
    id: 'seed_library', title: 'The Seed Library', arc: 'side', villager: 'saffi',
    summary: 'Bring Saffi the tin and five different kinds of forage to restock the library.',
    requires: ['seed_tin'],
    objectives: [
      { kind: 'deliver', to: 'saffi', item: 'seed_tin', count: 1 },
      { kind: 'deliverKinds', to: 'saffi', category: 'forage', kinds: 5 },
    ],
    rewards: { items: [{ item: 'honeypear_sapling', n: 2 }], recipes: ['cook_mushroom_toast'], points: { saffi: 150 }, scene: 'seed_library_open' },
  },
];

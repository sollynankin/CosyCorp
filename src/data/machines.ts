import { MACHINE_BALANCE } from './balance';
import type { MachineDef, MachineKind } from './types';

interface MachineEntry {
  id: string;
  name: string;
  kind: MachineKind;
  description: string;
  source?: 'water' | 'wind';
  needsPower?: boolean;
}

const ENTRIES: MachineEntry[] = [
  { id: 'sprinkler', name: 'Sprinkler', kind: 'sprinkler', description: 'Waters the 3×3 around it every dawn.' },
  { id: 'pump_sprinkler', name: 'Pump Sprinkler', kind: 'sprinkler', needsPower: true, description: 'Waters the 5×5 around it every dawn, if powered.' },
  { id: 'seed_planter', name: 'Seed Planter', kind: 'planter', description: 'Plants seeds from its hopper on free soil within 2 tiles.' },
  { id: 'harvester', name: 'Harvester', kind: 'harvester', description: 'Picks ripe crops within 2 tiles and outputs them to its front.' },
  { id: 'conveyor', name: 'Conveyor', kind: 'belt', description: 'Carries items forward. One item every 3 minutes.' },
  { id: 'swift_conveyor', name: 'Swift Conveyor', kind: 'belt', description: 'Carries items forward. One item every minute.' },
  { id: 'splitter', name: 'Splitter', kind: 'splitter', description: 'Sends items front, right, left in turn.' },
  { id: 'jam_press', name: 'Jam Press', kind: 'crafter', description: 'Presses fruit into jam and butter.' },
  { id: 'preserver', name: 'Preserver', kind: 'crafter', description: 'Pickles vegetables. Preserves never spoil.' },
  { id: 'mill', name: 'Mill', kind: 'crafter', description: 'Grinds wheat into flour.' },
  { id: 'cheese_press', name: 'Cheese Press', kind: 'crafter', description: 'Turns milk into cheese.' },
  { id: 'silo', name: 'Silo', kind: 'storage', description: 'Stores 240 items. Nothing spoils inside. Outputs to its front.' },
  { id: 'market_chute', name: 'Market Chute', kind: 'seller', description: 'Sells anything fed into it, at 90% of the shipping price.' },
  { id: 'water_wheel', name: 'Water Wheel', kind: 'generator', source: 'water', description: 'Powers machines within 5 tiles. Must touch the stream.' },
  { id: 'windmill', name: 'Windmill', kind: 'generator', source: 'wind', description: 'Powers machines within 4 tiles. Stronger in wind.' },
  { id: 'heater', name: 'Heater', kind: 'heater', description: 'Keeps soil within 2 tiles warm in winter, if powered.' },
  { id: 'chest', name: 'Chest', kind: 'chest', description: 'A box for 12 stacks.' },
];

export const MACHINES: MachineDef[] = ENTRIES.map((e) => ({
  ...e,
  ...MACHINE_BALANCE[e.id],
  item: e.id,
  mesh: e.id,
}));

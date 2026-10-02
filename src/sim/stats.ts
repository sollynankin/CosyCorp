import type { DayStats, EntityDayStats, MachineStatus } from './state';

export function emptyDayStats(): DayStats {
  return {
    coinsShipped: 0,
    coinsChute: 0,
    coinsOther: 0,
    harvestedHand: 0,
    harvestedMachine: 0,
    crafted: 0,
    spoiled: 0,
    entities: {},
    sold: {},
    levelUps: [],
  };
}

export function statsFor(today: DayStats, id: number): EntityDayStats {
  const key = String(id);
  let s = today.entities[key];
  if (!s) {
    s = { produced: 0, moved: 0, working: 0, idle: 0, blocked: 0, unpowered: 0 };
    today.entities[key] = s;
  }
  return s;
}

export function recordStatus(today: DayStats, id: number, status: MachineStatus): void {
  statsFor(today, id)[status] += 1;
}

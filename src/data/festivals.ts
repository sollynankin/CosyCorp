// One festival per season (DESIGN.md §11). Villagers gather at their spots an hour before the start.
import type { FestivalDef } from './types';

export interface FestivalSpotDef extends FestivalDef {
  /** where each villager stands in town during the festival */
  spots: Record<string, [number, number]>;
}

export const FESTIVALS: FestivalSpotDef[] = [
  {
    id: 'blossom', name: 'Blossom Fair', season: 'spring', day: 13, start: '10:00', end: '16:00',
    blurb: 'Seed-pod hunt! Find the pods hidden around the square within three hours. Press E on a pod to pick it up.',
    spots: { maudie: [23, 13], wren: [19, 12], teo: [28, 18], pell: [26, 19], bram: [20, 19], ilo: [29, 13], saffi: [18, 16], odile: [27, 12] },
  },
  {
    id: 'derby', name: 'Glowfin Derby', season: 'summer', day: 12, start: '10:00', end: '16:00',
    blurb: 'Catch as many fish as you can from the town river in three hours.',
    spots: { maudie: [41, 15], wren: [40, 13], teo: [43, 13], pell: [38, 16], bram: [39, 18], ilo: [43, 18], saffi: [40, 19], odile: [42, 20] },
  },
  {
    id: 'weighin', name: 'Harvest Weigh-in', season: 'autumn', day: 11, start: '10:00', end: '16:00',
    blurb: 'Exhibit your proudest produce. Judged on value and quality. Press E at the judging table (the fountain).',
    spots: { maudie: [22, 14], wren: [19, 12], teo: [28, 18], pell: [26, 13], bram: [20, 19], ilo: [29, 13], saffi: [18, 16], odile: [27, 19] },
  },
  {
    id: 'lantern', name: 'Lantern Night', season: 'winter', day: 13, start: '17:00', end: '23:00',
    blurb: 'Lanterns along Kettle Street. Give a gift to your secret friend tonight for a warm surprise.',
    spots: { maudie: [23, 14], wren: [20, 17], teo: [27, 17], pell: [25, 13], bram: [19, 13], ilo: [29, 16], saffi: [18, 19], odile: [44, 16] },
  },
];

// The eight villagers of Hearthvale (DESIGN.md §9). Schedules: the first variant whose conditions hold wins,
// so specific variants (rain, a weekday, story flags) come before the default. A stop's time is when the
// villager sets off toward it; `hidden` stops are indoors. tests/villagers.test.ts checks every stop is
// reachable.
import type { ScheduleStop, VillagerDef } from './types';

const stop = (time: string, map: string, x: number, y: number, hidden = false): ScheduleStop => ({ time, map, x, y, hidden });

// Doors (hidden = inside) and the tile in front of them.
const SLUICE = stop('06:00', 'forest', 34, 9, true);
const COTTAGE = stop('06:00', 'forest', 8, 10, true);
const HUT = stop('06:00', 'lake', 32, 21, true);
const ALMANAC = (t: string) => stop(t, 'town', 9, 12, true);
const SMITHY = (t: string) => stop(t, 'town', 8, 19, true);
const JOINERY = (t: string) => stop(t, 'town', 37, 12, true);
const INN = (t: string) => stop(t, 'town', 36, 19, true);
const HALL = (t: string) => stop(t, 'town', 23, 8, true);

export const VILLAGERS: VillagerDef[] = [
  {
    id: 'odile',
    name: 'Odile Brask',
    role: 'Widow of the last Sluice Keeper. Lives in the Sluice House in Brackenwood.',
    romanceable: false,
    birthday: { season: 'autumn', day: 9 },
    appearance: { height: 1.5, build: 'slim', skin: '#e8c4a8', hair: '#d8d4cc', hairStyle: 'bun', top: '#5a6a7a', bottom: '#3a3a44', shoes: '#2a2a2a', accessories: ['cloak'], accent: '#a83a4a' },
    loves: ['honeypear', 'pear_butter', 'kale_kraut'],
    likes: ['hazelnut', 'wild_leek', 'tomato_soup', 'tag:fish'],
    dislikes: ['coal', 'quartz', 'lantern'],
    giftLines: {
      loved: 'Well. You have been paying attention. Thank you, truly.',
      liked: 'That is kind of you. I will put it to good use.',
      neutral: 'Mm. Thank you.',
      disliked: 'I would rather you had not. Keep it for someone who wants it.',
    },
    schedule: [
      { when: { weather: ['rain', 'storm', 'snow'] }, stops: [SLUICE, stop('13:00', 'forest', 34, 10), stop('14:30', 'forest', 34, 9, true)] },
      { stops: [SLUICE, stop('08:30', 'forest', 37, 11), stop('11:00', 'town', 23, 23), stop('14:00', 'town', 25, 18), stop('17:00', 'forest', 34, 9, true)] },
    ],
  },
  {
    id: 'maudie',
    name: 'Maudie Fenn',
    role: 'Keeps the Town Hall, the quest board and the festival calendar.',
    romanceable: false,
    birthday: { season: 'spring', day: 9 },
    appearance: { height: 1.55, build: 'round', skin: '#c8906a', hair: '#8a4a2a', hairStyle: 'curly', top: '#d8a040', bottom: '#5a4a6a', shoes: '#4a2a1a', accessories: ['clipboard', 'glasses'], accent: '#3a7a5a' },
    loves: ['pancakes', 'berry_tart', 'strawberry_jam'],
    likes: ['sweet_clover', 'cheese', 'egg', 'honeypear'],
    dislikes: ['catfish', 'eel', 'coal'],
    giftLines: {
      loved: 'Oh! Oh, you lovely thing. That is going straight on my desk where I can see it.',
      liked: 'How thoughtful! Noted, appreciated, filed under nice.',
      neutral: 'Thank you, dear. Every little bit.',
      disliked: 'Ah. Well. It is the thought, as they say.',
    },
    schedule: [
      { when: { weekday: [6] }, stops: [HALL('06:00'), stop('10:00', 'town', 21, 12), stop('12:00', 'town', 36, 19, true), stop('15:00', 'town', 27, 19), HALL('18:00')] },
      { stops: [HALL('06:00'), stop('08:00', 'town', 27, 11), HALL('09:30'), stop('13:00', 'town', 20, 14), HALL('14:00'), stop('18:30', 'town', 36, 19, true), HALL('21:00')] },
    ],
  },
  {
    id: 'wren',
    name: 'Wren Halloway',
    role: 'Runs Almanac & Sundries. Draws every plant she sells.',
    romanceable: true,
    birthday: { season: 'summer', day: 6 },
    appearance: { height: 1.62, build: 'slim', skin: '#f0d0b4', hair: '#c8582a', hairStyle: 'long', top: '#6a9a7a', bottom: '#4a4a5a', shoes: '#5a3a2a', accessories: ['glasses', 'scarf'], accent: '#e0b040' },
    loves: ['morel', 'chanterelle', 'melon', 'honeypear'],
    likes: ['sweet_clover', 'strawberry', 'pumpkin_pie', 'tag:mushroom'],
    dislikes: ['pickled_beets', 'stone', 'iron_ore'],
    giftLines: {
      loved: 'For me? I... I am going to draw this before I do anything else with it.',
      liked: 'Oh, that is lovely. Thank you!',
      neutral: 'Thank you! That is very nice of you.',
      disliked: 'Ah, that is... I will find a place for it. Somewhere.',
    },
    schedule: [
      { when: { weekday: [2] }, stops: [stop('06:00', 'town', 9, 12, true), stop('10:00', 'forest', 14, 12), stop('13:00', 'forest', 27, 14), stop('16:00', 'town', 9, 12, true)] },
      { when: { weather: ['rain', 'storm', 'snow'] }, stops: [ALMANAC('06:00'), stop('18:10', 'town', 36, 19, true), stop('21:00', 'town', 9, 12, true)] },
      { stops: [ALMANAC('06:00'), stop('08:00', 'town', 9, 13), ALMANAC('08:40'), stop('18:10', 'town', 21, 18), stop('19:30', 'town', 36, 19, true), stop('22:00', 'town', 9, 12, true)] },
    ],
  },
  {
    id: 'teo',
    name: 'Teo Marsh',
    role: 'The smith. Talks to engines more easily than to people.',
    romanceable: true,
    birthday: { season: 'winter', day: 4 },
    appearance: { height: 1.82, build: 'broad', skin: '#8a5a3a', hair: '#1a1410', hairStyle: 'short', top: '#7a3a2a', bottom: '#3a3a3a', shoes: '#2a1a12', accessories: ['goggles', 'apron'], accent: '#c8843a' },
    loves: ['corn_chowder', 'quartz', 'amethyst', 'fish_stew'],
    likes: ['copper_ore', 'iron_ore', 'pancakes', 'sweetcorn'],
    dislikes: ['sweet_clover', 'strawberry_jam', 'fiber'],
    giftLines: {
      loved: 'Huh. That is exactly... how did you know? Thank you.',
      liked: 'Good. That is good. Thanks.',
      neutral: 'Oh. Thanks.',
      disliked: 'Not really my thing. But thanks for thinking of me.',
    },
    schedule: [
      { when: { weekday: [5] }, stops: [SMITHY('06:00'), stop('09:00', 'lake', 20, 17), stop('13:00', 'lake', 26, 20), stop('16:00', 'town', 8, 19, true)] },
      { stops: [SMITHY('06:00'), stop('07:30', 'town', 7, 18), SMITHY('08:20'), stop('16:20', 'town', 43, 18), stop('18:30', 'town', 36, 19, true), stop('21:30', 'town', 8, 19, true)] },
    ],
  },
  {
    id: 'pell',
    name: 'Pell Aster',
    role: 'Keeps the Kettle Inn. Hears everything, repeats most of it.',
    romanceable: false,
    birthday: { season: 'summer', day: 11 },
    appearance: { height: 1.7, build: 'average', skin: '#d8a888', hair: '#3a2a4a', hairStyle: 'tuft', top: '#8a3a6a', bottom: '#2a2a3a', shoes: '#1a1a1a', accessories: ['apron'], accent: '#f0c060' },
    loves: ['cheese', 'harvest_medley', 'pumpkin'],
    likes: ['tag:fish', 'tomato', 'egg', 'milk'],
    dislikes: ['radish', 'fiber', 'stone'],
    giftLines: {
      loved: 'Now THAT is an ingredient. Tonight\'s special is named after you.',
      liked: 'Ooh, the kitchen thanks you. As do I.',
      neutral: 'Very kind. It will find its way into a soup.',
      disliked: 'Darling, no. But I admire the confidence.',
    },
    schedule: [
      { stops: [INN('06:00'), stop('09:00', 'town', 26, 16), stop('10:30', 'town', 36, 19, true)] },
    ],
  },
  {
    id: 'bram',
    name: 'Bram Toller',
    role: 'Joiner. Built half the town and Ros\'s farmhouse door.',
    romanceable: false,
    birthday: { season: 'autumn', day: 3 },
    appearance: { height: 1.74, build: 'broad', skin: '#e0b090', hair: '#a8a8a8', hairStyle: 'short', top: '#4a6a3a', bottom: '#5a4a3a', shoes: '#3a2a1a', accessories: ['flatcap'], accent: '#8a5a2a' },
    loves: ['hazelnut', 'bramble_jam', 'pickled_carrots'],
    likes: ['blackberry', 'corn_relish', 'beetroot', 'cheese'],
    dislikes: ['snowberry', 'melon_jam', 'quartz'],
    giftLines: {
      loved: 'Ha! Ros used to bring me these. You have her knack.',
      liked: 'Much obliged.',
      neutral: 'Thank you kindly.',
      disliked: 'Hm. I will pass that on to someone with a stronger stomach.',
    },
    schedule: [
      { when: { weather: ['rain', 'storm', 'snow'] }, stops: [JOINERY('06:00'), stop('17:30', 'town', 36, 19, true), stop('20:00', 'town', 37, 12, true)] },
      { stops: [JOINERY('06:00'), stop('07:00', 'town', 38, 14), JOINERY('08:30'), stop('12:00', 'town', 29, 20), JOINERY('13:00'), stop('17:30', 'town', 36, 19, true), stop('20:00', 'town', 37, 12, true)] },
    ],
  },
  {
    id: 'ilo',
    name: 'Ilo Quill',
    role: 'Fishes Stillmere every day. Lives in the hut on the east shore.',
    romanceable: false,
    birthday: { season: 'spring', day: 5 },
    appearance: { height: 1.45, build: 'slim', skin: '#b8805a', hair: '#2a1a12', hairStyle: 'braids', top: '#e0b03a', bottom: '#3a5a7a', shoes: '#5a2a1a', accessories: ['rainhat'], accent: '#3a8ac8' },
    loves: ['glowfin', 'pike', 'berry_tart', 'blackberry'],
    likes: ['tag:fish', 'snowberry', 'pancakes', 'hazelnut'],
    dislikes: ['kale_kraut', 'frostkale', 'beetroot'],
    giftLines: {
      loved: 'No WAY. Can I keep it? I am keeping it.',
      liked: 'Nice! Thanks!',
      neutral: 'Oh, cool. Thanks.',
      disliked: 'Ugh. Um. Thanks, I guess?',
    },
    schedule: [
      { when: { weather: ['storm', 'snow'] }, stops: [HUT, stop('11:00', 'town', 36, 19, true), stop('15:00', 'lake', 32, 21, true)] },
      { stops: [HUT, stop('06:30', 'lake', 20, 18), stop('12:00', 'lake', 24, 19), stop('13:00', 'lake', 20, 16), stop('18:00', 'town', 43, 17), stop('20:00', 'lake', 32, 21, true)] },
    ],
  },
  {
    id: 'saffi',
    name: 'Saffi Rook',
    role: 'Forager and seed-saver. Her cottage is in the heart of Brackenwood.',
    romanceable: false,
    birthday: { season: 'winter', day: 10 },
    appearance: { height: 1.66, build: 'average', skin: '#6a4a3a', hair: '#1a1a1a', hairStyle: 'braids', top: '#7a8a4a', bottom: '#4a3a2a', shoes: '#3a2a1a', accessories: ['satchel', 'headscarf'], accent: '#c84a3a' },
    loves: ['sweet_clover', 'snowberry', 'winter_root', 'wild_leek'],
    likes: ['tag:mushroom', 'mushroom_toast', 'honeypear', 'hazelnut'],
    dislikes: ['coal', 'catfish', 'flour'],
    giftLines: {
      loved: 'Where did you find this one? No, wait, don\'t tell me. I want to look myself.',
      liked: 'Mm, good. This will keep.',
      neutral: 'Thank you.',
      disliked: 'Oh. I don\'t think so. But thank you.',
    },
    schedule: [
      { when: { weather: ['rain'] }, stops: [COTTAGE, stop('07:00', 'forest', 15, 20), stop('11:00', 'forest', 31, 23), stop('15:00', 'forest', 8, 10, true)] },
      { when: { weekday: [3] }, stops: [COTTAGE, stop('09:00', 'town', 11, 14), stop('11:00', 'town', 9, 12, true), stop('13:00', 'forest', 8, 10, true)] },
      { stops: [COTTAGE, stop('07:30', 'forest', 5, 14), stop('10:00', 'forest', 25, 21), stop('14:00', 'forest', 8, 11), stop('16:00', 'forest', 8, 10, true)] },
    ],
  },
];

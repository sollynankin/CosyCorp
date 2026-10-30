// Plain-language "what do I do now?" help for the journal. Content only: the journal picks the entry for
// each active quest and adds live progress. Keep steps short and concrete (where, with what, which key).

/** Where to get an item, used when a delivery or craft step is short of it. */
export const ITEM_SOURCES: Record<string, string> = {
  wood: 'Chop trees with the Axe (hotbar 3). Trees on the farm grow back from stumps, and the forest has plenty.',
  stone: 'Break stones and boulders with the Pickaxe (hotbar 4). The farm has some; the mine has many more.',
  fiber: 'Cut weeds with the Scythe (hotbar 5): some drop fibre.',
  copper_ore: 'Mine rocks inside the mine (south of the Forest) with the Pickaxe. Copper shows up on every floor.',
  iron_ore: 'Iron starts appearing from mine floor 5. Break the rocks with the Pickaxe; the lift at floors 5 and 10 saves the walk down.',
  quartz: 'Quartz turns up from mine floor 3 down. Break the rocks with the Pickaxe.',
};

/** Steps for each quest, in the order to do them. Shown under the quest in "What next?". */
export const QUEST_HINTS: Record<string, string[]> = {
  first_harvest: [
    'Hotbar 1 is the Hoe: click grass near the farmhouse to till it into soil.',
    'Hotbar 7 is Radish Seeds: select them and click the tilled soil. Radishes ripen in 3 days.',
    'Hotbar 2 is the Watering Can: water the soil every day (it refills when you use it on any water, like the stream on the left).',
    'Sleep in the farmhouse (E at the front door) to pass the night. When a radish is ripe, press E or right-click it to harvest.',
    'The Shipping Bin is the brown box by the farmhouse: press E at its front and put 5 crops in. You are paid straight away.',
  ],
  gears: [
    'Odile runs the Works Hall, the big building at the bottom of the town (east of the farm, through the gate on the right edge).',
    'Collect 40 wood, 25 stone and 5 copper ore (see below for where) and keep them in your backpack.',
    'Stand at the Works Hall door, press E, and use "Hand over" on the quest.',
  ],
  blossom: [
    'This one needs no gathering: be in the town square on Spring 13 between 10:00 and 16:00.',
    'Even if you miss it, the story carries on. But the fair is fun: take part in the seed-pod hunt.',
  ],
  pressing: [
    'Open Build mode (B) and place the Water Wheel on the stream at the left edge of the farm. It must touch the water. That gives the farm power.',
    'Bring any 20 crops (radishes are fine) to the Works Hall and hand them over.',
    'Machines near the Water Wheel (within 5 tiles) get power. Press F to see power coverage.',
  ],
  undersluice: [
    'Go south from the farm into the Forest, then through the cave mouth at the bottom into the mine.',
    'Each floor has a hidden ladder under a rock: break rocks with the Pickaxe to find it. Reach floor 5.',
    'On floor 5, look for the leather logbook on a ledge and pick it up (E). Bring food and rest if your energy runs low: you wake up at home if you pass out.',
    'This quest starts on Summer 1 at the earliest.',
  ],
  open_together: [
    'Talk to Odile in the town (the Works Hall) most days, and give her gifts she likes, to reach 2 hearts.',
    'Hand 10 copper ore and 5 iron ore over at the Works Hall (iron comes from mine floor 5 and below).',
  ],
  great_wheel: [
    'After the Thaw Flood storm (early Spring, Year 2) your wheel is silted. Bram wants timber, stone and iron.',
    'Hand 80 wood, 40 stone and 10 iron ore over at the Works Hall.',
  ],
  lantern_line: [
    'Press C to open crafting and make Lanterns (1 copper ore + 1 quartz each). You need 20.',
    'Also keep at least 30 power running on the farm: more Water Wheels and Windmills (build mode, B).',
    'Hand the lanterns over at the Works Hall.',
  ],
  finale: ['Be in the town on Winter 13 of Year 2 for Lantern Night. Nothing to gather.'],
  heron_mend: [
    'Ilo lives at the lake (north of town). Becoming friends with Ilo (2 hearts) sets this off: talk to them and give gifts.',
    'Then bring 40 wood and 20 fibre to Ilo.',
  ],
  heron_sail: ['Reach 5 hearts with Ilo, then visit the lake and talk to them.'],
  seed_tin: [
    'Saffi lives in the forest. Become friends with Saffi (2 hearts) to hear about her mother\'s Seed Tin.',
    'Then reach floor 3 of the mine and pick up the tin.',
  ],
};

/** The general "I have nothing to do" advice, shown when no quest needs attention right now. */
export const IDLE_TIPS: string[] = [
  'Plant seeds that match the season (the Almanac & Sundries in town sells them) and ship your harvest.',
  'Talk to townspeople every day: friendship (hearts) unlocks scenes and gifts.',
  'Press B for build mode: sprinklers, harvesters and belts do the daily chores for you.',
  'Check the quest board in the town square for paid weekly jobs.',
];

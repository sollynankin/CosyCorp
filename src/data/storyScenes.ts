// Story scenes queued by quests (data/quests.ts) and festivals. No trigger: the quest system queues them.
import type { SceneDef } from './types';

export const STORY_SCENES: SceneDef[] = [
  {
    id: 'arrival', title: 'A Key and a Kettle',
    lines: [
      { who: 'narrator', text: 'The bus leaves you at the end of a lane gone wild with cow parsley. At the bottom: a farmhouse, a yard full of rusted iron, and a stream.' },
      { who: 'maudie', text: 'You made it! Maudie Fenn, Town Hall, welcome committee, entire committee. Here is the key. Here is the kettle. The kettle is more important.' },
      { who: 'maudie', text: 'Rosamund left you Penhallow Yard. It was the Guild\'s testing yard, back when the Works ran. Belts, wheels, presses. All asleep now.' },
      { who: 'maudie', text: 'Start small. Clear a patch, plant some radishes, ship them in the bin by the house. The town will notice. Towns do.' },
      { who: 'narrator', text: 'On the kitchen table is a note in spidery handwriting: "Grow something. Then wake the wheel. Love, Ros."' },
    ],
  },
  {
    id: 'first_harvest', title: 'First Harvest',
    lines: [
      { who: 'narrator', text: 'Someone has left a parcel on the doorstep, wrapped in oilcloth. Inside: a brass sprinkler head, and a blueprint.' },
      { who: 'odile', text: '(A card, in stiff capitals:) ROSAMUND WOULD HAVE WANTED YOU TO STOP CARRYING WATER. THE WORKS HALL IS OPEN TUESDAY TO SUNDAY. O.B.' },
      { who: 'narrator', text: 'You can now craft Sprinklers (C). Odile Brask, it seems, keeps the keys to the Works Hall.' },
    ],
  },
  {
    id: 'yard_wheel', title: 'Gears and Grease',
    lines: [
      { who: 'narrator', text: 'Odile unlocks a cabinet in the Works Hall. Inside, wrapped in oiled cloth, is a Guild water-wheel, small enough to carry.' },
      { who: 'odile', text: 'The yard had one. Hollis took it out the year he died, for mending. He never finished. I have kept it oiled for twelve years. Do not ask me why.' },
      { who: 'odile', text: 'Put it by the stream. Anything within five paces will run on it. Belts, harvesters, the chute. The blueprints are in the drawer. Take them.' },
      { who: 'narrator', text: 'You learned: Water Wheel, Conveyor, Harvester and Market Chute. Place machines with B; F shows how things flow.' },
    ],
  },
  {
    id: 'pressing_room', title: 'The Pressing Room',
    lines: [
      { who: 'narrator', text: 'Behind the Works Hall is a long room that smells of old fruit and older oak. Presses stand in rows under dust sheets.' },
      { who: 'teo', text: 'I have wanted to get in here since I was six. Jam Press. Preserver. Look at the splitter castings, they\'re beautiful.' },
      { who: 'odile', text: 'Take the patterns. Teo will help you with the ironwork. He has been pestering me about it for a decade.' },
      { who: 'narrator', text: 'You learned: Jam Press, Preserver, Silo, Splitter and Seed Planter.' },
    ],
  },
  {
    id: 'logbook', title: 'The Last Entry',
    lines: [
      { who: 'narrator', text: 'On a dry ledge on the fifth floor, wedged behind a valve wheel, is a leather logbook. Hollis Brask, Sluice Keeper.' },
      { who: 'narrator', text: 'Pages of water levels and jokes about the weather. The last entry, in a different hand, is underlined twice.' },
      { who: 'odile', text: '(In Odile\'s handwriting:) "I closed them. I could not stand to hear them wear out with nobody left to mend them. Forgive me, love."' },
      { who: 'narrator', text: 'The Works never broke. Somebody stopped them. You should talk to Odile.' },
    ],
    effects: { flags: ['logbook_found'] },
  },
  {
    id: 'open_together', title: 'Open Them Together',
    lines: [
      { who: 'narrator', text: 'Dawn at the sluice gates. Odile stands at the great iron wheel with your parts in a basket at her feet.' },
      { who: 'odile', text: 'You read it. Everyone will know by lunchtime. Pell will make sure.' },
      { who: 'odile', text: 'I thought nobody would ever mend them. And then a farmer turned up with a toolbox and terrible boots.' },
      { who: 'odile', text: 'He always said it took two to open them. Take the other side.' },
      { who: 'narrator', text: 'The wheel groans, then gives. Water roars down the race. Somewhere in town, a lamp flickers on for the first time in twelve years.' },
      { who: 'narrator', text: 'Water power is doubled. You learned: Mill, Swift Conveyor, Windmill, Heater and Pump Sprinkler.' },
    ],
  },
  {
    id: 'thaw_flood', title: 'The Thaw Flood',
    lines: [
      { who: 'narrator', text: 'All night the storm hammered the valley. In the morning the stream is brown and roaring, and something in the hills went CRACK.' },
      { who: 'bram', text: 'The Great Wheel\'s axle. Snapped clean through. Forty years of oak.' },
      { who: 'odile', text: 'And your yard wheel is choked with silt. It will turn, but slowly. Half power, at best.' },
      { who: 'bram', text: 'I\'ve kept a beam for this. Bring me timber, stone and iron and we\'ll raise it again. The old greenhouse frame can come too, while we\'re at it.' },
    ],
  },
  {
    id: 'great_wheel', title: 'Raising the Great Wheel',
    lines: [
      { who: 'narrator', text: 'It takes the whole town and most of a day. Bram shouts, Teo hammers, Maudie keeps a list of who is pulling hardest.' },
      { who: 'narrator', text: 'When the Great Wheel turns, the silt in your stream washes out in a single brown rush.' },
      { who: 'bram', text: 'And that frame in your yard is a greenhouse again. Warm all year. Ros grew lemons in there once. Lemons!' },
      { who: 'narrator', text: 'Water power is restored, and the Greenhouse is open: its floor is always warm.' },
    ],
  },
  {
    id: 'lantern_line', title: 'The Lantern Line',
    lines: [
      { who: 'narrator', text: 'Twenty lanterns hang along Kettle Street on the old Guild line, dark for now.' },
      { who: 'maudie', text: 'They light themselves on Lantern Night, from your power. If it fails we will all look very silly in the dark. No pressure!' },
    ],
  },
  {
    id: 'finale', title: 'Lantern Night',
    lines: [
      { who: 'narrator', text: 'At dusk the whole town gathers on Kettle Street. Somewhere upstream, your wheels are turning.' },
      { who: 'maudie', text: 'Ladies, gentlemen, everyone else: for the first time in fourteen years...' },
      { who: 'narrator', text: 'One by one the lanterns come on, down the street, over the bridge, out toward Penhallow Yard.' },
      { who: 'odile', text: 'Listen. Can you hear it? The whole valley is humming.' },
      { who: 'odile', text: 'Thank you. From both of us.' },
      { who: 'narrator', text: 'The Works are awake. The story is done, but the farm goes on: there is always another season.' },
    ],
    effects: { flags: ['finale'] },
  },
  {
    id: 'missed_festival', title: 'You Missed It',
    lines: [
      { who: 'maudie', text: 'There you are! The festival came and went. You were missed. I wrote it down. In the book.' },
      { who: 'maudie', text: 'Never mind. There\'s always next year, and I saved you a bun.' },
    ],
  },
  {
    id: 'heron_mended', title: 'Planks and Rope',
    lines: [
      { who: 'ilo', text: 'That\'s the last plank. She floats! She actually floats! I need to sit down. On the boat. Carefully.' },
      { who: 'ilo', text: 'Come back when we know each other better and we\'ll take her out. Gran said you only sail the first time with a friend.' },
    ],
    effects: { flags: ['heron_mended'] },
  },
  {
    id: 'heron_reward', title: 'The Sturdy Rod',
    lines: [
      { who: 'ilo', text: 'Gran\'s rod. Sturdier than yours. Glowfin bite off the dock now, I\'m sure of it. Well, quite sure.' },
      { who: 'narrator', text: 'Your fishing rod is upgraded. Glowfin can now be caught from the lake dock.' },
    ],
  },
  {
    id: 'seed_tin', title: 'The Seed Tin',
    lines: [
      { who: 'narrator', text: 'Between two teeth of quartz on the third floor sits a dented tin. "ROOK" is scratched on the lid. It rattles.' },
      { who: 'narrator', text: 'Saffi will want this. Badly.' },
    ],
  },
  {
    id: 'seed_library_open', title: 'The Seed Library',
    lines: [
      { who: 'narrator', text: 'Saffi has cleared a shelf in her cottage for the tin\'s packets, each labelled in her mother\'s hand.' },
      { who: 'saffi', text: 'Honeypear. She saved honeypear pips. The whole valley used to have them and now there will be two trees, and they are yours.' },
      { who: 'saffi', text: 'The library is open again. Wren will stock the saplings. And here, mother\'s mushroom toast. Don\'t tell anyone it is mostly butter.' },
    ],
    effects: { flags: ['seed_library'] },
  },
];

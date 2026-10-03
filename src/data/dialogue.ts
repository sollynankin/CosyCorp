// Villager dialogue (DESIGN.md §9). Selection: among lines whose conditions all hold, a hash of (day, villager)
// makes a pick weighted toward lines with more conditions. Story flags used here: yard_wheel, pressing_room,
// logbook_found, sluice_open, silted, great_wheel, lantern_line, finale, heron_wreck, heron_sailed, seed_library.
import type { DialogueLine } from './types';

const L = (villager: string, text: string, when?: DialogueLine['when']): DialogueLine => ({ villager, text, when });

export const DIALOGUE: DialogueLine[] = [
  // ---- Odile ---------------------------------------------------------------------------------------
  L('odile', 'You are Rosamund\'s grand-niece? Hm. You have her chin. Mind the yard wheel, it bites.'),
  L('odile', 'The river is loud today. It always was, before.'),
  L('odile', 'I walk past the Works Hall every day. Habit. Don\'t read anything into it.'),
  L('odile', 'Rain. Good for the roses, bad for my knees.', { weather: ['rain'] }),
  L('odile', 'Snow on the sluice gates. Hollis used to chip it off with a teaspoon, the fool. A silver one.', { season: ['winter'], minHearts: 3 }),
  L('odile', 'So the yard wheel turns again. I heard it from the forest path this morning. I had to sit down.', { flags: ['yard_wheel'], notFlags: ['sluice_open'] }),
  L('odile', 'You found his logbook. I know. I can see it in how you\'re looking at me.', { flags: ['logbook_found'], notFlags: ['sluice_open'] }),
  L('odile', 'The gates are open and the town is humming. He would have pretended not to be pleased.', { flags: ['sluice_open'], notFlags: ['silted'] }),
  L('odile', 'Floods come. Wheels break. You mend them. That was the whole of Hollis\'s philosophy.', { flags: ['silted'], notFlags: ['great_wheel'] }),
  L('odile', 'My roses are coming in. Don\'t tell anyone I said they were beautiful.', { season: ['summer'], minHearts: 2 }),
  L('odile', 'You can call me Odile. Everyone else is too frightened to.', { minHearts: 4 }),
  L('odile', 'Lantern Night again. Light one for him, would you? I will be watching from the bridge.', { season: ['winter'], flags: ['lantern_line'] }),

  // ---- Maudie --------------------------------------------------------------------------------------
  L('maudie', 'Welcome, welcome! I have a list of everything you need to know. It is only four pages.'),
  L('maudie', 'The board outside has requests every Monday. People do love to be helped, and to complain.'),
  L('maudie', 'If you need me I am in the Hall, unless I am at the Inn, in which case I am working. Hard.'),
  L('maudie', 'Monday! Fresh requests on the board. I wrote them in my best handwriting.', { weekday: [0] }),
  L('maudie', 'The Blossom Fair is on the thirteenth! Pod hunt in the square. I am very competitive about it.', { season: ['spring'], notFlags: ['pressing_room'] }),
  L('maudie', 'The Glowfin Derby is on the twelfth. Bring a rod and an empty afternoon.', { season: ['summer'] }),
  L('maudie', 'Harvest Weigh-in on the eleventh! Bring your proudest thing. Pumpkins count double in my heart, not in the rules.', { season: ['autumn'] }),
  L('maudie', 'Lantern Night on the thirteenth. It is the one night the whole town agrees on something.', { season: ['winter'] }),
  L('maudie', 'Rain on the paperwork! Rain everywhere. I have three umbrellas and lost all of them.', { weather: ['rain', 'storm'] }),
  L('maudie', 'Do you know, the Hall\'s lamps run on your water now. I keep switching them on just to watch.', { flags: ['sluice_open'] }),
  L('maudie', 'I keep a little book of everyone\'s birthdays. You are in it now. In pen.', { minHearts: 3 }),

  // ---- Wren ----------------------------------------------------------------------------------------
  L('wren', 'Hello! Seeds are on the left, sundries on the right, and my sketchbook is NOT for sale.'),
  L('wren', 'Radishes are the friendliest crop. Three days and they\'re up. Very encouraging.', { season: ['spring'] }),
  L('wren', 'Sunpeppers love heat. So do I, honestly. Winter is long.', { season: ['summer'] }),
  L('wren', 'Pumpkins! The most dramatic vegetable. They just sit there getting bigger at you.', { season: ['autumn'] }),
  L('wren', 'Only frostkale goes in the ground now. Unless you can keep the soil warm somehow...', { season: ['winter'] }),
  L('wren', 'The rain does all my watering for me, but it also does all my drawing for me. Smudge, smudge.', { weather: ['rain'] }),
  L('wren', 'Wednesday walk! I draw whatever is growing in Brackenwood. Today it is mostly mud.', { weekday: [2], map: 'forest' }),
  L('wren', 'You brought the yard wheel back? I want to draw it. Can I come by and draw it?', { flags: ['yard_wheel'], minHearts: 2 }),
  L('wren', 'I drew you, by the way. From memory. Your hat came out better than your face. Sorry!', { minHearts: 5 }),
  L('wren', 'I keep looking up when the bell over the door rings. In case it is you.', { minHearts: 7 }),
  L('wren', 'I pressed one of the flowers you gave me in the sketchbook. Page one.', { courting: true }),
  L('wren', 'Good morning, farmer of mine. I brought you a drawing of your own house. Very meta.', { married: true }),

  // ---- Teo -----------------------------------------------------------------------------------------
  L('teo', 'Smithy. Ore, tools. Hi.'),
  L('teo', 'Copper for the first upgrade, iron for the next. Bring the tool and I\'ll have it back in two days.'),
  L('teo', 'The forge is warmest in winter. Everybody suddenly needs a nail fixed.', { season: ['winter'] }),
  L('teo', 'Saturdays I fish. I don\'t catch anything. That is not the point.', { weekday: [5, 6] }),
  L('teo', 'Your yard wheel. The bearings are Guild work. They don\'t make them like that any more. I would know, I tried.', { flags: ['yard_wheel'] }),
  L('teo', 'Gears and belts and water. I grew up thinking the Works were a ghost story. Now I\'m oiling them.', { flags: ['pressing_room'], minHearts: 2 }),
  L('teo', 'A storm. I love a storm. Very bad for business, very good for listening to.', { weather: ['storm'] }),
  L('teo', 'I made you something. It is a hook. For hanging things. It\'s a good hook.', { minHearts: 5 }),
  L('teo', 'I practise what to say to you while I\'m hammering. It goes better with the hammer.', { minHearts: 7 }),
  L('teo', 'I fixed the gate latch at your place. And the kettle. And the other kettle. I like it here.', { married: true }),

  // ---- Pell ----------------------------------------------------------------------------------------
  L('pell', 'Welcome to the Kettle! Soup of the day is soup. Gossip of the day is free.'),
  L('pell', 'Everyone comes through here eventually. Everyone. Even Odile, though she pretends she\'s lost.'),
  L('pell', 'Rainy day, full house. Rain is my favourite customer.', { weather: ['rain', 'storm'] }),
  L('pell', 'Word is you got the yard wheel turning. Word is also you fell in the stream doing it. Both true?', { flags: ['yard_wheel'] }),
  L('pell', 'Tomatoes! Bring me tomatoes. I have a soup that needs them and a reputation that needs the soup.', { season: ['summer'] }),
  L('pell', 'Somebody\'s been asking about you. Won\'t say who. I\'m a vault. A leaky vault.', { minHearts: 3 }),
  L('pell', 'Ribbon Charms are behind the bar for anyone with a sweetheart. I am not crying. You are crying.', { flags: ['eight_hearts_romance'] }),
  L('pell', 'The ovens run on Works water again. Bread rises faster. Coincidence? I think not.', { flags: ['sluice_open'] }),

  // ---- Bram ----------------------------------------------------------------------------------------
  L('bram', 'Joinery. Coops, barns, bigger houses. Bring wood or bring coin. Preferably both.'),
  L('bram', 'Ros and I built that farmhouse door together. It sticks in the damp. So did she.'),
  L('bram', 'Wood swells in the rain. So do my knees. We are both old timber.', { weather: ['rain', 'snow'] }),
  L('bram', 'Thinking of chickens? A coop pays for itself by summer. Eggs, eggs and eggs.', { notFlags: ['built_coop'] }),
  L('bram', 'I hear your hens from here. Happy birds. Good.', { flags: ['built_coop'] }),
  L('bram', 'The Guild built the Works to last a hundred years. Twelve years of nobody is nothing. You\'ll see.', { flags: ['yard_wheel'] }),
  L('bram', 'The flood took the old axle. Oak, it was. I\'ve kept a beam for twelve years in case. Now\'s the case.', { flags: ['silted'], notFlags: ['great_wheel'] }),
  L('bram', 'You remind me of Ros. That is the best thing I can say about anybody.', { minHearts: 5 }),

  // ---- Ilo -----------------------------------------------------------------------------------------
  L('ilo', 'Shh. The perch are thinking about it. Oh. They decided no.'),
  L('ilo', 'Did you know the Glowfin only bites in summer? And only in the river. And only if it likes you.'),
  L('ilo', 'My gran\'s boat is under the dock. Was. Is. It\'s complicated.', { notFlags: ['heron_wreck'] }),
  L('ilo', 'Rain is the best fishing. Fish can\'t see you through it. Probably.', { weather: ['rain'] }),
  L('ilo', 'Frozen lake. Gran used to cut a hole and fish through it. I tried. I am not allowed to try again.', { season: ['winter'] }),
  L('ilo', 'The Heron needs planks and rope. Planks, rope and a miracle. Two out of three is fine.', { flags: ['heron_wreck'], notFlags: ['heron_sailed'] }),
  L('ilo', 'We SAILED. She sailed. Gran\'s boat sailed. I\'m going to say it every day forever.', { flags: ['heron_sailed'] }),
  L('ilo', 'You can borrow my lucky float. Don\'t lose it. It isn\'t lucky, it\'s just mine.', { minHearts: 4 }),

  // ---- Saffi ---------------------------------------------------------------------------------------
  L('saffi', 'Careful where you step. That is a wild leek, and that one is my lunch.'),
  L('saffi', 'Every seed is a letter from last year. Most of them say "plant me".'),
  L('saffi', 'Morels after rain. Go, now, before the deer find them.', { weather: ['rain'], season: ['spring'] }),
  L('saffi', 'Snowberries are sweetest after the first frost. Like some people.', { season: ['winter'] }),
  L('saffi', 'Chanterelles in autumn, under the beeches. I\'m telling you this because I like you. A little.', { season: ['autumn'], minHearts: 2 }),
  L('saffi', 'There was a seed library once. Under the old granary. The flood took it. I keep a key on my bootlace.', { notFlags: ['seed_library'], minHearts: 1 }),
  L('saffi', 'The library is open. Every jar is labelled. Some of them twice, because I was excited.', { flags: ['seed_library'] }),
  L('saffi', 'Thursdays I take cuttings to Wren. She draws them, I name them. We argue about the names.', { weekday: [3] }),
];

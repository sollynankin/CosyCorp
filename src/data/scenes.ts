// Heart events and ceremonies (DESIGN.md §9). A scene with a `trigger` plays once, the first time you enter
// (or are on) its map while every condition holds. Story scenes queued by quests live in storyScenes.ts.
import { STORY_SCENES } from './storyScenes';
import type { SceneDef } from './types';

const HEART_EVENTS: SceneDef[] = [
  // ---- Odile ---------------------------------------------------------------------------------------
  {
    id: 'odile_2', villager: 'odile', title: 'The Teaspoon',
    trigger: { map: 'forest', minHearts: 2, from: '09:00', to: '16:00' },
    lines: [
      { who: 'narrator', text: 'Odile sits on the Sluice House step, polishing a silver teaspoon that is already very clean.' },
      { who: 'odile', text: 'Hollis used this on the gates. Chipping ice. I told him it was a wedding present. He said that made it lucky.' },
      { who: 'odile', text: 'Twelve winters it has sat in a drawer. I don\'t know why I took it out today.' },
    ],
    choices: [
      { text: 'Ask what Hollis was like.', reply: '"Stubborn. Kind. Loud. He sang to the wheels." She almost smiles.', points: 40 },
      { text: 'Offer to help with the roses.', reply: '"The roses do not need help. But you may sit." You sit.', points: 30 },
      { text: 'Leave her to it.', reply: 'She nods without looking up. It seems to be what she wanted.', points: 10 },
    ],
  },
  {
    id: 'odile_5', villager: 'odile', title: 'Roses at Dusk',
    trigger: { map: 'forest', minHearts: 5, from: '17:00', to: '21:00', weather: ['sunny'] },
    lines: [
      { who: 'narrator', text: 'The roses by the Sluice House have climbed right up to the gutter. Odile is cutting one.' },
      { who: 'odile', text: 'He planted these the year we married. I meant to dig them up when he died. I meant to do a lot of things.' },
      { who: 'odile', text: 'Do you know what I miss? Not him, not only him. The noise. The whole valley used to hum.' },
      { who: 'odile', text: 'Here. For the farmhouse table. Rosamund would want something alive in there.' },
    ],
    effects: { flags: ['odile_roses'], items: [{ item: 'sweet_clover', n: 3 }] },
  },

  // ---- Maudie --------------------------------------------------------------------------------------
  {
    id: 'maudie_2', villager: 'maudie', title: 'Four Pages',
    trigger: { map: 'town', minHearts: 2, from: '09:00', to: '17:00', weather: ['sunny'] },
    lines: [
      { who: 'narrator', text: 'A gust lifts a sheaf of paper out of Maudie\'s arms and scatters it across the square.' },
      { who: 'maudie', text: 'My lists! Grab them, grab them, the green one is the festival budget!' },
      { who: 'narrator', text: 'You catch one by the fountain. It is headed "NEW FARMER: things they might need". Item 1: a friend.' },
      { who: 'maudie', text: 'Ah. You weren\'t meant to see that one. Well. Consider item one in progress.' },
    ],
    choices: [
      { text: '"Item one: done."', reply: 'Maudie goes pink and crosses it off with a flourish.', points: 40 },
      { text: 'Hand it back politely.', reply: '"Thank you, dear." She files it somewhere private.', points: 20 },
    ],
  },
  {
    id: 'maudie_5', villager: 'maudie', title: 'The Birthday Book',
    trigger: { map: 'town', minHearts: 5, from: '18:00', to: '22:00' },
    lines: [
      { who: 'narrator', text: 'Maudie waves you over to a bench, a battered little book open on her knee.' },
      { who: 'maudie', text: 'Everybody\'s birthday since 1971. I never cross anyone out. Look, here is Rosamund. Spring the eighth.' },
      { who: 'maudie', text: 'I still bake her a bun every year. I eat it myself, obviously. It would be rude to waste it.' },
      { who: 'maudie', text: 'This year I will bake two. You will come. That is not a question, it is in the book.' },
    ],
    effects: { flags: ['maudie_book'] },
  },

  // ---- Wren ----------------------------------------------------------------------------------------
  {
    id: 'wren_2', villager: 'wren', title: 'The Sketchbook',
    trigger: { map: 'town', minHearts: 2, from: '08:00', to: '17:00' },
    lines: [
      { who: 'narrator', text: 'Wren is sitting on the shop step with her sketchbook, drawing a weed growing out of the paving.' },
      { who: 'wren', text: 'Don\'t look! It isn\'t finished. It is never finished. That is the problem with dandelions.' },
      { who: 'wren', text: 'Everyone draws roses. Nobody draws the things that come up through the cracks.' },
    ],
    choices: [
      { text: '"Can I see the rest?"', reply: 'She hesitates, then hands it over. It is full of weeds, each one drawn like a portrait.', points: 40 },
      { text: '"Draw me one of my radishes."', reply: '"A portrait of a radish. Bold. Yes."', points: 30 },
    ],
  },
  {
    id: 'wren_5', villager: 'wren', title: 'Drawing the Wheel',
    trigger: { map: 'farm', minHearts: 5, from: '09:00', to: '16:00', flags: ['yard_wheel'] },
    lines: [
      { who: 'narrator', text: 'Wren is perched on a fence post by the stream, drawing your water-wheel.' },
      { who: 'wren', text: 'I asked the wheel\'s permission. It said nothing, which I took as yes.' },
      { who: 'wren', text: 'My dad worked here, you know. Before. He would bring me and I would draw the belts going round. I was terrible at it.' },
      { who: 'wren', text: 'I am still terrible at it. But the wheel is turning again, so I get another go.' },
    ],
    effects: { flags: ['wren_drew_wheel'] },
  },
  {
    id: 'wren_8', villager: 'wren', title: 'Lamplight',
    trigger: { map: 'town', minHearts: 8, from: '19:00', to: '23:30' },
    lines: [
      { who: 'narrator', text: 'The street lamps come on one by one. Wren is standing under the last one, not drawing anything.' },
      { who: 'wren', text: 'I keep starting a picture of you and stopping. You keep moving. Not literally. In my head.' },
      { who: 'wren', text: 'I am very bad at saying things. I am better at pictures. So, here.' },
      { who: 'narrator', text: 'She tears out a page: the two of you on the shop step, in careful pencil.' },
    ],
    choices: [
      { text: 'Keep the drawing close.', reply: 'Wren lets out a breath she has clearly been holding since spring.', points: 60 },
      { text: '"You should sign it."', reply: 'She signs it, then adds a small heart, then scribbles it out, then adds it back.', points: 60 },
    ],
  },

  // ---- Teo -----------------------------------------------------------------------------------------
  {
    id: 'teo_2', villager: 'teo', title: 'Practice',
    trigger: { map: 'town', minHearts: 2, from: '08:00', to: '16:00' },
    lines: [
      { who: 'narrator', text: 'Through the smithy door you hear Teo talking to the anvil. Clang. "Hello." Clang. "Hi." Clang. "Nice weather."' },
      { who: 'teo', text: 'Oh. You. I was... the anvil needs to be spoken to. Keeps it true.' },
      { who: 'teo', text: 'That\'s not true. I practise saying normal things. I am better at bearings than normal things.' },
    ],
    choices: [
      { text: '"Nice weather."', reply: 'Teo laughs, a big surprised laugh. "Yeah. It is. It really is."', points: 40 },
      { text: '"Teach me about bearings, then."', reply: 'Forty minutes later you know a great deal about bearings. Teo looks happier than you have ever seen him.', points: 40 },
    ],
  },
  {
    id: 'teo_5', villager: 'teo', title: 'River Noise',
    trigger: { map: 'town', minHearts: 5, from: '18:00', to: '23:00' },
    lines: [
      { who: 'narrator', text: 'Teo is leaning on the bridge rail, watching the river go by under the boards.' },
      { who: 'teo', text: 'My mum says I used to sleep through anything except the Works stopping. The night they stopped I cried till morning.' },
      { who: 'teo', text: 'Twelve years of quiet. I thought it was just how towns sounded.' },
      { who: 'teo', text: 'Then you showed up and started hammering. I like it better loud.' },
    ],
    effects: { flags: ['teo_bridge'] },
  },
  {
    id: 'teo_8', villager: 'teo', title: 'A Good Bearing',
    trigger: { map: 'farm', minHearts: 8, from: '07:00', to: '12:00', flags: ['yard_wheel'] },
    lines: [
      { who: 'narrator', text: 'Teo is crouched by your water-wheel with a cloth bundle.' },
      { who: 'teo', text: 'I made you a bearing. By hand. It took four tries. The other three are in the river, sorry.' },
      { who: 'teo', text: 'I wanted to give you something that keeps things turning. That is... that is the most romantic thing I know.' },
    ],
    choices: [
      { text: '"It\'s perfect."', reply: 'He fits it with shaking hands. The wheel turns a little smoother. So does the morning.', points: 60 },
      { text: 'Hold his hand while he fits it.', reply: 'It takes twice as long. Neither of you minds.', points: 60 },
    ],
  },

  // ---- Pell ----------------------------------------------------------------------------------------
  {
    id: 'pell_2', villager: 'pell', title: 'Taste Test',
    trigger: { map: 'town', minHearts: 2, from: '12:00', to: '20:00' },
    lines: [
      { who: 'pell', text: 'You! Yes, you. Open your mouth. Trust me. I\'m a professional.' },
      { who: 'narrator', text: 'A spoonful of something hot and green. It is, unexpectedly, wonderful.' },
      { who: 'pell', text: 'Nettle and leek. Odile\'s favourite, though she\'d sooner die than order it. I send it up the hill in a "mistake" every week.' },
    ],
    choices: [
      { text: '"Your secret is safe."', reply: '"Darling, nothing is safe with me. But that one is."', points: 40 },
      { text: '"More salt."', reply: 'Pell gasps theatrically, then tastes it, then adds salt.', points: 30 },
    ],
  },
  {
    id: 'pell_5', villager: 'pell', title: 'The Recipe Box',
    trigger: { map: 'town', minHearts: 5, from: '20:00', to: '23:59' },
    lines: [
      { who: 'narrator', text: 'Pell sets a tin box on the bar, full of recipe cards in a dozen handwritings.' },
      { who: 'pell', text: 'Everybody who ever cooked in this kitchen left one card. House rule. Here is Rosamund\'s.' },
      { who: 'narrator', text: '"Berry Tart. Do NOT let Bram near the berries first." Underlined.' },
      { who: 'pell', text: 'It is yours. And one day you\'ll write me a card of your own.' },
    ],
    effects: { recipes: ['cook_berry_tart'], flags: ['pell_recipe'] },
  },

  // ---- Bram ----------------------------------------------------------------------------------------
  {
    id: 'bram_2', villager: 'bram', title: 'The Sticky Door',
    trigger: { map: 'farm', minHearts: 2, from: '07:00', to: '11:00' },
    lines: [
      { who: 'narrator', text: 'Bram is on your porch with a plane, shaving a curl of wood off the farmhouse door.' },
      { who: 'bram', text: 'Sticks in the damp. Always has. Ros would kick it. I would plane it. Forty years of that.' },
      { who: 'bram', text: 'There. It will stick again by autumn. Then I\'ll come back.' },
    ],
    choices: [
      { text: '"Come back anyway, door or not."', reply: 'He grunts, which you are learning means yes.', points: 40 },
      { text: 'Offer him tea.', reply: 'He drinks it standing up, looking at the yard. "She\'d like what you\'re doing."', points: 40 },
    ],
  },
  {
    id: 'bram_5', villager: 'bram', title: 'Two Initials',
    trigger: { map: 'town', minHearts: 5, from: '12:00', to: '18:00', weather: ['sunny'] },
    lines: [
      { who: 'narrator', text: 'Bram sits on an old bench by the plaza. Carved into the backrest: R.P. and B.T., worn almost smooth.' },
      { who: 'bram', text: 'We built this the summer the Works opened the inn ovens. We were nineteen and full of ourselves.' },
      { who: 'bram', text: 'Never married. Never needed to. Best friend I had.' },
      { who: 'bram', text: 'Here. I made a box for you. Ros would want you to have somewhere to keep things.' },
    ],
    effects: { items: [{ item: 'chest', n: 1 }], flags: ['bram_bench'] },
  },

  // ---- Ilo (side arc "The Heron") ------------------------------------------------------------------
  {
    id: 'ilo_2', villager: 'ilo', title: 'The Heron',
    trigger: { map: 'lake', minHearts: 2, from: '07:00', to: '18:00', notFlags: ['heron_wreck'] },
    lines: [
      { who: 'narrator', text: 'Ilo is lying flat on the dock, peering through the boards at something under the water.' },
      { who: 'ilo', text: 'That\'s her. The Heron. Gran\'s boat. The flood put her under the dock and nobody ever got her out.' },
      { who: 'ilo', text: 'Gran said a boat isn\'t wrecked until someone stops wanting to sail her. I haven\'t stopped.' },
      { who: 'ilo', text: 'Will you help? She needs planks. Lots. And rope. And probably a miracle.' },
    ],
    effects: { flags: ['heron_wreck'] },
  },
  {
    id: 'ilo_5', villager: 'ilo', title: 'First Sail',
    trigger: { map: 'lake', minHearts: 5, from: '08:00', to: '18:00', flags: ['heron_mended'], notFlags: ['heron_sailed'] },
    lines: [
      { who: 'narrator', text: 'The Heron sits at the end of the dock, patched and painted. Ilo is already in it.' },
      { who: 'ilo', text: 'Get in, get in, before I lose my nerve!' },
      { who: 'narrator', text: 'You row out to the middle of Stillmere. Ilo trails a hand in the water and says nothing for a long time.' },
      { who: 'ilo', text: 'Gran said the Glowfin follow boats at dusk. Now we have a boat. Here, take this. It was hers. It\'s a good rod.' },
    ],
    effects: { flags: ['heron_sailed'] },
  },

  // ---- Saffi (side arc "The Seed Library") ---------------------------------------------------------
  {
    id: 'saffi_2', villager: 'saffi', title: 'The Key-Tag',
    trigger: { map: 'forest', minHearts: 2, from: '08:00', to: '17:00', notFlags: ['seed_library_key'] },
    lines: [
      { who: 'narrator', text: 'Saffi crouches by a stump, turning a brass key-tag over in her fingers. "LIBRARY" is stamped on it.' },
      { who: 'saffi', text: 'My mother kept the valley\'s seed library under the old granary. Every heirloom, every family\'s beans.' },
      { who: 'saffi', text: 'The flood buried the granary and the mine took what was left. She said she hid the master tin somewhere deep.' },
      { who: 'saffi', text: 'Floor three, she said. "Where the quartz grows like teeth." If you are ever down there...' },
    ],
    effects: { flags: ['seed_library_key'] },
  },
  {
    id: 'saffi_4', villager: 'saffi', title: 'Under the Beeches',
    trigger: { map: 'forest', minHearts: 4, from: '09:00', to: '15:00' },
    lines: [
      { who: 'narrator', text: 'Saffi leads you off the path to a ring of old beeches and kneels in the leaf litter.' },
      { who: 'saffi', text: 'This is where she taught me to find things. You have to stop looking and start noticing.' },
      { who: 'saffi', text: 'Close your eyes. Smell that? Mushrooms, just under the surface. Tomorrow they\'ll be up.' },
    ],
    effects: { items: [{ item: 'chanterelle', n: 2 }], flags: ['saffi_beeches'] },
  },

  // ---- Ceremonies ------------------------------------------------------------------------------------
  {
    id: 'ceremony_wren', villager: 'wren', title: 'Lanterns in the Square',
    lines: [
      { who: 'narrator', text: 'Half the town has squeezed into the square. Someone has strung lanterns from the fountain to the Hall.' },
      { who: 'maudie', text: 'I have a list of things to say and I am going to ignore all of it. You two. That is all.' },
      { who: 'wren', text: 'I drew this moment a hundred times. I got it wrong every time. This is better.' },
      { who: 'narrator', text: 'Wren will come by Penhallow Yard every morning now, sketchbook first.' },
    ],
  },
  {
    id: 'ceremony_teo', villager: 'teo', title: 'Lanterns in the Square',
    lines: [
      { who: 'narrator', text: 'Half the town has squeezed into the square. Someone has strung lanterns from the fountain to the Hall.' },
      { who: 'maudie', text: 'I have a list of things to say and I am going to ignore all of it. You two. That is all.' },
      { who: 'teo', text: 'I practised this on the anvil. I am not going to say any of it. I am just very happy.' },
      { who: 'narrator', text: 'Teo will come by Penhallow Yard every morning now, usually to fix something that wasn\'t broken.' },
    ],
  },
];

export const SCENES: SceneDef[] = [...HEART_EVENTS, ...STORY_SCENES];

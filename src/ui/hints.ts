// "What next?" for the journal: turns the quest state into concrete guidance. Reads state only.
import { QUESTS } from '../data/quests';
import { IDLE_TIPS, ITEM_SOURCES, QUEST_HINTS } from '../data/hints';
import type { Objective, QuestDef } from '../data/types';
import { dateLabel } from '../sim';
import { activeQuest, isQuestDone, objectiveProgress, questDef, type SupplyFn } from '../sim/quests';
import type { GameState } from '../sim/state';

export interface ObjectiveRow {
  label: string;
  cur: number;
  target: number;
  done: boolean;
  /** where to get what is missing, when the objective is a delivery that is short */
  source?: string;
}

export interface ActiveGuide {
  quest: QuestDef;
  objectives: ObjectiveRow[];
  steps: string[];
}

export interface WaitingGuide {
  quest: QuestDef;
  /** why it has not started: unfinished quests and/or a date */
  why: string;
  steps: string[];
}

export interface Guidance {
  active: ActiveGuide[];
  waiting: WaitingGuide[];
  tips: string[];
}

function sourceFor(o: Objective): string | undefined {
  if ((o.kind === 'deliver' || o.kind === 'ship') && o.item) return ITEM_SOURCES[o.item];
  if (o.kind === 'deliver' && o.category === 'crop') return 'Keep some of your harvest in the backpack instead of shipping it all.';
  if (o.kind === 'reachFloor') return 'The mine is south of the Forest. Break rocks with the Pickaxe to find the ladder on each floor.';
  return undefined;
}

/** Main quests first, then side quests; each with its progress rows and the steps for doing it. */
export function guidance(state: GameState, supply: SupplyFn, describe: (o: Objective) => string): Guidance {
  const arcOrder = (q: QuestDef) => (q.arc === 'main' ? 0 : 1);
  const activeIds = state.quests.active.map((a) => a.id).sort((a, b) => arcOrder(questDef(a)) - arcOrder(questDef(b)));
  const active: ActiveGuide[] = activeIds.map((id) => {
    const quest = questDef(id);
    const qp = activeQuest(state, id)!;
    const objectives = quest.objectives.map((o, i) => {
      const [cur, target] = objectiveProgress(state, qp, i, supply);
      const done = cur >= target;
      return { label: describe(o), cur, target, done, source: done ? undefined : sourceFor(o) };
    });
    return { quest, objectives, steps: QUEST_HINTS[id] ?? [] };
  });

  const waiting: WaitingGuide[] = [];
  for (const quest of QUESTS) {
    if (isQuestDone(state, quest.id) || activeQuest(state, quest.id)) continue;
    const missing = quest.requires.filter((r) => !isQuestDone(state, r)).map((r) => questDef(r).title);
    const flagsMissing = (quest.requiresFlags ?? []).some((f) => !state.flags.includes(f));
    if (quest.arc === 'main') {
      // Only the quests one step away are worth showing: those whose prerequisites are all done or in progress.
      const prereqsActiveOrDone = quest.requires.every((r) => isQuestDone(state, r) || !!activeQuest(state, r));
      if (!prereqsActiveOrDone) continue;
      const parts: string[] = [];
      if (missing.length) parts.push(`finish ${missing.join(' and ')} first`);
      if (quest.earliest !== undefined && state.day < quest.earliest) parts.push(`it begins on ${dateLabel(quest.earliest)}`);
      waiting.push({ quest, why: parts.length ? `Up next: ${parts.join(', and ')}.` : 'Up next.', steps: QUEST_HINTS[quest.id] ?? [] });
    } else if (flagsMissing && !missing.length) {
      waiting.push({ quest, why: 'A side story that starts when you get to know the villager.', steps: (QUEST_HINTS[quest.id] ?? []).slice(0, 1) });
    }
  }
  return { active, waiting, tips: IDLE_TIPS };
}

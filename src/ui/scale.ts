// UI size. The whole DOM layer (#ui) is zoomed, so every panel, the hotbar and the fishing bar scale together.
// Anything positioned from screen pixels (name tags) must divide by getUiScale().
export const UI_SCALES: { label: string; value: number }[] = [
  { label: 'Normal', value: 1 },
  { label: 'Large', value: 1.25 },
  { label: 'Huge', value: 1.5 },
];

let current = 1;

export function getUiScale(): number {
  return current;
}

export function applyUiScale(root: HTMLElement, scale: number): void {
  current = scale;
  root.style.setProperty('zoom', String(scale));
  document.documentElement.style.setProperty('--ui-scale', String(scale));
}

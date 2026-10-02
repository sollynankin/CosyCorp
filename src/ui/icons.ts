// Procedural item icons drawn on a 2D canvas and cached as data URLs. Shape comes from ItemDef.icon,
// colour from ItemDef.color; tools and machines get their own little drawings.
import { getItem } from '../data';

const cache = new Map<string, string>();
const S = 48;

function ctx2d(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  return [c, c.getContext('2d')!];
}

function shadeHex(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

function outline(g: CanvasRenderingContext2D): void {
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(40,28,20,0.75)';
  g.stroke();
}

export function itemIcon(id: string): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const def = getItem(id);
  const [c, g] = ctx2d();
  const col = def.color;
  g.lineJoin = 'round';
  const fillShape = () => {
    const grad = g.createLinearGradient(0, 8, 0, 42);
    grad.addColorStop(0, shadeHex(col, 40));
    grad.addColorStop(1, shadeHex(col, -30));
    g.fillStyle = grad;
    g.fill();
    outline(g);
  };
  switch (def.icon) {
    case 'round':
      g.beginPath();
      g.arc(24, 27, 13, 0, Math.PI * 2);
      fillShape();
      g.fillStyle = '#5a9a3a';
      g.beginPath();
      g.ellipse(24, 13, 6, 3, -0.4, 0, Math.PI * 2);
      g.fill();
      break;
    case 'long':
      g.beginPath();
      g.moveTo(10, 36);
      g.quadraticCurveTo(16, 14, 36, 10);
      g.quadraticCurveTo(40, 16, 34, 22);
      g.quadraticCurveTo(22, 34, 10, 36);
      fillShape();
      break;
    case 'leaf':
      g.beginPath();
      g.moveTo(10, 38);
      g.quadraticCurveTo(8, 12, 38, 8);
      g.quadraticCurveTo(40, 34, 10, 38);
      fillShape();
      g.strokeStyle = shadeHex(col, -50);
      g.beginPath();
      g.moveTo(12, 36);
      g.lineTo(34, 12);
      g.stroke();
      break;
    case 'jar':
    case 'bottle':
      g.beginPath();
      if (def.icon === 'jar') g.roundRect(12, 14, 24, 26, 5);
      else {
        g.moveTo(19, 8);
        g.lineTo(29, 8);
        g.lineTo(29, 16);
        g.lineTo(35, 22);
        g.lineTo(35, 40);
        g.lineTo(13, 40);
        g.lineTo(13, 22);
        g.lineTo(19, 16);
        g.closePath();
      }
      fillShape();
      if (def.icon === 'jar') {
        g.fillStyle = '#9a7a5a';
        g.fillRect(11, 9, 26, 6);
        g.fillStyle = '#f4ecd8';
        g.fillRect(16, 22, 16, 9);
      }
      break;
    case 'bag':
      g.beginPath();
      g.moveTo(16, 14);
      g.lineTo(32, 14);
      g.quadraticCurveTo(42, 40, 24, 41);
      g.quadraticCurveTo(6, 40, 16, 14);
      g.fillStyle = '#e8d8b0';
      g.fill();
      outline(g);
      g.beginPath();
      g.arc(24, 30, 7, 0, Math.PI * 2);
      fillShape();
      break;
    case 'box':
      g.beginPath();
      g.roundRect(10, 14, 28, 24, 3);
      fillShape();
      break;
    case 'fish':
      g.beginPath();
      g.ellipse(22, 25, 14, 8, 0, 0, Math.PI * 2);
      fillShape();
      g.beginPath();
      g.moveTo(34, 25);
      g.lineTo(44, 17);
      g.lineTo(44, 33);
      g.closePath();
      fillShape();
      g.fillStyle = '#1a1a1a';
      g.beginPath();
      g.arc(14, 23, 2, 0, Math.PI * 2);
      g.fill();
      break;
    case 'gem':
      g.beginPath();
      g.moveTo(24, 8);
      g.lineTo(38, 20);
      g.lineTo(24, 40);
      g.lineTo(10, 20);
      g.closePath();
      fillShape();
      break;
    case 'egg':
      g.beginPath();
      g.ellipse(24, 26, 11, 14, 0, 0, Math.PI * 2);
      fillShape();
      break;
    case 'bowl':
      g.beginPath();
      g.ellipse(24, 22, 15, 6, 0, 0, Math.PI * 2);
      g.fillStyle = col;
      g.fill();
      g.beginPath();
      g.moveTo(9, 23);
      g.quadraticCurveTo(24, 46, 39, 23);
      g.fillStyle = '#e8e0d0';
      g.fill();
      outline(g);
      break;
    case 'tool':
      drawTool(g, def.tool ?? 'hoe', col);
      break;
    case 'machine':
      g.beginPath();
      g.roundRect(10, 12, 28, 26, 4);
      g.fillStyle = '#b08a5a';
      g.fill();
      outline(g);
      g.beginPath();
      g.arc(24, 25, 7, 0, Math.PI * 2);
      g.fillStyle = '#6a6a72';
      g.fill();
      outline(g);
      g.fillStyle = '#f4ecd8';
      g.font = 'bold 10px sans-serif';
      g.textAlign = 'center';
      g.fillText(def.name.slice(0, 2), 24, 46);
      break;
  }
  const url = c.toDataURL();
  cache.set(id, url);
  return url;
}

function drawTool(g: CanvasRenderingContext2D, tool: string, col: string): void {
  g.lineCap = 'round';
  g.strokeStyle = '#8a6440';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(12, 40);
  g.lineTo(32, 14);
  g.stroke();
  g.fillStyle = tool === 'can' ? '#5a8ab8' : '#a8a8b0';
  g.strokeStyle = 'rgba(40,28,20,0.75)';
  g.lineWidth = 2;
  g.beginPath();
  switch (tool) {
    case 'hoe':
      g.rect(28, 8, 14, 7);
      break;
    case 'axe':
      g.moveTo(28, 8);
      g.lineTo(42, 12);
      g.lineTo(38, 24);
      g.closePath();
      break;
    case 'pickaxe':
      g.moveTo(18, 12);
      g.quadraticCurveTo(32, 4, 44, 18);
      g.lineTo(32, 14);
      g.closePath();
      break;
    case 'scythe':
      g.moveTo(30, 12);
      g.quadraticCurveTo(44, 10, 42, 26);
      g.quadraticCurveTo(38, 16, 30, 16);
      g.closePath();
      break;
    case 'rod':
      g.strokeStyle = '#6a8a4a';
      g.lineWidth = 3;
      g.moveTo(10, 42);
      g.lineTo(40, 6);
      g.stroke();
      g.strokeStyle = '#e8e8e8';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(40, 6);
      g.lineTo(42, 30);
      g.stroke();
      return;
    case 'can':
      g.roundRect(14, 18, 20, 18, 3);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(34, 24);
      g.lineTo(44, 14);
      g.lineWidth = 3;
      g.strokeStyle = '#5a8ab8';
      g.stroke();
      return;
  }
  g.fill();
  g.stroke();
  void col;
}

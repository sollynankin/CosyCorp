// Procedural item icons drawn on a 2D canvas and cached as data URLs. Shape comes from ItemDef.icon,
// colour from ItemDef.color; tools and machines get their own little drawings.
import { getItem } from '../data';
import { machineIconUrl } from '../render/iconRender';
import { drawFish, drawFishLook } from './fishArt';
import { GENERIC_FISH_LOOK } from '../data/fishLook';

const cache = new Map<string, string>();
const S = 48;

function ctx2d(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  // Drawn on a 48-unit grid but rendered at twice the pixels, so the art stays crisp in a bigger UI.
  c.width = S * 2;
  c.height = S * 2;
  const g = c.getContext('2d')!;
  g.scale(2, 2);
  return [c, g];
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

/** A plain small fish: shown on the line while reeling, so the species stays a surprise until it is landed. */
export function genericFishIcon(): string {
  const hit = cache.get('generic-fish');
  if (hit) return hit;
  const [c, g] = ctx2d();
  drawFishLook(g, GENERIC_FISH_LOOK);
  const url = c.toDataURL();
  cache.set('generic-fish', url);
  return url;
}

export function itemIcon(id: string): string {
  const hit = cache.get(id);
  if (hit) return hit;
  const def = getItem(id);
  if (def.category === 'machine' && def.places) {
    const url = machineIconUrl(def.places);
    cache.set(id, url);
    return url;
  }
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
      if (drawFish(g, id)) break;
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

const INK = 'rgba(70,38,28,0.95)';

/** Fat rounded stroke with an ink outline, a shaded underside and a shine along the top: a chunky shaded handle. */
function fatLine(g: CanvasRenderingContext2D, pts: [number, number][], w: number, fill: string, ctrl?: [number, number], shadow = 'rgba(90,40,20,0.38)'): void {
  const path = (dx = 0, dy = 0) => {
    g.beginPath();
    g.moveTo(pts[0][0] + dx, pts[0][1] + dy);
    if (ctrl) g.quadraticCurveTo(ctrl[0] + dx, ctrl[1] + dy, pts[1][0] + dx, pts[1][1] + dy);
    else for (const p of pts.slice(1)) g.lineTo(p[0] + dx, p[1] + dy);
  };
  g.lineCap = 'round';
  path();
  g.lineWidth = w + 5;
  g.strokeStyle = INK;
  g.stroke();
  path();
  g.lineWidth = w;
  g.strokeStyle = fill;
  g.stroke();
  // shaded underside (bottom-right), then a thin shine (top-left)
  path(w * 0.2, w * 0.2);
  g.lineWidth = w * 0.4;
  g.strokeStyle = shadow;
  g.stroke();
  path(-w * 0.2, -w * 0.2);
  g.lineWidth = Math.max(1.5, w * 0.24);
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.stroke();
}

/**
 * Fill the path already traced on g with a glossy, shaded look: vertical gradient, a darker bottom-right
 * shadow, a soft white shine at the top-left, then the ink outline. `sharp` keeps hard mitred corners.
 */
function blobFill(g: CanvasRenderingContext2D, top: string, bottom: string, x0: number, y0: number, x1: number, y1: number, sharp = false): void {
  const grad = g.createLinearGradient(0, y0, 0, y1);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  const shade = g.createLinearGradient(x0, y0, x1, y1);
  shade.addColorStop(0.35, 'rgba(60,20,90,0)');
  shade.addColorStop(1, 'rgba(60,20,90,0.42)');
  g.fillStyle = shade;
  g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  const shine = g.createRadialGradient(x0 + (x1 - x0) * 0.3, y0 + (y1 - y0) * 0.25, 0, x0 + (x1 - x0) * 0.3, y0 + (y1 - y0) * 0.25, Math.max(x1 - x0, y1 - y0) * 0.6);
  shine.addColorStop(0, 'rgba(255,255,255,0.7)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = shine;
  g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
  g.restore();
  g.lineWidth = 3;
  g.lineJoin = sharp ? 'miter' : 'round';
  g.miterLimit = 6;
  g.strokeStyle = INK;
  g.stroke();
}

function drawTool(g: CanvasRenderingContext2D, tool: string, col: string): void {
  const handle = '#e0a060';
  g.lineJoin = 'round';
  switch (tool) {
    case 'hoe': {
      fatLine(g, [[9, 41], [30, 17]], 7, handle);
      g.save();
      g.translate(34, 13);
      g.rotate(0.35);
      g.beginPath();
      g.roundRect(-13, -9, 26, 18, 7);
      blobFill(g, '#d6f0ff', '#6aaee8', -13, -9, 13, 9);
      g.restore();
      break;
    }
    case 'axe': {
      // A sharp wedge: straight edges, a flared cutting edge on the right and a squared-off poll at the handle.
      fatLine(g, [[9, 42], [27, 15]], 7, handle);
      g.beginPath();
      g.moveTo(21, 9);
      g.lineTo(31, 6);
      g.lineTo(46, 3);
      g.lineTo(48, 26);
      g.lineTo(31, 24);
      g.lineTo(24, 22);
      g.closePath();
      blobFill(g, '#f4f8ff', '#8ea4c8', 21, 3, 48, 26, true);
      // bright cutting edge
      g.beginPath();
      g.moveTo(46, 4);
      g.lineTo(47.5, 25);
      g.lineWidth = 2;
      g.strokeStyle = '#ffffff';
      g.stroke();
      break;
    }
    case 'pickaxe': {
      fatLine(g, [[9, 42], [29, 14]], 7, handle);
      fatLine(g, [[10, 20], [44, 20]], 10, '#dcd2f4', [27, -2], 'rgba(70,40,120,0.4)');
      break;
    }
    case 'scythe': {
      fatLine(g, [[9, 42], [27, 12]], 7, handle);
      fatLine(g, [[26, 9], [45, 28]], 9, '#fff0b8', [48, 6], 'rgba(120,80,20,0.4)');
      break;
    }
    case 'rod': {
      fatLine(g, [[8, 43], [39, 7]], 6, '#9ae070', undefined, 'rgba(20,90,40,0.4)');
      g.beginPath();
      g.moveTo(39, 7);
      g.quadraticCurveTo(46, 20, 40, 30);
      g.lineWidth = 1.5;
      g.strokeStyle = '#ffffff';
      g.stroke();
      g.beginPath();
      g.arc(40, 37, 8, 0, Math.PI * 2);
      blobFill(g, '#ff9a8a', '#e8445a', 32, 29, 48, 45);
      g.save();
      g.beginPath();
      g.arc(40, 37, 6.5, Math.PI * 1.1, Math.PI * 1.9);
      g.lineTo(40, 37);
      g.closePath();
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.fill();
      g.restore();
      break;
    }
    case 'can': {
      fatLine(g, [[30, 25], [44, 13]], 7, '#7ac0f0', undefined, 'rgba(20,60,140,0.4)');
      g.beginPath();
      g.arc(12, 26, 7, Math.PI * 0.5, Math.PI * 1.5);
      g.lineWidth = 4;
      g.strokeStyle = INK;
      g.stroke();
      g.beginPath();
      g.roundRect(9, 17, 26, 23, 9);
      blobFill(g, '#b8e4ff', '#4a8ed8', 9, 17, 35, 40);
      g.fillStyle = '#8ad4ff';
      for (const [x, y] of [[44, 21], [41, 27], [45, 30]]) {
        g.beginPath();
        g.arc(x, y, 2, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
  }
  void col;
}

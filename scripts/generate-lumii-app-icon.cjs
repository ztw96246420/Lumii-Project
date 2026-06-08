const fs = require('fs');
const path = require('path');
const { PNG } = require('../mobile/node_modules/pngjs');

const root = path.resolve(__dirname, '..');
const mobile = path.join(root, 'mobile');

const densities = [
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
];

const pawPad = [
  ['M', 100, 104],
  ['C', 76, 104, 60, 124, 60, 144],
  ['C', 60, 162, 78, 170, 100, 170],
  ['C', 122, 170, 140, 162, 140, 144],
  ['C', 140, 124, 124, 104, 100, 104],
];

const padPolygon = buildPathPolygon(pawPad, 72);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function hex(value) {
  const raw = value.replace('#', '');
  return [0, 2, 4].map((index) => Number.parseInt(raw.slice(index, index + 2), 16));
}

function clamp(v, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, v));
}

function mix(a, b, t) {
  return a + (b - a) * clamp(t);
}

function mixColor(a, b, t) {
  return a.map((v, index) => mix(v, b[index], t));
}

function stopsColor(stops, t) {
  const n = clamp(t);
  for (let index = 0; index < stops.length - 1; index += 1) {
    const left = stops[index];
    const right = stops[index + 1];
    if (n >= left[0] && n <= right[0]) {
      return mixColor(left[1], right[1], (n - left[0]) / (right[0] - left[0] || 1));
    }
  }
  return stops[n <= stops[0][0] ? 0 : stops.length - 1][1];
}

function blend(data, idx, color, alpha) {
  const a = clamp(alpha);
  if (a <= 0) return;
  const inv = 1 - a;
  data[idx] = Math.round(color[0] * a + data[idx] * inv);
  data[idx + 1] = Math.round(color[1] * a + data[idx + 1] * inv);
  data[idx + 2] = Math.round(color[2] * a + data[idx + 2] * inv);
  data[idx + 3] = Math.round(255 * a + data[idx + 3] * inv);
}

function setPixel(data, idx, color) {
  data[idx] = Math.round(color[0]);
  data[idx + 1] = Math.round(color[1]);
  data[idx + 2] = Math.round(color[2]);
  data[idx + 3] = Math.round(color[3]);
}

function buildPathPolygon(commands, steps) {
  const points = [];
  let current = [0, 0];
  for (const command of commands) {
    if (command[0] === 'M') {
      current = [command[1], command[2]];
      points.push(current);
      continue;
    }
    if (command[0] === 'C') {
      const p0 = current;
      const p1 = [command[1], command[2]];
      const p2 = [command[3], command[4]];
      const p3 = [command[5], command[6]];
      for (let index = 1; index <= steps; index += 1) {
        const t = index / steps;
        const inv = 1 - t;
        points.push([
          inv ** 3 * p0[0] + 3 * inv ** 2 * t * p1[0] + 3 * inv * t ** 2 * p2[0] + t ** 3 * p3[0],
          inv ** 3 * p0[1] + 3 * inv ** 2 * t * p1[1] + 3 * inv * t ** 2 * p2[1] + t ** 3 * p3[1],
        ]);
      }
      current = p3;
    }
  }
  return points;
}

function inPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function rotatedEllipse(x, y, cx, cy, rx, ry, deg) {
  const r = (-deg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  const xr = dx * Math.cos(r) - dy * Math.sin(r);
  const yr = dx * Math.sin(r) + dy * Math.cos(r);
  return (xr * xr) / (rx * rx) + (yr * yr) / (ry * ry) <= 1;
}

function pawMask(x, y) {
  if (inPolygon(x, y, padPolygon)) return true;
  return (
    rotatedEllipse(x, y, 60, 92, 11.5, 15, -20) ||
    rotatedEllipse(x, y, 84, 70, 12.5, 16, -7) ||
    rotatedEllipse(x, y, 116, 70, 12.5, 16, 7) ||
    rotatedEllipse(x, y, 140, 92, 11.5, 15, 20)
  );
}

function roundedRectMask(x, y, radius) {
  if (radius <= 0) return true;
  const r = Math.min(radius, 100);
  const cx = x < r ? r : x > 200 - r ? 200 - r : x;
  const cy = y < r ? r : y > 200 - r ? 200 - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2;
}

function bgWarm(nx, ny) {
  const v = [0.85 - 0.15, 1];
  const t = ((nx - 0.15) * v[0] + ny * v[1]) / (v[0] ** 2 + v[1] ** 2);
  return stopsColor(
    [
      [0, hex('#FFB182')],
      [0.45, hex('#FF8A5C')],
      [1, hex('#D85F35')],
    ],
    t,
  );
}

function radialOverlay(nx, ny, cx, cy, r, stops) {
  const t = Math.sqrt((nx - cx) ** 2 + (ny - cy) ** 2) / r;
  return stopsColor(stops, t);
}

function backgroundPixel(nx, ny) {
  let color = bgWarm(nx, ny);
  const vignetteColor = radialOverlay(nx, ny, 0.7, 1, 0.8, [
    [0, hex('#7A2C0F')],
    [1, hex('#7A2C0F')],
  ]);
  const vignetteAlpha = mix(0.35, 0, Math.sqrt((nx - 0.7) ** 2 + (ny - 1) ** 2) / 0.8);
  color = mixColor(color, vignetteColor, vignetteAlpha);

  const sheenAlpha = stopsColor(
    [
      [0, [0.55]],
      [0.4, [0.08]],
      [1, [0]],
    ],
    Math.sqrt((nx - 0.3) ** 2 + (ny - 0.1) ** 2) / 0.8,
  )[0];
  color = mixColor(color, hex('#FFFFFF'), sheenAlpha);
  return color;
}

function markColor(y) {
  return stopsColor(
    [
      [0, hex('#FFFFFF')],
      [0.55, hex('#FFF6EC')],
      [1, hex('#FBE6D2')],
    ],
    (y - 54) / 116,
  );
}

function sparkColor(dx, dy, radius) {
  const t = Math.sqrt(dx ** 2 + (dy + radius * 0.2) ** 2) / (radius * 1.2);
  return stopsColor(
    [
      [0, hex('#7FDDD2')],
      [0.7, hex('#4DB6AC')],
      [1, hex('#3A968D')],
    ],
    t,
  );
}

function renderSpark(data, idx, x, y) {
  const dx = x - 150;
  const dy = y - 56;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d <= 13) blend(data, idx, sparkColor(dx, dy, 13), 0.35);
  if (d <= 7) blend(data, idx, sparkColor(dx, dy, 7), 1);
  const hx = x - 148.4;
  const hy = y - 54.4;
  if (Math.sqrt(hx * hx + hy * hy) <= 2.4) blend(data, idx, hex('#FFFFFF'), 0.9);
}

function render(size, mode) {
  const ss = size >= 1024 ? 2 : size >= 432 ? 3 : 4;
  const s = size * ss;
  const png = new PNG({ width: s, height: s });
  const full = mode === 'full' || mode === 'round' || mode === 'legacy';
  const background = full || mode === 'background';
  const foreground = full || mode === 'foreground' || mode === 'monochrome' || mode === 'legacy';
  const monochrome = mode === 'monochrome';
  const radius = mode === 'round' ? 100 : mode === 'background' || mode === 'foreground' || mode === 'monochrome' ? 0 : 45;

  for (let py = 0; py < s; py += 1) {
    const y = ((py + 0.5) / s) * 200;
    const ny = y / 200;
    for (let px = 0; px < s; px += 1) {
      const x = ((px + 0.5) / s) * 200;
      const nx = x / 200;
      const idx = (py * s + px) * 4;
      const inside = roundedRectMask(x, y, radius);
      setPixel(png.data, idx, [0, 0, 0, 0]);

      if (background && inside) {
        const bg = backgroundPixel(nx, ny);
        setPixel(png.data, idx, [bg[0], bg[1], bg[2], 255]);

        const orbitDistance = Math.abs(Math.sqrt((x - 100) ** 2 + (y - 100) ** 2) - 78);
        if (orbitDistance < 0.55) blend(png.data, idx, hex('#FFFFFF'), 0.08);
      }

      if (!foreground || (!inside && full)) continue;

      if (!monochrome && pawMask(x, y - 2)) {
        blend(png.data, idx, hex('#7A2C0F'), full ? 0.18 : 0.22);
      }

      if (pawMask(x, y)) {
        blend(png.data, idx, monochrome ? hex('#FFFFFF') : markColor(y), 1);
      }

      if (!monochrome) renderSpark(png.data, idx, x, y);

      if (full && inside) {
        const edge = Math.min(x, y, 200 - x, 200 - y);
        if (edge < 1.2) blend(png.data, idx, hex('#FFFFFF'), 0.22);
      }
    }
  }

  return downsample(png, ss);
}

function downsample(src, ss) {
  if (ss === 1) return src;
  const out = new PNG({ width: src.width / ss, height: src.height / ss });
  for (let y = 0; y < out.height; y += 1) {
    for (let x = 0; x < out.width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let yy = 0; yy < ss; yy += 1) {
        for (let xx = 0; xx < ss; xx += 1) {
          const idx = ((y * ss + yy) * src.width + (x * ss + xx)) * 4;
          r += src.data[idx];
          g += src.data[idx + 1];
          b += src.data[idx + 2];
          a += src.data[idx + 3];
        }
      }
      const n = ss * ss;
      const outIdx = (y * out.width + x) * 4;
      out.data[outIdx] = Math.round(r / n);
      out.data[outIdx + 1] = Math.round(g / n);
      out.data[outIdx + 2] = Math.round(b / n);
      out.data[outIdx + 3] = Math.round(a / n);
    }
  }
  return out;
}

function writePng(file, image) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, PNG.sync.write(image));
}

function removeOldLauncherWebp() {
  const resDir = path.join(mobile, 'android', 'app', 'src', 'main', 'res');
  for (const [density] of densities) {
    const dir = path.join(resDir, `mipmap-${density}`);
    for (const name of [
      'ic_launcher.webp',
      'ic_launcher_round.webp',
      'ic_launcher_background.webp',
      'ic_launcher_foreground.webp',
      'ic_launcher_monochrome.webp',
    ]) {
      const file = path.join(dir, name);
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }
}

function main() {
  const assets = path.join(mobile, 'assets');
  writePng(path.join(assets, 'icon.png'), render(1024, 'full'));
  writePng(path.join(assets, 'splash-icon.png'), render(1024, 'full'));
  writePng(path.join(assets, 'android-icon-background.png'), render(1024, 'background'));
  writePng(path.join(assets, 'android-icon-foreground.png'), render(1024, 'foreground'));
  writePng(path.join(assets, 'android-icon-monochrome.png'), render(1024, 'monochrome'));
  writePng(path.join(assets, 'favicon.png'), render(128, 'full'));

  removeOldLauncherWebp();
  const resDir = path.join(mobile, 'android', 'app', 'src', 'main', 'res');
  for (const [density, ratio] of densities) {
    const dir = path.join(resDir, `mipmap-${density}`);
    writePng(path.join(dir, 'ic_launcher.png'), render(Math.round(48 * ratio), 'legacy'));
    writePng(path.join(dir, 'ic_launcher_round.png'), render(Math.round(48 * ratio), 'round'));
    writePng(path.join(dir, 'ic_launcher_background.png'), render(Math.round(108 * ratio), 'background'));
    writePng(path.join(dir, 'ic_launcher_foreground.png'), render(Math.round(108 * ratio), 'foreground'));
    writePng(path.join(dir, 'ic_launcher_monochrome.png'), render(Math.round(108 * ratio), 'monochrome'));
  }

  for (const [density, ratio] of densities) {
    const dir = path.join(resDir, `drawable-${density}`);
    writePng(path.join(dir, 'splashscreen_logo.png'), render(Math.round(96 * ratio), 'full'));
  }

  console.log('Lumii app icons generated from latest Figma Make Screen 74 SVG spec.');
}

main();

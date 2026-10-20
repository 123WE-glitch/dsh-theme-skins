// Rough WCAG contrast self-check for the skin palettes.
//
// Run: node src/audit-contrast.mjs
// Nothing fails the build; the output is a design aid for tuning a skin.
import { SKINS } from './theme-core.mjs';

function parseHex(color) {
  let value = color.replace('#', '');
  if (value.length === 3) value = value.split('').map((x) => x + x).join('');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
    value.length === 8 ? parseInt(value.slice(6, 8), 16) / 255 : 1,
  ];
}
function relativeLuminance([r, g, b]) {
  const channel = (v) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function blend(fg, bg) {
  const top = parseHex(fg);
  const bottom = parseHex(bg);
  const alpha = top[3];
  return [
    top[0] * alpha + bottom[0] * (1 - alpha),
    top[1] * alpha + bottom[1] * (1 - alpha),
    top[2] * alpha + bottom[2] * (1 - alpha),
  ];
}
function contrast(fg, bg) {
  const top = relativeLuminance(blend(fg, bg));
  const bottom = relativeLuminance(parseHex(bg).slice(0, 3));
  const [hi, lo] = top > bottom ? [top, bottom] : [bottom, top];
  return (hi + 0.05) / (lo + 0.05);
}
function mix(a, b, t) {
  const A = parseHex(a);
  const B = parseHex(b);
  return '#' + A.slice(0, 3).map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

let checked = 0;
let issues = 0;
for (const skin of SKINS) {
  for (const mode of ['light', 'dark']) {
    const palette = skin[mode];
    // Links and business accents resolve to deepseek-500 in light mode (the
    // accent nudged 10% toward the skin ink) and deepseek-400 (accent
    // lightened by 24%) in dark mode.
    const accentText = mode === 'light'
      ? mix(skin.accent, skin.ink, 0.10)
      : mix(skin.accent, '#FFFFFF', 0.24);
    const checks = [
      ['label-primary / card', palette.ink1, palette.card, 4.5],
      ['label-secondary / card', palette.ink2, palette.card, 4.5],
      ['label-tertiary / card', palette.ink3, palette.card, 3.5],
      ['label-caption / card', palette.ink4, palette.card, 3.0],
      ['label-primary / canvas', palette.ink1, palette.canvas, 4.5],
      ['label-secondary / canvas', palette.ink2, palette.canvas, 4.0],
      ['label-tertiary / canvas', palette.ink3, palette.canvas, 3.0],
      ['label-caption / canvas', palette.ink4, palette.canvas, 2.8],
      ['label-secondary / raised', palette.ink2, palette.raised, 4.5],
      ['label-tertiary / raised', palette.ink3, palette.raised, 3.0],
      ['label-primary / sidebar', palette.ink1, palette.sidebar, 4.5],
      ['label-secondary / sidebar', palette.ink2, palette.sidebar, 4.0],
      ['label-tertiary / sidebar', palette.ink3, palette.sidebar, 3.0],
      ['accent text / card', accentText, palette.card, 4.0],
      ['accent text / soft pill', accentText, palette.soft, 3.0],
      ['label-primary / code block', palette.ink1, palette.code, 4.5],
      ['label-primary / user bubble', palette.ink1, palette.soft, 3.5],
    ];
    for (const [name, fg, bg, minimum] of checks) {
      checked += 1;
      const value = contrast(fg, bg);
      if (value < minimum) {
        issues += 1;
        console.log(`[${skin.id}/${mode}] ${name}: ${value.toFixed(2)} < ${minimum}  (${fg} on ${bg})`);
      }
    }
  }
}
console.log(`contrast: checked ${checked} pairs, ${issues} below the advisory minimum`);

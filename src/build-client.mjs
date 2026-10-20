// Generates client.js (single-file browser module) from client-runtime.js + theme-core.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKINS, tokensFor, swatchFor } from './theme-core.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

const skinEntries = SKINS.map((skin) => {
  const swatch = swatchFor(skin);
  return {
    id: skin.id,
    swatchBg: swatch.bg,
    swatchAccent: swatch.accent,
    tokens: tokensFor(skin),
  };
});

const ZH = {
  title: '主题皮肤',
  description: '为整个界面换一套配色，浅色与深色会自动适配',
  default: '默认',
  aurora: '极光',
  nightflight: '夜航',
  nord: '北境',
  sakura: '樱花',
};
const EN = {
  title: 'Theme skin',
  description: 'Recolor the whole interface; light and dark adapt automatically',
  default: 'Default',
  aurora: 'Aurora',
  nightflight: 'Night',
  nord: 'Nord',
  sakura: 'Sakura',
};

const template = fs.readFileSync(path.join(here, 'client-runtime.js'), 'utf8');
const output = template
  .replace('__DEFAULT_SKIN__', JSON.stringify(SKINS[0].id))
  .replace('__SKINS_JSON__', JSON.stringify(skinEntries))
  .replace('__ZH_JSON__', JSON.stringify(ZH))
  .replace('__EN_JSON__', JSON.stringify(EN));

const target = path.join(here, '..', 'client.js');
fs.writeFileSync(target, output);
const tokenCount = Object.keys(skinEntries[0].tokens).length;
console.log(`wrote ${target} (${(output.length / 1024).toFixed(1)} KiB, ${skinEntries.length} skins, ${tokenCount} tokens each)`);

// Live theme preview against a running DSH Web GUI.
//
// Computes each skin's token map from theme-core.mjs, injects it into the real
// page over CDP exactly the way ui-layout applies a theme snapshot, and saves a
// screenshot per color scheme. Nothing is installed and nothing persists.
//
// usage: node src/preview.mjs [all|aurora,nightflight,...] [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKINS, SKIN_MAP, tokensFor } from './theme-core.mjs';
import { launchChrome, openCdp, sleep, dismissWelcomeNotice } from './dev-env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const which = process.argv[2] || 'all';
const outDir = path.resolve(process.argv[3] || path.join(here, '..', 'preview'));
const skinIds = which === 'all'
  ? SKINS.map((skin) => skin.id)
  : which.split(',').map((id) => id.trim()).filter(Boolean);

fs.mkdirSync(outDir, { recursive: true });
const userDataDir = path.join(outDir, '.chrome-profile');
fs.rmSync(userDataDir, { recursive: true, force: true });

const applyThemeJs = (tokens, mode) => `(() => {
  const tokens = ${JSON.stringify(tokens)};
  const mode = ${JSON.stringify(mode)};
  const body = document.body;
  for (const [name, modes] of Object.entries(tokens)) body.style.setProperty(name, modes[mode]);
  if (mode === 'dark') body.setAttribute('data-ds-dark-theme', '');
  else body.removeAttribute('data-ds-dark-theme');
  document.documentElement.style.colorScheme = mode;
  return Object.keys(tokens).length;
})()`;

const port = 9334;
const chrome = launchChrome({ port, userDataDir });
const cleanup = () => { try { chrome.kill(); } catch { /* already gone */ } };
process.on('exit', cleanup);

try {
  const cdp = await openCdp(port);
  console.log('chrome', cdp.version.Browser);
  for (const skinId of skinIds) {
    if (skinId === 'default') {
      console.warn('skin "default" means "no override layer"; preview it by not injecting any tokens');
      continue;
    }
    const skin = SKIN_MAP[skinId];
    if (!skin) {
      console.error('unknown skin', skinId);
      continue;
    }
    const tokens = tokensFor(skin);
    await cdp.navigate('/');
    await sleep(7500);
    await dismissWelcomeNotice(cdp);
    for (const mode of ['light', 'dark']) {
      await cdp.evaluate(applyThemeJs(tokens, mode));
      await sleep(900);
      const file = path.join(outDir, `${skinId}-${mode}.png`);
      await cdp.screenshot(file);
      console.log('saved', file, `${Object.keys(tokens).length} tokens`);
    }
  }
  const crashes = cdp.events.filter((event) => event.method === 'Runtime.exceptionThrown');
  if (crashes.length) console.error('page exceptions:', crashes.length);
  cdp.close();
} finally {
  cleanup();
}

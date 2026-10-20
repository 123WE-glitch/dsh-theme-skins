// End-to-end verification of an installed theme bundle against the live GUI.
//
// The page is a real client: once the bundle is installed through Plugin
// Manager, this script opens the GUI in headless Chrome, runs an optional step
// plan (click / evaluate / wheel / shot) and captures screenshots.
//
// usage: node src/verify.mjs <outDir> [steps.json]
//
// Step plan entries:
//   { "type": "click",  "x": 60, "y": 969, "wait": 2200 }
//   { "type": "eval",   "expr": "document.title", "name": "title", "wait": 800 }
//   { "type": "wheel",  "x": 800, "y": 600, "dy": 600, "wait": 900 }
//   { "type": "shot",   "name": "01-main-light" }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, openCdp, sleep, dismissWelcomeNotice } from './dev-env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] || path.join(here, '..', 'verify'));
const planPath = process.argv[3] || '';
fs.mkdirSync(outDir, { recursive: true });
const userDataDir = path.join(outDir, '.chrome-profile');
fs.rmSync(userDataDir, { recursive: true, force: true });

const plan = planPath ? JSON.parse(fs.readFileSync(path.resolve(planPath), 'utf8')) : [];
const port = 9335;
const chrome = launchChrome({ port, userDataDir });
const cleanup = () => { try { chrome.kill(); } catch { /* already gone */ } };
process.on('exit', cleanup);

try {
  const cdp = await openCdp(port);
  await cdp.navigate('/');
  await sleep(8000);
  await dismissWelcomeNotice(cdp);
  await cdp.screenshot(path.join(outDir, '01-main-light.png'));
  console.log('saved 01-main-light.png');

  for (const step of plan) {
    if (step.type === 'click') await cdp.click(step.x, step.y, step.wait);
    if (step.type === 'wheel') await cdp.wheel(step.x ?? 800, step.y ?? 500, step.dy ?? -600, step.wait);
    if (step.type === 'eval') {
      const value = await cdp.evaluate(step.expr);
      console.log('eval:', step.name || '', JSON.stringify(value).slice(0, 300));
      await sleep(step.wait || 800);
    }
    if (step.type === 'shot') {
      await cdp.screenshot(path.join(outDir, `${step.name}.png`));
      console.log('saved', `${step.name}.png`);
    }
  }

  const crashes = cdp.events.filter((event) => event.method === 'Runtime.exceptionThrown');
  console.log('page exceptions:', crashes.length);
  for (const crash of crashes.slice(0, 5)) console.log(JSON.stringify(crash.params).slice(0, 400));
  cdp.close();
} finally {
  cleanup();
}

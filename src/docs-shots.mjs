// Generate the documentation screenshots (docs/) from a live DSH Web GUI.
//
// Hero screenshots for every skin and color scheme, plus the
// Settings › General picker row. Session/workspace titles are replaced with
// demo text before capture so no personal data ends up in the repository.
//
// usage: node src/docs-shots.mjs [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKINS, tokensFor } from './theme-core.mjs';
import { launchChrome, openCdp, sleep, dismissWelcomeNotice } from './dev-env.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(process.argv[2] || path.join(here, '..', 'docs', 'raw'));
fs.mkdirSync(outDir, { recursive: true });
const userDataDir = path.join(outDir, '.chrome-profile');
fs.rmSync(userDataDir, { recursive: true, force: true });

// Replace personal session/workspace titles with neutral demo text.
const DEMO_TITLES = {
  '空间光对准': '示例项目',
  '文献阅读': '示例工作区',
  'fpga': '示例应用',
  'wangzhan': '网站',
  '新建文件夹 (2)': '归档',
  'ancoda': '研究',
  '电赛': '比赛',
  '11': '笔记',
  'deepseek hareness': '文档',
  'DeepSeek Harness 主题推荐': '主题皮肤展示',
  '查看文件夹中的文件': '浏览工作区文件',
  '查看文件夹中的文件 (1)': '浏览工作区文件 (1)',
  '打不开网址': '抓取网页',
  '画一个5V红灯电路并生成PCB': '画一块 PCB 电路板',
  '你是什么模型': '模型信息',
};

const anonymizeJs = `(() => {
  const map = ${JSON.stringify(DEMO_TITLES)};
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let replaced = 0;
  for (const node of nodes) {
    const original = node.nodeValue;
    if (original === undefined) continue;
    const text = original.trim();
    for (const [from, to] of Object.entries(map)) {
      if (text === from) {
        node.nodeValue = original.replace(from, to);
        replaced += 1;
        break;
      }
    }
  }
  return replaced;
})()`;

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

const port = 9336;
const chrome = launchChrome({ port, userDataDir });
const cleanup = () => { try { chrome.kill(); } catch { /* already gone */ } };
process.on('exit', cleanup);

try {
  const cdp = await openCdp(port);
  await cdp.navigate('/');
  await sleep(8000);
  await dismissWelcomeNotice(cdp);
  const replaced = await cdp.evaluate(anonymizeJs);
  console.log('anonymized text nodes:', replaced);

  for (const skin of SKINS) {
    const tokens = tokensFor(skin);
    for (const mode of ['light', 'dark']) {
      await cdp.evaluate(applyThemeJs(tokens, mode));
      await sleep(900);
      const file = path.join(outDir, `${skin.id}-${mode}.png`);
      await cdp.screenshot(file);
      console.log('saved', path.basename(file));
    }
  }

  // Settings › General, where the picker lives (light scheme, Aurora active).
  await cdp.evaluate(applyThemeJs(tokensFor(SKINS[0]), 'light'));
  await sleep(500);
  await cdp.click(60, 969, 2500);
  await cdp.screenshot(path.join(outDir, 'settings-light.png'));
  console.log('saved settings-light.png');

  const crashes = cdp.events.filter((event) => event.method === 'Runtime.exceptionThrown');
  if (crashes.length) console.error('page exceptions:', crashes.length);
  cdp.close();
} finally {
  cleanup();
}

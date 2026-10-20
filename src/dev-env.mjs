// Shared helpers for the local development tools: harness discovery, browser
// authentication cookie, headless Chrome launch and a minimal CDP client.
//
// The auth cookie mirrors what the Harness itself mints after a browser opens
// the launch URL printed by `dsh web`: the request authority plus an
// HMAC-SHA256 signature over the cookie body, keyed by the local
// `client-connection/browser-session` secret. It is only read from your own
// `$DSH_HOME/.credentials.yaml`, on your own machine.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

export const HOME = os.homedir();
export const DSH_HOME = process.env.DSH_HOME || path.join(HOME, '.dsh');
export const WEB_URL = process.env.DSH_WEB_URL || 'http://127.0.0.1:19387';
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
].filter(Boolean);

export function chromePath() {
  for (const candidate of CANDIDATES) if (fs.existsSync(candidate)) return candidate;
  throw new Error('No Chrome/Edge/Chromium found; set CHROME_PATH to the browser executable');
}

const base64url = (buffer) =>
  Buffer.from(buffer).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');

/** Mint the browser-session cookie for the local Harness Web origin. */
export function authCookie() {
  const raw = fs.readFileSync(path.join(DSH_HOME, '.credentials.yaml'), 'utf8');
  const match = raw.match(
    /client-connection\/browser-session:\s*\n\s*kind:\s*grant\s*\n\s*payload:\s*\n\s*version:\s*\d+\s*\n\s*secret:\s*([A-Za-z0-9_-]+)/,
  );
  if (!match) throw new Error('browser-session secret not found in $DSH_HOME/.credentials.yaml');
  const secret = Buffer.from(match[1].replaceAll('-', '+').replaceAll('_', '/'), 'base64');
  const url = new URL(WEB_URL);
  const authority = url.host;
  const name = 'dsh-auth-' + base64url(crypto.createHash('sha256').update(authority).digest());
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 24 * 3600 * 1000;
  const body = base64url(
    Buffer.from(JSON.stringify({ version: 1, authority, issuedAt, expiresAt }), 'utf8'),
  );
  const signature = base64url(crypto.createHmac('sha256', secret).update(body).digest());
  return { name, value: `v1.${body}.${signature}`, hostname: url.hostname };
}

export async function fetchJson(url, options) {
  const response = await fetch(url, options);
  return JSON.parse(await response.text());
}

/** Launch headless Chrome with the DevTools endpoint on `port`. */
export function launchChrome({ port, userDataDir, width = 1600, height = 1000 }) {
  const child = spawn(chromePath(), [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`,
    'about:blank',
  ], { stdio: 'ignore' });
  return child;
}

/** Wait for DevTools, open a blank target and return a small CDP session. */
export async function openCdp(port) {
  let version;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      version = await fetchJson(`http://127.0.0.1:${port}/json/version`);
      break;
    } catch {
      await sleep(200);
    }
  }
  if (!version) throw new Error('Chrome DevTools endpoint not reachable');

  const target = await fetchJson(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  const events = [];
  let seq = 0;
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== undefined) {
      const waiter = pending.get(message.id);
      if (waiter) {
        pending.delete(message.id);
        if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
        else waiter.resolve(message.result);
      }
    } else {
      events.push(message);
    }
  };
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = (seq += 1);
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Network.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  const cookie = authCookie();
  await send('Network.setCookie', {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.hostname,
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Strict',
    expires: Math.floor(Date.now() / 1000) + 24 * 3600,
  });

  const cdp = {
    send,
    events,
    version,
    close: () => ws.close(),
    navigate: async (route = '/') => { await send('Page.navigate', { url: WEB_URL + route }); },
    screenshot: async (file) => {
      const result = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
      return file;
    },
    click: async (x, y, wait = 1200) => {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      await sleep(wait);
    },
    wheel: async (x, y, deltaY, wait = 900) => {
      await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY });
      await sleep(wait);
    },
    evaluate: async (expression) => {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails).slice(0, 500));
      return result.result?.value;
    },
  };
  return cdp;
}

/** Dismiss the first-run preview-version notice when it is still up. */
export async function dismissWelcomeNotice(cdp) {
  await cdp.evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((node) => (node.textContent || '').includes('继续'));
    if (button) button.click();
    return Boolean(button);
  })()`);
  await sleep(700);
}

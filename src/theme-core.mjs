// Theme palette definitions + DSH token mapping (pure Node, used by preview + build).

const hex = (c) => c.replace('#', '');
function parseHex(c) {
  let s = hex(c);
  if (s.length === 3) s = s.split('').map((x) => x + x).join('');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function toHex(rgb) {
  return '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
const mix = (a, b, t) => {
  const A = parseHex(a);
  const B = parseHex(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
};
const rgba = (c, a) => {
  const [r, g, b] = parseHex(c);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

// ---------------------------------------------------------------------------
// Skin palettes. `paper`/`ink` are the lightest/darkest anchors used to build
// the shared static neutral ramps; `light`/`dark` carry the mode-specific UI
// colors; `accent` drives the accent ramp used by links / business states.
// ---------------------------------------------------------------------------
export const SKINS = [
  {
    id: 'aurora',
    zh: '极光',
    en: 'Aurora',
    accent: '#6A5AE0',
    paper: '#FCFBFF',
    ink: '#141228',
    light: {
      canvas: '#F8F6FE', card: '#FFFFFF', raised: '#F2EFFC', sunken: '#EDE9F9', overlay: '#F1EDFB',
      module: '#F0ECFA', mark: '#E7E1FA', sidebar: '#F4F1FE',
      ink1: '#1A1633', ink2: '#4F4A6B', ink3: '#7A7397', ink4: '#8E88AC',
      soft: '#EAE6FF', code: '#F7F4FE', codeHeader: '#F1ECFC', inlineCode: '#F2EEFB',
      scroll: '#DCD5F2', scrollHover: '#C6BDE9', menuHeader: '#F8F6FEF0', toast: '#252044', tooltip: '#221D3E',
      syntax: {
        keyword: '#7C3AED', string: '#0F766E', constant: '#B45309', comment: '#8E88AC',
        parameter: '#C2410C', func: '#4338CA', punct: '#4F4A6B', link: '#2563EB',
      },
    },
    dark: {
      canvas: '#121028', card: '#1A1735', raised: '#211D40', sunken: '#16132D', overlay: '#211D40',
      module: '#1D1A38', mark: '#2B2456', sidebar: '#0F0D22',
      ink1: '#EFEBFF', ink2: '#BDB6E4', ink3: '#948DC0', ink4: '#726BA0',
      soft: '#2C2657', code: '#171432', codeHeader: '#1D1940', inlineCode: '#1B1738',
      scroll: '#3C3564', scrollHover: '#4E4680', menuHeader: '#1A1735F0', toast: '#2B2553', tooltip: '#262046',
      syntax: {
        keyword: '#B69CFF', string: '#5EEAD4', constant: '#FFB86C', comment: '#6E6899',
        parameter: '#FFB86C', func: '#8AB4FF', punct: '#BDB6E4', link: '#7DD3FC',
      },
    },
  },
  {
    id: 'nightflight',
    zh: '夜航',
    en: 'Night Flight',
    accent: '#2E7DE9',
    paper: '#FBFBFD',
    ink: '#10111B',
    light: {
      canvas: '#EFF1F8', card: '#FCFCFE', raised: '#E9ECF5', sunken: '#E3E6F1', overlay: '#EDEFF7',
      module: '#E8EBF4', mark: '#DDE3F4', sidebar: '#E7EAF4',
      ink1: '#1A1B2E', ink2: '#464A6B', ink3: '#6C7196', ink4: '#868BB2',
      soft: '#E2EDFC', code: '#EEF1F9', codeHeader: '#E8ECF6', inlineCode: '#E9EDF7',
      scroll: '#CBD2E8', scrollHover: '#B4BDDC', menuHeader: '#F1F3FAF0', toast: '#1B1E30', tooltip: '#1A1D2E',
      syntax: {
        keyword: '#7A3EE8', string: '#2F7D32', constant: '#B45309', comment: '#848CB5',
        parameter: '#C2410C', func: '#2E7DE9', punct: '#464A6B', link: '#2E7DE9',
      },
    },
    dark: {
      canvas: '#16161E', card: '#1A1B26', raised: '#1F2335', sunken: '#191A24', overlay: '#1F2335',
      module: '#1D2030', mark: '#283457', sidebar: '#131320',
      ink1: '#C8D0F0', ink2: '#A9B1D6', ink3: '#7D84AC', ink4: '#6A72A0',
      soft: '#292E42', code: '#1B1E2B', codeHeader: '#1F2335', inlineCode: '#20232F',
      scroll: '#3B4261', scrollHover: '#4E5579', menuHeader: '#1A1B26F0', toast: '#1F2335', tooltip: '#1F2335',
      syntax: {
        keyword: '#BB9AF7', string: '#9ECE6A', constant: '#FF9E64', comment: '#565F89',
        parameter: '#E0AF68', func: '#7AA2F7', punct: '#A9B1D6', link: '#7DCFFF',
      },
    },
  },
  {
    id: 'nord',
    zh: '北境',
    en: 'Nordfjord',
    accent: '#5E81AC',
    paper: '#FBFCFD',
    ink: '#12161D',
    light: {
      canvas: '#ECEFF4', card: '#FCFDFE', raised: '#E5E9F0', sunken: '#DEE3EB', overlay: '#E9EDF3',
      module: '#E5E9F0', mark: '#DBE2EE', sidebar: '#E9EDF3',
      ink1: '#2E3440', ink2: '#4C566A', ink3: '#6C7584', ink4: '#858FA0',
      soft: '#E2EAF4', code: '#E8ECF3', codeHeader: '#E2E7EF', inlineCode: '#E4E9F1',
      scroll: '#C7D0DE', scrollHover: '#AEB9CC', menuHeader: '#E9EDF3F0', toast: '#2E3440', tooltip: '#2E3440',
      syntax: {
        keyword: '#52708F', string: '#5E7F46', constant: '#A2604A', comment: '#8B96A8',
        parameter: '#9A6E86', func: '#5E81AC', punct: '#4C566A', link: '#5E81AC',
      },
    },
    dark: {
      canvas: '#242A34', card: '#2E3440', raised: '#3B4252', sunken: '#2A303B', overlay: '#3B4252',
      module: '#333A47', mark: '#414A5C', sidebar: '#1F242D',
      ink1: '#ECEFF4', ink2: '#D8DEE9', ink3: '#A3ABB8', ink4: '#7C8595',
      soft: '#3A4657', code: '#2C323E', codeHeader: '#353C4A', inlineCode: '#313845',
      scroll: '#4C566A', scrollHover: '#5E6B82', menuHeader: '#2E3440F0', toast: '#3B4252', tooltip: '#3B4252',
      syntax: {
        keyword: '#81A1C1', string: '#A3BE8C', constant: '#B48EAD', comment: '#7A869A',
        parameter: '#D08770', func: '#88C0D0', punct: '#D8DEE9', link: '#8FBCBB',
      },
    },
  },
  {
    id: 'sakura',
    zh: '樱花',
    en: 'Sakura',
    accent: '#D6557E',
    paper: '#FFFBFC',
    ink: '#211419',
    light: {
      canvas: '#FBF3F5', card: '#FFFFFF', raised: '#F8ECF0', sunken: '#F3E3E8', overlay: '#F9EFF2',
      module: '#F6E9ED', mark: '#F1DCE3', sidebar: '#FAF0F3',
      ink1: '#2B1A20', ink2: '#5E4149', ink3: '#85646E', ink4: '#9A7583',
      soft: '#FBE3EC', code: '#FBF4F6', codeHeader: '#F7EAEE', inlineCode: '#F7ECEF',
      scroll: '#E8CDD5', scrollHover: '#D8B4C0', menuHeader: '#FAF0F3F0', toast: '#3B2730', tooltip: '#38252D',
      syntax: {
        keyword: '#B5467A', string: '#4E7A52', constant: '#B4660F', comment: '#A88A94',
        parameter: '#C25E3C', func: '#9C4A8F', punct: '#5E4149', link: '#C2456E',
      },
    },
    dark: {
      canvas: '#1E1619', card: '#261C20', raised: '#2E2227', sunken: '#221A1D', overlay: '#2E2227',
      module: '#2A1F23', mark: '#3B2B33', sidebar: '#1A1316',
      ink1: '#F6E9ED', ink2: '#D3B9C2', ink3: '#A98C97', ink4: '#806872',
      soft: '#3F2A34', code: '#251B1F', codeHeader: '#2C2025', inlineCode: '#291E22',
      scroll: '#4A3840', scrollHover: '#5F4851', menuHeader: '#261C20F0', toast: '#33242B', tooltip: '#302229',
      syntax: {
        keyword: '#F0A6C8', string: '#A8D8A0', constant: '#FFC38A', comment: '#8A7079',
        parameter: '#FFB08A', func: '#F5A3BD', punct: '#D3B9C2', link: '#FF9EC4',
      },
    },
  },
];

export const SKIN_MAP = Object.fromEntries(SKINS.map((s) => [s.id, s]));

// Original DSH palette, offered as "default" (no override layer).
export const DEFAULT_SKIN = {
  id: 'default',
  zh: '默认',
  en: 'Default',
  swatch: { bg: '#FFFFFF', accent: '#0F1115' },
};

// Static ramp positions: 0 = paper, 1 = ink.
const BLUISH_STOPS = [
  ['00', 0], ['50', 0.03], ['60', 0.055], ['75', 0.085], ['100', 0.12], ['150', 0.145], ['200', 0.175],
  ['300', 0.28], ['400', 0.42], ['500', 0.52], ['600', 0.62], ['700', 0.72], ['750', 0.82],
  ['800', 0.87], ['850', 0.91], ['875', 0.93], ['900', 0.95], ['950', 0.97], ['1000', 1],
];
const NEUTRAL_STOPS = [
  ['00', 0], ['50', 0.03], ['100', 0.12], ['150', 0.145], ['200', 0.175], ['250', 0.20], ['300', 0.28],
  ['400', 0.42], ['500', 0.52], ['550', 0.57], ['600', 0.62], ['700', 0.72], ['800', 0.87],
  ['850', 0.91], ['900', 0.95], ['1000', 1],
];

function accentRamp(skin) {
  const a = skin.accent;
  // 500 is the light-mode link/business color: nudge it toward the skin ink so
  // small accent text keeps a readable contrast on white cards.
  const solid = mix(a, skin.ink, 0.10);
  return {
    '--dsw-static-deepseek-50': mix(skin.paper, a, 0.08),
    '--dsw-static-deepseek-100': mix(skin.paper, a, 0.16),
    '--dsw-static-deepseek-200': mix(skin.paper, a, 0.30),
    '--dsw-static-deepseek-300': mix(skin.paper, a, 0.45),
    '--dsw-static-deepseek-400': mix(a, '#FFFFFF', 0.24),
    '--dsw-static-deepseek-450': mix(a, '#FFFFFF', 0.12),
    '--dsw-static-deepseek-500': solid,
    '--dsw-static-deepseek-600': mix(a, skin.ink, 0.22),
    '--dsw-static-deepseek-800': mix(a, skin.ink, 0.55),
    '--dsw-static-deepseek-900': mix(a, skin.ink, 0.72),
    '--dsw-static-blue-300': mix(a, '#FFFFFF', 0.42),
    '--dsw-static-blue-500': solid,
    '--dsw-static-blue-900': mix(a, skin.ink, 0.68),
    '--dsw-static-blue-950': mix(a, skin.ink, 0.80),
  };
}

/** Build the full override token map for one skin: token -> { light, dark }. */
export function tokensFor(skin) {
  const tokens = {};
  const same = (name, value) => { tokens[name] = { light: value, dark: value }; };
  const pair = (name, light, dark) => { tokens[name] = { light, dark }; };

  // Shared static neutral ramps (referenced by both palettes' alias sheets).
  for (const [step, t] of BLUISH_STOPS) same(`--dsw-static-neutral-bluish-${step}`, mix(skin.paper, skin.ink, t));
  for (const [step, t] of NEUTRAL_STOPS) {
    const tinted = mix(skin.paper, skin.ink, t);
    same(`--dsw-static-neutral-${step}`, mix(tinted, '#808080', 0.35));
  }
  for (const [name, value] of Object.entries(accentRamp(skin))) same(name, value);

  const L = skin.light;
  const D = skin.dark;
  const border = (mode, alpha) => rgba(mode.ink1, alpha);

  // Surfaces.
  pair('--dsw-alias-bg-base', L.canvas, D.canvas);
  pair('--dsw-alias-bg-layer-1', L.card, D.card);
  pair('--dsw-alias-bg-layer-2', L.raised, D.raised);
  pair('--dsw-alias-bg-layer-3', L.sunken, D.sunken);
  pair('--dsw-alias-bg-overlay', L.overlay, D.overlay);
  pair('--dsw-alias-bg-module-platform', L.module, D.module);
  pair('--dsw-alias-bg-multi-select', L.mark, D.mark);
  pair('--dsw-alias-bg-document-preview', L.card, D.raised);
  pair('--dsw-specific-sidebar-fill', L.sidebar, D.sidebar);
  pair('--dsw-alias-menu-group-header-fill', L.menuHeader, D.menuHeader);
  pair('--dsw-menu-surface-fill', rgba(L.canvas, 0.60), rgba(D.raised, 0.50));
  pair('--dsw-specific-sidebar-nav-item-active-accent', L.soft, D.soft);
  pair('--dsw-specific-bubble', L.soft, D.mark);
  pair('--dsw-specific-bubble-highlight', mix(L.soft, skin.accent, 0.22), mix(D.mark, skin.accent, 0.18));

  // Borders.
  pair('--dsw-alias-border-l1', border(L, 0.06), border(D, 0.07));
  pair('--dsw-alias-border-l2', border(L, 0.10), border(D, 0.11));
  pair('--dsw-alias-border-l3', border(L, 0.14), border(D, 0.16));
  pair('--dsw-alias-border-l4', border(L, 0.20), border(D, 0.22));

  // Labels.
  pair('--dsw-alias-label-primary', L.ink1, D.ink1);
  pair('--dsw-alias-label-secondary', L.ink2, D.ink2);
  pair('--dsw-alias-label-tertiary', L.ink3, D.ink3);
  pair('--dsw-alias-label-caption', L.ink4, D.ink4);
  pair('--dsw-alias-label-primary-dimmed', mix(L.ink1, L.canvas, 0.25), mix(D.ink1, D.canvas, 0.25));
  pair('--dsw-alias-label-primary-bluish', mix(L.ink1, skin.accent, 0.45), mix(D.ink1, skin.accent, 0.5));
  pair('--dsw-alias-menu-icon', mix(L.ink1, L.ink2, 0.35), D.ink2);

  // Interaction layers.
  pair('--dsw-alias-interactive-bg-hover', rgba(L.ink1, 0.05), rgba(D.ink1, 0.07));
  pair('--dsw-alias-interactive-bg-active', rgba(L.ink1, 0.09), rgba(D.ink1, 0.12));
  pair('--dsw-alias-interactive-bg-hover-accent', rgba(skin.accent, 0.10), rgba(skin.accent, 0.18));
  pair('--dsw-alias-interactive-bg-hover-solid', L.raised, D.module);

  // Markdown / code surfaces.
  pair('--dsw-alias-markdown-code-block', L.code, D.code);
  pair('--dsw-alias-markdown-code-block-banner', L.codeHeader, D.codeHeader);
  pair('--dsw-alias-markdown-code-segment-selected', L.card, D.card);
  pair('--dsw-alias-markdown-code-segment-unselected', L.module, D.module);
  pair('--dsw-alias-markdown-inline-code', L.inlineCode, D.inlineCode);
  pair('--dsw-alias-markdown-tag', L.module, D.module);
  pair('--dsw-alias-markdown-citation', L.raised, D.mark);
  pair('--dsw-alias-markdown-placeholder', L.module, D.module);

  // Scrollbars, tooltips, toasts, switches.
  pair('--dsw-alias-scrollbar-bg-l1', L.scroll, D.scroll);
  pair('--dsw-alias-scrollbar-bg-l2', L.scroll, D.scrollHover);
  pair('--dsw-alias-scrollbar-hover-l1', L.scrollHover, D.scrollHover);
  pair('--dsw-alias-scrollbar-hover-l2', L.scrollHover, D.ink3);
  pair('--dsw-alias-tooltip-bg', L.tooltip, D.tooltip);
  pair('--dsw-alias-toast-bg', L.toast, D.toast);
  pair('--dsw-alias-switch-thumb', L.card, mix(D.card, D.ink1, 0.30));

  // Accent highlights that are hardcoded in the shipped sheets.
  pair('--dsw-alias-brand-primary-new-colorprimary-new-color', skin.accent, skin.accent);
  pair('--dsw-alias-onboarding-accent', skin.accent, skin.accent);

  // Syntax palette.
  const syntax = (name, key) => pair(`--shiki-token-${name}`, L.syntax[key], D.syntax[key]);
  syntax('constant', 'constant');
  syntax('string', 'string');
  syntax('comment', 'comment');
  syntax('keyword', 'keyword');
  syntax('parameter', 'parameter');
  syntax('function', 'func');
  syntax('string-expression', 'string');
  syntax('punctuation', 'punct');
  syntax('link', 'link');

  return tokens;
}

export function swatchFor(skin) {
  if (skin.id === 'default') return { bg: '#FFFFFF', accent: '#0F1115' };
  return { bg: skin.light.canvas, accent: skin.accent };
}

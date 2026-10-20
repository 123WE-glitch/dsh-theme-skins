window.__ModuleLoader__.load({
  id: '@local/dsh-theme-skins',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PACKAGE_ID = '@local/dsh-theme-skins';
    const STORAGE_KEY = 'dsh:theme-skins:active';
    const LOCALE_NS = 'theme-skins';
    const DEFAULT_SKIN = __DEFAULT_SKIN__;
    const SKINS = __SKINS_JSON__;
    const SKIN_MAP = Object.create(null);
    for (const skin of SKINS) SKIN_MAP[skin.id] = skin;
    const OPTIONS = [{ id: 'default', swatchBg: '#FFFFFF', swatchAccent: '#0F1115' }].concat(SKINS);

    const LOCALES = { zh: __ZH_JSON__, en: __EN_JSON__ };
    const FALLBACK_LOCALE = /^zh/i.test((typeof document !== 'undefined' && document.documentElement.lang) || '') ? 'zh' : 'en';

    const ROW_CSS = [
      '.dstskins-row{display:flex;flex-direction:column;gap:12px;padding:16px 0;border-bottom:.5px solid var(--dsw-alias-border-l2)}',
      '.dstskins-head{display:flex;flex-direction:column;gap:4px;min-width:0}',
      '.dstskins-title{color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family);font-size:14px;font-weight:400;line-height:20px}',
      '.dstskins-desc{color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-family);font-size:12px;font-weight:400;line-height:18px}',
      '.dstskins-options{display:flex;align-items:stretch;gap:8px;min-width:0}',
      '.dstskins-card{display:flex;align-items:center;gap:8px;flex:1 1 0;min-width:0;padding:8px 10px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-family:var(--dsw-font-family);font-size:12px;font-weight:400;line-height:16px;text-align:left;cursor:pointer;transition:background var(--ds-transition-duration) var(--ds-ease-in-out),border-color var(--ds-transition-duration) var(--ds-ease-in-out),color var(--ds-transition-duration) var(--ds-ease-in-out),box-shadow var(--ds-transition-duration) var(--ds-ease-in-out)}',
      '.dstskins-card:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-primary)}',
      '.dstskins-card:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dstskins-card[data-active="true"]{border-color:transparent;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);box-shadow:inset 0 0 0 1px var(--dsw-alias-label-primary),var(--dsw-shadow-lv1)}',
      '.dstskins-card[data-active="true"]:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.dstskins-swatch{position:relative;width:20px;height:20px;flex:none;border-radius:50%;background:conic-gradient(from 140deg,var(--dstskins-swatch-bg) 0 45%,var(--dstskins-swatch-accent) 45% 100%);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-label-primary) 14%,transparent)}',
      '.dstskins-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    ].join('\n');

    // --- page-local skin state ------------------------------------------------
    let selectedId = DEFAULT_SKIN;
    const listeners = new Set();
    let applyCurrent = null;

    function isKnown(id) {
      return id === 'default' || SKIN_MAP[id] !== undefined;
    }
    function readStored() {
      try {
        const value = localStorage.getItem(STORAGE_KEY);
        if (value !== null && isKnown(value)) return value;
      } catch (error) { /* storage may be unavailable */ }
      return DEFAULT_SKIN;
    }
    function notify() {
      for (const listener of [...listeners]) listener();
    }
    function select(id) {
      if (!isKnown(id) || id === selectedId) return;
      selectedId = id;
      try { localStorage.setItem(STORAGE_KEY, id); } catch (error) { /* best effort */ }
      if (applyCurrent !== null) applyCurrent();
      notify();
    }
    function subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    }

    // --- row copy -------------------------------------------------------------
    function copyFor(locale) {
      return LOCALES[locale] || LOCALES[FALLBACK_LOCALE];
    }
    function textOf(t, key, fallback) {
      if (typeof t === 'function') {
        try {
          const text = t(key);
          if (typeof text === 'string' && text !== key) return text;
        } catch (error) { /* fall through to the local dictionary */ }
      }
      const dict = copyFor(FALLBACK_LOCALE);
      return dict[key] !== undefined ? dict[key] : fallback;
    }

    // --- picker row -----------------------------------------------------------
    function SkinSwatch({ option }) {
      return h('span', {
        className: 'dstskins-swatch',
        style: {
          '--dstskins-swatch-bg': option.swatchBg,
          '--dstskins-swatch-accent': option.swatchAccent,
        },
        'aria-hidden': true,
      });
    }

    function ThemeSkinRow({ t }) {
      const [value, setValue] = React.useState(selectedId);
      React.useEffect(() => {
        const off = subscribe(() => setValue(selectedId));
        setValue(selectedId);
        return off;
      }, []);
      return h('div', { className: 'dstskins-row' },
        h('div', { className: 'dstskins-head' },
          h('div', { className: 'dstskins-title' }, textOf(t, 'title', 'Theme skin')),
          h('div', { className: 'dstskins-desc' }, textOf(t, 'description', 'Recolor the whole interface; light and dark adapt automatically')),
        ),
        h('div', {
          className: 'dstskins-options',
          role: 'radiogroup',
          'aria-label': textOf(t, 'title', 'Theme skin'),
        }, OPTIONS.map((option) => h('button', {
          key: option.id,
          type: 'button',
          role: 'radio',
          'aria-checked': value === option.id,
          className: 'dstskins-card',
          'data-active': value === option.id ? 'true' : 'false',
          onClick: () => select(option.id),
        },
          h(SkinSwatch, { option }),
          h('span', { className: 'dstskins-name' }, textOf(t, option.id, option.id)),
        ))),
      );
    }

    // --- plugin -----------------------------------------------------------------
    const inject = ['theme', 'slots', 'locale'];

    function apply(ctx) {
      selectedId = readStored();

      ctx.effect(() => {
        const tag = document.createElement('style');
        tag.dataset.plugin = PACKAGE_ID;
        tag.textContent = ROW_CSS;
        document.head.appendChild(tag);
        return () => { tag.remove(); };
      }, 'theme-skins: picker stylesheet');

      ctx.effect(() => ctx.locale.register(LOCALE_NS, LOCALES), 'theme-skins: picker dictionaries');

      ctx.effect(() => {
        let disposeLayer;
        const applyLayer = () => {
          if (disposeLayer !== undefined) {
            disposeLayer();
            disposeLayer = undefined;
          }
          const skin = SKIN_MAP[selectedId];
          if (skin === undefined) return;
          disposeLayer = ctx.theme.overrideTokens(PACKAGE_ID, skin.tokens);
        };
        applyCurrent = applyLayer;
        applyLayer();
        return () => {
          applyCurrent = null;
          if (disposeLayer !== undefined) {
            disposeLayer();
            disposeLayer = undefined;
          }
        };
      }, 'theme-skins: active skin palette');

      ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'theme-skins',
        order: 10.5,
        locale: LOCALE_NS,
      }, ThemeSkinRow));
    }

    return { inject, apply };
  },
});

(function () {
  'use strict';

  const Radix = window.RadixConverter;
  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));

  const COMMON_BASES = {
    2: { code: 'BIN', name: '二进制' },
    8: { code: 'OCT', name: '八进制' },
    10: { code: 'DEC', name: '十进制' },
    16: { code: 'HEX', name: '十六进制' },
  };

  const PREFIXES = { 2: '0b', 8: '0o', 16: '0x' };
  const SETTINGS_KEY = 'radix-settings-v1';
  const THEME_KEY = 'radix-theme';
  const INITIAL_VALUE = '1011.01';
  const ALL_BASES = Array.from({ length: 35 }, (_, index) => index + 2);

  const DEFAULT_STATE = {
    sourceBase: 2,
    targetBase: 10,
    precision: 16,
    grouped: true,
    uppercase: true,
  };

  const elements = {
    input: $('#valueInput'),
    inputShell: $('#inputShell'),
    sourceTag: $('#sourceTag'),
    fieldHint: $('#fieldHint'),
    fieldError: $('#fieldError'),
    quickBases: $('#quickBases'),
    sourceSelect: $('#sourceBaseSelect'),
    targetSelect: $('#targetBaseSelect'),
    examples: $('#examples'),
    clearButton: $('#clearBtn'),
    targetTag: $('#targetTag'),
    resultStage: $('#resultStage'),
    primaryDigits: $('#primaryDigits'),
    approxMark: $('#approxMark'),
    resultBadge: $('#resultBadge'),
    copyPrimary: $('#copyPrimary'),
    resultMeta: $('#resultMeta'),
    precisionSelect: $('#precisionSelect'),
    groupToggle: $('#groupToggle'),
    upperToggle: $('#upperToggle'),
    commonCards: $$('.base-card'),
    allGrid: $('#allBasesGrid'),
    themeToggle: $('#themeToggle'),
    toast: $('#toast'),
    srStatus: $('#srStatus'),
  };

  const state = { ...DEFAULT_STATE };
  const allRows = new Map();
  let toastTimer = null;

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function baseCode(base) {
    return COMMON_BASES[base] ? COMMON_BASES[base].code : '';
  }

  function baseName(base) {
    return COMMON_BASES[base] ? COMMON_BASES[base].name : `${base} 进制`;
  }

  function baseLabel(base) {
    return COMMON_BASES[base]
      ? `${COMMON_BASES[base].code} · ${COMMON_BASES[base].name}`
      : `BASE ${pad2(base)}`;
  }

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');

      if (!saved || typeof saved !== 'object') return;

      const sourceBase = Number(saved.sourceBase);
      const targetBase = Number(saved.targetBase);
      const precision = Number(saved.precision);

      if (Radix.isValidBase(sourceBase)) state.sourceBase = sourceBase;
      if (Radix.isValidBase(targetBase)) state.targetBase = targetBase;
      if ([8, 16, 24, 32].includes(precision)) state.precision = precision;
      if (typeof saved.grouped === 'boolean') state.grouped = saved.grouped;
      if (typeof saved.uppercase === 'boolean') state.uppercase = saved.uppercase;
    } catch (error) {
      /* Storage can be unavailable in private windows; defaults still work. */
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
          sourceBase: state.sourceBase,
          targetBase: state.targetBase,
          precision: state.precision,
          grouped: state.grouped,
          uppercase: state.uppercase,
        })
      );
    } catch (error) {
      /* Ignore storage quota/privacy errors. */
    }
  }

  function fillBaseSelect(select) {
    for (const base of ALL_BASES) {
      const option = document.createElement('option');
      option.value = String(base);
      option.textContent = `${pad2(base)}${baseCode(base) ? ` ${baseCode(base)}` : ''}`;
      select.appendChild(option);
    }
  }

  function hintForBase(base) {
    const allowed =
      base <= 10
        ? `允许数字 0–${base - 1}`
        : `允许 0–9、A–${Radix.DIGITS[base - 1]}`;
    const prefix = PREFIXES[base] ? ` · 可加 ${PREFIXES[base]} 前缀` : '';
    return `${allowed} · 支持小数${prefix}`;
  }

  function placeholderForBase(base) {
    const samples = {
      2: '1011.01',
      8: '755.4',
      10: '3.14159',
      16: 'FF.A',
      36: 'Z.Z',
    };

    if (samples[base]) return samples[base];

    const high = Radix.DIGITS[base - 1];
    const next = Radix.DIGITS[Math.max(0, base - 2)];
    return `${high}${next}.1`;
  }

  function applyLetterCase(value) {
    return state.uppercase ? value.toUpperCase() : value.toLowerCase();
  }

  function formatForDisplay(value, base) {
    return state.grouped ? Radix.groupDigits(value, base) : value;
  }

  function syncSourceUI() {
    elements.sourceSelect.value = String(state.sourceBase);
    elements.sourceTag.textContent = `BASE ${pad2(state.sourceBase)}`;
    elements.fieldHint.textContent = hintForBase(state.sourceBase);
    elements.input.placeholder = placeholderForBase(state.sourceBase);

    const isCustom = !COMMON_BASES[state.sourceBase];
    elements.sourceSelect.closest('.select-shell').classList.toggle('is-custom', isCustom);

    for (const button of $$('.base-chip', elements.quickBases)) {
      const active = Number(button.dataset.base) === state.sourceBase;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  function syncTargetUI() {
    elements.targetSelect.value = String(state.targetBase);
  }

  function syncSettingControls() {
    elements.precisionSelect.value = String(state.precision);
    elements.groupToggle.checked = state.grouped;
    elements.upperToggle.checked = state.uppercase;
  }

  function setFieldError(message) {
    const hasError = Boolean(message);
    elements.fieldError.textContent = hasError ? message : '';
    elements.fieldError.hidden = !hasError;
    elements.fieldHint.hidden = hasError;
    elements.inputShell.classList.toggle('is-error', hasError);
    elements.input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
    elements.input.setAttribute(
      'aria-describedby',
      hasError ? 'fieldError fieldHint' : 'fieldHint'
    );
  }

  function clearCardValues(message) {
    for (const card of elements.commonCards) {
      card.dataset.copy = '';
      card.dataset.label = `${baseName(Number(card.dataset.base))}结果`;
      card.classList.remove('is-target');
      card.classList.remove('is-copied');
      $('[data-output]', card).textContent = '—';
    }

    for (const base of ALL_BASES) {
      const row = allRows.get(base);
      if (!row) continue;
      row.button.dataset.copy = '';
      row.button.dataset.label = `${base} 进制结果`;
      row.button.classList.remove('is-target');
      row.button.setAttribute('aria-label', `复制 ${base} 进制结果`);
      row.value.textContent = '—';
    }

    elements.copyPrimary.disabled = true;
    elements.copyPrimary.dataset.copy = '';
    elements.copyPrimary.dataset.label = `${baseName(state.targetBase)}结果`;
    elements.copyPrimary.setAttribute(
      'aria-label',
      `复制${baseName(state.targetBase)}结果`
    );

    elements.primaryDigits.textContent = '—';
    elements.approxMark.hidden = true;
    elements.resultStage.classList.add('is-empty');
    elements.resultBadge.hidden = false;
    elements.resultBadge.className = 'badge neutral';
    elements.resultBadge.textContent = message || '等待输入';
    elements.targetTag.textContent = baseLabel(state.targetBase);
    elements.resultMeta.textContent =
      message === '待修正' ? '输入有误，请修正后重试' : '输入数值后自动换算';
    elements.srStatus.textContent =
      message === '待修正' ? '输入有误' : '等待输入数值';
  }

  function buildAllBaseRows() {
    const fragment = document.createDocumentFragment();

    for (const base of ALL_BASES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'all-base';
      button.dataset.base = String(base);
      button.setAttribute('aria-label', `复制 ${base} 进制结果`);

      const label = document.createElement('span');
      label.className = 'all-base-base';
      label.textContent = pad2(base);

      const value = document.createElement('span');
      value.className = 'all-base-value';
      value.textContent = '—';

      button.appendChild(label);
      button.appendChild(value);
      fragment.appendChild(button);
      allRows.set(base, { button, value });
    }

    elements.allGrid.appendChild(fragment);
  }

  function renderPrimary(result) {
    const raw = applyLetterCase(result.digits);

    elements.primaryDigits.textContent = formatForDisplay(raw, result.base);
    elements.approxMark.hidden = !result.truncated;
    elements.resultStage.classList.remove('is-empty');
    elements.resultBadge.hidden = false;
    elements.resultBadge.className = `badge ${result.truncated ? 'approx' : 'exact'}`;
    elements.resultBadge.textContent = result.truncated ? '近似' : '精确';
    elements.targetTag.textContent = baseLabel(state.targetBase);

    elements.copyPrimary.disabled = false;
    elements.copyPrimary.dataset.copy = raw;
    elements.copyPrimary.dataset.label = `${baseName(state.targetBase)}结果`;
    elements.copyPrimary.setAttribute(
      'aria-label',
      `复制${baseName(state.targetBase)}结果`
    );
  }

  function renderCommon(results) {
    for (const card of elements.commonCards) {
      const base = Number(card.dataset.base);
      const result = results.get(base);
      const raw = applyLetterCase(result.digits);
      const prefix = result.truncated ? '≈ ' : '';

      $('[data-output]', card).textContent = `${prefix}${formatForDisplay(raw, base)}`;
      card.dataset.copy = raw;
      card.dataset.label = `${baseName(base)}结果`;
      card.classList.toggle('is-target', base === state.targetBase);
      card.classList.remove('is-copied');
      card.setAttribute(
        'aria-label',
        `复制${baseName(base)}结果${result.truncated ? '（近似值）' : ''}`
      );
    }
  }

  function renderAllBases(results) {
    for (const base of ALL_BASES) {
      const row = allRows.get(base);
      if (!row) continue;

      const result = results.get(base);
      const raw = applyLetterCase(result.digits);
      const prefix = result.truncated ? '≈ ' : '';

      row.value.textContent = `${prefix}${formatForDisplay(raw, base)}`;
      row.button.dataset.copy = raw;
      row.button.dataset.label = `${base} 进制结果`;
      row.button.classList.toggle('is-target', base === state.targetBase);
      row.button.setAttribute(
        'aria-label',
        `复制 ${base} 进制结果${result.truncated ? '（近似值）' : ''}`
      );
    }
  }

  function buildMeta(result) {
    const parts = [
      `${state.sourceBase} 进制 → ${state.targetBase} 进制`,
      `${result.integerPart.length} 位整数`,
    ];

    if (result.fractionPart) parts.push(`${result.fractionPart.length} 位小数`);
    if (result.truncated) parts.push(`已截断至 ${state.precision} 位`);

    return parts.join(' · ');
  }

  function convert() {
    const parsed = Radix.parse(elements.input.value, state.sourceBase);

    if (!parsed.ok) {
      const isEmpty = parsed.error.code === 'EMPTY';
      setFieldError(isEmpty ? '' : parsed.error.message);
      clearCardValues(isEmpty ? '等待输入' : '待修正');
      return;
    }

    setFieldError('');

    const results = new Map();
    for (const base of ALL_BASES) {
      results.set(base, Radix.toBase(parsed, base, state.precision));
    }

    const target = results.get(state.targetBase);
    renderPrimary(target);
    renderCommon(results);
    renderAllBases(results);
    elements.resultMeta.textContent = buildMeta(target);
    elements.srStatus.textContent = `已更新${baseName(state.targetBase)}结果${
      target.truncated ? '，当前为近似值' : ''
    }`;
  }

  function setSourceBase(base) {
    if (!Radix.isValidBase(base)) return;
    state.sourceBase = base;
    syncSourceUI();
    saveSettings();
    convert();
  }

  function setTargetBase(base) {
    if (!Radix.isValidBase(base)) return;
    state.targetBase = base;
    syncTargetUI();
    saveSettings();
    convert();
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (error) {
      copied = false;
    }

    textarea.remove();
    return copied;
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove('is-visible');
    }, 2200);
  }

  function flashCopied(button) {
    if (!button) return;
    button.classList.add('is-copied');
    window.clearTimeout(button._copiedTimer);
    button._copiedTimer = window.setTimeout(() => {
      button.classList.remove('is-copied');
    }, 1400);
  }

  async function copyValue(text, label, button) {
    if (!text) {
      showToast('暂无可复制的结果');
      return;
    }

    let copied = false;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (error) {
        copied = false;
      }
    }

    if (!copied) copied = fallbackCopy(text);

    if (copied) {
      flashCopied(button);
      showToast(`已复制${label}`);
    } else {
      showToast('复制失败，请手动选择数值');
    }
  }

  function applyTheme(theme, persist) {
    document.documentElement.dataset.theme = theme;

    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (error) {
        /* Ignore storage errors. */
      }
    }

    const isDark = theme === 'dark';
    elements.themeToggle.setAttribute(
      'aria-label',
      isDark ? '切换到浅色模式' : '切换到深色模式'
    );

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', isDark ? '#080b09' : '#f4f1e8');
  }

  function loadExample(button) {
    const base = Number(button.dataset.base);
    const target = Number(button.dataset.target);

    if (!Radix.isValidBase(base)) return;

    state.sourceBase = base;
    if (Radix.isValidBase(target)) state.targetBase = target;

    elements.input.value = button.dataset.value || '';
    syncSourceUI();
    syncTargetUI();
    saveSettings();
    convert();

    elements.input.focus({ preventScroll: true });
  }

  function bindEvents() {
    elements.input.addEventListener('input', convert);

    elements.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        convert();
      }
    });

    elements.quickBases.addEventListener('click', (event) => {
      const button = event.target.closest('.base-chip');
      if (!button) return;
      setSourceBase(Number(button.dataset.base));
    });

    elements.sourceSelect.addEventListener('change', (event) => {
      setSourceBase(Number(event.target.value));
    });

    elements.targetSelect.addEventListener('change', (event) => {
      setTargetBase(Number(event.target.value));
    });

    elements.precisionSelect.addEventListener('change', (event) => {
      state.precision = Number(event.target.value);
      saveSettings();
      convert();
    });

    elements.groupToggle.addEventListener('change', (event) => {
      state.grouped = event.target.checked;
      saveSettings();
      convert();
    });

    elements.upperToggle.addEventListener('change', (event) => {
      state.uppercase = event.target.checked;
      saveSettings();
      convert();
    });

    elements.clearButton.addEventListener('click', () => {
      elements.input.value = '';
      setFieldError('');
      clearCardValues('等待输入');
      elements.input.focus({ preventScroll: true });
    });

    elements.examples.addEventListener('click', (event) => {
      const button = event.target.closest('.example-chip');
      if (button) loadExample(button);
    });

    elements.copyPrimary.addEventListener('click', () => {
      copyValue(
        elements.copyPrimary.dataset.copy,
        elements.copyPrimary.dataset.label || '结果',
        elements.copyPrimary
      );
    });

    for (const card of elements.commonCards) {
      card.addEventListener('click', () => {
        copyValue(
          card.dataset.copy,
          card.dataset.label || '结果',
          card
        );
      });
    }

    elements.allGrid.addEventListener('click', (event) => {
      const row = event.target.closest('.all-base');
      if (!row) return;
      copyValue(row.dataset.copy, row.dataset.label || '结果', row);
    });

    elements.themeToggle.addEventListener('click', () => {
      const nextTheme =
        document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme, true);
    });

    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.matches('input, select, textarea') || target.isContentEditable);

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        elements.input.focus();
        elements.input.select();
        return;
      }

      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        elements.input.focus();
        elements.input.select();
      }
    });

    const colorScheme = window.matchMedia('(prefers-color-scheme: light)');
    if (typeof colorScheme.addEventListener === 'function') {
      colorScheme.addEventListener('change', (event) => {
        let hasPreference = false;
        try {
          hasPreference = Boolean(localStorage.getItem(THEME_KEY));
        } catch (error) {
          hasPreference = false;
        }

        if (!hasPreference) applyTheme(event.matches ? 'light' : 'dark', false);
      });
    }
  }

  function init() {
    loadSettings();
    fillBaseSelect(elements.sourceSelect);
    fillBaseSelect(elements.targetSelect);
    buildAllBaseRows();
    syncSourceUI();
    syncTargetUI();
    syncSettingControls();
    applyTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark', false);
    bindEvents();

    elements.input.value = INITIAL_VALUE;
    convert();
  }

  init();
})();

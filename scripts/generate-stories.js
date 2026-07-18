import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const tokenPath = path.join(rootDir, 'tokens.json');
const storiesDir = path.join(rootDir, 'src', 'stories');

const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

const ignoredKeys = new Set(['light', 'dark', 'theme', '$themes', '$metadata', 'tokenSetOrder']);

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const cap = (value = '') => value.charAt(0).toUpperCase() + value.slice(1);
const js = (value) => JSON.stringify(value, null, 2);

function readTokenValue(node) {
  if (!node || typeof node !== 'object') return node;
  return node.value !== undefined ? node.value : node.$value;
}

function getByPath(root, rawPath) {
  if (!rawPath) return undefined;
  const keys = rawPath.split('.');
  let current = root;
  for (const key of keys) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

function aliasCandidates(ref) {
  const candidates = [ref, `core.${ref}`, `semantic.${ref}`, `component.${ref}`, `typography.${ref}`];
  const fontMap = {
    'font.family.': 'core.fontFamily.',
    'font.size.': 'core.fontSize.',
    'font.weight.': 'core.fontWeight.',
    'font.lineHeight.': 'core.lineHeight.',
    'font.letterSpacing.': 'core.letterSpacing.',
  };

  for (const [from, to] of Object.entries(fontMap)) {
    if (ref.startsWith(from)) candidates.unshift(ref.replace(from, to));
  }

  for (const prefix of ['color', 'spacing', 'radius', 'borderWidth', 'opacity', 'shadow']) {
    if (ref.startsWith(`${prefix}.`)) candidates.unshift(`core.${ref}`);
  }

  return [...new Set(candidates)];
}

function resolveRef(value, depth = 0) {
  if (depth > 12) return value;
  if (typeof value !== 'string') return value;
  const match = value.match(/^\{(.+)\}$/);
  if (!match) return value;

  for (const candidate of aliasCandidates(match[1])) {
    const found = getByPath(tokens, candidate);
    const next = readTokenValue(found);
    if (next !== undefined) return resolveRef(next, depth + 1);
  }

  return value;
}

function formatShadow(value) {
  const resolved = resolveRef(value);
  if (typeof resolved === 'string') return resolved;
  if (Array.isArray(resolved)) return resolved.map(formatShadow).join(', ');
  if (resolved && typeof resolved === 'object') {
    const px = (item) => (typeof item === 'number' ? `${item}px` : item || '0');
    return `${px(resolved.x)} ${px(resolved.y)} ${px(resolved.blur)} ${px(resolved.spread)} ${resolveRef(resolved.color || '#000000')}`;
  }
  return 'none';
}

function cssValue(value) {
  const resolved = resolveRef(value);
  if (Array.isArray(resolved)) return resolved.map(cssValue).join(', ');
  if (resolved && typeof resolved === 'object') return formatShadow(resolved);
  return resolved;
}

function flattenTokens(node, prefix = '', jsonPath = '') {
  if (!node || typeof node !== 'object') return [];
  const result = [];

  for (const [key, value] of Object.entries(node)) {
    if (ignoredKeys.has(key)) continue;
    const nextName = prefix ? `${prefix}-${key}` : key;
    const nextJsonPath = jsonPath ? `${jsonPath}.${key}` : key;

    if (value && typeof value === 'object' && (value.value !== undefined || value.$value !== undefined)) {
      result.push({
        name: nextName,
        path: nextJsonPath,
        cssName: `--${nextJsonPath.replace(/^core\./, '').replace(/\./g, '-')}`,
        value: readTokenValue(value),
        resolved: cssValue(readTokenValue(value)),
        description: value.description || value.$description || '',
        type: value.type || value.$type || '',
      });
    } else if (value && typeof value === 'object') {
      result.push(...flattenTokens(value, nextName, nextJsonPath));
    }
  }

  return result;
}

function collectCompositions(node, category, jsonPrefix) {
  if (!node || typeof node !== 'object') return [];

  return Object.entries(node)
    .filter(([key]) => !ignoredKeys.has(key))
    .map(([key, value]) => {
      const props = {};
      for (const [propName, propValue] of Object.entries(value || {})) {
        const raw = readTokenValue(propValue);
        if (raw !== undefined) props[propName] = cssValue(raw);
      }
      return {
        name: key,
        path: `${category}.${key}`,
        jsonPath: `${jsonPrefix}.${key}`,
        props,
        description: value?.description || '',
      };
    });
}

function writeFile(fileName, content) {
  fs.writeFileSync(path.join(storiesDir, fileName), `${content.trim()}\n`);
}

const dsThemeCss = String.raw`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --bg: #f7f8fa;
  --surface: #ffffff;
  --surface-2: #fbfbfd;
  --border: #e6e8ee;
  --border-strong: #d8dbe3;
  --text: #0f1222;
  --text-2: #4a5060;
  --text-3: #7a8093;
  --text-4: #9aa0b0;
  --accent: #4f46e5;
  --accent-soft: #eef0ff;
  --accent-ink: #3730a3;
  --success: #15803d;
  --success-soft: #e7f6ec;
  --warn: #b45309;
  --warn-soft: #fef3c7;
  --danger: #b91c1c;
  --danger-soft: #fde8e8;
  --info: #1d4ed8;
  --info-soft: #e6efff;
  --shadow-card: 0 1px 0 rgba(15,18,34,0.04), 0 2px 6px -2px rgba(15,18,34,0.06);
  --shadow-pop: 0 1px 0 rgba(15,18,34,0.04), 0 10px 30px -10px rgba(15,18,34,0.18);
  --radius-card: 14px;
  --radius-sm: 8px;
}

[data-theme="dark"] {
  --bg: #0b0d12;
  --surface: #11141b;
  --surface-2: #0e1117;
  --border: #1d2330;
  --border-strong: #2a3142;
  --text: #eef0f6;
  --text-2: #b8bdcd;
  --text-3: #868c9d;
  --text-4: #5e6478;
  --accent: #818cf8;
  --accent-soft: #1e1f3d;
  --accent-ink: #c7caff;
  --success: #4ade80;
  --success-soft: #0e2a1c;
  --warn: #fbbf24;
  --warn-soft: #2a2010;
  --danger: #f87171;
  --danger-soft: #2a1416;
  --info: #60a5fa;
  --info-soft: #102036;
  --shadow-card: 0 1px 0 rgba(0,0,0,0.4), 0 2px 6px -2px rgba(0,0,0,0.4);
  --shadow-pop: 0 1px 0 rgba(0,0,0,0.4), 0 10px 30px -10px rgba(0,0,0,0.6);
}

.ds-page, .do-shell {
  background: var(--bg);
  color: var(--text);
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  min-height: 100vh;
}

.ds-page {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.ds-header {
  margin-bottom: 24px;
}

.ds-header-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ds-title {
  color: var(--text);
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
  margin: 0;
}

.ds-subtitle {
  color: var(--text-3);
  font-size: 15px;
  line-height: 1.6;
  margin: 10px 0 0;
  max-width: 760px;
}

.ds-count {
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 16%, transparent);
  border-radius: 999px;
  color: var(--accent-ink);
  font: 600 12px/1 Inter, sans-serif;
  padding: 6px 10px;
}

.ds-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.ds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
}

.ds-clickable {
  cursor: pointer;
  transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}

.ds-clickable:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-pop);
  transform: translateY(-1px);
}

.ds-swatch {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
  position: relative;
}

.ds-swatch-color {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--border-strong) 70%, transparent);
}

.ds-token-name {
  color: var(--text);
  font-weight: 650;
  overflow-wrap: anywhere;
}

.ds-token-value, .ds-code {
  color: var(--text-2);
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
}

.ds-description {
  color: var(--text-3);
  font-size: 12.5px;
  line-height: 1.45;
  margin-top: 5px;
}

.ds-copied {
  animation: copiedPop 1.1s ease both;
  background: var(--text);
  border-radius: 999px;
  color: var(--surface);
  font-size: 11px;
  font-weight: 700;
  padding: 5px 8px;
  position: absolute;
  right: 12px;
  top: 12px;
}

@keyframes copiedPop {
  0% { opacity: 0; transform: translateY(4px) scale(0.96); }
  18%, 75% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-4px) scale(0.98); }
}

.ds-scale-list {
  overflow: hidden;
}

.ds-scale-row {
  display: grid;
  grid-template-columns: 190px minmax(120px, 1fr) 90px;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
}

.ds-scale-row:nth-child(even) {
  background: var(--surface-2);
}

.ds-bar-track {
  background: color-mix(in srgb, var(--accent-soft) 55%, transparent);
  border-radius: 999px;
  height: 12px;
  overflow: hidden;
}

.ds-bar-fill {
  background: linear-gradient(90deg, var(--accent), #7c3aed);
  border-radius: inherit;
  height: 100%;
  min-width: 3px;
}

.ds-type-list {
  overflow: hidden;
}

.ds-type-item {
  padding: 24px;
  border-bottom: 1px solid var(--border);
}

.ds-type-item:last-child {
  border-bottom: 0;
}

.ds-type-tag {
  background: var(--accent-soft);
  border-radius: 999px;
  color: var(--accent-ink);
  display: inline-flex;
  font: 700 12px/1 Inter, sans-serif;
  margin-bottom: 14px;
  padding: 6px 10px;
}

.ds-type-sample {
  color: var(--text);
  margin-bottom: 12px;
}

.ds-meta {
  color: var(--text-3);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
}

.ds-meta code {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text-2);
  font-family: "JetBrains Mono", monospace;
  padding: 4px 7px;
}

.ds-radius-grid, .ds-shadow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 16px;
}

.ds-radius-card, .ds-shadow-card, .ds-component-card {
  padding: 18px;
}

.ds-radius-box {
  background: linear-gradient(135deg, var(--accent), #06b6d4);
  height: 80px;
  margin-bottom: 14px;
  width: 80px;
}

.ds-shadow-box {
  background: #fff;
  border: 1px solid #eef0f4;
  border-radius: 12px;
  height: 84px;
  margin-bottom: 14px;
}

.ds-opacity-row {
  display: grid;
  grid-template-columns: 190px minmax(140px, 1fr) 90px;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
}

.ds-opacity-row:nth-child(even) {
  background: var(--surface-2);
}

.ds-checker {
  background-image: linear-gradient(45deg, #d8dbe3 25%, transparent 25%), linear-gradient(-45deg, #d8dbe3 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d8dbe3 75%), linear-gradient(-45deg, transparent 75%, #d8dbe3 75%);
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
  background-size: 16px 16px;
  border: 1px solid var(--border);
  border-radius: 999px;
  height: 24px;
  overflow: hidden;
}

.ds-opacity-fill {
  background: var(--accent);
  height: 100%;
  width: 100%;
}

.ds-table {
  border-collapse: collapse;
  width: 100%;
}

.ds-table th {
  background: var(--surface-2);
  border-bottom: 1px solid var(--border);
  color: var(--text-4);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 12px 16px;
  text-align: left;
  text-transform: uppercase;
}

.ds-table td {
  border-bottom: 1px solid var(--border);
  color: var(--text-2);
  font-size: 13px;
  padding: 14px 16px;
  vertical-align: middle;
}

.ds-table tbody tr:hover {
  background: var(--surface-2);
}

.ds-mini-swatch {
  border: 1px solid var(--border-strong);
  border-radius: 7px;
  display: inline-block;
  height: 20px;
  margin-right: 8px;
  vertical-align: middle;
  width: 20px;
}

.ds-preview-band {
  background: #171a22;
  border-radius: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 18px;
}

.ds-button {
  align-items: center;
  border-radius: 8px;
  border: 1px solid transparent;
  display: inline-flex;
  font-weight: 700;
  justify-content: center;
}

.ds-button.sm { min-height: 32px; padding: 4px 10px; font-size: 13px; }
.ds-button.md { min-height: 40px; padding: 8px 16px; font-size: 14px; }
.ds-button.lg { min-height: 48px; padding: 10px 24px; font-size: 16px; }
.ds-button.primary { background: var(--accent); color: white; }
.ds-button.secondary { background: white; border-color: var(--border-strong); color: #111827; }
.ds-button.ghost { background: transparent; border-color: rgba(255,255,255,0.2); color: white; }
.ds-button.danger { background: var(--danger); color: white; }

.ds-input-grid, .ds-card-grid, .ds-badge-grid, .ds-alert-grid {
  display: grid;
  gap: 14px;
}

.ds-input {
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  color: var(--text);
  display: grid;
  min-width: 220px;
  padding: 8px 12px;
}

.ds-input.focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.ds-input.error { border-color: var(--danger); box-shadow: 0 0 0 3px var(--danger-soft); }
.ds-input.disabled { opacity: 0.55; }

.ds-badge {
  border-radius: 999px;
  display: inline-flex;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 9px;
  width: fit-content;
}

.ds-badge.success { background: var(--success-soft); color: var(--success); }
.ds-badge.warning { background: var(--warn-soft); color: var(--warn); }
.ds-badge.error { background: var(--danger-soft); color: var(--danger); }
.ds-badge.info { background: var(--info-soft); color: var(--info); }
.ds-badge.neutral { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-2); }

.ds-alert {
  border: 1px solid var(--border);
  border-radius: 12px;
  display: flex;
  gap: 10px;
  padding: 12px;
}

.ds-alert.success { background: var(--success-soft); color: var(--success); }
.ds-alert.warning { background: var(--warn-soft); color: var(--warn); }
.ds-alert.error { background: var(--danger-soft); color: var(--danger); }
.ds-alert.info { background: var(--info-soft); color: var(--info); }

.do-shell * { box-sizing: border-box; }
.do-shell { background: #f9fafb; color: #101828; }
.do-shell button { font: inherit; cursor: pointer; }
.do-app { display: grid; grid-template-columns: minmax(0, 1fr); min-height: 100vh; }
.do-sidebar { background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 22px; height: 100vh; padding: 18px 14px; position: sticky; top: 0; }
.do-brand { align-items: center; display: flex; gap: 10px; padding: 4px 6px 8px; }
.do-logo { background: linear-gradient(135deg, var(--accent), #7c3aed); border-radius: 8px; color: white; display: grid; font-size: 13px; font-weight: 800; height: 30px; place-items: center; width: 30px; }
.do-brand-title { font-size: 13.5px; font-weight: 700; line-height: 1.15; }
.do-brand-sub { color: var(--text-3); font-size: 11px; }
.do-section-label { color: var(--text-4); font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; padding: 0 8px 6px; text-transform: uppercase; }
.do-nav { display: flex; flex-direction: column; gap: 1px; }
.do-nav-item { align-items: center; border-radius: 7px; color: var(--text-2); display: flex; gap: 10px; padding: 7px 10px; }
.do-nav-item.active, .do-nav-item:hover { background: var(--accent-soft); color: var(--accent-ink); }
.do-count { color: var(--text-4); font-size: 11px; margin-left: auto; }
.do-footer { border-top: 1px solid var(--border); color: var(--text-4); display: flex; font: 500 11px/1.4 "JetBrains Mono", monospace; justify-content: space-between; margin-top: auto; padding: 10px 8px; }
.do-main { min-width: 0; }
.do-home-header { align-items: center; background: #fff; border-bottom: 1px solid #e5e7eb; display: flex; height: 85px; justify-content: space-between; padding: 16px 32px; }
.do-home-title { color: #101828; font-size: 24px; font-weight: 800; line-height: 36px; margin: 0; letter-spacing: 0.07px; }
.do-home-title span { color: #6a7282; }
.do-home-title em { font-style: normal; font-weight: 600; }
.do-home-header p { color: #6a7282; font-size: 12px; line-height: 16px; margin: 0; }
.do-home-tools { align-items: center; display: flex; gap: 16px; }
.do-topbar { align-items: center; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; gap: 16px; height: 56px; padding: 0 28px; position: sticky; top: 0; z-index: 5; }
.do-crumbs { align-items: center; color: var(--text-3); display: flex; font-size: 13px; gap: 8px; }
.do-current { color: var(--text); font-weight: 650; }
.do-topbar-right { align-items: center; display: flex; gap: 14px; margin-left: auto; }
.do-avatars { display: flex; }
.do-avatar-wrap { position: relative; }
.do-avatar { border: 2px solid var(--surface); border-radius: 50%; color: white; display: grid; flex: 0 0 auto; font-size: 10px; font-weight: 800; height: 26px; place-items: center; width: 26px; }
.do-avatar-wrap:not(:first-child), .do-avatar-more { margin-left: -8px; }
.do-avatar-more { background: var(--surface-2); color: var(--text-2); }
.do-tooltip { background: var(--text); border-radius: 6px; box-shadow: var(--shadow-pop); color: var(--surface); font-size: 11.5px; left: 50%; opacity: 0; padding: 6px 10px; pointer-events: none; position: absolute; top: calc(100% + 8px); transform: translateX(-50%); transition: opacity 120ms; white-space: nowrap; z-index: 30; }
.do-avatar-wrap:hover .do-tooltip { opacity: 1; }
.do-theme-pill { background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; display: inline-flex; padding: 2px; }
.do-theme-pill button, .do-icon-btn { background: transparent; border: 0; color: var(--text-3); display: grid; place-items: center; }
.do-theme-pill button { border-radius: 6px; padding: 4px 8px; }
.do-theme-pill button.on { background: var(--surface); box-shadow: var(--shadow-card); color: var(--text); }
.do-icon-btn { border-radius: 8px; height: 34px; position: relative; width: 34px; }
.do-icon-btn:hover { background: var(--surface-2); color: var(--text); }
.do-dot { background: var(--accent); border: 2px solid var(--surface); border-radius: 50%; height: 7px; position: absolute; right: 8px; top: 7px; width: 7px; }
.do-me { align-items: center; border-radius: 999px; display: flex; gap: 8px; padding: 4px 6px 4px 4px; }
.do-content { display: flex; flex-direction: column; gap: 32px; margin: 0 auto; max-width: 1536px; padding: 32px; width: 100%; }
.do-page-head { align-items: flex-end; display: flex; gap: 16px; }
.do-page-title { font-size: 22px; font-weight: 700; margin: 0; }
.do-page-sub { color: var(--text-3); font-size: 13px; margin-top: 2px; }
.do-page-actions { display: flex; gap: 8px; margin-left: auto; }
.do-btn { align-items: center; background: var(--surface); border: 1px solid #e5e7eb; border-radius: 10px; color: #4a5565; display: inline-flex; font-size: 14px; font-weight: 500; gap: 8px; min-height: 38px; padding: 8px 12px; }
.do-btn.primary { background: var(--accent); border-color: var(--accent); color: white; }
.do-kpi-grid { display: grid; gap: 24px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.do-kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; box-shadow: 0 4px 3px rgba(0,0,0,0.10), 0 2px 2px rgba(0,0,0,0.10); display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; grid-template-rows: 48px 20px; column-gap: 16px; height: 117px; padding: 25px; text-align: left; transition: 140ms ease; }
.do-kpi:hover, .do-kpi.active { border-color: #d1d5db; box-shadow: 0 6px 10px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08); transform: translateY(-1px); }
.do-kpi.priority { background: #fff; border-color: #e5e7eb; }
.do-kpi-top { align-items: center; display: contents; }
.do-kpi-icon { background: #ffedd4; border: 0; border-radius: 10px; color: #4f39f6; display: grid; grid-row: 1; height: 48px; place-items: center; width: 48px; }
.do-kpi-badge { background: var(--accent); border-radius: 999px; color: white; font-size: 10px; font-weight: 800; letter-spacing: 0.03em; padding: 3px 8px; text-transform: uppercase; }
.do-kpi-trend { align-self: start; color: #16a34a; font-size: 16px; font-weight: 800; grid-column: 3; grid-row: 1; }
.do-kpi-trend.down { color: #ca3500; }
.do-kpi-num { align-self: center; color: #101828; font-size: 30px; font-weight: 700; grid-column: 2; grid-row: 1; letter-spacing: 0.4px; line-height: 36px; }
.do-kpi-label { align-self: end; color: #4a5565; font-size: 14px; font-weight: 400; grid-column: 1 / -1; grid-row: 2; line-height: 20px; margin-top: 0; }
.do-kpi-foot, .do-delta { align-items: center; display: flex; gap: 5px; }
.do-kpi-foot { color: var(--text-3); font-size: 11.5px; }
.do-delta { font-weight: 800; }
.do-delta.up { color: var(--success); }
.do-delta.warn { color: var(--warn); }
.do-body-grid { align-items: start; display: grid; gap: 20px; grid-template-columns: minmax(0, 1fr) 320px; }
.do-stack, .do-right-col { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.do-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; box-shadow: 0 1px 1.5px rgba(0,0,0,0.1), 0 1px 1px rgba(0,0,0,0.1); overflow: hidden; }
.do-home-card { min-height: 768px; }
.do-review-detail { margin-top: -8px; }
.do-review-summary { padding: 24px; }
.do-review-summary .do-card-head { min-height: 0; padding: 0; }
.do-card.muted { background: var(--surface-2); }
.do-card-head { align-items: center; border-bottom: 0; display: flex; gap: 12px; min-height: 78px; padding: 24px 24px 16px; }
.do-card-title { align-items: center; color: #101828; display: flex; font-size: 20px; font-weight: 600; gap: 8px; letter-spacing: -0.45px; line-height: 28px; margin: 0; }
.do-title-count { background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; color: var(--text-3); font-size: 11.5px; font-weight: 600; padding: 2px 7px; }
.do-card-actions { align-items: center; display: flex; gap: 6px; margin-left: auto; }
.do-home-searchbar { border-bottom: 1px solid #e5e7eb; padding: 0 24px 24px; }
.do-search { align-items: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; color: #6a7282; display: flex; gap: 8px; min-height: 38px; padding: 8px 12px; width: 100%; }
.do-search input { background: transparent; border: 0; color: #101828; flex: 1; font: inherit; font-size: 14px; outline: 0; padding: 0; }
.do-search input::placeholder { color: rgba(10,10,10,0.5); }
.do-filter-bar { align-items: center; border-bottom: 1px solid var(--border); display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 18px; }
.do-chip { background: var(--surface); border: 1px solid var(--border); border-radius: 999px; color: var(--text-2); font-size: 11.5px; padding: 4px 9px; }
.do-chip.active { background: var(--text); border-color: var(--text); color: var(--surface); }
.do-filter-clear { background: transparent; border: 0; color: var(--text-3); margin-left: auto; }
.do-table { border-collapse: collapse; width: 100%; }
.do-table th { background: #f9fafb; border-bottom: 1px solid #e5e7eb; color: #6a7282; font-size: 12px; font-weight: 500; letter-spacing: 0.6px; line-height: 16px; padding: 12px 24px; text-align: left; text-transform: uppercase; }
.do-table td { border-bottom: 1px solid #e5e7eb; color: #4a5565; font-size: 14px; height: 66px; line-height: 20px; padding: 16px 24px; vertical-align: middle; }
.do-table tbody tr:hover { background: #fbfbfd; }
.do-table tbody tr.selected { background: #f7f8ff; }
.do-table .empty, .empty { color: var(--text-3); font-size: 13px; padding: 34px 18px; text-align: center; }
.do-review-name { color: #4f39f6; display: flex; flex-direction: column; font-weight: 500; gap: 2px; }
.do-review-id { color: var(--text-4); font: 500 10.5px/1 "JetBrains Mono", monospace; }
.do-author { align-items: center; display: flex; gap: 8px; }
.do-elts { display: flex; flex-wrap: wrap; gap: 4px; }
.do-elt { border-radius: 4px; font-size: 12px; font-weight: 500; line-height: 16px; padding: 4px 8px; }
.do-elt.c { background: #f1efff; color: #432dd7; }
.do-elt.k { background: #faf0ff; color: #8200db; }
.do-elt.s { background: #fff0f7; color: #c6005c; }
.do-badge { align-items: center; border-radius: 4px; display: inline-flex; font-size: 12px; font-weight: 500; gap: 4px; line-height: 16px; padding: 4px 8px; }
.do-badge::before { display: none; }
.do-badge.todo { background: #e3e9fc; color: #1447e6; }
.do-badge.progress { background: #f9e7e1; color: #ca3500; }
.do-badge.blocked { background: #ffe4e6; color: #c10007; }
.do-badge.success { background: #dcfce7; color: #008236; }
.do-badge.tosend { background: #f0e1f0; color: purple; }
.do-badge.neutral { background: #fff4e1; border: 0; color: orange; }
.do-row-action { background: #4f39f6; border: 1px solid #4f39f6; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 500; min-height: 32px; padding: 6px 11px; }
.do-row-action.primary { background: #4f39f6; color: #fff; }
.do-pager, .do-see-all { align-items: center; background: #f9fafb; border-top: 1px solid #e5e7eb; color: #4a5565; display: flex; font-size: 14px; justify-content: space-between; line-height: 20px; padding: 17px 24px; }
.do-pages { display: flex; gap: 4px; }
.do-page { background: transparent; border: 0; border-radius: 4px; color: #4a5565; font-size: 16px; min-height: 32px; padding: 4px 12px; width: auto; opacity: 0.5; }
.do-page.active { background: var(--text); color: var(--surface); }
.do-trend { padding: 16px 18px; }
.do-trend-head { align-items: flex-end; display: flex; justify-content: space-between; margin-bottom: 14px; }
.do-trend-label { color: var(--text-3); font-size: 12.5px; font-weight: 650; margin-bottom: 4px; }
.do-trend-num { font-size: 24px; font-weight: 750; line-height: 1; }
.do-spark { height: 64px; width: 100%; }
.do-spark-days { color: var(--text-4); display: flex; font: 500 10px/1 "JetBrains Mono", monospace; justify-content: space-between; margin-top: 6px; }
.do-qa { padding: 14px 16px; }
.do-qa-grid { display: grid; gap: 8px; grid-template-columns: 1fr 1fr; }
.do-qa-item { align-items: center; background: var(--surface-2); border: 1px solid var(--border); border-radius: 9px; color: var(--text); display: flex; gap: 10px; padding: 10px; text-align: left; }
.do-qa-icon { background: var(--surface); border: 1px solid var(--border); border-radius: 7px; color: var(--accent); display: grid; height: 28px; place-items: center; width: 28px; }
.do-qa-label { font-size: 12.5px; font-weight: 750; }
.do-qa-sub { color: var(--text-3); font-size: 10.5px; }
.do-mention { border-bottom: 1px solid var(--border); display: flex; gap: 10px; padding: 12px 16px; }
.do-mention.unread { background: linear-gradient(90deg, var(--accent-soft), transparent 36%); }
.do-mention-body { color: var(--text-2); flex: 1; font-size: 12.5px; min-width: 0; }
.do-mention-body b, .do-ref { color: var(--text); font-weight: 750; }
.do-ref { color: var(--accent); }
.do-mention-meta { align-items: center; color: var(--text-4); display: flex; font-size: 11px; gap: 8px; margin-top: 4px; }
.do-mention-tag { background: var(--surface-2); border: 1px solid var(--border); border-radius: 4px; color: var(--text-3); font-size: 10.5px; padding: 1px 6px; }

@media (max-width: 1100px) {
  .do-app { grid-template-columns: 1fr; }
  .do-sidebar { display: none; }
  .do-kpi-grid, .do-body-grid { grid-template-columns: 1fr; }
  .do-topbar, .do-content { padding-left: 18px; padding-right: 18px; }
}
`;

function generateColorStories() {
  const palettes = ['neutral', 'orange'];
  const colorsByPalette = Object.fromEntries(
    palettes.map((palette) => [palette, flattenTokens(tokens.core?.color?.[palette] || {}, '', `core.color.${palette}`)])
  );
  const tokenCount = Object.values(colorsByPalette).reduce((sum, list) => sum + list.length, 0);

  let file = `import React, { useState } from 'react';\nimport './ds-theme.css';\n\nconst PALETTES = ${js(colorsByPalette)};\n\nfunction copyToken(name, setCopied) {\n  navigator.clipboard?.writeText(name);\n  setCopied(name);\n  window.setTimeout(() => setCopied(null), 1000);\n}\n\nfunction ColorPage({ title, tokens }) {\n  const [copied, setCopied] = useState(null);\n  return (\n    <div className="ds-page">\n      <header className="ds-header">\n        <div className="ds-header-row"><h1 className="ds-title">{title} Palette</h1><span className="ds-count">{tokens.length} tokens</span></div>\n        <p className="ds-subtitle">Swatches cliquables pour copier le nom de variable CSS, avec valeur hex et usage documenté.</p>\n      </header>\n      <div className="ds-grid">\n        {tokens.map((token) => (\n          <button key={token.path} className="ds-card ds-swatch ds-clickable" onClick={() => copyToken(token.cssName, setCopied)} type="button">\n            <span className="ds-swatch-color" style={{ background: token.resolved }} />\n            <span>\n              <span className="ds-token-name">{token.name}</span><br />\n              <span className="ds-token-value">{token.resolved}</span>\n              {token.description && <span className="ds-description">{token.description}</span>}\n            </span>\n            {copied === token.cssName && <span className="ds-copied">Copied!</span>}\n          </button>\n        ))}\n      </div>\n    </div>\n  );\n}\n\nexport default { title: 'Design System/Colors' };\n`;

  for (const palette of palettes) {
    file += `\nexport const ${cap(palette)} = () => <ColorPage title="${cap(palette)}" tokens={PALETTES.${palette}} />;\n`;
  }

  writeFile('Colors.stories.jsx', file);
  return `Colors.stories.jsx (${palettes.length} palettes, ${tokenCount} tokens)`;
}

function generateSpacingStories() {
  const data = flattenTokens(tokens.core?.space || tokens.core?.spacing || {}, '', tokens.core?.space ? 'core.space' : 'core.spacing');
  const max = Math.max(...data.map((item) => parseFloat(item.resolved) || 0), 1);
  const rows = data.map((item) => ({ ...item, width: `${Math.max(2, ((parseFloat(item.resolved) || 0) / max) * 100)}%` }));

  const file = `import React from 'react';\nimport './ds-theme.css';\n\nconst SPACING = ${js(rows)};\n\nexport default { title: 'Design System/Spacing' };\n\nexport const Scale = () => (\n  <div className="ds-page">\n    <header className="ds-header">\n      <div className="ds-header-row"><h1 className="ds-title">Spacing Scale</h1><span className="ds-count">{SPACING.length} tokens</span></div>\n      <p className="ds-subtitle">Échelle proportionnelle des espacements, lisible par token et par valeur px.</p>\n    </header>\n    <div className="ds-card ds-scale-list">\n      {SPACING.map((item) => (\n        <div className="ds-scale-row" key={item.path}>\n          <span className="ds-token-name">{item.name}</span>\n          <span className="ds-bar-track"><span className="ds-bar-fill" style={{ width: item.width }} /></span>\n          <span className="ds-token-value">{item.resolved}</span>\n        </div>\n      ))}\n    </div>\n  </div>\n);\n`;

  writeFile('Spacing.stories.jsx', file);
  return `Spacing.stories.jsx (${data.length} tokens)`;
}

function generateTypographyStories() {
  const groups = {
    headings: collectCompositions(tokens.typography?.heading, 'heading', 'typography.heading'),
    body: collectCompositions(tokens.typography?.body, 'body', 'typography.body'),
    labels: collectCompositions(tokens.typography?.label, 'label', 'typography.label'),
  };

  const file = `import React from 'react';\nimport './ds-theme.css';\n\nconst TYPOGRAPHY = ${js(groups)};\n\nfunction TypePage({ title, items }) {\n  return (\n    <div className="ds-page">\n      <header className="ds-header">\n        <div className="ds-header-row"><h1 className="ds-title">{title}</h1><span className="ds-count">{items.length} styles</span></div>\n        <p className="ds-subtitle">Rendu live avec les valeurs typographiques réellement résolues depuis les tokens.</p>\n      </header>\n      <div className="ds-card ds-type-list">\n        {items.map((item) => {\n          const s = item.props;\n          return (\n            <section className="ds-type-item" key={item.path}>\n              <span className="ds-type-tag">{item.path}</span>\n              <div className="ds-type-sample" style={{ fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing }}>\n                The quick brown fox jumps over the lazy dog\n              </div>\n              <div className="ds-meta">\n                <code>size {s.fontSize}</code><code>weight {s.fontWeight}</code><code>line-height {s.lineHeight}</code><code>letter-spacing {s.letterSpacing || '0'}</code>\n              </div>\n            </section>\n          );\n        })}\n      </div>\n    </div>\n  );\n}\n\nexport default { title: 'Design System/Typography' };\nexport const Headings = () => <TypePage title="Headings" items={TYPOGRAPHY.headings} />;\nexport const Body = () => <TypePage title="Body" items={TYPOGRAPHY.body} />;\nexport const Labels = () => <TypePage title="Labels" items={TYPOGRAPHY.labels} />;\n`;

  writeFile('Typography.stories.jsx', file);
  return 'Typography.stories.jsx (3 catégories)';
}

function generateRadiusStories() {
  const data = flattenTokens(tokens.core?.radius || {}, '', 'core.radius');
  const file = `import React from 'react';\nimport './ds-theme.css';\n\nconst RADIUS = ${js(data)};\n\nexport default { title: 'Design System/Radius' };\n\nexport const Scale = () => (\n  <div className="ds-page">\n    <header className="ds-header">\n      <div className="ds-header-row"><h1 className="ds-title">Radius Scale</h1><span className="ds-count">{RADIUS.length} tokens</span></div>\n      <p className="ds-subtitle">Carrés de 80px avec chaque border-radius appliqué visuellement.</p>\n    </header>\n    <div className="ds-radius-grid">\n      {RADIUS.map((item) => (\n        <div className="ds-card ds-radius-card" key={item.path}>\n          <div className="ds-radius-box" style={{ borderRadius: item.resolved }} />\n          <div className="ds-token-name">{item.name}</div>\n          <div className="ds-token-value">{item.resolved}</div>\n        </div>\n      ))}\n    </div>\n  </div>\n);\n`;

  writeFile('Radius.stories.jsx', file);
  return `Radius.stories.jsx (${data.length} tokens)`;
}

function generateShadowStories() {
  const data = flattenTokens(tokens.core?.shadow || {}, '', 'core.shadow').map((item) => ({ ...item, resolved: formatShadow(item.value) }));
  const file = `import React from 'react';\nimport './ds-theme.css';\n\nconst SHADOWS = ${js(data)};\n\nexport default { title: 'Design System/Shadows' };\n\nexport const Scale = () => (\n  <div className="ds-page">\n    <header className="ds-header">\n      <div className="ds-header-row"><h1 className="ds-title">Shadows Scale</h1><span className="ds-count">{SHADOWS.length} tokens</span></div>\n      <p className="ds-subtitle">Rectangles blancs sur fond gris pour comparer les élévations.</p>\n    </header>\n    <div className="ds-shadow-grid">\n      {SHADOWS.map((item) => (\n        <div className="ds-card ds-shadow-card" key={item.path}>\n          <div className="ds-shadow-box" style={{ boxShadow: item.resolved }} />\n          <div className="ds-token-name">{item.name}</div>\n          <div className="ds-token-value">{item.resolved}</div>\n        </div>\n      ))}\n    </div>\n  </div>\n);\n`;

  writeFile('Shadows.stories.jsx', file);
  return `Shadows.stories.jsx (${data.length} tokens)`;
}

function generateOpacityStories() {
  const data = flattenTokens(tokens.core?.opacity || {}, '', 'core.opacity');
  const file = `import React from 'react';\nimport './ds-theme.css';\n\nconst OPACITY = ${js(data)};\n\nexport default { title: 'Design System/Opacity' };\n\nexport const Scale = () => (\n  <div className="ds-page">\n    <header className="ds-header">\n      <div className="ds-header-row"><h1 className="ds-title">Opacity Scale</h1><span className="ds-count">{OPACITY.length} tokens</span></div>\n      <p className="ds-subtitle">Barres sur fond damier pour rendre la transparence immédiatement visible.</p>\n    </header>\n    <div className="ds-card ds-scale-list">\n      {OPACITY.map((item) => (\n        <div className="ds-opacity-row" key={item.path}>\n          <span className="ds-token-name">{item.name}</span>\n          <span className="ds-checker"><span className="ds-opacity-fill" style={{ opacity: item.resolved }} /></span>\n          <span className="ds-token-value">{item.resolved}</span>\n        </div>\n      ))}\n    </div>\n  </div>\n);\n`;

  writeFile('Opacity.stories.jsx', file);
  return `Opacity.stories.jsx (${data.length} tokens)`;
}

function generateSemanticStories() {
  const categories = Object.keys(tokens.semantic?.color || {});
  const semantic = Object.fromEntries(
    categories.map((category) => [category, flattenTokens(tokens.semantic?.color?.[category] || {}, '', `semantic.color.${category}`)])
  );

  const file = `import React, { useState } from 'react';\nimport './ds-theme.css';\n\nconst SEMANTIC = ${js(semantic)};\n\nfunction copyToken(name, setCopied) {\n  navigator.clipboard?.writeText(name);\n  setCopied(name);\n  window.setTimeout(() => setCopied(null), 1000);\n}\n\nfunction SemanticPage({ title, rows }) {\n  const [copied, setCopied] = useState(null);\n  return (\n    <div className="ds-page">\n      <header className="ds-header">\n        <div className="ds-header-row"><h1 className="ds-title">Semantic {title}</h1><span className="ds-count">{rows.length} tokens</span></div>\n        <p className="ds-subtitle">Références sémantiques résolues vers leurs valeurs core, prêtes à être utilisées en CSS.</p>\n      </header>\n      <div className="ds-card">\n        <table className="ds-table">\n          <thead><tr><th>Token</th><th>Référence</th><th>Valeur résolue</th><th>Description</th></tr></thead>\n          <tbody>\n            {rows.map((row) => (\n              <tr key={row.path}>\n                <td><button className="ds-code ds-clickable" type="button" onClick={() => copyToken(row.cssName, setCopied)}>{row.cssName}</button>{copied === row.cssName && <span className="ds-copied">Copied!</span>}</td>\n                <td><span className="ds-mini-swatch" style={{ background: row.resolved }} /> <code>{String(row.value)}</code></td>\n                <td><code>{row.resolved}</code></td>\n                <td>{row.description || '—'}</td>\n              </tr>\n            ))}\n          </tbody>\n        </table>\n      </div>\n    </div>\n  );\n}\n\nexport default { title: 'Design System/Semantic' };\n${categories.map((category) => `export const ${cap(category)} = () => <SemanticPage title="${cap(category)}" rows={SEMANTIC.${category}} />;`).join('\n')}\n`;

  const count = categories.filter((category) => semantic[category].length > 0).length;
  writeFile('Semantic.stories.jsx', file);
  return `Semantic.stories.jsx (${count} catégories)`;
}

function generateComponentStories() {
  const file = `import React from 'react';\nimport './ds-theme.css';\n\nexport default { title: 'Design System/Components' };\n\nconst sizes = ['sm', 'md', 'lg'];\nconst buttonVariants = ['primary', 'secondary', 'ghost'];\nconst buttonStates = ['default', 'hover', 'disabled'];\nconst cardTones = ['default', 'highlight'];\nconst cardMedia = ['off', 'on'];\nconst cardStates = ['default', 'hover'];\n\nfunction buttonStyle(variant, size, state) {\n  const disabled = state === 'disabled';\n  const bgState = state === 'hover' ? 'hover' : disabled ? 'disabled' : 'default';\n  const textState = disabled ? 'disabled' : state === 'hover' && variant !== 'primary' ? 'hover' : 'default';\n  const borderState = state === 'hover' ? 'hover' : 'default';\n  return {\n    alignItems: 'center',\n    background: 'var(--component-button-' + variant + '-bg-' + bgState + ')',\n    border: '1px solid var(--component-button-' + variant + '-border-' + borderState + ')',\n    borderRadius: 'var(--component-button-radius)',\n    color: 'var(--component-button-' + variant + '-text-' + textState + ')',\n    display: 'inline-flex',\n    fontFamily: 'var(--component-button-font-family)',\n    fontSize: 'var(--component-button-' + size + '-font-size)',\n    fontWeight: 'var(--component-button-font-weight)',\n    gap: 'var(--component-button-' + size + '-gap)',\n    justifyContent: 'center',\n    lineHeight: 'var(--component-button-' + size + '-line-height)',\n    minHeight: 'var(--component-button-' + size + '-min-height)',\n    minWidth: 'var(--component-button-' + size + '-min-width)',\n    opacity: disabled ? 0.72 : 1,\n    padding: 'var(--component-button-' + size + '-padding-y) var(--component-button-' + size + '-padding-x)',\n  };\n}\n\nfunction cardStyle(tone, media, state) {\n  const hover = state === 'hover';\n  return {\n    background: 'var(--component-card-bg-' + tone + (hover ? '-hover' : '') + ')',\n    border: '1px solid var(--component-card-border-' + (hover ? 'hover' : 'default') + ')',\n    borderRadius: 'var(--component-card-radius)',\n    boxShadow: hover ? 'var(--component-card-shadow-hover)' : 'none',\n    color: 'var(--semantic-color-text-primary)',\n    display: 'flex',\n    flexDirection: 'column',\n    gap: 'var(--component-card-gap)',\n    minHeight: 'var(--component-card-height-media-' + media + ')',\n    padding: 'var(--component-card-padding)',\n    width: 'var(--component-card-width)',\n  };\n}\n\nexport const Button = () => (\n  <div className=\"ds-page\">\n    <header className=\"ds-header\"><div className=\"ds-header-row\"><h1 className=\"ds-title\">Button</h1><span className=\"ds-count\">3 variantes x 3 tailles x 3 etats</span></div><p className=\"ds-subtitle\">Preview Caba synchronisee sur les variables component-button.</p></header>\n    <div className=\"ds-card\" style={{ display: 'grid', gap: 18, padding: 20 }}>\n      {buttonVariants.map((variant) => (\n        <section key={variant} style={{ display: 'grid', gap: 10 }}>\n          <h3 className=\"ds-token-name\" style={{ margin: 0 }}>{variant}</h3>\n          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>\n            {buttonStates.map((state) => (\n              <div key={state} style={{ display: 'grid', gap: 8 }}>\n                <span className=\"ds-token-value\">{state}</span>\n                {sizes.map((size) => <button key={size} disabled={state === 'disabled'} style={buttonStyle(variant, size, state)}>{variant} {size}</button>)}\n              </div>\n            ))}\n          </div>\n        </section>\n      ))}\n    </div>\n  </div>\n);\n\nexport const Card = () => (\n  <div className=\"ds-page\">\n    <header className=\"ds-header\"><div className=\"ds-header-row\"><h1 className=\"ds-title\">Card</h1><span className=\"ds-count\">2 tons x 2 medias x 2 etats</span></div><p className=\"ds-subtitle\">Preview Caba synchronisee sur les variables component-card.</p></header>\n    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>\n      {cardTones.flatMap((tone) => cardMedia.flatMap((media) => cardStates.map((state) => (\n        <article key={tone + media + state} style={cardStyle(tone, media, state)}>\n          {media === 'on' && <div style={{ background: 'var(--semantic-color-bg-elevated)', borderRadius: 'var(--component-card-media-radius)', height: 'var(--component-card-media-height)' }} />}\n          <div style={{ display: 'grid', gap: 8 }}>\n            <span className=\"ds-token-value\">{tone} / media {media} / {state}</span>\n            <h3 style={{ color: 'var(--semantic-color-text-primary)', fontSize: 'var(--core-font-size-24)', lineHeight: 'var(--core-font-line-height-32)', margin: 0 }}>Soiree casino</h3>\n            <p style={{ color: 'var(--semantic-color-text-secondary)', fontSize: 'var(--core-font-size-14)', lineHeight: 'var(--core-font-line-height-20)', margin: 0 }}>Carte de contenu Caba, avec surface sombre, accent orange et etat hover documente.</p>\n          </div>\n        </article>\n      ))))}\n    </div>\n  </div>\n);\n`;

  writeFile('Components.stories.jsx', file);
  return 'Components.stories.jsx (2 composants)';
}

function dashboardStory() {
  return String.raw`
import React, { useMemo, useState } from 'react';
import './ds-theme.css';

const Icon = {
  Inbox: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  Check: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  Cube: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>,
  Palette: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 1 0 0 20 2 2 0 0 0 2-2v-2a2 2 0 0 1 2-2h2a4 4 0 0 0 4-4 10 10 0 0 0-10-10z"/></svg>,
  Code: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Bell: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  Search: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>,
  Filter: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Home: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Layers: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  Type: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  Users: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>,
  Settings: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.5.2.93.54 1.25 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Plus: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 16} height={p.size || 16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Sun: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>,
  Moon: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  At: (p = {}) => <svg viewBox="0 0 24 24" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></svg>,
};

const COLLABS = [
  { id: 'tj', name: 'Thibault Jovy', role: 'Design Ops · Owner', color: '#4f46e5', initials: 'TJ' },
  { id: 'ml', name: 'Marie Lambert', role: 'Senior Designer', color: '#0891b2', initials: 'ML' },
  { id: 'sk', name: 'Samir Khaled', role: 'Product Designer', color: '#16a34a', initials: 'SK' },
  { id: 'lc', name: 'Léa Charrier', role: 'Brand Designer', color: '#db2777', initials: 'LC' },
  { id: 'nb', name: 'Nicolas Bernard', role: 'Frontend Engineer', color: '#ea580c', initials: 'NB' },
  { id: 'aa', name: 'Aïcha Arnaud', role: 'Frontend Engineer', color: '#7c3aed', initials: 'AA' },
];

const KPIS = [
  { id: 'reviews', label: 'Reviews à valider', value: 12, delta: 3, icon: 'Check', priority: true },
  { id: 'components', label: 'Composants à vérifier', value: 34, delta: 8, icon: 'Cube' },
  { id: 'styles', label: 'Couleurs & styles à valider', value: 18, delta: -2, icon: 'Palette' },
  { id: 'dev', label: 'Éléments à transmettre dev', value: 7, delta: 0, icon: 'Code' },
];

const REVIEWS = [
  { id: 'R-241', name: 'Composant Combobox v2', sub: 'Recherche multi-critères + tags', days: 8, author: 'ml', counts: { c: 7, k: 4, s: 5 }, status: 'todo', kind: 'reviews' },
  { id: 'R-240', name: 'Tokens couleur — Neutral scale', sub: 'Refonte échelle 50→950', days: 6, author: 'lc', counts: { c: 0, k: 12, s: 3 }, status: 'progress', kind: 'styles' },
  { id: 'R-239', name: 'Data table — densité compact', sub: 'Variant pour rapports financiers', days: 5, author: 'sk', counts: { c: 3, k: 0, s: 8 }, status: 'todo', kind: 'components' },
  { id: 'R-238', name: 'Icônes système — pack v3.2', sub: '+34 glyphes, refactor stroke', days: 4, author: 'tj', counts: { c: 1, k: 0, s: 14 }, status: 'blocked', kind: 'components' },
  { id: 'R-237', name: 'Typographie display — révision', sub: 'Switch vers Söhne, scale 4xl→7xl', days: 3, author: 'lc', counts: { c: 0, k: 0, s: 11 }, status: 'todo', kind: 'styles' },
  { id: 'R-236', name: 'Form — patterns d’erreur', sub: 'Inline, summary, toast', days: 2, author: 'ml', counts: { c: 5, k: 2, s: 3 }, status: 'progress', kind: 'reviews' },
  { id: 'R-235', name: 'Spec dev — Toast & Snackbar', sub: 'Hand-off React + tokens', days: 2, author: 'nb', counts: { c: 2, k: 0, s: 0 }, status: 'todo', kind: 'dev' },
  { id: 'R-234', name: 'Charts — variants compact', sub: 'Bar + line + area, dense mode', days: 1, author: 'sk', counts: { c: 4, k: 3, s: 6 }, status: 'todo', kind: 'components' },
  { id: 'R-233', name: 'Accessibilité — focus rings', sub: 'Pattern global, prefers-contrast', days: 1, author: 'aa', counts: { c: 8, k: 1, s: 2 }, status: 'progress', kind: 'reviews' },
];

const VALIDATED = [
  { id: 'R-229', name: 'Modal — large variant', date: '08 mai', validator: 'tj', counts: { c: 2, k: 0, s: 1 }, status: 'merged' },
  { id: 'R-228', name: 'Tokens spacing — 4px scale', date: '07 mai', validator: 'tj', counts: { c: 0, k: 0, s: 6 }, status: 'transmis' },
  { id: 'R-227', name: 'Dropdown menu — keyboard nav', date: '06 mai', validator: 'ml', counts: { c: 1, k: 0, s: 0 }, status: 'published' },
  { id: 'R-226', name: 'Couleurs sémantiques v1.2', date: '05 mai', validator: 'tj', counts: { c: 0, k: 8, s: 2 }, status: 'merged' },
];

const MENTIONS = [
  { author: 'ml', text: 'vous a assigné à', target: 'R-241 · Combobox v2', when: 'il y a 12 min', tag: 'Assigné', unread: true },
  { author: 'nb', text: 'attend votre validation sur', target: 'R-235 · Toast specs dev', when: 'il y a 1 h', tag: 'Bloquant', unread: true },
  { author: 'lc', text: 'vous a mentionné dans la review', target: 'R-237', when: 'il y a 3 h', tag: 'Mention' },
  { author: 'sk', text: 'a répondu à votre commentaire sur', target: 'R-239', when: 'hier · 17:24', tag: 'Réponse' },
];

const STATUS = {
  todo: ['À valider', 'todo'],
  progress: ['En cours', 'progress'],
  blocked: ['Bloqué', 'blocked'],
  merged: ['Mergé', 'success'],
  transmis: ['Transmis dev', 'neutral'],
  published: ['Publié', 'success'],
};

const TREND = [4, 6, 5, 9, 7, 11, 12];

function Avatar({ id, size = 26 }) {
  const person = COLLABS.find((item) => item.id === id) || COLLABS[0];
  return <span className="do-avatar" style={{ background: person.color, width: size, height: size }}>{person.initials}</span>;
}

function Sidebar() {
  const spaces = [
    ['Home', 'Tableau de bord', '', true],
    ['Inbox', 'Reviews', '12'],
    ['Cube', 'Composants', '34'],
    ['Palette', 'Couleurs & tokens', '18'],
    ['Type', 'Typographie', ''],
    ['Layers', 'Patterns', ''],
    ['Code', 'Hand-off dev', '7'],
  ];
  const workspace = [['Users', 'Équipe'], ['Inbox', 'Documentation'], ['Settings', 'Paramètres']];
  const render = ([icon, label, count, active]) => {
    const I = Icon[icon];
    return <div className={'do-nav-item ' + (active ? 'active' : '')} key={label}><I size={15} /><span>{label}</span>{count && <span className="do-count">{count}</span>}</div>;
  };
  return <aside className="do-sidebar"><div className="do-brand"><div className="do-logo">TJ</div><div><div className="do-brand-title">Thibault Jovy</div><div className="do-brand-sub">Design System</div></div></div><div><div className="do-section-label">Espaces</div><nav className="do-nav">{spaces.map(render)}</nav></div><div><div className="do-section-label">Workspace</div><nav className="do-nav">{workspace.map(render)}</nav></div><div className="do-footer"><span>v2.4.0</span><span style={{ color: 'var(--success)' }}>stable</span></div></aside>;
}

function TopBar({ theme, setTheme }) {
  const visible = COLLABS.slice(0, 5);
  return <div className="do-topbar"><div className="do-crumbs"><span>Workspace</span><span>/</span><span>Thibault Jovy DS</span><span>/</span><span className="do-current">Tableau de bord</span></div><div className="do-topbar-right"><div className="do-avatars">{visible.map((person) => <span className="do-avatar-wrap" key={person.id}><span className="do-avatar" style={{ background: person.color }}>{person.initials}</span><span className="do-tooltip"><strong>{person.name}</strong><br />{person.role}</span></span>)}<span className="do-avatar do-avatar-more">+1</span></div><div className="do-theme-pill"><button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}><Icon.Sun /></button><button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}><Icon.Moon /></button></div><button className="do-icon-btn" aria-label="Notifications"><Icon.Bell /><span className="do-dot" /></button><div className="do-me"><Avatar id="tj" size={28} /><div><div style={{ fontSize: 12.5, fontWeight: 700 }}>Thibault Jovy</div><div style={{ color: 'var(--text-3)', fontSize: 10.5 }}>Design Ops</div></div></div></div></div>;
}

function KpiCard({ kpi, active, onClick }) {
  const I = Icon[kpi.icon];
  const tone = kpi.delta > 0 ? 'warn' : kpi.delta < 0 ? 'up' : '';
  return <button className={'do-kpi ' + (active ? 'active ' : '') + (kpi.priority ? 'priority' : '')} onClick={() => onClick(kpi.id)}><div className="do-kpi-top"><span className="do-kpi-icon"><I /></span>{kpi.priority && <span className="do-kpi-badge">Prioritaire</span>}</div><div><div className="do-kpi-num">{kpi.value}</div><div className="do-kpi-label">{kpi.label}</div></div><div className="do-kpi-foot"><span className={'do-delta ' + tone}>{kpi.delta === 0 ? '—' : (kpi.delta > 0 ? '↑ ' : '↓ ') + Math.abs(kpi.delta)}</span><span>vs semaine dernière</span></div></button>;
}

function ReviewsTable({ filter, search, setFilter, setSearch }) {
  const chips = [['all', 'Tous'], ['reviews', 'Reviews'], ['components', 'Composants'], ['styles', 'Couleurs & styles'], ['dev', 'Hand-off dev']];
  const filtered = useMemo(() => REVIEWS.filter((review) => (filter === 'all' || review.kind === filter) && (!search || (review.name + ' ' + review.id).toLowerCase().includes(search.toLowerCase()))), [filter, search]);
  return <div className="do-card"><div className="do-card-head"><h2 className="do-card-title">Reviews à valider <span className="do-title-count">{filtered.length}</span></h2><div className="do-card-actions"><label className="do-search"><Icon.Search size={13} /><input placeholder="Rechercher une review, un ID..." value={search} onChange={(event) => setSearch(event.target.value)} /></label><button className="do-btn"><Icon.Filter size={13} /> Filtres</button><button className="do-btn primary"><Icon.Plus size={13} /> Nouvelle</button></div></div><div className="do-filter-bar"><span style={{ color: 'var(--text-4)', fontSize: 11.5, marginRight: 4 }}>Catégorie :</span>{chips.map(([id, label]) => <button key={id} className={'do-chip ' + (filter === id ? 'active' : '')} onClick={() => setFilter(id)}>{label}</button>)}{filter !== 'all' && <button className="do-filter-clear" onClick={() => setFilter('all')}>Réinitialiser</button>}</div><table className="do-table"><thead><tr><th>Review</th><th>Soumis le</th><th>Auteur</th><th>Éléments</th><th>Statut</th><th /></tr></thead><tbody>{filtered.map((review) => { const [label, cls] = STATUS[review.status]; return <tr key={review.id}><td><span className="do-review-name">{review.name}<span><span className="do-review-id">{review.id}</span><span style={{ color: 'var(--text-3)', fontSize: 11.5 }}> · {review.sub}</span></span></span></td><td>{review.days > 1 ? 'il y a ' + review.days + ' j' : 'hier'}</td><td><span className="do-author"><Avatar id={review.author} size={22} />{COLLABS.find((item) => item.id === review.author)?.name.split(' ')[0]}</span></td><td><span className="do-elts">{review.counts.c > 0 && <span className="do-elt c">{review.counts.c} composants</span>}{review.counts.k > 0 && <span className="do-elt k">{review.counts.k} couleurs</span>}{review.counts.s > 0 && <span className="do-elt s">{review.counts.s} styles</span>}</span></td><td><span className={'do-badge ' + cls}>{label}</span></td><td style={{ textAlign: 'right' }}><button className="do-row-action">Accéder</button></td></tr>; })}</tbody></table><div className="do-pager"><span>{filtered.length} sur {REVIEWS.length} reviews — triées par date décroissante</span><span className="do-pages"><button className="do-page">‹</button><button className="do-page active">1</button><button className="do-page">2</button><button className="do-page">›</button></span></div></div>;
}

function ValidatedTable() {
  return <div className="do-card muted"><div className="do-card-head"><h2 className="do-card-title">Dernières reviews validées <span className="do-title-count">{VALIDATED.length}</span></h2><div className="do-card-actions"><span style={{ color: 'var(--text-4)', fontSize: 11.5 }}>7 derniers jours</span></div></div><table className="do-table"><thead><tr><th>Review</th><th>Validé le</th><th>Validé par</th><th>Éléments</th><th>Statut final</th></tr></thead><tbody>{VALIDATED.map((review) => { const [label, cls] = STATUS[review.status]; return <tr key={review.id}><td><span className="do-review-name">{review.name}<span className="do-review-id">{review.id}</span></span></td><td>{review.date}</td><td><span className="do-author"><Avatar id={review.validator} size={22} />{COLLABS.find((item) => item.id === review.validator)?.name.split(' ')[0]}</span></td><td><span className="do-elts">{review.counts.c > 0 && <span className="do-elt c">{review.counts.c} cmp</span>}{review.counts.k > 0 && <span className="do-elt k">{review.counts.k} clr</span>}{review.counts.s > 0 && <span className="do-elt s">{review.counts.s} sty</span>}</span></td><td><span className={'do-badge ' + cls}>{label}</span></td></tr>; })}</tbody></table><div className="do-see-all">Voir tout l'historique</div></div>;
}

function TrendCard() {
  const max = Math.max(...TREND);
  const min = Math.min(...TREND);
  const w = 280;
  const h = 64;
  const pts = TREND.map((value, index) => [4 + (index * (w - 8)) / (TREND.length - 1), h - 4 - ((value - min) / (max - min || 1)) * (h - 8)]);
  const d = pts.map((point, index) => (index ? 'L' : 'M') + point[0] + ',' + point[1]).join(' ');
  const area = d + ' L' + pts.at(-1)[0] + ',' + h + ' L' + pts[0][0] + ',' + h + ' Z';
  return <div className="do-card do-trend"><div className="do-trend-head"><div><div className="do-trend-label">Activité — 7 derniers jours</div><div className="do-trend-num">54 <span style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 600 }}>reviews soumises</span></div></div><div style={{ color: 'var(--text-3)', fontSize: 11.5, textAlign: 'right' }}><span className="do-delta up">↑ +24%</span><div>vs sem. préc.</div></div></div><svg className="do-spark" viewBox={'0 0 ' + w + ' ' + h} preserveAspectRatio="none"><defs><linearGradient id="doSpark" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs><path d={area} fill="url(#doSpark)" /><path d={d} stroke="var(--accent)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /><circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r="3" fill="var(--accent)" /></svg><div className="do-spark-days">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day) => <span key={day}>{day}</span>)}</div></div>;
}

function QuickActions() {
  const actions = [['Plus', 'Créer une review', 'Nouveau ticket'], ['Users', 'Inviter', 'Designer ou dev'], ['Code', 'Transmettre au dev', 'Hand-off'], ['Inbox', 'Note de release', 'Compiler v2.4.1']];
  return <div className="do-card do-qa"><div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><h3 className="do-card-title">Actions rapides</h3><span style={{ color: 'var(--text-4)', font: '500 10.5px JetBrains Mono, monospace' }}>⌘ K</span></div><div className="do-qa-grid">{actions.map(([icon, label, sub]) => { const I = Icon[icon]; return <button className="do-qa-item" key={label}><span className="do-qa-icon"><I size={14} /></span><span><span className="do-qa-label">{label}</span><br /><span className="do-qa-sub">{sub}</span></span></button>; })}</div></div>;
}

function MentionsCard() {
  return <div className="do-card"><div className="do-card-head"><Icon.At /><h3 className="do-card-title">Mentions & assigné</h3><span className="do-title-count" style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>2 non lus</span></div>{MENTIONS.map((mention) => <div className={'do-mention ' + (mention.unread ? 'unread' : '')} key={mention.target}><Avatar id={mention.author} size={28} /><div className="do-mention-body"><b>{COLLABS.find((item) => item.id === mention.author)?.name.split(' ')[0]}</b> {mention.text} <span className="do-ref">{mention.target}</span><div className="do-mention-meta"><span>{mention.when}</span><span className="do-mention-tag">{mention.tag}</span></div></div></div>)}<div className="do-see-all">Voir toutes les notifications</div></div>;
}

function Dashboard() {
  const [theme, setTheme] = useState('light');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const onKpiClick = (id) => setFilter((previous) => previous === id ? 'all' : id);
  const activeKpi = filter === 'all' ? null : filter;
  return <div className="do-shell" data-theme={theme}><div className="do-app"><Sidebar /><main className="do-main"><TopBar theme={theme} setTheme={setTheme} /><div className="do-content"><div className="do-page-head"><div><h1 className="do-page-title">Bonjour Thibault</h1><div className="do-page-sub">12 reviews en attente — 3 sont urgentes. Activité +24% cette semaine.</div></div><div className="do-page-actions"><button className="do-btn"><Icon.Filter size={13} /> Cette semaine</button><button className="do-btn primary"><Icon.Plus size={13} /> Nouvelle review</button></div></div><div className="do-kpi-grid">{KPIS.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} active={activeKpi === kpi.id} onClick={onKpiClick} />)}</div><div className="do-body-grid"><div className="do-stack"><ReviewsTable filter={filter} search={search} setFilter={setFilter} setSearch={setSearch} /><ValidatedTable /></div><aside className="do-right-col"><TrendCard /><QuickActions /><MentionsCard /></aside></div></div></main></div></div>;
}

export default { title: 'Dashboard' };
export const Overview = () => <Dashboard />;
`;
}

function generateDashboardStories() {
  writeFile('Dashboard.stories.jsx', dashboardStory());
  return 'Dashboard.stories.jsx';
}

ensureDir(storiesDir);

console.log('\n🔨 Génération des stories React depuis tokens.json...\n');
writeFile('ds-theme.css', dsThemeCss);
console.log('  ✓ ds-theme.css');
console.log(`  ✓ ${generateColorStories()}`);
console.log(`  ✓ ${generateSpacingStories()}`);
console.log(`  ✓ ${generateTypographyStories()}`);
console.log(`  ✓ ${generateRadiusStories()}`);
console.log(`  ✓ ${generateShadowStories()}`);
console.log(`  ✓ ${generateOpacityStories()}`);
console.log(`  ✓ ${generateSemanticStories()}`);
console.log(`  ✓ ${generateComponentStories()}`);
console.log(`  ✓ ${generateDashboardStories()}`);
console.log('\n✅ Toutes les stories ont été générées dans ./src/stories/');

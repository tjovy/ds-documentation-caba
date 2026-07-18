import React, { useState } from 'react';
import './ds-theme.css';

const PALETTES = {
  "neutral": [
    {
      "name": "50",
      "path": "core.color.neutral.50",
      "cssName": "--color-neutral-50",
      "value": "#fafafa",
      "resolved": "#fafafa",
      "description": "",
      "type": "color"
    },
    {
      "name": "100",
      "path": "core.color.neutral.100",
      "cssName": "--color-neutral-100",
      "value": "#f5f5f5",
      "resolved": "#f5f5f5",
      "description": "",
      "type": "color"
    },
    {
      "name": "200",
      "path": "core.color.neutral.200",
      "cssName": "--color-neutral-200",
      "value": "#e5e5e5",
      "resolved": "#e5e5e5",
      "description": "",
      "type": "color"
    },
    {
      "name": "300",
      "path": "core.color.neutral.300",
      "cssName": "--color-neutral-300",
      "value": "#d4d4d4",
      "resolved": "#d4d4d4",
      "description": "",
      "type": "color"
    },
    {
      "name": "400",
      "path": "core.color.neutral.400",
      "cssName": "--color-neutral-400",
      "value": "#a3a3a3",
      "resolved": "#a3a3a3",
      "description": "",
      "type": "color"
    },
    {
      "name": "500",
      "path": "core.color.neutral.500",
      "cssName": "--color-neutral-500",
      "value": "#878787",
      "resolved": "#878787",
      "description": "",
      "type": "color"
    },
    {
      "name": "600",
      "path": "core.color.neutral.600",
      "cssName": "--color-neutral-600",
      "value": "#525252",
      "resolved": "#525252",
      "description": "",
      "type": "color"
    },
    {
      "name": "700",
      "path": "core.color.neutral.700",
      "cssName": "--color-neutral-700",
      "value": "#474747",
      "resolved": "#474747",
      "description": "",
      "type": "color"
    },
    {
      "name": "800",
      "path": "core.color.neutral.800",
      "cssName": "--color-neutral-800",
      "value": "#242424",
      "resolved": "#242424",
      "description": "",
      "type": "color"
    },
    {
      "name": "850",
      "path": "core.color.neutral.850",
      "cssName": "--color-neutral-850",
      "value": "#191919",
      "resolved": "#191919",
      "description": "",
      "type": "color"
    },
    {
      "name": "900",
      "path": "core.color.neutral.900",
      "cssName": "--color-neutral-900",
      "value": "#0f0f0f",
      "resolved": "#0f0f0f",
      "description": "",
      "type": "color"
    },
    {
      "name": "950",
      "path": "core.color.neutral.950",
      "cssName": "--color-neutral-950",
      "value": "#080808",
      "resolved": "#080808",
      "description": "",
      "type": "color"
    }
  ],
  "orange": [
    {
      "name": "50",
      "path": "core.color.orange.50",
      "cssName": "--color-orange-50",
      "value": "#fff7ed",
      "resolved": "#fff7ed",
      "description": "",
      "type": "color"
    },
    {
      "name": "100",
      "path": "core.color.orange.100",
      "cssName": "--color-orange-100",
      "value": "#ffedd5",
      "resolved": "#ffedd5",
      "description": "",
      "type": "color"
    },
    {
      "name": "200",
      "path": "core.color.orange.200",
      "cssName": "--color-orange-200",
      "value": "#fed7aa",
      "resolved": "#fed7aa",
      "description": "",
      "type": "color"
    },
    {
      "name": "300",
      "path": "core.color.orange.300",
      "cssName": "--color-orange-300",
      "value": "#fdba74",
      "resolved": "#fdba74",
      "description": "",
      "type": "color"
    },
    {
      "name": "400",
      "path": "core.color.orange.400",
      "cssName": "--color-orange-400",
      "value": "#ff9b28",
      "resolved": "#ff9b28",
      "description": "",
      "type": "color"
    },
    {
      "name": "500",
      "path": "core.color.orange.500",
      "cssName": "--color-orange-500",
      "value": "#f97316",
      "resolved": "#f97316",
      "description": "",
      "type": "color"
    },
    {
      "name": "600",
      "path": "core.color.orange.600",
      "cssName": "--color-orange-600",
      "value": "#ed8f26",
      "resolved": "#ed8f26",
      "description": "",
      "type": "color"
    },
    {
      "name": "700",
      "path": "core.color.orange.700",
      "cssName": "--color-orange-700",
      "value": "#c57a24",
      "resolved": "#c57a24",
      "description": "",
      "type": "color"
    },
    {
      "name": "800",
      "path": "core.color.orange.800",
      "cssName": "--color-orange-800",
      "value": "#9a5a16",
      "resolved": "#9a5a16",
      "description": "",
      "type": "color"
    },
    {
      "name": "900",
      "path": "core.color.orange.900",
      "cssName": "--color-orange-900",
      "value": "#7c3f10",
      "resolved": "#7c3f10",
      "description": "",
      "type": "color"
    },
    {
      "name": "950",
      "path": "core.color.orange.950",
      "cssName": "--color-orange-950",
      "value": "#431407",
      "resolved": "#431407",
      "description": "",
      "type": "color"
    },
    {
      "name": "4002",
      "path": "core.color.orange.4002",
      "cssName": "--color-orange-4002",
      "value": "#ff9b28",
      "resolved": "#ff9b28",
      "description": "",
      "type": "color"
    }
  ]
};

function copyToken(name, setCopied) {
  navigator.clipboard?.writeText(name);
  setCopied(name);
  window.setTimeout(() => setCopied(null), 1000);
}

function ColorPage({ title, tokens }) {
  const [copied, setCopied] = useState(null);
  return (
    <div className="ds-page">
      <header className="ds-header">
        <div className="ds-header-row"><h1 className="ds-title">{title} Palette</h1><span className="ds-count">{tokens.length} tokens</span></div>
        <p className="ds-subtitle">Swatches cliquables pour copier le nom de variable CSS, avec valeur hex et usage documenté.</p>
      </header>
      <div className="ds-grid">
        {tokens.map((token) => (
          <button key={token.path} className="ds-card ds-swatch ds-clickable" onClick={() => copyToken(token.cssName, setCopied)} type="button">
            <span className="ds-swatch-color" style={{ background: token.resolved }} />
            <span>
              <span className="ds-token-name">{token.name}</span><br />
              <span className="ds-token-value">{token.resolved}</span>
              {token.description && <span className="ds-description">{token.description}</span>}
            </span>
            {copied === token.cssName && <span className="ds-copied">Copied!</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default { title: 'Design System/Colors' };

export const Neutral = () => <ColorPage title="Neutral" tokens={PALETTES.neutral} />;

export const Orange = () => <ColorPage title="Orange" tokens={PALETTES.orange} />;

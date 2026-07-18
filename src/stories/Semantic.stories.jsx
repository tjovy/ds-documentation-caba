import React, { useState } from 'react';
import './ds-theme.css';

const SEMANTIC = {
  "action": [
    {
      "name": "disabled",
      "path": "semantic.color.action.disabled",
      "cssName": "--semantic-color-action-disabled",
      "value": "{core.color.neutral.800}",
      "resolved": "#242424",
      "description": "",
      "type": "color"
    },
    {
      "name": "primary-default",
      "path": "semantic.color.action.primary.default",
      "cssName": "--semantic-color-action-primary-default",
      "value": "{core.color.orange.400}",
      "resolved": "#ff9b28",
      "description": "",
      "type": "color"
    },
    {
      "name": "primary-hover",
      "path": "semantic.color.action.primary.hover",
      "cssName": "--semantic-color-action-primary-hover",
      "value": "{core.color.orange.600}",
      "resolved": "#ed8f26",
      "description": "",
      "type": "color"
    },
    {
      "name": "primary-pressed",
      "path": "semantic.color.action.primary.pressed",
      "cssName": "--semantic-color-action-primary-pressed",
      "value": "{core.color.orange.700}",
      "resolved": "#c57a24",
      "description": "",
      "type": "color"
    }
  ],
  "bg": [
    {
      "name": "brand",
      "path": "semantic.color.bg.brand",
      "cssName": "--semantic-color-bg-brand",
      "value": "{core.color.orange.400}",
      "resolved": "#ff9b28",
      "description": "",
      "type": "color"
    },
    {
      "name": "brandHover",
      "path": "semantic.color.bg.brandHover",
      "cssName": "--semantic-color-bg-brandHover",
      "value": "{core.color.orange.600}",
      "resolved": "#ed8f26",
      "description": "",
      "type": "color"
    },
    {
      "name": "brandSoft",
      "path": "semantic.color.bg.brandSoft",
      "cssName": "--semantic-color-bg-brandSoft",
      "value": "{core.color.orange.700}",
      "resolved": "#c57a24",
      "description": "",
      "type": "color"
    },
    {
      "name": "disabled",
      "path": "semantic.color.bg.disabled",
      "cssName": "--semantic-color-bg-disabled",
      "value": "{core.color.neutral.800}",
      "resolved": "#242424",
      "description": "",
      "type": "color"
    },
    {
      "name": "elevated",
      "path": "semantic.color.bg.elevated",
      "cssName": "--semantic-color-bg-elevated",
      "value": "{core.color.neutral.800}",
      "resolved": "#242424",
      "description": "",
      "type": "color"
    },
    {
      "name": "header",
      "path": "semantic.color.bg.header",
      "cssName": "--semantic-color-bg-header",
      "value": "{core.color.neutral.900}",
      "resolved": "#0f0f0f",
      "description": "",
      "type": "color"
    },
    {
      "name": "page",
      "path": "semantic.color.bg.page",
      "cssName": "--semantic-color-bg-page",
      "value": "{core.color.neutral.850}",
      "resolved": "#191919",
      "description": "",
      "type": "color"
    },
    {
      "name": "surface",
      "path": "semantic.color.bg.surface",
      "cssName": "--semantic-color-bg-surface",
      "value": "{core.color.neutral.850}",
      "resolved": "#191919",
      "description": "",
      "type": "color"
    },
    {
      "name": "surfaceHover",
      "path": "semantic.color.bg.surfaceHover",
      "cssName": "--semantic-color-bg-surfaceHover",
      "value": "{core.color.neutral.800}",
      "resolved": "#242424",
      "description": "",
      "type": "color"
    }
  ],
  "border": [
    {
      "name": "brand",
      "path": "semantic.color.border.brand",
      "cssName": "--semantic-color-border-brand",
      "value": "{core.color.orange.400}",
      "resolved": "#ff9b28",
      "description": "",
      "type": "color"
    },
    {
      "name": "default",
      "path": "semantic.color.border.default",
      "cssName": "--semantic-color-border-default",
      "value": "{core.color.neutral.700}",
      "resolved": "#474747",
      "description": "",
      "type": "color"
    },
    {
      "name": "subtle",
      "path": "semantic.color.border.subtle",
      "cssName": "--semantic-color-border-subtle",
      "value": "{core.color.neutral.800}",
      "resolved": "#242424",
      "description": "",
      "type": "color"
    }
  ],
  "focus": [
    {
      "name": "ring",
      "path": "semantic.color.focus.ring",
      "cssName": "--semantic-color-focus-ring",
      "value": "{core.color.orange.400}",
      "resolved": "#ff9b28",
      "description": "",
      "type": "color"
    }
  ],
  "icon": [
    {
      "name": "brand",
      "path": "semantic.color.icon.brand",
      "cssName": "--semantic-color-icon-brand",
      "value": "{core.color.orange.400}",
      "resolved": "#ff9b28",
      "description": "",
      "type": "color"
    },
    {
      "name": "default",
      "path": "semantic.color.icon.default",
      "cssName": "--semantic-color-icon-default",
      "value": "{core.color.white}",
      "resolved": "#ffff00",
      "description": "",
      "type": "color"
    },
    {
      "name": "muted",
      "path": "semantic.color.icon.muted",
      "cssName": "--semantic-color-icon-muted",
      "value": "{core.color.neutral.400}",
      "resolved": "#a3a3a3",
      "description": "",
      "type": "color"
    }
  ],
  "text": [
    {
      "name": "brand",
      "path": "semantic.color.text.brand",
      "cssName": "--semantic-color-text-brand",
      "value": "{core.color.orange.400}",
      "resolved": "#ff9b28",
      "description": "",
      "type": "color"
    },
    {
      "name": "disabled",
      "path": "semantic.color.text.disabled",
      "cssName": "--semantic-color-text-disabled",
      "value": "{core.color.neutral.500}",
      "resolved": "#878787",
      "description": "",
      "type": "color"
    },
    {
      "name": "muted",
      "path": "semantic.color.text.muted",
      "cssName": "--semantic-color-text-muted",
      "value": "{core.color.neutral.500}",
      "resolved": "#878787",
      "description": "",
      "type": "color"
    },
    {
      "name": "onBrand",
      "path": "semantic.color.text.onBrand",
      "cssName": "--semantic-color-text-onBrand",
      "value": "{core.color.neutral.900}",
      "resolved": "#0f0f0f",
      "description": "",
      "type": "color"
    },
    {
      "name": "primary",
      "path": "semantic.color.text.primary",
      "cssName": "--semantic-color-text-primary",
      "value": "{core.color.white}",
      "resolved": "#ffff00",
      "description": "",
      "type": "color"
    },
    {
      "name": "secondary",
      "path": "semantic.color.text.secondary",
      "cssName": "--semantic-color-text-secondary",
      "value": "{core.color.neutral.300}",
      "resolved": "#d4d4d4",
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

function SemanticPage({ title, rows }) {
  const [copied, setCopied] = useState(null);
  return (
    <div className="ds-page">
      <header className="ds-header">
        <div className="ds-header-row"><h1 className="ds-title">Semantic {title}</h1><span className="ds-count">{rows.length} tokens</span></div>
        <p className="ds-subtitle">Références sémantiques résolues vers leurs valeurs core, prêtes à être utilisées en CSS.</p>
      </header>
      <div className="ds-card">
        <table className="ds-table">
          <thead><tr><th>Token</th><th>Référence</th><th>Valeur résolue</th><th>Description</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.path}>
                <td><button className="ds-code ds-clickable" type="button" onClick={() => copyToken(row.cssName, setCopied)}>{row.cssName}</button>{copied === row.cssName && <span className="ds-copied">Copied!</span>}</td>
                <td><span className="ds-mini-swatch" style={{ background: row.resolved }} /> <code>{String(row.value)}</code></td>
                <td><code>{row.resolved}</code></td>
                <td>{row.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default { title: 'Design System/Semantic' };
export const Action = () => <SemanticPage title="Action" rows={SEMANTIC.action} />;
export const Bg = () => <SemanticPage title="Bg" rows={SEMANTIC.bg} />;
export const Border = () => <SemanticPage title="Border" rows={SEMANTIC.border} />;
export const Focus = () => <SemanticPage title="Focus" rows={SEMANTIC.focus} />;
export const Icon = () => <SemanticPage title="Icon" rows={SEMANTIC.icon} />;
export const Text = () => <SemanticPage title="Text" rows={SEMANTIC.text} />;

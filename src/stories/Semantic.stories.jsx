import React, { useState } from 'react';
import './ds-theme.css';

const SEMANTIC = {
  "bg": [
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
      "name": "header",
      "path": "semantic.color.bg.header",
      "cssName": "--semantic-color-bg-header",
      "value": "{core.color.neutral.900}",
      "resolved": "#0F0F0F",
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
      "name": "brand",
      "path": "semantic.color.bg.brand",
      "cssName": "--semantic-color-bg-brand",
      "value": "{core.color.orange.400}",
      "resolved": "#FF9B28",
      "description": "",
      "type": "color"
    },
    {
      "name": "brandHover",
      "path": "semantic.color.bg.brandHover",
      "cssName": "--semantic-color-bg-brandHover",
      "value": "{core.color.orange.600}",
      "resolved": "#ED8F26",
      "description": "",
      "type": "color"
    },
    {
      "name": "brandSoft",
      "path": "semantic.color.bg.brandSoft",
      "cssName": "--semantic-color-bg-brandSoft",
      "value": "{core.color.orange.700}",
      "resolved": "#C57A24",
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
    }
  ],
  "text": [
    {
      "name": "primary",
      "path": "semantic.color.text.primary",
      "cssName": "--semantic-color-text-primary",
      "value": "{core.color.white}",
      "resolved": "#FFFFFF",
      "description": "",
      "type": "color"
    },
    {
      "name": "secondary",
      "path": "semantic.color.text.secondary",
      "cssName": "--semantic-color-text-secondary",
      "value": "{core.color.neutral.300}",
      "resolved": "#D4D4D4",
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
      "name": "brand",
      "path": "semantic.color.text.brand",
      "cssName": "--semantic-color-text-brand",
      "value": "{core.color.orange.400}",
      "resolved": "#FF9B28",
      "description": "",
      "type": "color"
    },
    {
      "name": "onBrand",
      "path": "semantic.color.text.onBrand",
      "cssName": "--semantic-color-text-onBrand",
      "value": "{core.color.neutral.900}",
      "resolved": "#0F0F0F",
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
    }
  ],
  "border": [
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
    },
    {
      "name": "brand",
      "path": "semantic.color.border.brand",
      "cssName": "--semantic-color-border-brand",
      "value": "{core.color.orange.400}",
      "resolved": "#FF9B28",
      "description": "",
      "type": "color"
    }
  ],
  "icon": [
    {
      "name": "default",
      "path": "semantic.color.icon.default",
      "cssName": "--semantic-color-icon-default",
      "value": "{core.color.white}",
      "resolved": "#FFFFFF",
      "description": "",
      "type": "color"
    },
    {
      "name": "muted",
      "path": "semantic.color.icon.muted",
      "cssName": "--semantic-color-icon-muted",
      "value": "{core.color.neutral.400}",
      "resolved": "#A3A3A3",
      "description": "",
      "type": "color"
    },
    {
      "name": "brand",
      "path": "semantic.color.icon.brand",
      "cssName": "--semantic-color-icon-brand",
      "value": "{core.color.orange.400}",
      "resolved": "#FF9B28",
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
      "resolved": "#FF9B28",
      "description": "",
      "type": "color"
    }
  ],
  "action": [
    {
      "name": "primary-bg-default",
      "path": "semantic.color.action.primary.bg.default",
      "cssName": "--semantic-color-action-primary-bg-default",
      "value": "{semantic.color.bg.brand}",
      "resolved": "#FF9B28",
      "description": "",
      "type": "color"
    },
    {
      "name": "primary-bg-hover",
      "path": "semantic.color.action.primary.bg.hover",
      "cssName": "--semantic-color-action-primary-bg-hover",
      "value": "{semantic.color.bg.brandHover}",
      "resolved": "#ED8F26",
      "description": "",
      "type": "color"
    },
    {
      "name": "primary-bg-disabled",
      "path": "semantic.color.action.primary.bg.disabled",
      "cssName": "--semantic-color-action-primary-bg-disabled",
      "value": "{semantic.color.bg.disabled}",
      "resolved": "#242424",
      "description": "",
      "type": "color"
    },
    {
      "name": "primary-text-default",
      "path": "semantic.color.action.primary.text.default",
      "cssName": "--semantic-color-action-primary-text-default",
      "value": "{semantic.color.text.onBrand}",
      "resolved": "#0F0F0F",
      "description": "",
      "type": "color"
    },
    {
      "name": "primary-text-disabled",
      "path": "semantic.color.action.primary.text.disabled",
      "cssName": "--semantic-color-action-primary-text-disabled",
      "value": "{semantic.color.text.disabled}",
      "resolved": "#878787",
      "description": "",
      "type": "color"
    },
    {
      "name": "primary-border-default",
      "path": "semantic.color.action.primary.border.default",
      "cssName": "--semantic-color-action-primary-border-default",
      "value": "{semantic.color.border.brand}",
      "resolved": "#FF9B28",
      "description": "",
      "type": "color"
    },
    {
      "name": "primary-border-hover",
      "path": "semantic.color.action.primary.border.hover",
      "cssName": "--semantic-color-action-primary-border-hover",
      "value": "{core.color.orange.600}",
      "resolved": "#ED8F26",
      "description": "",
      "type": "color"
    },
    {
      "name": "primary-border-disabled",
      "path": "semantic.color.action.primary.border.disabled",
      "cssName": "--semantic-color-action-primary-border-disabled",
      "value": "{semantic.color.border.default}",
      "resolved": "#474747",
      "description": "",
      "type": "color"
    },
    {
      "name": "secondary-bg-default",
      "path": "semantic.color.action.secondary.bg.default",
      "cssName": "--semantic-color-action-secondary-bg-default",
      "value": "{semantic.color.bg.surface}",
      "resolved": "#191919",
      "description": "",
      "type": "color"
    },
    {
      "name": "secondary-bg-hover",
      "path": "semantic.color.action.secondary.bg.hover",
      "cssName": "--semantic-color-action-secondary-bg-hover",
      "value": "{semantic.color.bg.surfaceHover}",
      "resolved": "#242424",
      "description": "",
      "type": "color"
    },
    {
      "name": "secondary-bg-disabled",
      "path": "semantic.color.action.secondary.bg.disabled",
      "cssName": "--semantic-color-action-secondary-bg-disabled",
      "value": "{semantic.color.bg.disabled}",
      "resolved": "#242424",
      "description": "",
      "type": "color"
    },
    {
      "name": "secondary-text-default",
      "path": "semantic.color.action.secondary.text.default",
      "cssName": "--semantic-color-action-secondary-text-default",
      "value": "{semantic.color.text.primary}",
      "resolved": "#FFFFFF",
      "description": "",
      "type": "color"
    },
    {
      "name": "secondary-text-hover",
      "path": "semantic.color.action.secondary.text.hover",
      "cssName": "--semantic-color-action-secondary-text-hover",
      "value": "{semantic.color.text.brand}",
      "resolved": "#FF9B28",
      "description": "",
      "type": "color"
    },
    {
      "name": "secondary-text-disabled",
      "path": "semantic.color.action.secondary.text.disabled",
      "cssName": "--semantic-color-action-secondary-text-disabled",
      "value": "{semantic.color.text.disabled}",
      "resolved": "#878787",
      "description": "",
      "type": "color"
    },
    {
      "name": "secondary-border-default",
      "path": "semantic.color.action.secondary.border.default",
      "cssName": "--semantic-color-action-secondary-border-default",
      "value": "{semantic.color.border.default}",
      "resolved": "#474747",
      "description": "",
      "type": "color"
    },
    {
      "name": "secondary-border-hover",
      "path": "semantic.color.action.secondary.border.hover",
      "cssName": "--semantic-color-action-secondary-border-hover",
      "value": "{semantic.color.border.brand}",
      "resolved": "#FF9B28",
      "description": "",
      "type": "color"
    },
    {
      "name": "secondary-border-disabled",
      "path": "semantic.color.action.secondary.border.disabled",
      "cssName": "--semantic-color-action-secondary-border-disabled",
      "value": "{semantic.color.border.default}",
      "resolved": "#474747",
      "description": "",
      "type": "color"
    },
    {
      "name": "ghost-bg-default",
      "path": "semantic.color.action.ghost.bg.default",
      "cssName": "--semantic-color-action-ghost-bg-default",
      "value": "transparent",
      "resolved": "transparent",
      "description": "",
      "type": "color"
    },
    {
      "name": "ghost-bg-hover",
      "path": "semantic.color.action.ghost.bg.hover",
      "cssName": "--semantic-color-action-ghost-bg-hover",
      "value": "transparent",
      "resolved": "transparent",
      "description": "",
      "type": "color"
    },
    {
      "name": "ghost-bg-disabled",
      "path": "semantic.color.action.ghost.bg.disabled",
      "cssName": "--semantic-color-action-ghost-bg-disabled",
      "value": "transparent",
      "resolved": "transparent",
      "description": "",
      "type": "color"
    },
    {
      "name": "ghost-text-default",
      "path": "semantic.color.action.ghost.text.default",
      "cssName": "--semantic-color-action-ghost-text-default",
      "value": "{semantic.color.text.primary}",
      "resolved": "#FFFFFF",
      "description": "",
      "type": "color"
    },
    {
      "name": "ghost-text-hover",
      "path": "semantic.color.action.ghost.text.hover",
      "cssName": "--semantic-color-action-ghost-text-hover",
      "value": "{semantic.color.text.brand}",
      "resolved": "#FF9B28",
      "description": "",
      "type": "color"
    },
    {
      "name": "ghost-text-disabled",
      "path": "semantic.color.action.ghost.text.disabled",
      "cssName": "--semantic-color-action-ghost-text-disabled",
      "value": "{semantic.color.text.disabled}",
      "resolved": "#878787",
      "description": "",
      "type": "color"
    },
    {
      "name": "ghost-border-default",
      "path": "semantic.color.action.ghost.border.default",
      "cssName": "--semantic-color-action-ghost-border-default",
      "value": "{semantic.color.border.default}",
      "resolved": "#474747",
      "description": "",
      "type": "color"
    },
    {
      "name": "ghost-border-hover",
      "path": "semantic.color.action.ghost.border.hover",
      "cssName": "--semantic-color-action-ghost-border-hover",
      "value": "{semantic.color.border.default}",
      "resolved": "#474747",
      "description": "",
      "type": "color"
    },
    {
      "name": "ghost-border-disabled",
      "path": "semantic.color.action.ghost.border.disabled",
      "cssName": "--semantic-color-action-ghost-border-disabled",
      "value": "{semantic.color.border.default}",
      "resolved": "#474747",
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
export const Bg = () => <SemanticPage title="Bg" rows={SEMANTIC.bg} />;
export const Text = () => <SemanticPage title="Text" rows={SEMANTIC.text} />;
export const Border = () => <SemanticPage title="Border" rows={SEMANTIC.border} />;
export const Icon = () => <SemanticPage title="Icon" rows={SEMANTIC.icon} />;
export const Focus = () => <SemanticPage title="Focus" rows={SEMANTIC.focus} />;
export const Action = () => <SemanticPage title="Action" rows={SEMANTIC.action} />;

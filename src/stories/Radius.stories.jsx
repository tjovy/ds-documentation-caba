import React from 'react';
import './ds-theme.css';

const RADIUS = [
  {
    "name": "0",
    "path": "core.radius.0",
    "cssName": "--radius-0",
    "value": "0px",
    "resolved": "0px",
    "description": "",
    "type": "borderRadius"
  },
  {
    "name": "2",
    "path": "core.radius.2",
    "cssName": "--radius-2",
    "value": "2px",
    "resolved": "2px",
    "description": "",
    "type": "borderRadius"
  },
  {
    "name": "4",
    "path": "core.radius.4",
    "cssName": "--radius-4",
    "value": "4px",
    "resolved": "4px",
    "description": "",
    "type": "borderRadius"
  },
  {
    "name": "6",
    "path": "core.radius.6",
    "cssName": "--radius-6",
    "value": "6px",
    "resolved": "6px",
    "description": "",
    "type": "borderRadius"
  },
  {
    "name": "8",
    "path": "core.radius.8",
    "cssName": "--radius-8",
    "value": "8px",
    "resolved": "8px",
    "description": "",
    "type": "borderRadius"
  },
  {
    "name": "12",
    "path": "core.radius.12",
    "cssName": "--radius-12",
    "value": "12px",
    "resolved": "12px",
    "description": "",
    "type": "borderRadius"
  },
  {
    "name": "16",
    "path": "core.radius.16",
    "cssName": "--radius-16",
    "value": "16px",
    "resolved": "16px",
    "description": "",
    "type": "borderRadius"
  },
  {
    "name": "full",
    "path": "core.radius.full",
    "cssName": "--radius-full",
    "value": "999px",
    "resolved": "999px",
    "description": "",
    "type": "borderRadius"
  }
];

export default { title: 'Design System/Radius' };

export const Scale = () => (
  <div className="ds-page">
    <header className="ds-header">
      <div className="ds-header-row"><h1 className="ds-title">Radius Scale</h1><span className="ds-count">{RADIUS.length} tokens</span></div>
      <p className="ds-subtitle">Carrés de 80px avec chaque border-radius appliqué visuellement.</p>
    </header>
    <div className="ds-radius-grid">
      {RADIUS.map((item) => (
        <div className="ds-card ds-radius-card" key={item.path}>
          <div className="ds-radius-box" style={{ borderRadius: item.resolved }} />
          <div className="ds-token-name">{item.name}</div>
          <div className="ds-token-value">{item.resolved}</div>
        </div>
      ))}
    </div>
  </div>
);

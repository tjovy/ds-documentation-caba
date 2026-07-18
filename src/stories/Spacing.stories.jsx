import React from 'react';
import './ds-theme.css';

const SPACING = [
  {
    "name": "0",
    "path": "core.space.0",
    "cssName": "--space-0",
    "value": "0px",
    "resolved": "0px",
    "description": "",
    "type": "spacing",
    "width": "2%"
  },
  {
    "name": "1",
    "path": "core.space.1",
    "cssName": "--space-1",
    "value": "1px",
    "resolved": "1px",
    "description": "",
    "type": "spacing",
    "width": "2%"
  },
  {
    "name": "2",
    "path": "core.space.2",
    "cssName": "--space-2",
    "value": "2px",
    "resolved": "2px",
    "description": "",
    "type": "spacing",
    "width": "3.125%"
  },
  {
    "name": "4",
    "path": "core.space.4",
    "cssName": "--space-4",
    "value": "4px",
    "resolved": "4px",
    "description": "",
    "type": "spacing",
    "width": "6.25%"
  },
  {
    "name": "6",
    "path": "core.space.6",
    "cssName": "--space-6",
    "value": "6px",
    "resolved": "6px",
    "description": "",
    "type": "spacing",
    "width": "9.375%"
  },
  {
    "name": "8",
    "path": "core.space.8",
    "cssName": "--space-8",
    "value": "8px",
    "resolved": "8px",
    "description": "",
    "type": "spacing",
    "width": "12.5%"
  },
  {
    "name": "10",
    "path": "core.space.10",
    "cssName": "--space-10",
    "value": "10px",
    "resolved": "10px",
    "description": "",
    "type": "spacing",
    "width": "15.625%"
  },
  {
    "name": "12",
    "path": "core.space.12",
    "cssName": "--space-12",
    "value": "12px",
    "resolved": "12px",
    "description": "",
    "type": "spacing",
    "width": "18.75%"
  },
  {
    "name": "16",
    "path": "core.space.16",
    "cssName": "--space-16",
    "value": "16px",
    "resolved": "16px",
    "description": "",
    "type": "spacing",
    "width": "25%"
  },
  {
    "name": "20",
    "path": "core.space.20",
    "cssName": "--space-20",
    "value": "20px",
    "resolved": "20px",
    "description": "",
    "type": "spacing",
    "width": "31.25%"
  },
  {
    "name": "24",
    "path": "core.space.24",
    "cssName": "--space-24",
    "value": "24px",
    "resolved": "24px",
    "description": "",
    "type": "spacing",
    "width": "37.5%"
  },
  {
    "name": "32",
    "path": "core.space.32",
    "cssName": "--space-32",
    "value": "32px",
    "resolved": "32px",
    "description": "",
    "type": "spacing",
    "width": "50%"
  },
  {
    "name": "40",
    "path": "core.space.40",
    "cssName": "--space-40",
    "value": "40px",
    "resolved": "40px",
    "description": "",
    "type": "spacing",
    "width": "62.5%"
  },
  {
    "name": "48",
    "path": "core.space.48",
    "cssName": "--space-48",
    "value": "48px",
    "resolved": "48px",
    "description": "",
    "type": "spacing",
    "width": "75%"
  },
  {
    "name": "64",
    "path": "core.space.64",
    "cssName": "--space-64",
    "value": "64px",
    "resolved": "64px",
    "description": "",
    "type": "spacing",
    "width": "100%"
  }
];

export default { title: 'Design System/Spacing' };

export const Scale = () => (
  <div className="ds-page">
    <header className="ds-header">
      <div className="ds-header-row"><h1 className="ds-title">Spacing Scale</h1><span className="ds-count">{SPACING.length} tokens</span></div>
      <p className="ds-subtitle">Échelle proportionnelle des espacements, lisible par token et par valeur px.</p>
    </header>
    <div className="ds-card ds-scale-list">
      {SPACING.map((item) => (
        <div className="ds-scale-row" key={item.path}>
          <span className="ds-token-name">{item.name}</span>
          <span className="ds-bar-track"><span className="ds-bar-fill" style={{ width: item.width }} /></span>
          <span className="ds-token-value">{item.resolved}</span>
        </div>
      ))}
    </div>
  </div>
);

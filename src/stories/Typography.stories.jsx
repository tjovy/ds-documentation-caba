import React from 'react';
import './ds-theme.css';

const TYPOGRAPHY = {
  "headings": [
    {
      "name": "h1",
      "path": "heading.h1",
      "jsonPath": "typography.heading.h1",
      "props": {
        "fontSize": "32px",
        "lineHeight": "40px"
      },
      "description": ""
    },
    {
      "name": "h2",
      "path": "heading.h2",
      "jsonPath": "typography.heading.h2",
      "props": {
        "fontSize": "24px",
        "lineHeight": "32px"
      },
      "description": ""
    }
  ],
  "body": [
    {
      "name": "md",
      "path": "body.md",
      "jsonPath": "typography.body.md",
      "props": {
        "fontSize": "16px",
        "lineHeight": "24px"
      },
      "description": ""
    },
    {
      "name": "sm",
      "path": "body.sm",
      "jsonPath": "typography.body.sm",
      "props": {
        "fontSize": "14px",
        "lineHeight": "20px"
      },
      "description": ""
    }
  ],
  "labels": [
    {
      "name": "button",
      "path": "label.button",
      "jsonPath": "typography.label.button",
      "props": {
        "fontSize": "14px",
        "lineHeight": "20px"
      },
      "description": ""
    }
  ]
};

function TypePage({ title, items }) {
  return (
    <div className="ds-page">
      <header className="ds-header">
        <div className="ds-header-row"><h1 className="ds-title">{title}</h1><span className="ds-count">{items.length} styles</span></div>
        <p className="ds-subtitle">Rendu live avec les valeurs typographiques réellement résolues depuis les tokens.</p>
      </header>
      <div className="ds-card ds-type-list">
        {items.map((item) => {
          const s = item.props;
          return (
            <section className="ds-type-item" key={item.path}>
              <span className="ds-type-tag">{item.path}</span>
              <div className="ds-type-sample" style={{ fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing }}>
                The quick brown fox jumps over the lazy dog
              </div>
              <div className="ds-meta">
                <code>size {s.fontSize}</code><code>weight {s.fontWeight}</code><code>line-height {s.lineHeight}</code><code>letter-spacing {s.letterSpacing || '0'}</code>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default { title: 'Design System/Typography' };
export const Headings = () => <TypePage title="Headings" items={TYPOGRAPHY.headings} />;
export const Body = () => <TypePage title="Body" items={TYPOGRAPHY.body} />;
export const Labels = () => <TypePage title="Labels" items={TYPOGRAPHY.labels} />;

import React from 'react';
import './ds-theme.css';

export default { title: 'Design System/Components' };

const sizes = ['sm', 'md', 'lg'];
const buttonVariants = ['primary', 'secondary', 'ghost'];
const buttonStates = ['default', 'hover', 'disabled'];
const cardTones = ['default', 'highlight'];
const cardMedia = ['off', 'on'];
const cardStates = ['default', 'hover'];

function buttonStyle(variant, size, state) {
  const disabled = state === 'disabled';
  const bgState = state === 'hover' ? 'hover' : disabled ? 'disabled' : 'default';
  const textState = disabled ? 'disabled' : state === 'hover' && variant !== 'primary' ? 'hover' : 'default';
  const borderState = state === 'hover' ? 'hover' : 'default';
  return {
    alignItems: 'center',
    background: 'var(--component-button-' + variant + '-bg-' + bgState + ')',
    border: '1px solid var(--component-button-' + variant + '-border-' + borderState + ')',
    borderRadius: 'var(--component-button-radius)',
    color: 'var(--component-button-' + variant + '-text-' + textState + ')',
    display: 'inline-flex',
    fontFamily: 'var(--component-button-font-family)',
    fontSize: 'var(--component-button-' + size + '-font-size)',
    fontWeight: 'var(--component-button-font-weight)',
    gap: 'var(--component-button-' + size + '-gap)',
    justifyContent: 'center',
    lineHeight: 'var(--component-button-' + size + '-line-height)',
    minHeight: 'var(--component-button-' + size + '-min-height)',
    minWidth: 'var(--component-button-' + size + '-min-width)',
    opacity: disabled ? 0.72 : 1,
    padding: 'var(--component-button-' + size + '-padding-y) var(--component-button-' + size + '-padding-x)',
  };
}

function cardStyle(tone, media, state) {
  const hover = state === 'hover';
  return {
    background: 'var(--component-card-bg-' + tone + (hover ? '-hover' : '') + ')',
    border: '1px solid var(--component-card-border-' + (hover ? 'hover' : 'default') + ')',
    borderRadius: 'var(--component-card-radius)',
    boxShadow: hover ? 'var(--component-card-shadow-hover)' : 'none',
    color: 'var(--semantic-color-text-primary)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--component-card-gap)',
    minHeight: 'var(--component-card-height-media-' + media + ')',
    padding: 'var(--component-card-padding)',
    width: 'var(--component-card-width)',
  };
}

export const Button = () => (
  <div className="ds-page">
    <header className="ds-header"><div className="ds-header-row"><h1 className="ds-title">Button</h1><span className="ds-count">3 variantes x 3 tailles x 3 etats</span></div><p className="ds-subtitle">Preview Caba synchronisee sur les variables component-button.</p></header>
    <div className="ds-card" style={{ display: 'grid', gap: 18, padding: 20 }}>
      {buttonVariants.map((variant) => (
        <section key={variant} style={{ display: 'grid', gap: 10 }}>
          <h3 className="ds-token-name" style={{ margin: 0 }}>{variant}</h3>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {buttonStates.map((state) => (
              <div key={state} style={{ display: 'grid', gap: 8 }}>
                <span className="ds-token-value">{state}</span>
                {sizes.map((size) => <button key={size} disabled={state === 'disabled'} style={buttonStyle(variant, size, state)}>{variant} {size}</button>)}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  </div>
);

export const Card = () => (
  <div className="ds-page">
    <header className="ds-header"><div className="ds-header-row"><h1 className="ds-title">Card</h1><span className="ds-count">2 tons x 2 medias x 2 etats</span></div><p className="ds-subtitle">Preview Caba synchronisee sur les variables component-card.</p></header>
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      {cardTones.flatMap((tone) => cardMedia.flatMap((media) => cardStates.map((state) => (
        <article key={tone + media + state} style={cardStyle(tone, media, state)}>
          {media === 'on' && <div style={{ background: 'var(--semantic-color-bg-elevated)', borderRadius: 'var(--component-card-media-radius)', height: 'var(--component-card-media-height)' }} />}
          <div style={{ display: 'grid', gap: 8 }}>
            <span className="ds-token-value">{tone} / media {media} / {state}</span>
            <h3 style={{ color: 'var(--semantic-color-text-primary)', fontSize: 'var(--core-font-size-24)', lineHeight: 'var(--core-font-line-height-32)', margin: 0 }}>Soiree casino</h3>
            <p style={{ color: 'var(--semantic-color-text-secondary)', fontSize: 'var(--core-font-size-14)', lineHeight: 'var(--core-font-line-height-20)', margin: 0 }}>Carte de contenu Caba, avec surface sombre, accent orange et etat hover documente.</p>
          </div>
        </article>
      ))))}
    </div>
  </div>
);

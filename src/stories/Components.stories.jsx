import React from 'react';
import './ds-theme.css';

export default { title: 'Design System/Components' };

const sizes = ['sm', 'md', 'lg'];
const buttonVariants = ['primary', 'secondary', 'ghost'];
const buttonStates = ['default', 'hover', 'disabled'];
const cardTones = ['default', 'highlight'];
const cardMedia = ['off', 'on'];
const cardStates = ['default', 'hover'];

const sizeStyles = {
  sm: { fontSize: 'var(--core-font-size-14)', gap: 'var(--core-space-6)', minHeight: '32px', padding: 'var(--core-space-4) var(--core-space-12)' },
  md: { fontSize: 'var(--core-font-size-14)', gap: 'var(--core-space-8)', minHeight: '40px', padding: 'var(--core-space-8) var(--core-space-16)' },
  lg: { fontSize: 'var(--core-font-size-16)', gap: 'var(--core-space-8)', minHeight: '48px', padding: 'var(--core-space-12) var(--core-space-20)' },
};

const variantStyles = {
  primary: {
    default: { bg: 'var(--semantic-color-action-primary-default)', border: 'var(--semantic-color-border-brand)', color: 'var(--semantic-color-text-on-brand)' },
    hover: { bg: 'var(--semantic-color-action-primary-hover)', border: 'var(--semantic-color-border-brand)', color: 'var(--semantic-color-text-on-brand)' },
    disabled: { bg: 'var(--semantic-color-action-disabled)', border: 'var(--semantic-color-border-subtle)', color: 'var(--semantic-color-text-disabled)' },
  },
  secondary: {
    default: { bg: 'var(--semantic-color-bg-surface)', border: 'var(--semantic-color-border-default)', color: 'var(--semantic-color-text-primary)' },
    hover: { bg: 'var(--semantic-color-bg-surface-hover)', border: 'var(--semantic-color-border-brand)', color: 'var(--semantic-color-text-primary)' },
    disabled: { bg: 'var(--semantic-color-bg-disabled)', border: 'var(--semantic-color-border-subtle)', color: 'var(--semantic-color-text-disabled)' },
  },
  ghost: {
    default: { bg: 'transparent', border: 'transparent', color: 'var(--semantic-color-text-brand)' },
    hover: { bg: 'var(--semantic-color-bg-surface-hover)', border: 'transparent', color: 'var(--semantic-color-text-primary)' },
    disabled: { bg: 'transparent', border: 'transparent', color: 'var(--semantic-color-text-disabled)' },
  },
};

function buttonStyle(variant, size, state) {
  const tone = variantStyles[variant][state];
  const sizing = sizeStyles[size];
  return {
    alignItems: 'center',
    background: tone.bg,
    border: '1px solid ' + tone.border,
    borderRadius: 'var(--core-radius-8)',
    color: tone.color,
    display: 'inline-flex',
    fontFamily: 'var(--core-font-family-sans)',
    fontSize: sizing.fontSize,
    fontWeight: 'var(--core-font-weight-medium)',
    gap: sizing.gap,
    justifyContent: 'center',
    lineHeight: 'var(--core-font-line-height-20)',
    minHeight: sizing.minHeight,
    minWidth: '96px',
    opacity: state === 'disabled' ? 0.72 : 1,
    padding: sizing.padding,
  };
}

function cardStyle(tone, media, state) {
  const hover = state === 'hover';
  const highlight = tone === 'highlight';
  return {
    background: highlight ? (hover ? 'var(--semantic-color-bg-brand)' : 'var(--semantic-color-bg-brand-soft)') : (hover ? 'var(--semantic-color-bg-surface-hover)' : 'var(--semantic-color-bg-surface)'),
    border: '1px solid ' + (hover ? 'var(--semantic-color-border-brand)' : 'var(--semantic-color-border-default)'),
    borderRadius: 'var(--core-radius-12)',
    color: highlight ? 'var(--semantic-color-text-on-brand)' : 'var(--semantic-color-text-primary)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--core-space-16)',
    minHeight: media === 'on' ? '304px' : '168px',
    padding: 'var(--core-space-20)',
    width: '320px',
  };
}

export const Button = () => (
  <div className="ds-page">
    <header className="ds-header"><div className="ds-header-row"><h1 className="ds-title">Button</h1><span className="ds-count">3 variantes x 3 tailles x 3 etats</span></div><p className="ds-subtitle">Preview Caba synchronisee sur les variables semantic et core.</p></header>
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
    <header className="ds-header"><div className="ds-header-row"><h1 className="ds-title">Card</h1><span className="ds-count">2 tons x 2 medias x 2 etats</span></div><p className="ds-subtitle">Preview Caba synchronisee sur les variables semantic et core.</p></header>
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      {cardTones.flatMap((tone) => cardMedia.flatMap((media) => cardStates.map((state) => (
        <article key={tone + media + state} style={cardStyle(tone, media, state)}>
          {media === 'on' && <div style={{ background: 'var(--semantic-color-bg-elevated)', borderRadius: 'var(--core-radius-8)', height: '120px' }} />}
          <div style={{ display: 'grid', gap: 'var(--core-space-8)' }}>
            <span className="ds-token-value">{tone} / media {media} / {state}</span>
            <h3 style={{ color: tone === 'highlight' ? 'var(--semantic-color-text-on-brand)' : 'var(--semantic-color-text-primary)', fontFamily: 'var(--core-font-family-sans)', fontSize: 'var(--typography-heading-h2-font-size)', fontWeight: 'var(--core-font-weight-bold)', lineHeight: 'var(--typography-heading-h2-line-height)', margin: 0 }}>Soiree casino</h3>
            <p style={{ color: tone === 'highlight' ? 'var(--semantic-color-text-on-brand)' : 'var(--semantic-color-text-secondary)', fontFamily: 'var(--core-font-family-sans)', fontSize: 'var(--typography-body-sm-font-size)', fontWeight: 'var(--core-font-weight-regular)', lineHeight: 'var(--typography-body-sm-line-height)', margin: 0 }}>Carte de contenu Caba, avec surface sombre, accent orange et etat hover documente.</p>
          </div>
        </article>
      ))))}
    </div>
  </div>
);

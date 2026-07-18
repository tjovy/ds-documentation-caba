import test from 'node:test';
import assert from 'node:assert/strict';
import { validateComponentMarkdown } from '../src/lib/markdown.js';

const context = {
  component: {
    name: 'button', htmlTag: 'button',
    variants: ['primary', 'secondary', 'ghost'], sizes: ['sm', 'md', 'lg'], states: ['default', 'hover', 'disabled'],
  },
  contract: { allowedCssVars: ['--semantic-color-action-primary-bg-default'] },
};

const validMarkdown = `## Description
Bouton Caba.

## Spec
- Conforme.

## Do & Don't
- Do: utiliser une action.
- Don't: inventer une variante.

## Code interactif (Live Editor)
\`\`\`jsx
const css = \`.caba-button { background: var(--semantic-color-action-primary-bg-default); }\`;
const variants = ['primary', 'secondary', 'ghost'];
const sizes = ['sm', 'md', 'lg'];
const states = ['default', 'hover', 'disabled'];
const Button = ({ state }) => <button className="caba-button" disabled={state === 'disabled'}>Action</button>;
const Demo = () => <div>{variants.map((variant) => sizes.map((size) => states.map((state) => <Button key={variant + size + state} state={state} />)))}</div>;
render(<Demo />);
\`\`\``;

test('accepts a compiled, exhaustive button snippet', () => {
  assert.equal(validateComponentMarkdown(validMarkdown, context).valid, true);
});

test('rejects CSS variable fallbacks and invented variables', () => {
  const invalid = validMarkdown.replace(
    'var(--semantic-color-action-primary-bg-default)',
    'var(--invented-color, #fff)',
  );
  const result = validateComponentMarkdown(invalid, context);
  assert.equal(result.valid, false);
  assert.deepEqual(result.checks.unknownCssVars, ['--invented-color']);
  assert.equal(result.checks.hasCssVarFallback, true);
});

test('rejects invalid JSX syntax', () => {
  const invalid = validMarkdown.replace('<button className', '<button><span className');
  assert.equal(validateComponentMarkdown(invalid, context).checks.compilation.valid, false);
});

test('rejects dynamically constructed CSS variable names', () => {
  const invalid = validMarkdown.replace(
    'var(--semantic-color-action-primary-bg-default)',
    'var(--semantic-color-action-${variant}-bg-default)',
  );
  assert.equal(validateComponentMarkdown(invalid, context).checks.hasDynamicCssVar, true);
});

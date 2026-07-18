import test from 'node:test';
import assert from 'node:assert/strict';
import { validateComponentMarkdown } from '../src/lib/markdown.js';
import { buildGenerationContext } from '../src/lib/registry.js';

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

test('accepts an auto-discovered generic menu snippet', () => {
  const menuContext = {
    component: {
      name: 'menu',
      htmlTag: 'nav',
      rootClass: 'caba-menu',
      autoDiscovered: true,
      axes: { state: ['default', 'hover'] },
    },
    contract: { allowedCssVars: ['--component-menu-bg-default'] },
  };
  const markdown = `## Description
Menu Caba.

## Spec
- Conforme au blueprint.

## Do & Don't
- Do: utiliser les etats declares.
- Don't: inventer une couleur.

## Code interactif (Live Editor)
\`\`\`jsx
const css = \`.caba-menu { background: var(--component-menu-bg-default); }\`;
const states = ['default', 'hover'];
function Menu({ state }) { return <nav className="caba-menu" data-state={state}>Menu</nav>; }
const Demo = () => <div>{states.map((state) => <Menu key={state} state={state} />)}</div>;
render(<Demo />);
\`\`\``;

  assert.equal(validateComponentMarkdown(markdown, menuContext).valid, true);
});

test('builds an auto-discovered menu context from component tokens', () => {
  const tokens = {
    component: {
      menu: {
        bg: {
          default: { value: '#111111', type: 'color' },
        },
      },
    },
  };
  const figmaCache = {
    _meta: { cached_at: '2026-07-18T00:00:00.000Z', source: 'test' },
    figma_design_specs: {
      Menu: {
        name: 'Menu',
        type: 'COMPONENT_SET',
        children: [
          { name: 'State=Default', type: 'COMPONENT', width: '160px', height: '40px' },
          { name: 'State=Hover', type: 'COMPONENT', width: '160px', height: '40px' },
        ],
      },
    },
  };

  const generated = buildGenerationContext({}, tokens, 'menu', figmaCache);
  assert.equal(generated.component.autoDiscovered, true);
  assert.equal(generated.component.htmlTag, 'nav');
  assert.deepEqual(generated.component.axes, { state: ['default', 'hover'] });
  assert.equal(generated.figma.complete, true);
  assert.deepEqual(generated.contract.allowedCssVars, ['--component-menu-bg-default']);
});

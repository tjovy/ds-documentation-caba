import fs from 'fs';
import path from 'path';
import { buildComponentTokenEntries, buildTokenEntry, getNodeByPath } from './tokens.js';
import { extractDesignBlueprint, findFigmaSpec, findRelatedFigmaSpecs, summarizeDesignSpec } from './figma.js';

const HTML_TAG_BY_COMPONENT_NAME = {
  accordion: 'section',
  alert: 'section',
  avatar: 'span',
  badge: 'span',
  banner: 'section',
  breadcrumb: 'nav',
  button: 'button',
  card: 'article',
  checkbox: 'input',
  dialog: 'dialog',
  drawer: 'aside',
  input: 'input',
  link: 'a',
  menu: 'nav',
  modal: 'dialog',
  nav: 'nav',
  navigation: 'nav',
  radio: 'input',
  select: 'select',
  sidebar: 'aside',
  tabs: 'div',
  textarea: 'textarea',
  toast: 'section',
  tooltip: 'div',
};

function titleFromName(name) {
  return String(name || '')
    .split(/[-_\s/]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function classNameFromComponentName(name) {
  return `caba-${String(name || 'component')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'component'}`;
}

function buildAutoDiscoveredDefinition(tokens, componentName) {
  const subtree = getNodeByPath(tokens, `component.${componentName}`);
  if (!subtree) {
    return null;
  }

  const normalizedName = String(componentName || '').toLowerCase();
  const title = titleFromName(componentName);

  return {
    name: componentName,
    title,
    htmlTag: HTML_TAG_BY_COMPONENT_NAME[normalizedName] || 'div',
    role: null,
    requiresFigma: true,
    interactive: ['button', 'checkbox', 'input', 'link', 'menu', 'radio', 'select', 'tabs', 'textarea'].includes(normalizedName),
    autoDiscovered: true,
    summary: `${title} Caba auto-detecte depuis tokens.json et le cache Figma.`,
    allowedProps: ['children', 'className'],
    slots: ['children'],
    variants: [],
    sizes: [],
    states: [],
    usageRules: {
      do: [
        'Respecter les axes presents dans le blueprint Figma.',
        'Utiliser uniquement les variables CSS autorisees par le MCP.',
      ],
      dont: [
        'Ne pas inventer de variante absente de Figma ou des tokens.',
        'Ne pas ajouter de couleur litterale dans le code.',
      ],
    },
    accessibility: [
      `Le rendu doit inclure un element <${HTML_TAG_BY_COMPONENT_NAME[normalizedName] || 'div'}>.`,
      'La structure HTML doit rester comprehensible sans script externe.',
    ],
    previewMatrix: {},
    renderRequirements: {
      mustInclude: [
        `Utiliser une classe racine .${classNameFromComponentName(componentName)}.`,
        'Representer les axes detectes dans Figma quand ils existent.',
        'Conserver le HTML, le CSS et la logique JS dans un seul bloc react-live.',
      ],
      forbiddenPatterns: [
        'Aucun import, export, asset externe ou URL.',
        'Aucune CSS var non fournie dans allowedCssVars.',
        'Aucun fallback de variable CSS.',
      ],
    },
    requiredTokenPaths: [],
  };
}

function resolveDefinition(registry, tokens, componentName) {
  return registry[componentName] || buildAutoDiscoveredDefinition(tokens, componentName);
}

function completeDefinitionFromBlueprint(definition, figmaBlueprint) {
  if (!definition?.autoDiscovered || !figmaBlueprint?.axes) {
    return definition;
  }

  const axes = figmaBlueprint.axes || {};
  const variants = axes.variant || axes.style || axes.type || axes.tone || axes.intent || [];
  const sizes = axes.size || [];
  const states = axes.state || [];

  return {
    ...definition,
    axes,
    variants,
    sizes,
    states,
    previewMatrix: {
      axes: Object.keys(axes),
      variantAxis: variants.length ? 'variant' : null,
      sizeAxis: sizes.length ? 'size' : null,
      stateAxis: states.length ? 'state' : null,
    },
    renderRequirements: {
      ...definition.renderRequirements,
      mustInclude: [
        ...(definition.renderRequirements?.mustInclude || []),
        ...Object.entries(axes).map(([axis, values]) => `Axe ${axis}: ${values.join(', ')}.`),
      ],
    },
  };
}

function countRequiredButtonCombos(definition, figmaBlueprint) {
  let count = 0;
  for (const variant of definition.variants || []) {
    for (const state of definition.states || []) {
      for (const size of definition.sizes || []) {
        if (figmaBlueprint?.variants?.[variant]?.[state]?.[size]) {
          count += 1;
        }
      }
    }
  }
  return count;
}

function countRequiredCardCombos(definition, figmaBlueprint) {
  const expectedMedia = ['off', 'on'];
  let count = 0;
  for (const tone of definition.variants || []) {
    for (const media of expectedMedia) {
      for (const state of definition.states || []) {
        if ((figmaBlueprint?.variants || []).some((item) => item.tone === tone && item.media === media && item.state === state)) {
          count += 1;
        }
      }
    }
  }
  return count;
}

function buildJsxBlueprint(definition) {
  if (definition.name === 'button') {
    return {
      strategy: 'compact-button-matrix',
      outline: [
        "Declarer VARIANTS, SIZES et STATES une seule fois depuis le contrat Caba.",
        "Utiliser des helpers compacts du type colorVar(variant, part, state, fallback) et sizeVar(size, part, fallback) au lieu d'une grosse map verbeuse.",
        "Construire la taille a la demande a partir des vars --button-size-*.",
        "Implementer function Button({ variant, size, state, icon, children }).",
        "Implementer function Demo() qui rend une grille compacte: 3 variantes x 3 etats, chaque cellule montrant sm/md/lg verticalement.",
        "Terminer strictement par render(<Demo />);",
      ],
      skeleton: [
        "const VARIANTS = ['primary', 'secondary', 'ghost'];",
        "const SIZES = ['sm', 'md', 'lg'];",
        "const STATES = ['default', 'hover', 'disabled'];",
        'Construire les noms uniquement a partir des CSS vars exactes presentes dans contract.allowedCssVars.',
        'function Button({ variant = "primary", size = "md", state = "default", icon = false, children = "Button" }) { /* ... */ }',
        'function Demo() { /* matrice compacte uniquement */ }',
        'render(<Demo />);',
      ],
    };
  }

  if (definition.name === 'card') {
    return {
      strategy: 'two-card-figma-layout',
      outline: [
        "Implementer function Card({ tone = 'default', media = 'off', state = 'default' }).",
        "Utiliser exactement les axes Caba: Tone default/highlight, Media off/on, State default/hover.",
        "Respecter 320px de largeur, 168px sans media et 304px avec media.",
        "Conserver un titre et une description lisibles avec les tokens typographiques Caba.",
        "Terminer strictement par render(<Demo />);",
      ],
      skeleton: [
        'function Card({ tone = "default", media = "off", state = "default" }) { /* ... */ }',
        'function Demo() { return <div>{/* matrice tone/media/state Caba */}</div>; }',
        'render(<Demo />);',
      ],
    };
  }

  return {
    strategy: 'generic-token-driven-component',
    outline: [
      `Implementer function ${titleFromName(definition.name).replace(/\s+/g, '') || 'Component'}({ children, className }) autour d'un <${definition.htmlTag}>.`,
      `Utiliser une classe racine .${classNameFromComponentName(definition.name)} et des sous-classes scopees.`,
      'Rendre les variantes Figma detectees via des arrays compacts quand des axes existent.',
      "S'appuyer uniquement sur les CSS vars autorisees par le contrat MCP.",
      'Terminer strictement par render(<Demo />);',
    ],
    skeleton: [
      `const css = \`.${classNameFromComponentName(definition.name)} { /* vars MCP uniquement */ }\`;`,
      'const AXES = { /* reprendre uniquement component.previewMatrix/figma.blueprint.axes */ };',
      `function ${titleFromName(definition.name).replace(/\s+/g, '') || 'Component'}(props) { return <${definition.htmlTag} className="${classNameFromComponentName(definition.name)}">...</${definition.htmlTag}>; }`,
      'function Demo() { /* demo compacte et exhaustive si axes presents */ }',
      'render(<Demo />);',
    ],
  };
}

export function loadRegistry(registryDir) {
  const componentsDir = path.join(registryDir, 'components');
  const files = fs.readdirSync(componentsDir).filter((file) => file.endsWith('.json'));

  return files.reduce((acc, file) => {
    const fullPath = path.join(componentsDir, file);
    const definition = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    acc[definition.name] = definition;
    return acc;
  }, {});
}

export function listComponentSummaries(registry, tokens = {}) {
  const components = { ...registry };
  for (const componentName of Object.keys(tokens.component || {})) {
    components[componentName] ||= buildAutoDiscoveredDefinition(tokens, componentName);
  }

  return Object.values(components).filter(Boolean).map((component) => ({
    name: component.name,
    title: component.title,
    htmlTag: component.htmlTag,
    summary: component.summary,
    autoDiscovered: component.autoDiscovered === true,
  }));
}

export function buildGenerationContext(registry, tokens, componentName, figmaCache = null) {
  let definition = resolveDefinition(registry, tokens, componentName);
  if (!definition) {
    return null;
  }

  const isCssValueEntry = (item) => {
    if (!item) return false;
    if (typeof item.rawValue === 'string' && /^\{.+\}$/.test(item.rawValue) && item.resolvedValue === item.rawValue) {
      return false;
    }
    if (item.resolvedValue && typeof item.resolvedValue === 'object' && !String(item.type || '').includes('shadow')) {
      return false;
    }
    return item.resolvedValue !== null && item.resolvedValue !== undefined;
  };
  const componentTokens = buildComponentTokenEntries(tokens, componentName).filter(isCssValueEntry);
  const referencedTokens = (definition.requiredTokenPaths || [])
    .map((tokenPath) => buildTokenEntry(tokens, tokenPath))
    .filter(isCssValueEntry);

  const extraAllowedCssVars = Array.isArray(definition.extraAllowedCssVars) ? definition.extraAllowedCssVars : [];
  const allowedCssVars = [
    ...componentTokens.map((item) => item.cssVar),
    ...referencedTokens.map((item) => item.cssVar),
    ...extraAllowedCssVars,
  ]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .sort();

  const figmaMatch = findFigmaSpec(figmaCache, definition);
  const relatedFigmaSpecs = findRelatedFigmaSpecs(figmaCache, figmaMatch?.key || definition.title);
  const figmaBlueprint = extractDesignBlueprint(figmaMatch?.key || definition.title, figmaMatch?.spec || null, relatedFigmaSpecs);
  definition = completeDefinitionFromBlueprint(definition, figmaBlueprint);
  const designSpecDepth = figmaBlueprint ? 1 : 3;
  const jsxBlueprint = buildJsxBlueprint(definition);
  const expectedVariantCount = definition.name === 'button'
    ? (definition.variants || []).length * (definition.sizes || []).length * (definition.states || []).length
    : definition.name === 'card'
      ? (definition.variants || []).length * 2 * (definition.states || []).length
      : null;
  const actualVariantCount = definition.name === 'button'
    ? countRequiredButtonCombos(definition, figmaBlueprint)
    : definition.name === 'card'
      ? countRequiredCardCombos(definition, figmaBlueprint)
      : figmaBlueprint?.variantCount ?? null;
  const figmaComplete = !!figmaMatch
    && !!figmaBlueprint
    && (expectedVariantCount === null || actualVariantCount === expectedVariantCount);

  return {
    component: {
      name: definition.name,
      title: definition.title,
      rootClass: classNameFromComponentName(definition.name),
      htmlTag: definition.htmlTag,
      role: definition.role,
      requiresFigma: definition.requiresFigma === true,
      interactive: definition.interactive,
      autoDiscovered: definition.autoDiscovered === true,
      summary: definition.summary,
      allowedProps: definition.allowedProps || [],
      slots: definition.slots || [],
      axes: definition.axes || {},
      variants: definition.variants || [],
      sizes: definition.sizes || [],
      states: definition.states || [],
      usageRules: definition.usageRules || { do: [], dont: [] },
      accessibility: definition.accessibility || [],
      previewMatrix: definition.previewMatrix || {},
      renderRequirements: definition.renderRequirements || null,
    },
    figma: {
      available: !!figmaMatch,
      source: figmaCache?._meta?.source || null,
      cachedAt: figmaCache?._meta?.cached_at || null,
      matchedKey: figmaMatch?.key || null,
      designSpec: summarizeDesignSpec(figmaMatch?.spec || null, 0, designSpecDepth),
      relatedSpecs: Object.fromEntries(
        relatedFigmaSpecs.map(({ key, spec }) => [key, summarizeDesignSpec(spec || null, 0, 2)])
      ),
      blueprint: figmaBlueprint,
      complete: figmaComplete,
      expectedVariantCount,
      actualVariantCount,
    },
    contract: {
      componentTokens,
      referencedTokens,
      extraAllowedCssVars,
      allowedCssVars,
    },
    outputRequirements: {
      format: 'Markdown',
      requiredSections: ['## Description', '## Spec', "## Do & Don't", '## Code interactif (Live Editor)'],
      jsxRule: `The root JSX element must be <${definition.htmlTag}> or wrap a <${definition.htmlTag}> root component.`,
      generationPolicy: [
        'Use only CSS variables listed in allowedCssVars.',
        'Do not invent variants, sizes, states or props.',
        'Keep the rendered preview exhaustive across the declared matrix.',
        'If figma.designSpec is present, it is the visual source of truth.',
        'If figma.designSpec is missing, explicitly say it in the Spec section instead of inventing visual details.',
      ],
      jsxBlueprint,
    },
  };
}

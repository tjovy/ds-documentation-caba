import fs from 'fs';
import path from 'path';
import { buildComponentTokenEntries, buildTokenEntry } from './tokens.js';
import { extractDesignBlueprint, findFigmaSpec, findRelatedFigmaSpecs, summarizeDesignSpec } from './figma.js';

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

  return null;
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

export function listComponentSummaries(registry) {
  return Object.values(registry).map((component) => ({
    name: component.name,
    title: component.title,
    htmlTag: component.htmlTag,
    summary: component.summary,
  }));
}

export function buildGenerationContext(registry, tokens, componentName, figmaCache = null) {
  const definition = registry[componentName];
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
  const designSpecDepth = figmaBlueprint ? 1 : 3;
  const jsxBlueprint = buildJsxBlueprint(definition);
  const expectedVariantCount = definition.name === 'button'
    ? (definition.variants || []).length * (definition.sizes || []).length * (definition.states || []).length
    : definition.name === 'card'
      ? (definition.variants || []).length * 2 * (definition.states || []).length
      : null;
  const actualVariantCount = figmaBlueprint?.variantCount ?? null;
  const figmaComplete = !!figmaMatch
    && !!figmaBlueprint
    && (expectedVariantCount === null || actualVariantCount === expectedVariantCount);

  return {
    component: {
      name: definition.name,
      title: definition.title,
      htmlTag: definition.htmlTag,
      role: definition.role,
      requiresFigma: definition.requiresFigma === true,
      interactive: definition.interactive,
      summary: definition.summary,
      allowedProps: definition.allowedProps || [],
      slots: definition.slots || [],
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

function extractTextContent(input) {
  if (!input) return '';
  if (typeof input === 'string') return input;
  return JSON.stringify(input, null, 2);
}

export function extractCodeBlock(markdown) {
  const source = extractTextContent(markdown);
  const match = source.match(/```(?:jsx|tsx|js)?\n([\s\S]*?)```/i);
  return match ? match[1].trim() : '';
}

export function validateMarkdownSections(markdown) {
  const source = extractTextContent(markdown);
  const trimmed = source.trimStart();
  return {
    startsWithDescription: /^##\s+Description\b/i.test(trimmed),
    hasDescription: /##\s+Description\b/i.test(source),
    hasSpec: /##\s+Spec\b/i.test(source),
    hasDoDont: /##\s+Do\s*&\s*Don['’]t\b/i.test(source),
    hasCode: /##\s+(?:💻\s*)?Code interactif(?:\s*\(Live Editor\))?\b/i.test(source) && /```/i.test(source),
  };
}

export function extractCssVars(code) {
  return [...new Set([...code.matchAll(/var\((--[a-z0-9-]+)\)/gi)].map((match) => match[1]))].sort();
}

export function extractLiteralValues(code, propName) {
  const regex = new RegExp(`${propName}\\s*=\\s*["']([a-z0-9-]+)["']`, 'gi');
  return [
    ...new Set(
      [...code.matchAll(regex)]
        .map((match) => match[1].toLowerCase())
        .filter((value) => /^[a-z-]+$/i.test(value))
    ),
  ].sort();
}

export function extractStringArrayValues(code, variableName) {
  const regex = new RegExp(`(?:const|let|var)\\s+${variableName}\\s*=\\s*\\[([\\s\\S]*?)\\]`, 'i');
  const match = code.match(regex);
  if (!match) return [];

  return [
    ...new Set(
      [...match[1].matchAll(/["']([a-z0-9-]+)["']/gi)]
        .map((item) => item[1].toLowerCase())
        .filter((value) => /^[a-z-]+$/i.test(value))
    ),
  ].sort();
}

export function validateComponentMarkdown(markdown, context) {
  const sections = validateMarkdownSections(markdown);
  const code = extractCodeBlock(markdown);
  const cssVars = extractCssVars(code);
  const allowedCssVars = new Set(context.contract.allowedCssVars || []);
  const referencedVariants = [
    ...extractLiteralValues(code, 'variant'),
    ...extractStringArrayValues(code, 'variants'),
  ].filter((value, index, array) => array.indexOf(value) === index);
  const referencedSizes = [
    ...extractLiteralValues(code, 'size'),
    ...extractStringArrayValues(code, 'sizes'),
  ].filter((value, index, array) => array.indexOf(value) === index);

  const unknownCssVars = cssVars.filter((cssVar) => !allowedCssVars.has(cssVar));
  const illegalVariants = referencedVariants.filter(
    (variant) => !(context.component.variants || []).includes(variant)
  );
  const illegalSizes = referencedSizes.filter(
    (size) => !(context.component.sizes || []).includes(size)
  );
  const hasRenderCall = /render\s*\(/.test(code);
  const rootTagOk = code.includes(`<${context.component.htmlTag}`) || code.includes(`${context.component.title} = (`) || code.includes(`${context.component.title}={`);
  const isGenericCardMatrixDemo =
    context.component?.name === 'card'
    && code.includes('variant = {variant}')
    && code.includes('Card · ${variant} · ${size}')
    && code.includes('Conteneur de contenu regroupant des informations homogènes avec padding et élévation pilotés par tokens.');
  const buttonMatrixHints = context.component?.name === 'button'
    ? {
        hasVariants: (context.component.variants || []).every((token) => code.includes(token)),
        hasSizes: (context.component.sizes || []).every((token) => code.includes(token)),
        hasStates: (context.component.states || []).every((token) => code.toLowerCase().includes(token)),
      }
    : null;
  const hasCompleteButtonMatrix = !buttonMatrixHints || (
    buttonMatrixHints.hasVariants
    && buttonMatrixHints.hasSizes
    && buttonMatrixHints.hasStates
  );

  return {
    valid:
      sections.startsWithDescription &&
      sections.hasDescription &&
      sections.hasSpec &&
      sections.hasDoDont &&
      sections.hasCode &&
      unknownCssVars.length === 0 &&
      illegalVariants.length === 0 &&
      illegalSizes.length === 0 &&
      hasRenderCall &&
      rootTagOk &&
      hasCompleteButtonMatrix &&
      !isGenericCardMatrixDemo,
    checks: {
      sections,
      hasRenderCall,
      rootTagOk,
      isGenericCardMatrixDemo,
      buttonMatrixHints,
      hasCompleteButtonMatrix,
      referencedVariants,
      referencedSizes,
      cssVars,
      unknownCssVars,
      illegalVariants,
      illegalSizes,
    },
  };
}

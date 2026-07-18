import { transform } from 'sucrase';

const EXPECTED_SECTIONS = [
  'description',
  'spec',
  "do & don't",
  'code interactif (live editor)',
];

function extractTextContent(input) {
  if (!input) return '';
  if (typeof input === 'string') return input;
  return JSON.stringify(input, null, 2);
}

function normalizeHeading(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ');
}

export function extractCodeBlocks(markdown) {
  const source = extractTextContent(markdown);
  return [...source.matchAll(/```([a-z0-9-]*)\s*\n([\s\S]*?)```/gi)].map((match) => ({
    language: String(match[1] || '').toLowerCase(),
    code: match[2].trim(),
  }));
}

export function extractCodeBlock(markdown) {
  return extractCodeBlocks(markdown)[0]?.code || '';
}

export function validateMarkdownSections(markdown) {
  const source = extractTextContent(markdown);
  const headings = [...source.matchAll(/^##\s+(.+)$/gm)].map((match) => normalizeHeading(match[1]));
  return {
    headings,
    exact: headings.length === EXPECTED_SECTIONS.length
      && headings.every((heading, index) => heading === EXPECTED_SECTIONS[index]),
  };
}

export function extractCssVars(code) {
  return [...new Set(
    [...String(code || '').matchAll(/var\(\s*(--[a-z0-9-]+)(?:\s*,[^)]*)?\s*\)/gi)]
      .map((match) => match[1].toLowerCase())
  )].sort();
}

export function extractLiteralValues(code, propName) {
  const regex = new RegExp(`${propName}\\s*=\\s*["']([a-z0-9-]+)["']`, 'gi');
  return [...new Set([...code.matchAll(regex)].map((match) => match[1].toLowerCase()))].sort();
}

export function extractStringArrayValues(code, variableName) {
  const regex = new RegExp(`(?:const|let|var)\\s+${variableName}\\s*=\\s*\\[([\\s\\S]*?)\\]`, 'i');
  const match = code.match(regex);
  if (!match) return [];
  return [...new Set([...match[1].matchAll(/["']([a-z0-9-]+)["']/gi)].map((item) => item[1].toLowerCase()))].sort();
}

function sameValues(actual, expected) {
  const left = [...new Set(actual)].sort();
  const right = [...new Set(expected || [])].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compileJsx(code) {
  try {
    transform(code, { transforms: ['jsx', 'imports'] });
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: error?.message || String(error) };
  }
}

function validateAxes(code, component) {
  const checks = {};
  const axes = component.name === 'card'
    ? { tones: component.variants || [], media: ['off', 'on'], states: component.states || [] }
    : { variants: component.variants || [], sizes: component.sizes || [], states: component.states || [] };

  for (const [arrayName, expected] of Object.entries(axes)) {
    const propName = arrayName === 'tones' ? 'tone' : arrayName.replace(/s$/, '');
    const actual = [
      ...extractStringArrayValues(code, arrayName),
      ...extractStringArrayValues(code, arrayName.toUpperCase()),
      ...extractLiteralValues(code, propName),
    ];
    checks[arrayName] = {
      expected: [...expected].sort(),
      actual: [...new Set(actual)].sort(),
      exact: sameValues(actual, expected),
    };
  }

  return checks;
}

export function validateComponentMarkdown(markdown, context) {
  const source = extractTextContent(markdown);
  const sections = validateMarkdownSections(source);
  const blocks = extractCodeBlocks(source);
  const code = blocks[0]?.code || '';
  const cssVars = extractCssVars(code);
  const allowedCssVars = new Set((context.contract.allowedCssVars || []).map((value) => value.toLowerCase()));
  const unknownCssVars = cssVars.filter((cssVar) => !allowedCssVars.has(cssVar));
  const compilation = compileJsx(code);
  const axes = validateAxes(code, context.component);
  const invalidAxes = Object.entries(axes).filter(([, check]) => !check.exact).map(([name]) => name);
  const hasSingleJsxBlock = blocks.length === 1 && ['jsx', 'js'].includes(blocks[0]?.language);
  const hasCssTemplate = /\bconst\s+css\s*=\s*`[\s\S]*?`;/.test(code);
  const endsWithRender = /render\(\s*<Demo\s*\/>\s*\);\s*$/.test(code);
  const rootTagOk = new RegExp(`<${context.component.htmlTag}\\b`, 'i').test(code);
  const hasNativeDisabled = context.component.name !== 'button' || /<button\b[\s\S]*?\bdisabled(?:\s|=|\})/i.test(code);
  const hasCssVarFallback = /var\(\s*--[a-z0-9-]+\s*,/i.test(code);
  const hasDynamicCssVar = /var\([^)]*\$\{|--[a-z0-9-]*\$\{/i.test(code);
  const hardcodedColors = [...new Set([
    ...(code.match(/#[0-9a-f]{3,8}\b/gi) || []),
    ...(code.match(/\b(?:rgb|rgba|hsl|hsla)\s*\([^)]*\)/gi) || []),
  ])];
  const forbiddenPatterns = [
    /\b(?:import|export)\b/,
    /\b(?:fetch|XMLHttpRequest|WebSocket|eval)\s*\(/,
    /\bnew\s+Function\b/,
    /\b(?:window|document|location|localStorage|sessionStorage)\b/,
    /https?:\/\//i,
    /<(?:script|iframe)\b/i,
  ].filter((pattern) => pattern.test(code)).map((pattern) => pattern.source);

  const valid = sections.exact
    && hasSingleJsxBlock
    && compilation.valid
    && hasCssTemplate
    && endsWithRender
    && rootTagOk
    && hasNativeDisabled
    && unknownCssVars.length === 0
    && invalidAxes.length === 0
    && !hasCssVarFallback
    && !hasDynamicCssVar
    && hardcodedColors.length === 0
    && forbiddenPatterns.length === 0;

  return {
    valid,
    checks: {
      sections,
      hasSingleJsxBlock,
      compilation,
      hasCssTemplate,
      endsWithRender,
      rootTagOk,
      hasNativeDisabled,
      axes,
      invalidAxes,
      cssVars,
      unknownCssVars,
      hasCssVarFallback,
      hasDynamicCssVar,
      hardcodedColors,
      forbiddenPatterns,
    },
  };
}

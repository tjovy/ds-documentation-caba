const WORKFLOW_VERSION = 'ssot-v4';
const MAX_COMPONENTS_PER_RUN = 5;
const MCP_ENDPOINT = 'http://127.0.0.1:3101/mcp';
const CANONICAL_TOKEN_KEYS = new Set(['core', 'semantic', 'typography', 'component']);

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isTokenNode(node) {
  return isObject(node) && ('value' in node || '$value' in node);
}

function toCamelSegment(segment) {
  return String(segment).replace(/-([a-z0-9])/gi, (_, char) => char.toUpperCase());
}

function normalizeTokenReference(value) {
  if (typeof value !== 'string') return value;
  const match = value.trim().match(/^\{(.+)\}$/);
  if (!match) return value;
  return `{${match[1].split('.').filter(Boolean).map(toCamelSegment).join('.')}}`;
}

function normalizeTokenTree(node) {
  if (!isObject(node)) return node;
  if (isTokenNode(node)) {
    const output = { value: normalizeTokenReference(node.value ?? node.$value) };
    if (node.type || node.$type) output.type = node.type ?? node.$type;
    if (node.description || node.$description) output.description = node.description ?? node.$description;
    return output;
  }

  const output = {};
  for (const [rawKey, value] of Object.entries(node)) {
    if (rawKey === '$extensions') continue;
    const key = rawKey.startsWith('$') ? rawKey : toCamelSegment(rawKey);
    output[key] = normalizeTokenTree(value);
  }
  return output;
}

function mergeTokenTree(target, source) {
  if (!isObject(source)) return target;
  for (const [key, value] of Object.entries(source)) {
    if (isObject(value) && isObject(target[key]) && !isTokenNode(value) && !isTokenNode(target[key])) {
      mergeTokenTree(target[key], value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function readTokenSet(rawTokens, setPath) {
  if (!isObject(rawTokens)) return null;
  if (rawTokens[setPath]) return rawTokens[setPath];
  return setPath.split('/').filter(Boolean).reduce((current, segment) => {
    if (!isObject(current) || !current[segment]) return null;
    return current[segment];
  }, rawTokens);
}

function normalizeDesignTokens(rawTokens) {
  const normalized = {};
  if (rawTokens?.$metadata) normalized.$metadata = rawTokens.$metadata;

  for (const key of CANONICAL_TOKEN_KEYS) {
    if (isObject(rawTokens?.[key])) normalized[key] = normalizeTokenTree(rawTokens[key]);
  }

  const primitive = readTokenSet(rawTokens, 'Primitive/Value') || readTokenSet(rawTokens, 'primitive/value');
  const space = readTokenSet(rawTokens, 'Space/Value') || readTokenSet(rawTokens, 'space/value');
  const radius = readTokenSet(rawTokens, 'Radius/Value') || readTokenSet(rawTokens, 'radius/value');
  const typography = readTokenSet(rawTokens, 'Typography/Value') || readTokenSet(rawTokens, 'typography/value');
  const semantic = readTokenSet(rawTokens, 'Semantic/Dark') || readTokenSet(rawTokens, 'semantic/dark');
  const component = readTokenSet(rawTokens, 'Component/Value') ||
    readTokenSet(rawTokens, 'component/value') ||
    readTokenSet(rawTokens, 'component/component');

  if (primitive) mergeTokenTree(normalized.core ||= {}, normalizeTokenTree(primitive));
  if (space?.space) mergeTokenTree(normalized.core ||= {}, { space: normalizeTokenTree(space.space) });
  if (radius?.radius) mergeTokenTree(normalized.core ||= {}, { radius: normalizeTokenTree(radius.radius) });
  if (typography?.font) mergeTokenTree(normalized.core ||= {}, { font: normalizeTokenTree(typography.font) });
  if (typography?.typography) normalized.typography = normalizeTokenTree(typography.typography);
  if (semantic) normalized.semantic = normalizeTokenTree(semantic);
  if (component) normalized.component = normalizeTokenTree(component);

  return normalized;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value ?? null);
}

function simpleHash(value) {
  const input = typeof value === 'string' ? value : stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function getNodeByPath(root, path) {
  return String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((current, key) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      return current[key];
    }, root);
}

function isLegacyDoc(markdown) {
  const text = String(markdown || '');
  const normalized = text.toLowerCase();

  if (!text.trim()) return true;
  if (!normalized.includes('## description')) return true;
  if (!normalized.includes('## spec')) return true;
  if (!normalized.includes('## do')) return true;
  if (!normalized.includes('code interactif')) return true;
  if (normalized.includes('<token_mapping>') || normalized.includes('<css>') || normalized.includes('<react>')) return true;
  if (normalized.includes('function buttondemo()')) return true;
  if (normalized.includes('--component-button-color-bg-')) return true;
  if (normalized.includes('card · ${variant} · ${size}')) return true;

  return false;
}

function parseSseJson(raw) {
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const dataLine = lines.find((line) => line.startsWith('data: '));
  if (!dataLine) {
    throw new Error('Reponse MCP invalide: data manquante');
  }
  return JSON.parse(dataLine.slice(6));
}

async function callMcpTool(name, args) {
  const raw = await this.helpers.httpRequest({
    method: 'POST',
    url: MCP_ENDPOINT,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    }),
    returnFullResponse: false,
  });

  const payload = parseSseJson(raw);
  return payload.result?.structuredContent || null;
}

async function resolveComponentContext(componentName, tokens, sourceRef) {
  return callMcpTool.call(this, 'get_component_generation_context', {
    name: componentName,
    tokens,
    sourceRef,
  });
}

function referencedTokenPathsFromContext(context) {
  const referencedTokens = Array.isArray(context?.contract?.referencedTokens)
    ? context.contract.referencedTokens
    : [];

  return referencedTokens
    .map((item) => item?.tokenPath)
    .filter(Boolean);
}

function figmaSnapshotFromContext(context) {
  if (!context?.figma?.available) {
    return null;
  }

  return {
    matchedKey: context.figma.matchedKey || null,
    complete: context.figma.complete === true,
    expectedVariantCount: context.figma.expectedVariantCount ?? null,
    actualVariantCount: context.figma.actualVariantCount ?? null,
    blueprint: context.figma.blueprint || null,
    component: {
      htmlTag: context.component?.htmlTag || null,
      rootClass: context.component?.rootClass || null,
      autoDiscovered: context.component?.autoDiscovered === true,
      axes: context.component?.axes || {},
      variants: context.component?.variants || [],
      sizes: context.component?.sizes || [],
      states: context.component?.states || [],
      renderRequirements: context.component?.renderRequirements || null,
    },
  };
}

function shouldSkipForFigma(componentName, context) {
  if (!context?.component?.requiresFigma) {
    return null;
  }

  if (!context.figma?.available) {
    return `Figma indisponible pour ${componentName}`;
  }

  if (!context.figma?.complete) {
    return `Cache Figma incomplet pour ${componentName}: ${context.figma?.actualVariantCount || 0}/${context.figma?.expectedVariantCount || '?'}`;
  }

  return null;
}

try {
  const bufferTokens = await this.helpers.getBinaryDataBuffer(0, 'data', 'Get tokens.json');
  const rawTokens = JSON.parse(bufferTokens.toString('utf8'));
  const tokens = normalizeDesignTokens(rawTokens);
  const sourceRef = $('Get source main ref').first()?.json?.object?.sha || 'main';

  let docs = {};
  try {
    const bufferDocs = await this.helpers.getBinaryDataBuffer(0, 'docs', 'Get tokens-docs.json');
    docs = JSON.parse(bufferDocs.toString('utf8'));
  } catch (error) {
    docs = {};
  }

  const items = [];
  const blockedComponents = [];
  const components = tokens.component || {};

  for (const componentName of Object.keys(components).sort()) {
    const existingEntry = docs.component?.[componentName] || {};
    const existingMarkdown = existingEntry.description || '';
    const existingMeta = existingEntry._meta || {};
    const context = await resolveComponentContext.call(this, componentName, tokens, sourceRef);
    const figmaSkipReason = shouldSkipForFigma(componentName, context);
    if (figmaSkipReason) {
      blockedComponents.push({ componentName, reason: figmaSkipReason });
      console.warn(figmaSkipReason);
      continue;
    }
    const metaPaths = Array.isArray(existingMeta?.referencedTokenPaths)
      ? existingMeta.referencedTokenPaths.filter(Boolean)
      : [];
    const referencedTokenPaths = metaPaths.length > 0 ? metaPaths : referencedTokenPathsFromContext(context);

    const componentSnapshot = components[componentName] || {};
    const referencedSnapshot = referencedTokenPaths.map((tokenPath) => ({
      tokenPath,
      value: getNodeByPath(tokens, tokenPath),
    }));

    const componentTokenHash = simpleHash(componentSnapshot);
    const referencedTokenHash = simpleHash(referencedSnapshot);
    const figmaHash = simpleHash(figmaSnapshotFromContext(context));
    const currentSourceHash = simpleHash({
      workflowVersion: WORKFLOW_VERSION,
      componentTokenHash,
      referencedTokenHash,
      figmaHash,
    });

    const reasons = [];
    if (isLegacyDoc(existingMarkdown)) reasons.push('legacy_doc');
    if (!existingMeta || typeof existingMeta !== 'object' || !existingMeta.sourceHash) reasons.push('missing_meta');
    if ((existingMeta.workflowVersion || '') !== WORKFLOW_VERSION) reasons.push('workflow_version_changed');
    if (existingMeta.componentTokenHash && existingMeta.componentTokenHash !== componentTokenHash) reasons.push('component_tokens_changed');
    if (referencedTokenPaths.length > 0 && existingMeta.referencedTokenHash && existingMeta.referencedTokenHash !== referencedTokenHash) reasons.push('referenced_tokens_changed');
    if (existingMeta.figmaHash && existingMeta.figmaHash !== figmaHash) reasons.push('figma_blueprint_changed');
    if (existingMeta.sourceHash && existingMeta.sourceHash !== currentSourceHash) reasons.push('source_hash_changed');

    if (reasons.length > 0) {
      items.push({
        json: {
          componentName,
          tokenPath: `component.${componentName}`,
          rawComponentTokens: componentSnapshot,
          existingMarkdown,
          previousDocs: docs,
          sourceTokens: tokens,
          sourceRef,
          sourceComparison: {
            workflowVersion: WORKFLOW_VERSION,
            reasons,
            componentTokenHash,
            referencedTokenPaths,
            referencedTokenHash,
            figmaHash,
            currentSourceHash,
            previousSourceHash: existingMeta.sourceHash || null,
            previousFigmaHash: existingMeta.figmaHash || null,
          },
        },
      });
    }
  }

  if (!items.length) {
    const blockedMessage = blockedComponents.length
      ? ` Composants bloques sans appel OpenAI: ${JSON.stringify(blockedComponents)}`
      : '';
    console.log(`Aucune difference exploitable entre tokens.json et tokens-docs.json. Aucun appel OpenAI.${blockedMessage}`);
    return [];
  }

  return items.slice(0, MAX_COMPONENTS_PER_RUN);
} catch (error) {
  return [{ json: { error: 'filter_failed', details: error.message } }];
}

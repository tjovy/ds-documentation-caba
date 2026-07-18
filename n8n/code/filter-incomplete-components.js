const WORKFLOW_VERSION = 'ssot-v3';
const MAX_COMPONENTS_PER_RUN = 5;
const MCP_ENDPOINT = 'http://127.0.0.1:3101/mcp';

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

async function resolveReferencedTokenPaths(componentName, existingMeta) {
  const metaPaths = Array.isArray(existingMeta?.referencedTokenPaths)
    ? existingMeta.referencedTokenPaths.filter(Boolean)
    : [];

  if (metaPaths.length > 0) {
    return metaPaths;
  }

  const context = await callMcpTool.call(this, 'get_component_generation_context', { name: componentName });
  const referencedTokens = Array.isArray(context?.contract?.referencedTokens)
    ? context.contract.referencedTokens
    : [];

  return referencedTokens
    .map((item) => item?.tokenPath)
    .filter(Boolean);
}

try {
  const bufferTokens = await this.helpers.getBinaryDataBuffer(0, 'data', 'Get tokens.json');
  const tokens = JSON.parse(bufferTokens.toString('utf8'));

  let docs = {};
  try {
    const bufferDocs = await this.helpers.getBinaryDataBuffer(0, 'docs', 'Get tokens-docs.json');
    docs = JSON.parse(bufferDocs.toString('utf8'));
  } catch (error) {
    docs = {};
  }

  const items = [];
  const components = tokens.component || {};

  for (const componentName of Object.keys(components).sort()) {
    const existingEntry = docs.component?.[componentName] || {};
    const existingMarkdown = existingEntry.description || '';
    const existingMeta = existingEntry._meta || {};
    const referencedTokenPaths = await resolveReferencedTokenPaths.call(this, componentName, existingMeta);

    const componentSnapshot = components[componentName] || {};
    const referencedSnapshot = referencedTokenPaths.map((tokenPath) => ({
      tokenPath,
      value: getNodeByPath(tokens, tokenPath),
    }));

    const componentTokenHash = simpleHash(componentSnapshot);
    const referencedTokenHash = simpleHash(referencedSnapshot);
    const currentSourceHash = simpleHash({
      workflowVersion: WORKFLOW_VERSION,
      componentTokenHash,
      referencedTokenHash,
    });

    const reasons = [];
    if (isLegacyDoc(existingMarkdown)) reasons.push('legacy_doc');
    if (!existingMeta || typeof existingMeta !== 'object' || !existingMeta.sourceHash) reasons.push('missing_meta');
    if ((existingMeta.workflowVersion || '') !== WORKFLOW_VERSION) reasons.push('workflow_version_changed');
    if (existingMeta.componentTokenHash && existingMeta.componentTokenHash !== componentTokenHash) reasons.push('component_tokens_changed');
    if (referencedTokenPaths.length > 0 && existingMeta.referencedTokenHash && existingMeta.referencedTokenHash !== referencedTokenHash) reasons.push('referenced_tokens_changed');
    if (existingMeta.sourceHash && existingMeta.sourceHash !== currentSourceHash) reasons.push('source_hash_changed');

    if (reasons.length > 0) {
      items.push({
        json: {
          componentName,
          tokenPath: `component.${componentName}`,
          rawComponentTokens: componentSnapshot,
          existingMarkdown,
          previousDocs: docs,
          sourceComparison: {
            workflowVersion: WORKFLOW_VERSION,
            reasons,
            componentTokenHash,
            referencedTokenPaths,
            referencedTokenHash,
            currentSourceHash,
            previousSourceHash: existingMeta.sourceHash || null,
          },
        },
      });
    }
  }

  if (!items.length) {
    return [{
      json: {
        stop: true,
        message: 'Aucune difference detectee entre tokens.json et tokens-docs.json pour les composants documentes.',
      },
    }];
  }

  return items.slice(0, MAX_COMPONENTS_PER_RUN);
} catch (error) {
  return [{ json: { error: 'filter_failed', details: error.message } }];
}

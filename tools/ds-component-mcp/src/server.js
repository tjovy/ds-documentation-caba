import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { loadRegistry, listComponentSummaries, buildGenerationContext } from './lib/registry.js';
import { loadJson, buildKnownCssVars } from './lib/tokens.js';
import { validateComponentMarkdown } from './lib/markdown.js';
import { loadFigmaCache } from './lib/figma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');
const registryDir = path.join(packageRoot, 'registry');
const defaultRawTokensPath = path.join(repoRoot, 'tokens.json');
const tokensPath = process.env.DS_TOKENS_PATH || defaultRawTokensPath;
const figmaCachePath =
  process.env.DS_FIGMA_CACHE_PATH || path.join(repoRoot, 'n8n', 'cache', 'figma-design-specs.json');

const registry = loadRegistry(registryDir);

function loadRuntimeState(tokensOverride = null) {
  const tokens = tokensOverride && typeof tokensOverride === 'object'
    ? tokensOverride
    : loadJson(tokensPath);
  return {
    tokens,
    figmaCache: loadFigmaCache(figmaCachePath),
    knownCssVars: buildKnownCssVars(tokens),
  };
}

const server = new McpServer({
  name: 'ds-component-mcp',
  version: '0.1.0',
});

server.tool(
  'list_components',
  'List all documentable design-system components.',
  {},
  async () => {
    const { tokens, figmaCache } = loadRuntimeState();
    const payload = {
      components: listComponentSummaries(registry, tokens),
      figma: {
        cachePath: figmaCachePath,
        cachedAt: figmaCache?._meta?.cached_at || null,
        source: figmaCache?._meta?.source || null,
      },
    };
    return {
      structuredContent: payload,
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  }
);

server.tool(
  'get_component_definition',
  'Return the semantic contract for one component.',
  {
    name: z.string().describe('Component name, for example button or input.'),
  },
  async ({ name }) => {
    const { tokens, figmaCache } = loadRuntimeState();
    const context = buildGenerationContext(registry, tokens, name, figmaCache);
    if (!context) {
      const errorPayload = { error: `Unknown component: ${name}` };
      return {
        structuredContent: errorPayload,
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorPayload, null, 2),
          },
        ],
      };
    }

    const payload = { component: context.component };
    return {
      structuredContent: payload,
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  }
);

server.tool(
  'get_component_generation_context',
  'Return the full generation context that the documentation generator must follow for one component.',
  {
    name: z.string().describe('Component name, for example button or input.'),
    tokens: z.record(z.unknown()).optional().describe('Exact tokens.json snapshot read by the caller.'),
    sourceRef: z.string().optional().describe('Git commit or ref associated with the token snapshot.'),
  },
  async ({ name, tokens: tokensOverride, sourceRef }) => {
    const { tokens, figmaCache, knownCssVars } = loadRuntimeState(tokensOverride);
    const context = buildGenerationContext(registry, tokens, name, figmaCache);
    if (!context) {
      const errorPayload = { error: `Unknown component: ${name}` };
      return {
        structuredContent: errorPayload,
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorPayload, null, 2),
          },
        ],
      };
    }

    const payload = {
      ...context,
      repositoryContext: {
        tokenSource: tokensOverride ? 'caller-snapshot' : 'local-file',
        tokensPath: tokensOverride ? null : tokensPath,
        sourceRef: sourceRef || null,
        figmaCachePath,
        knownCssVarCount: knownCssVars.length,
      },
    };

    return {
      structuredContent: payload,
      content: [
        {
          type: 'text',
          text: JSON.stringify(payload, null, 2),
        },
      ],
    };
  }
);

server.tool(
  'validate_component_markdown',
  'Validate generated Markdown against the component contract and allowed CSS variables.',
  {
    name: z.string().describe('Component name, for example button or input.'),
    markdown: z.string().describe('Generated Markdown returned by the model.'),
    tokens: z.record(z.unknown()).optional().describe('Exact tokens.json snapshot used for generation.'),
    sourceRef: z.string().optional().describe('Git commit or ref associated with the token snapshot.'),
  },
  async ({ name, markdown, tokens: tokensOverride }) => {
    const { tokens, figmaCache } = loadRuntimeState(tokensOverride);
    const context = buildGenerationContext(registry, tokens, name, figmaCache);
    if (!context) {
      const errorPayload = { valid: false, name, error: `Unknown component: ${name}` };
      return {
        structuredContent: errorPayload,
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorPayload, null, 2),
          },
        ],
      };
    }

    const result = {
      name,
      ...validateComponentMarkdown(markdown, context),
    };
    return {
      structuredContent: result,
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DB_PATH = '/Users/atypic/.n8n/database.sqlite';
const WORKFLOW_ID = '5iHwlZOmTAxQDkec';
const BACKUP_PATH = fileURLToPath(new URL('./backups/ds-documentation-caba.before-patch.json', import.meta.url));
const PROMPT_PATH = fileURLToPath(new URL('./prompts/component-doc-generator.md', import.meta.url));
const FINALIZE_CODE_PATH = fileURLToPath(new URL('./code/finalize-component-docs.js', import.meta.url));

function sqlite(args) {
  return execFileSync('sqlite3', [DB_PATH, ...args], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });
}

function getColumn(column) {
  return sqlite([
    '-noheader',
    '-batch',
    `select ${column} from workflow_entity where id = '${WORKFLOW_ID}';`,
  ]);
}

function textLiteral(value) {
  return `CAST(X'${Buffer.from(value, 'utf8').toString('hex')}' AS TEXT)`;
}

function requireNode(nodes, name) {
  const node = nodes.find((item) => item.name === name);
  if (!node) throw new Error(`Node introuvable: ${name}`);
  return node;
}

function replaceAll(text, replacements) {
  return replacements.reduce(
    (current, [from, to]) => current.split(from).join(to),
    text,
  );
}

function buildOpenAiGeneratorCode(systemPrompt, userPromptTemplate) {
  return `const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-sol';
const OPENAI_REASONING_EFFORT = process.env.OPENAI_REASONING_EFFORT || 'high';
const OPENAI_REASONING_MODE = process.env.OPENAI_REASONING_MODE || 'standard';
const OPENAI_MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 12000);
const SYSTEM_PROMPT = ${JSON.stringify(systemPrompt)};
const USER_PROMPT_TEMPLATE = ${JSON.stringify(userPromptTemplate)};

function getApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY est manquante dans l\\'environnement n8n. Ajoutez-la puis redemarrez n8n.');
  }
  return apiKey;
}

function compactContext(ctx = {}) {
  return {
    component: {
      name: ctx.component?.name,
      title: ctx.component?.title,
      htmlTag: ctx.component?.htmlTag,
      summary: ctx.component?.summary,
      variants: ctx.component?.variants,
      sizes: ctx.component?.sizes,
      states: ctx.component?.states,
      previewMatrix: ctx.component?.previewMatrix,
      renderRequirements: ctx.component?.renderRequirements,
      requiresFigma: ctx.component?.requiresFigma,
      usageRules: ctx.component?.usageRules,
      accessibility: ctx.component?.accessibility,
    },
    figma: {
      available: ctx.figma?.available,
      matchedKey: ctx.figma?.matchedKey,
      cachedAt: ctx.figma?.cachedAt,
      blueprint: ctx.figma?.blueprint,
      shell: ctx.figma?.designSpec ? {
        name: ctx.figma.designSpec.name,
        type: ctx.figma.designSpec.type,
        width: ctx.figma.designSpec.width,
        height: ctx.figma.designSpec.height,
        cornerRadius: ctx.figma.designSpec.cornerRadius,
      } : null,
    },
    contract: {
      allowedCssVars: ctx.contract?.allowedCssVars || [],
      referencedTokens: (ctx.contract?.referencedTokens || []).map((item) => ({
        tokenPath: item.tokenPath,
        cssVar: item.cssVar,
        resolvedValue: item.resolvedValue,
        type: item.type,
      })),
    },
    outputRequirements: ctx.outputRequirements,
  };
}

function buildUserPrompt(data) {
  return USER_PROMPT_TEMPLATE
    .replace('{{componentName}}', data.componentName || '')
    .replace('{{reasons}}', JSON.stringify(data.sourceComparison?.reasons || [], null, 2))
    .replace('{{existingMarkdown}}', String(data.existingMarkdown || '(aucun)').slice(0, 600))
    .replace('{{mcpContext}}', JSON.stringify(compactContext(data.mcpContext || {}), null, 2));
}

function extractOutputText(response) {
  if (!response) return '';
  if (typeof response.output_text === 'string') return response.output_text;
  if (typeof response.text === 'string') return response.text;
  if (typeof response.content === 'string') return response.content;
  if (Array.isArray(response.output)) {
    const message = response.output.find((item) => item?.type === 'message' && Array.isArray(item.content));
    const textBlock = message?.content?.find((block) => typeof block?.text === 'string');
    if (textBlock) return textBlock.text;
  }
  return '';
}

const apiKey = getApiKey();
const outputItems = [];

for (const item of $input.all()) {
  const data = item?.json || {};
  const componentName = String(data.componentName || '').trim();

  if (!componentName) {
    continue;
  }

  const body = {
    model: OPENAI_MODEL,
    instructions: SYSTEM_PROMPT,
    input: buildUserPrompt(data),
    max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS,
    reasoning: {
      effort: OPENAI_REASONING_EFFORT,
      mode: OPENAI_REASONING_MODE,
    },
  };

  const response = await this.helpers.httpRequest({
    method: 'POST',
    url: OPENAI_ENDPOINT,
    headers: {
      Authorization: \`Bearer \${apiKey}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    returnFullResponse: false,
    timeout: 180000,
  });

  const text = extractOutputText(response);
  if (!text.trim()) {
    throw new Error(\`OpenAI n'a retourne aucun markdown exploitable pour \${componentName}\`);
  }

  outputItems.push({
    json: {
      text,
      provider: 'openai',
      model: OPENAI_MODEL,
      componentName,
      openaiResponseId: response?.id || null,
      usage: response?.usage || null,
    },
  });
}

return outputItems;
`;
}

const row = JSON.parse(sqlite([
  '-json',
  '-batch',
  `select id, name, nodes, connections, settings from workflow_entity where id = '${WORKFLOW_ID}';`,
]))[0];

if (!row) {
  throw new Error(`Workflow introuvable: ${WORKFLOW_ID}`);
}

mkdirSync(dirname(BACKUP_PATH), { recursive: true });
writeFileSync(
  BACKUP_PATH,
  JSON.stringify(
    {
      id: row.id,
      name: row.name,
      nodes: JSON.parse(row.nodes),
      connections: JSON.parse(row.connections),
      settings: JSON.parse(row.settings || '{}'),
    },
    null,
    2,
  ),
);

const nodes = JSON.parse(getColumn('nodes'));
const connections = JSON.parse(getColumn('connections'));

const tokensNode = requireNode(nodes, 'Get tokens.json');
tokensNode.parameters ||= {};
tokensNode.parameters.filePath = 'tokens.json';
tokensNode.parameters.additionalParameters ||= {};
tokensNode.parameters.additionalParameters.reference = 'main';

const filterNode = requireNode(nodes, 'Filtrer les composants incomplets');
filterNode.parameters.jsCode = replaceAll(filterNode.parameters.jsCode, [
  ['tokens.sanitized.json', 'tokens.json'],
  ["Get tokens.sanitized.json", "Get tokens.json"],
]);

const promptTemplate = readFileSync(PROMPT_PATH, 'utf8').trimEnd();
const systemPrompt = promptTemplate
  .split('\n\nTu generes la documentation Markdown finale du composant pour Storybook.')[0]
  .trimEnd();
const userPromptTemplate = `Tu generes la documentation Markdown finale du composant pour Storybook.

Nom du composant : {{componentName}}

Raisons de regeneration :
{{reasons}}

Markdown actuel (tronque, informatif uniquement) :
{{existingMarkdown}}

Contexte MCP compact :
{{mcpContext}}`;

const previousGeneratorNode = nodes.find(
  (node) => node.name.includes('Claude') || node.name === 'OpenAI GPT-5.6 Sol — Generate Markdown',
);
if (!previousGeneratorNode) throw new Error('Node generateur introuvable');
const previousGeneratorName = previousGeneratorNode.name;
previousGeneratorNode.name = 'OpenAI GPT-5.6 Sol — Generate Markdown';
previousGeneratorNode.type = 'n8n-nodes-base.code';
previousGeneratorNode.typeVersion = 2;
previousGeneratorNode.credentials = undefined;
previousGeneratorNode.webhookId = undefined;
previousGeneratorNode.parameters = {
  jsCode: buildOpenAiGeneratorCode(systemPrompt, userPromptTemplate),
};

const finalizeNode = requireNode(nodes, 'Finalize + Validate');
finalizeNode.parameters.jsCode = readFileSync(FINALIZE_CODE_PATH, 'utf8');

const splitNode = requireNode(nodes, 'Process One at a Time');
splitNode.parameters = {
  batchSize: 1,
  ...splitNode.parameters,
  options: splitNode.parameters?.options || {},
};

connections['Get component generation context'] = {
  main: [[{ node: 'Process One at a Time', type: 'main', index: 0 }]],
};
connections['Process One at a Time'] = {
  main: [
    [{ node: previousGeneratorNode.name, type: 'main', index: 0 }],
    [{ node: 'Finalize + Validate', type: 'main', index: 0 }],
  ],
};
connections[previousGeneratorNode.name] = {
  main: [[{ node: 'Process One at a Time', type: 'main', index: 0 }]],
};
if (previousGeneratorName !== previousGeneratorNode.name) {
  delete connections[previousGeneratorName];
}

JSON.parse(JSON.stringify(nodes));
JSON.parse(JSON.stringify(connections));

const sql = `
update workflow_entity
set
  nodes = ${textLiteral(JSON.stringify(nodes))},
  connections = ${textLiteral(JSON.stringify(connections))},
  updatedAt = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
where id = '${WORKFLOW_ID}';

update workflow_history
set
  nodes = ${textLiteral(JSON.stringify(nodes))},
  connections = ${textLiteral(JSON.stringify(connections))},
  updatedAt = STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')
where versionId = (
  select versionId
  from workflow_entity
  where id = '${WORKFLOW_ID}'
);
`;

sqlite([sql]);

const verification = sqlite([
  '-noheader',
  '-batch',
  `select name, length(nodes), length(connections), updatedAt from workflow_entity where id = '${WORKFLOW_ID}';`,
]).trim();

console.log(`Patched workflow ${WORKFLOW_ID}: ${verification}`);
console.log(`Backup: ${BACKUP_PATH}`);

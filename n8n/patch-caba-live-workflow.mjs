import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DB_PATH = '/Users/atypic/.n8n/database.sqlite';
const WORKFLOW_ID = '5iHwlZOmTAxQDkec';
const BACKUP_PATH = fileURLToPath(new URL('./backups/ds-documentation-caba.before-patch.json', import.meta.url));
const PROMPT_PATH = fileURLToPath(new URL('./prompts/component-doc-generator.md', import.meta.url));

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

const claudeNode = nodes.find((node) => node.name.includes('Claude'));
if (!claudeNode) throw new Error('Node Claude introuvable');
const promptTemplate = readFileSync(PROMPT_PATH, 'utf8').trimEnd();
const systemPrompt = promptTemplate
  .split('\n\nTu generes la documentation Markdown finale du composant pour Storybook.')[0]
  .trimEnd();

const messageValues = claudeNode.parameters?.messages?.values || [];
for (const message of messageValues) {
  if (typeof message.content === 'string') {
    message.content = `=${promptTemplate}\n`;
  }
}

claudeNode.parameters.options ||= {};
claudeNode.parameters.options.system = `${systemPrompt}\n`;

const finalizeNode = requireNode(nodes, 'Finalize + Validate');
finalizeNode.parameters.jsCode = replaceAll(finalizeNode.parameters.jsCode, [
  ["repo: 'Demo-design-tokens'", "repo: 'ds-documentation-caba'"],
]);

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
    [{ node: claudeNode.name, type: 'main', index: 0 }],
    [{ node: 'Finalize + Validate', type: 'main', index: 0 }],
  ],
};
connections[claudeNode.name] = {
  main: [[{ node: 'Process One at a Time', type: 'main', index: 0 }]],
};

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

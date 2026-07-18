import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const DB_PATH = '/Users/atypic/.n8n/database.sqlite';
const WORKFLOW_ID = 'BcUGOffUD95utzmw';
const CONTEXT_CODE_PATH = new URL('./code/get-component-generation-context.js', import.meta.url);

function sqlite(args) {
  return execFileSync('sqlite3', [DB_PATH, ...args], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
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

const nodes = JSON.parse(getColumn('nodes'));
const connections = JSON.parse(getColumn('connections'));
const contextCode = readFileSync(CONTEXT_CODE_PATH, 'utf8');

const contextNode = nodes.find((node) => node.name === 'Get component generation context');
if (!contextNode) {
  throw new Error('Node "Get component generation context" introuvable');
}
contextNode.parameters ||= {};
contextNode.parameters.jsCode = contextCode;

const claudeNode = nodes.find((node) => node.name.includes('Claude'));
if (!claudeNode) {
  throw new Error('Node Claude introuvable');
}

let splitNode = nodes.find((node) => node.name === 'Process One at a Time');
if (!splitNode) {
  splitNode = {
    parameters: { batchSize: 1, options: {} },
    type: 'n8n-nodes-base.splitInBatches',
    typeVersion: 3,
    position: [claudeNode.position[0] - 224, claudeNode.position[1]],
    id: randomUUID(),
    name: 'Process One at a Time',
  };
  nodes.push(splitNode);
} else {
  splitNode.parameters = {
    batchSize: 1,
    ...splitNode.parameters,
    options: splitNode.parameters?.options || {},
  };
}

connections['Get component generation context'] = {
  main: [[{ node: 'Process One at a Time', type: 'main', index: 0 }]],
};
connections['Process One at a Time'] = {
  main: [
    [{ node: claudeNode.name, type: 'main', index: 0 }],
    [],
  ],
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
`;

sqlite([sql]);

const verification = sqlite([
  '-noheader',
  '-batch',
  `select length(nodes), length(connections), updatedAt from workflow_entity where id = '${WORKFLOW_ID}';`,
]).trim();

console.log(`Patched workflow ${WORKFLOW_ID}: ${verification}`);

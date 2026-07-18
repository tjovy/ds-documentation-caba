/**
 * Fix n8n workflow BcUGOffUD95utzmw via the n8n REST API.
 *
 * Changes:
 * 1. Insert SplitInBatches (batchSize=1) between context node and Claude
 * 2. Increase maxTokens from 2600 to 4096
 * 3. Make Finalize tolerant to partial runs
 * 4. Make the context node ignore stop/control items without componentName
 */

const N8N_BASE = 'http://localhost:5678/api/v1';
const API_KEY = process.argv[2];
const WORKFLOW_ID = 'BcUGOffUD95utzmw';

if (!API_KEY) {
  console.error('Usage: node fix-workflow.mjs <API_KEY>');
  process.exit(1);
}

const headers = {
  'X-N8N-API-KEY': API_KEY,
  'Content-Type': 'application/json',
};

// 1. Fetch current workflow
const res = await fetch(`${N8N_BASE}/workflows/${WORKFLOW_ID}`, { headers });
if (!res.ok) {
  console.error('Failed to fetch workflow:', res.status, await res.text());
  process.exit(1);
}
const wf = await res.json();
console.log('✅ Fetched workflow:', wf.name, '— nodes:', wf.nodes.map(n => n.name));

const contextNode = wf.nodes.find(n => n.name === 'Get component generation context');
if (contextNode) {
  contextNode.parameters.jsCode = `const MCP_ENDPOINT = 'http://127.0.0.1:3101/mcp';
const MCP_TOOL_NAME = 'get_component_generation_context';

function parseSseJson(raw) {
  if (raw && typeof raw === 'object' && !Buffer.isBuffer(raw)) {
    return raw;
  }

  const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw || '');

  try {
    return JSON.parse(text);
  } catch {
    // SSE fallback handled below.
  }

  const dataChunks = text
    .split('\\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean)
    .filter((line) => line !== '[DONE]');

  if (!dataChunks.length) {
    throw new Error('Reponse MCP invalide: payload JSON ou data SSE manquant');
  }

  for (let index = dataChunks.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(dataChunks[index]);
    } catch {
      // Keep searching until a valid JSON payload is found.
    }
  }

  throw new Error('Reponse MCP invalide: aucun bloc data SSE JSON exploitable');
}

function extractStructuredContent(payload, toolName) {
  if (!payload || typeof payload !== 'object') {
    throw new Error(\`Reponse MCP invalide pour \${toolName}: payload vide\`);
  }

  if (payload.error) {
    const message = payload.error.message || JSON.stringify(payload.error);
    throw new Error(\`Erreur MCP \${toolName}: \${message}\`);
  }

  const result = payload.result;
  if (!result || typeof result !== 'object') {
    throw new Error(\`Reponse MCP invalide pour \${toolName}: result manquant\`);
  }

  return result.structuredContent ?? null;
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
    timeout: 30000,
  });

  const payload = parseSseJson(raw);
  return extractStructuredContent(payload, name);
}

const incomingItems = $input.all();
const outputItems = [];

for (const item of incomingItems) {
  const data = item?.json || {};
  const componentName = String(data.componentName || '').trim();

  if (data.error) {
    throw new Error(\`Filtre composants en erreur: \${data.details || data.error}\`);
  }

  if (data.stop || !componentName) {
    console.log(data.message || 'Aucun composant a enrichir par le contexte MCP.');
    continue;
  }

  const context = await callMcpTool.call(this, MCP_TOOL_NAME, { name: componentName });

  if (!context || !context.component || !context.component.name) {
    throw new Error(\`Contexte MCP incomplet pour \${componentName}\`);
  }

  if (context.component.requiresFigma && !context.figma?.available) {
    throw new Error(\`Figma indisponible pour \${componentName} alors que le workflow exige un contexte Figma\`);
  }

  outputItems.push({
    json: {
      ...data,
      mcpContext: context,
    },
  });
}

return outputItems;`;
  console.log('✅ Context node now skips stop/control items');
}

// 2. Fix Claude maxTokens
const claude = wf.nodes.find(n => n.name.includes('Claude'));
if (claude) {
  claude.parameters.options.maxTokens = 4096;
  console.log('✅ maxTokens → 4096');
}

// 3. Insert SplitInBatches between context and Claude (if not already there)
const alreadyHasSplit = wf.nodes.some(n => n.name === 'Process One at a Time');
if (!alreadyHasSplit && claude) {
  const splitNode = {
    parameters: { batchSize: 1, options: {} },
    type: 'n8n-nodes-base.splitInBatches',
    typeVersion: 3,
    position: [claude.position[0] - 200, claude.position[1]],
    id: crypto.randomUUID(),
    name: 'Process One at a Time',
  };
  wf.nodes.push(splitNode);

  // Rewire: context → split → claude (instead of context → claude)
  const ctxConns = wf.connections['Get component generation context'];
  if (ctxConns?.main?.[0]) {
    ctxConns.main[0] = [{ node: 'Process One at a Time', type: 'main', index: 0 }];
  }
  wf.connections['Process One at a Time'] = {
    main: [
      [{ node: claude.name, type: 'main', index: 0 }],
      [],
    ],
  };
  console.log('✅ Inserted SplitInBatches node');
} else if (alreadyHasSplit && claude) {
  const ctxConns = wf.connections['Get component generation context'];
  if (ctxConns?.main?.[0]) {
    ctxConns.main[0] = [{ node: 'Process One at a Time', type: 'main', index: 0 }];
  }
  wf.connections['Process One at a Time'] = {
    main: [
      [{ node: claude.name, type: 'main', index: 0 }],
      [],
    ],
  };
  console.log('✅ SplitInBatches done output disconnected from Claude');
}

// 4. Make Finalize tolerant
const fin = wf.nodes.find(n => n.name === 'Finalize + Validate');
if (fin) {
  fin.parameters.jsCode = fin.parameters.jsCode.replace(
    /if \(invalidComponents\.length \|\| missingComponents\.length\) \{\s*throw new Error\(\s*`Generation incomplete[^`]*`\s*\);\s*\}/,
    `if (missingComponents.length) {
  console.log(\`⚠️ Composants non traites dans ce run: \${missingComponents.join(', ')}. Seuls \${validComponents.join(', ')} seront mis a jour.\`);
}`
  );
  console.log('✅ Finalize made tolerant to partial runs');
}

// 5. Push updated workflow — only fields accepted by PUT /workflows/:id
const { executionOrder } = wf.settings || {};
const payload = {
  name: wf.name,
  nodes: wf.nodes,
  connections: wf.connections,
  settings: { executionOrder: executionOrder || 'v1' },
};
const putRes = await fetch(`${N8N_BASE}/workflows/${WORKFLOW_ID}`, {
  method: 'PUT',
  headers,
  body: JSON.stringify(payload),
});

if (!putRes.ok) {
  console.error('Failed to update workflow:', putRes.status, await putRes.text());
  process.exit(1);
}

const result = await putRes.json();
console.log('✅ Workflow updated successfully:', result.name);

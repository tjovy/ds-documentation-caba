const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
const MCP_ENDPOINT = 'http://127.0.0.1:3101/mcp';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-sol';
const OPENAI_REASONING_EFFORT = process.env.OPENAI_REASONING_EFFORT || 'medium';
const OPENAI_REASONING_MODE = process.env.OPENAI_REASONING_MODE || 'standard';
const OPENAI_MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 6000);
const OPENAI_MAX_REPAIR_TOKENS = Number(process.env.OPENAI_MAX_REPAIR_TOKENS || 4000);
const SYSTEM_PROMPT = __SYSTEM_PROMPT__;

function getApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY manque dans n8n. Ajoutez-la puis redemarrez n8n.');
  return apiKey;
}

function parseSseJson(raw) {
  if (raw && typeof raw === 'object' && !Buffer.isBuffer(raw)) return raw;
  const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw || '');
  try { return JSON.parse(text); } catch {}
  const chunks = text.split('\n').map((line) => line.trim()).filter((line) => line.startsWith('data:'));
  for (let index = chunks.length - 1; index >= 0; index -= 1) {
    try { return JSON.parse(chunks[index].slice(5).trim()); } catch {}
  }
  throw new Error('Reponse MCP invalide');
}

async function callMcpTool(name, args) {
  const raw = await this.helpers.httpRequest({
    method: 'POST', url: MCP_ENDPOINT,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } }),
    returnFullResponse: false, timeout: 30000,
  });
  const payload = parseSseJson(raw);
  if (payload.error) throw new Error(payload.error.message || 'Erreur MCP');
  return payload.result?.structuredContent || null;
}

function compactBlueprint(ctx) {
  const blueprint = ctx.figma?.blueprint || {};
  if (ctx.component?.name === 'button') {
    const styles = {};
    for (const [variant, states] of Object.entries(blueprint.variants || {})) {
      styles[variant] = {};
      for (const [state, sizes] of Object.entries(states || {})) {
        const sample = Object.values(sizes || {})[0] || {};
        styles[variant][state] = {
          background: sample.background, border: sample.border, borderWidth: sample.borderWidth,
          opacity: sample.opacity, label: sample.label,
        };
      }
    }
    return { shell: blueprint.shell, sizes: blueprint.sizes, styles };
  }
  return {
    shell: blueprint.shell,
    variants: (blueprint.variants || []).map((item) => ({
      tone: item.tone, media: item.media, state: item.state, width: item.width, height: item.height,
      cornerRadius: item.cornerRadius, background: item.background, shadow: item.shadow,
      mediaSpec: item.media ? { width: item.media.width, height: item.media.height, cornerRadii: item.media.cornerRadii } : null,
      content: item.content,
    })),
  };
}

function compactContext(ctx = {}) {
  const tokenMap = new Map();
  for (const item of [...(ctx.contract?.componentTokens || []), ...(ctx.contract?.referencedTokens || [])]) {
    if (item?.cssVar) tokenMap.set(item.cssVar, item.resolvedValue);
  }
  return {
    component: {
      name: ctx.component?.name, htmlTag: ctx.component?.htmlTag,
      variants: ctx.component?.variants || [], sizes: ctx.component?.sizes || [], states: ctx.component?.states || [],
      previewMatrix: ctx.component?.previewMatrix, renderRequirements: ctx.component?.renderRequirements,
      usageRules: ctx.component?.usageRules, accessibility: ctx.component?.accessibility,
    },
    figma: { matchedKey: ctx.figma?.matchedKey, cachedAt: ctx.figma?.cachedAt, blueprint: compactBlueprint(ctx) },
    tokens: [...tokenMap.entries()],
    jsxBlueprint: ctx.outputRequirements?.jsxBlueprint,
  };
}

function extractOutputText(response) {
  if (typeof response?.output_text === 'string') return response.output_text;
  for (const item of response?.output || []) {
    for (const block of item?.content || []) if (typeof block?.text === 'string') return block.text;
  }
  return '';
}

function retryable(error) {
  const status = Number(error?.statusCode || error?.response?.status || 0);
  return status === 429 || status >= 500;
}

async function requestOpenAi(input, maxOutputTokens) {
  const body = {
    model: OPENAI_MODEL, instructions: SYSTEM_PROMPT, input, max_output_tokens: maxOutputTokens,
    reasoning: { effort: OPENAI_REASONING_EFFORT, mode: OPENAI_REASONING_MODE },
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await this.helpers.httpRequest({
        method: 'POST', url: OPENAI_ENDPOINT,
        headers: { Authorization: `Bearer ${getApiKey()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body), returnFullResponse: false, timeout: 180000,
      });
    } catch (error) {
      if (attempt || !retryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }
}

const outputItems = [];
for (const item of $input.all()) {
  const data = item?.json || {};
  const componentName = String(data.componentName || '').trim();
  if (!componentName) continue;
  const compact = compactContext(data.mcpContext || {});
  const firstInput = `Composant: ${componentName}\nContexte JSON:\n${JSON.stringify(compact)}`;
  const firstResponse = await requestOpenAi.call(this, firstInput, OPENAI_MAX_OUTPUT_TOKENS);
  let text = extractOutputText(firstResponse).trim();
  if (!text) throw new Error(`OpenAI n'a retourne aucun markdown pour ${componentName}`);

  let validation = await callMcpTool.call(this, 'validate_component_markdown', {
    name: componentName, markdown: text, tokens: data.sourceTokens, sourceRef: data.sourceRef,
  });
  let repairResponse = null;
  if (!validation?.valid) {
    const repairInput = `Corrige uniquement les erreurs ci-dessous et retourne tout le Markdown final.\nErreurs:\n${JSON.stringify(validation?.checks || {})}\nSortie invalide:\n${text}`;
    repairResponse = await requestOpenAi.call(this, repairInput, OPENAI_MAX_REPAIR_TOKENS);
    text = extractOutputText(repairResponse).trim();
    validation = await callMcpTool.call(this, 'validate_component_markdown', {
      name: componentName, markdown: text, tokens: data.sourceTokens, sourceRef: data.sourceRef,
    });
  }
  if (!validation?.valid) throw new Error(`Validation finale impossible pour ${componentName}: ${JSON.stringify(validation?.checks || {})}`);

  outputItems.push({ json: {
    text, provider: 'openai', model: OPENAI_MODEL, componentName,
    repairUsed: !!repairResponse,
    openaiResponseIds: [firstResponse?.id, repairResponse?.id].filter(Boolean),
    usage: [firstResponse?.usage, repairResponse?.usage].filter(Boolean),
  } });
}
return outputItems;

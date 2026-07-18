type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

type GitHubConfig = {
  owner: string;
  repo: string;
  branch: string;
};

type StoredSettings = GitHubConfig & {
  token?: string;
};

type TokenNode = {
  $value: JsonValue;
  $type: string;
  $description?: string;
  $extensions?: JsonObject;
};

type CanonicalPath = {
  group: 'core' | 'semantic' | 'typography' | 'component';
  keys: string[];
};

type ExportResult = {
  content: string;
  variableCount: number;
  collectionCount: number;
  componentCount: number;
};

const SETTINGS_KEY = 'caba-github-settings-v1';
const TOKENS_PATH = 'tokens.json';
const DEFAULT_COMMIT_MESSAGE = 'chore(tokens): export depuis Figma';
const DEFAULT_CONFIG: GitHubConfig = {
  owner: 'tjovy',
  repo: 'ds-documentation-caba',
  branch: 'main',
};

figma.showUI(__html__, {
  width: 420,
  height: 620,
  title: 'Exporter tokens.json',
  themeColors: true,
});

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function toCamelSegment(value: string): string {
  const words = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  if (!words.length) return 'token';
  return words
    .map((word, index) => {
      const normalized = word.length > 1 && word === word.toUpperCase()
        ? word.toLowerCase()
        : `${word.charAt(0).toLowerCase()}${word.slice(1)}`;
      return index === 0
        ? normalized
        : `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
    })
    .join('');
}

function splitName(value: string): string[] {
  return value
    .split('/')
    .map((segment) => toCamelSegment(segment))
    .filter(Boolean);
}

function normalizedCollectionName(value: string): string {
  return toCamelSegment(value.split('/')[0] || value);
}

function canonicalPath(variable: Variable, collection: VariableCollection): CanonicalPath {
  const collectionName = normalizedCollectionName(collection.name);
  let keys = splitName(variable.name);

  if (['primitive', 'primitives', 'core'].includes(collectionName)) {
    if (keys[0] === 'core' || keys[0] === 'primitive' || keys[0] === 'primitives') keys = keys.slice(1);
    return { group: 'core', keys };
  }

  if (collectionName === 'space' || collectionName === 'spacing') {
    if (keys[0] !== 'space') keys.unshift('space');
    return { group: 'core', keys };
  }

  if (collectionName === 'radius' || collectionName === 'radii') {
    if (keys[0] !== 'radius') keys.unshift('radius');
    return { group: 'core', keys };
  }

  if (collectionName === 'typography' || collectionName === 'type') {
    if (keys[0] === 'font') return { group: 'core', keys };
    if (keys[0] === 'typography' || keys[0] === 'type') keys = keys.slice(1);
    return { group: 'typography', keys };
  }

  if (collectionName === 'semantic' || collectionName === 'semantics') {
    if (keys[0] === 'semantic' || keys[0] === 'semantics') keys = keys.slice(1);
    return { group: 'semantic', keys };
  }

  if (collectionName === 'component' || collectionName === 'components') {
    if (keys[0] === 'component' || keys[0] === 'components') keys = keys.slice(1);
    return { group: 'component', keys };
  }

  return { group: 'core', keys: [collectionName, ...keys] };
}

function setDeep(root: JsonObject, keys: string[], value: JsonValue): void {
  if (!keys.length) throw new Error('Une variable Figma possède un nom vide.');

  let current = root;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      if (isObject(current[key])) {
        throw new Error(`Collision de token sur ${keys.join('.')}.`);
      }
      current[key] = value;
      return;
    }

    const existing = current[key];
    if (existing === undefined) current[key] = {};
    if (!isObject(current[key])) throw new Error(`Collision de chemin sur ${keys.slice(0, index + 1).join('.')}.`);
    current = current[key] as JsonObject;
  });
}

function roundChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value * 255)));
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function formatColor(value: RGB | RGBA): string {
  const red = roundChannel(value.r);
  const green = roundChannel(value.g);
  const blue = roundChannel(value.b);
  const alpha = 'a' in value ? value.a : 1;

  if (alpha < 1) return `rgba(${red}, ${green}, ${blue}, ${Number(alpha.toFixed(3))})`;
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function variableScopes(variable: Variable): string[] {
  return Array.isArray(variable.scopes) ? variable.scopes.map(String) : [];
}

function inferTokenType(variable: Variable, path: CanonicalPath): string {
  if (variable.resolvedType === 'COLOR') return 'color';
  if (variable.resolvedType === 'STRING') return 'string';
  if (variable.resolvedType === 'BOOLEAN') return 'boolean';

  const hint = [...variableScopes(variable), ...path.keys].join(' ').toLowerCase();
  if (/opacity/.test(hint)) return 'opacity';
  if (/font.?weight/.test(hint)) return 'fontWeight';
  if (/duration|delay/.test(hint)) return 'duration';
  if (/radius|spacing|space|gap|padding|width|height|size|dimension|font.?size|line.?height|letter.?spacing/.test(hint)) {
    return 'dimension';
  }
  return 'number';
}

function formatFloat(value: number, type: string): JsonValue {
  if (type === 'dimension') return `${Number(value.toFixed(3))}px`;
  if (type === 'duration') return `${Number(value.toFixed(3))}ms`;
  return Number(value.toFixed(4));
}

function isVariableAlias(value: VariableValue): value is VariableAlias {
  return isObject(value) && value.type === 'VARIABLE_ALIAS' && typeof value.id === 'string';
}

function convertValue(
  value: VariableValue,
  variable: Variable,
  path: CanonicalPath,
  pathsByVariableId: Map<string, string>,
): JsonValue {
  if (isVariableAlias(value)) {
    const aliasPath = pathsByVariableId.get(value.id);
    if (!aliasPath) throw new Error(`Alias introuvable pour ${variable.name} (${value.id}).`);
    return `{${aliasPath}}`;
  }

  if (variable.resolvedType === 'COLOR' && isObject(value) && 'r' in value && 'g' in value && 'b' in value) {
    return formatColor(value as unknown as RGB | RGBA);
  }

  if (variable.resolvedType === 'FLOAT' && typeof value === 'number') {
    return formatFloat(value, inferTokenType(variable, path));
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  throw new Error(`Valeur non prise en charge pour ${variable.name}.`);
}

function modeName(collection: VariableCollection, modeId: string): string {
  return collection.modes.find((mode) => mode.modeId === modeId)?.name || modeId;
}

function tokenForVariable(
  variable: Variable,
  collection: VariableCollection,
  path: CanonicalPath,
  pathsByVariableId: Map<string, string>,
): TokenNode {
  const modeIds = collection.modes.map((mode) => mode.modeId);
  const defaultModeId = collection.defaultModeId || modeIds[0];
  const availableModeId = defaultModeId in variable.valuesByMode
    ? defaultModeId
    : modeIds.find((id) => id in variable.valuesByMode);

  if (!availableModeId) throw new Error(`Aucune valeur trouvée pour ${collection.name}/${variable.name}.`);

  const type = inferTokenType(variable, path);
  const token: TokenNode = {
    $value: convertValue(variable.valuesByMode[availableModeId], variable, path, pathsByVariableId),
    $type: type,
  };

  if (variable.description) token.$description = variable.description;

  const modes: JsonObject = {};
  for (const id of modeIds) {
    if (!(id in variable.valuesByMode)) continue;
    modes[modeName(collection, id)] = convertValue(variable.valuesByMode[id], variable, path, pathsByVariableId);
  }

  token.$extensions = {
    'com.figma': {
      id: variable.id,
      key: variable.key,
      collection: collection.name,
      defaultMode: modeName(collection, availableModeId),
      modes,
      scopes: variableScopes(variable),
      hiddenFromPublishing: variable.hiddenFromPublishing,
    },
  };

  return token;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(3)) : null;
}

function paintSignature(paints: readonly Paint[] | PluginAPI['mixed']): JsonValue {
  if (!Array.isArray(paints)) return null;
  return paints.map((paint) => {
    const result: JsonObject = { type: paint.type, visible: paint.visible !== false, opacity: paint.opacity ?? 1 };
    if ('color' in paint && paint.color) result.color = formatColor(paint.color);
    if ('gradientStops' in paint) {
      result.gradientStops = paint.gradientStops.map((stop: ColorStop) => ({
        position: Number(stop.position.toFixed(4)),
        color: formatColor(stop.color),
      }));
    }
    return result;
  });
}

function nodeSignature(node: SceneNode): JsonObject {
  const result: JsonObject = {
    type: node.type,
    name: node.name,
    visible: node.visible,
    opacity: 'opacity' in node ? numberOrNull(node.opacity) : null,
    width: 'width' in node ? numberOrNull(node.width) : null,
    height: 'height' in node ? numberOrNull(node.height) : null,
  };

  if ('layoutMode' in node) {
    result.layout = {
      mode: node.layoutMode,
      gap: numberOrNull(node.itemSpacing),
      paddingTop: numberOrNull(node.paddingTop),
      paddingRight: numberOrNull(node.paddingRight),
      paddingBottom: numberOrNull(node.paddingBottom),
      paddingLeft: numberOrNull(node.paddingLeft),
    };
  }
  if ('cornerRadius' in node) result.cornerRadius = node.cornerRadius === figma.mixed ? 'mixed' : numberOrNull(node.cornerRadius);
  if ('fills' in node) result.fills = paintSignature(node.fills);
  if ('strokes' in node) result.strokes = paintSignature(node.strokes);
  if ('characters' in node) {
    result.text = node.characters;
    result.fontSize = node.fontSize === figma.mixed ? 'mixed' : numberOrNull(node.fontSize);
    result.fontWeight = node.fontWeight === figma.mixed ? 'mixed' : node.fontWeight;
  }
  if ('variantProperties' in node && node.variantProperties) {
    result.variantProperties = Object.fromEntries(
      Object.entries(node.variantProperties).sort(([a], [b]) => a.localeCompare(b)),
    ) as JsonObject;
  }
  if ('children' in node) result.children = node.children.map((child) => nodeSignature(child));
  return result;
}

function stableStringify(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key] as JsonValue)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function shortHash(value: JsonValue): string {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function componentKey(name: string): string {
  const finalSegment = name.split('/').map((part) => part.trim()).filter(Boolean).pop() || name;
  return toCamelSegment(finalSegment);
}

function componentMetadata(node: ComponentNode | ComponentSetNode): JsonObject {
  const pageNode = (() => {
    let current: BaseNode | null = node;
    while (current && current.type !== 'PAGE') current = current.parent;
    return current?.type === 'PAGE' ? current : null;
  })();
  const signature = nodeSignature(node);

  return {
    name: node.name,
    nodeId: node.id,
    key: node.key,
    nodeType: node.type,
    page: pageNode?.name || '',
    variantCount: node.type === 'COMPONENT_SET'
      ? node.children.filter((child) => child.type === 'COMPONENT').length
      : 1,
    signature: shortHash(signature),
  };
}

function ensureComponentEntry(componentRoot: JsonObject, key: string): JsonObject {
  const existing = componentRoot[key];
  if (existing === undefined) componentRoot[key] = {};
  if (!isObject(componentRoot[key])) throw new Error(`Le chemin component.${key} doit être un groupe de tokens.`);
  return componentRoot[key] as JsonObject;
}

async function discoverComponents(componentRoot: JsonObject): Promise<number> {
  await figma.loadAllPagesAsync();
  const nodes = figma.root.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] });
  const localComponents = nodes.filter((node) => (
    node.type === 'COMPONENT_SET' || (node.type === 'COMPONENT' && node.parent?.type !== 'COMPONENT_SET')
  ));

  const grouped = new Map<string, Array<ComponentNode | ComponentSetNode>>();
  for (const node of localComponents) {
    const key = componentKey(node.name);
    const current = grouped.get(key) || [];
    current.push(node);
    grouped.set(key, current);
  }

  for (const [key, matches] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const entry = ensureComponentEntry(componentRoot, key);
    const preferred = [...matches].sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'COMPONENT_SET' ? -1 : 1;
    })[0];
    entry.$figma = componentMetadata(preferred);
    if (matches.length > 1) {
      (entry.$figma as JsonObject).duplicates = matches.slice(1).map(componentMetadata);
    }
  }

  return grouped.size;
}

async function buildTokens(): Promise<ExportResult> {
  const [variables, collections] = await Promise.all([
    figma.variables.getLocalVariablesAsync(),
    figma.variables.getLocalVariableCollectionsAsync(),
  ]);
  const localVariables = variables.filter((variable) => !variable.remote);
  const collectionsById = new Map(collections.map((collection) => [collection.id, collection]));
  const pathsByVariableId = new Map<string, string>();
  const planned = localVariables.map((variable) => {
    const collection = collectionsById.get(variable.variableCollectionId);
    if (!collection) throw new Error(`Collection introuvable pour ${variable.name}.`);
    const path = canonicalPath(variable, collection);
    if (!path.keys.length) throw new Error(`Nom de variable invalide dans ${collection.name}.`);
    const fullPath = `${path.group}.${path.keys.join('.')}`;
    if ([...pathsByVariableId.values()].includes(fullPath)) throw new Error(`Deux variables produisent le même token ${fullPath}.`);
    pathsByVariableId.set(variable.id, fullPath);
    return { variable, collection, path };
  });

  const output: JsonObject = {
    $metadata: {
      source: 'caba-figma-plugin',
      fileKey: figma.fileKey || '',
      fileName: figma.root.name,
      exportedAt: new Date().toISOString(),
      format: 'DTCG',
    },
    core: {},
    semantic: {},
    typography: {},
    component: {},
  };

  for (const { variable, collection, path } of planned.sort((a, b) => {
    const aPath = pathsByVariableId.get(a.variable.id) || '';
    const bPath = pathsByVariableId.get(b.variable.id) || '';
    return aPath.localeCompare(bPath);
  })) {
    setDeep(output[path.group] as JsonObject, path.keys, tokenForVariable(variable, collection, path, pathsByVariableId) as unknown as JsonValue);
  }

  const componentCount = await discoverComponents(output.component as JsonObject);
  (output.$metadata as JsonObject).counts = {
    variables: localVariables.length,
    collections: collections.length,
    components: componentCount,
  };

  return {
    content: `${JSON.stringify(output, null, 2)}\n`,
    variableCount: localVariables.length,
    collectionCount: collections.length,
    componentCount,
  };
}

function validateConfig(config: GitHubConfig): GitHubConfig {
  const clean = {
    owner: String(config.owner || '').trim(),
    repo: String(config.repo || '').trim(),
    branch: String(config.branch || '').trim(),
  };
  if (!/^[A-Za-z0-9_.-]+$/.test(clean.owner)) throw new Error('Propriétaire GitHub invalide.');
  if (!/^[A-Za-z0-9_.-]+$/.test(clean.repo)) throw new Error('Nom de dépôt GitHub invalide.');
  if (!clean.branch || /[\s~^:?*[\\]/.test(clean.branch)) throw new Error('Branche GitHub invalide.');
  return clean;
}

function validateCommitMessage(value?: string): string {
  const message = String(value || '').trim() || DEFAULT_COMMIT_MESSAGE;
  if (message.length > 240) throw new Error('Message de commit trop long.');
  return message;
}

async function loadSettings(): Promise<StoredSettings> {
  const stored = await figma.clientStorage.getAsync(SETTINGS_KEY) as StoredSettings | undefined;
  return { ...DEFAULT_CONFIG, ...(stored || {}) };
}

async function saveSettings(config: GitHubConfig, nextToken?: string): Promise<StoredSettings> {
  const previous = await loadSettings();
  const settings: StoredSettings = {
    ...validateConfig(config),
    token: nextToken?.trim() || previous.token,
  };
  await figma.clientStorage.setAsync(SETTINGS_KEY, settings);
  return settings;
}

function utf8Encode(value: string): Uint8Array {
  const bytes: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    let codePoint = value.charCodeAt(index);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff && index + 1 < value.length) {
      const next = value.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      }
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return new Uint8Array(bytes);
}

function utf8Decode(bytes: Uint8Array): string {
  let output = '';
  for (let index = 0; index < bytes.length;) {
    const first = bytes[index];
    let codePoint = 0;
    let extraBytes = 0;

    if (first < 0x80) {
      codePoint = first;
    } else if ((first & 0xe0) === 0xc0) {
      codePoint = first & 0x1f;
      extraBytes = 1;
    } else if ((first & 0xf0) === 0xe0) {
      codePoint = first & 0x0f;
      extraBytes = 2;
    } else if ((first & 0xf8) === 0xf0) {
      codePoint = first & 0x07;
      extraBytes = 3;
    } else {
      output += '\uFFFD';
      index += 1;
      continue;
    }

    if (index + extraBytes >= bytes.length) {
      output += '\uFFFD';
      break;
    }

    let valid = true;
    for (let offset = 1; offset <= extraBytes; offset += 1) {
      const next = bytes[index + offset];
      if ((next & 0xc0) !== 0x80) {
        valid = false;
        break;
      }
      codePoint = (codePoint << 6) | (next & 0x3f);
    }

    output += valid ? String.fromCodePoint(codePoint) : '\uFFFD';
    index += valid ? extraBytes + 1 : 1;
  }
  return output;
}

function encodeBase64(value: string): string {
  return figma.base64Encode(utf8Encode(value));
}

function decodeBase64(value: string): string {
  return utf8Decode(figma.base64Decode(value.replace(/\s/g, '')));
}

function comparableTokens(content: string): string {
  const parsed = JSON.parse(content) as JsonObject;
  if (isObject(parsed.$metadata)) delete parsed.$metadata.exportedAt;
  return stableStringify(parsed);
}

async function githubRequest(url: string, token: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  });
}

async function pushToGitHub(
  settings: StoredSettings,
  result: ExportResult,
  commitMessage: string,
): Promise<'pushed' | 'unchanged'> {
  if (!settings.token) throw new Error('Ajoute le token GitHub dans les réglages lors de la première utilisation.');

  const baseUrl = `https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/contents/${TOKENS_PATH}`;
  const currentResponse = await githubRequest(`${baseUrl}?ref=${encodeURIComponent(settings.branch)}`, settings.token);
  let currentSha: string | undefined;

  if (currentResponse.ok) {
    const current = await currentResponse.json() as { sha?: string; content?: string };
    currentSha = current.sha;
    if (current.content) {
      const previousContent = decodeBase64(current.content);
      if (comparableTokens(previousContent) === comparableTokens(result.content)) return 'unchanged';
    }
  } else if (currentResponse.status !== 404) {
    const details = await currentResponse.text();
    throw new Error(`Lecture GitHub impossible (${currentResponse.status}) : ${details.slice(0, 240)}`);
  }

  const body: Record<string, unknown> = {
    message: validateCommitMessage(commitMessage),
    content: encodeBase64(result.content),
    branch: settings.branch,
  };
  if (currentSha) body.sha = currentSha;

  const updateResponse = await githubRequest(baseUrl, settings.token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!updateResponse.ok) {
    const details = await updateResponse.text();
    throw new Error(`Push GitHub impossible (${updateResponse.status}) : ${details.slice(0, 240)}`);
  }
  return 'pushed';
}

function send(type: string, payload: Record<string, unknown> = {}): void {
  figma.ui.postMessage({ type, ...payload });
}

async function initialize(): Promise<void> {
  const settings = await loadSettings();
  send('init', {
    config: { owner: settings.owner, repo: settings.repo, branch: settings.branch },
    hasToken: !!settings.token,
    fileName: figma.root.name,
  });
}

figma.ui.onmessage = async (message: {
  type?: string;
  config?: GitHubConfig;
  commitMessage?: string;
  token?: string;
}) => {
  try {
    if (message.type === 'save-settings') {
      const settings = await saveSettings(message.config || DEFAULT_CONFIG, message.token);
      send('settings-saved', { hasToken: !!settings.token });
      return;
    }

    if (message.type === 'download') {
      send('working', { label: 'Lecture des variables et composants Figma…' });
      const result = await buildTokens();
      send('download-ready', result);
      return;
    }

    if (message.type === 'push') {
      send('working', { label: 'Génération de tokens.json…' });
      const settings = await saveSettings(message.config || DEFAULT_CONFIG, message.token);
      const result = await buildTokens();
      send('working', { label: 'Envoi de tokens.json vers GitHub…' });
      const status = await pushToGitHub(settings, result, message.commitMessage || DEFAULT_COMMIT_MESSAGE);
      send('push-complete', { ...result, status });
      return;
    }
  } catch (error) {
    send('error', { message: error instanceof Error ? error.message : String(error) });
  }
};

initialize().catch((error) => send('error', { message: String(error) }));

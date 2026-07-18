const COLLECTION_NAME_MAP = {
  primitive: 'core',
  primitives: 'core',
  core: 'core',
  semantic: 'semantic',
  component: 'component',
  components: 'component',
  typography: 'typography',
};

function normalizeCollectionName(name) {
  const normalized = String(name || '').trim().toLowerCase().replace(/\/.*$/, '');
  return COLLECTION_NAME_MAP[normalized] || normalized || 'tokens';
}

function splitTokenName(name) {
  return String(name || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
}

function setDeep(root, keys, value) {
  let current = root;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = value;
      return;
    }

    current[key] = current[key] || {};
    current = current[key];
  });
}

function roundChannel(channel) {
  return Math.max(0, Math.min(255, Math.round(Number(channel || 0) * 255)));
}

function toHexPart(value) {
  return value.toString(16).padStart(2, '0');
}

function formatColor(value) {
  const r = roundChannel(value.r);
  const g = roundChannel(value.g);
  const b = roundChannel(value.b);
  const alpha = value.a === undefined ? 1 : Number(value.a);

  if (alpha === 0) return 'rgba(0, 0, 0, 0)';
  if (alpha > 0 && alpha < 1) return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`;

  return `#${toHexPart(r)}${toHexPart(g)}${toHexPart(b)}`;
}

function isVariableAlias(value) {
  return value && typeof value === 'object' && value.type === 'VARIABLE_ALIAS' && value.id;
}

function inferTokenType(variable) {
  if (variable.resolvedType === 'COLOR') return 'color';
  if (variable.resolvedType === 'STRING') return 'string';
  if (variable.resolvedType === 'BOOLEAN') return 'boolean';

  const name = variable.name.toLowerCase();
  if (name.includes('radius')) return 'borderRadius';
  if (name.includes('opacity')) return 'opacity';
  if (name.includes('fontsize') || name.includes('font-size')) return 'fontSizes';
  if (name.includes('fontweight') || name.includes('font-weight')) return 'fontWeights';
  if (name.includes('lineheight') || name.includes('line-height')) return 'lineHeights';
  if (name.includes('letterspacing') || name.includes('letter-spacing')) return 'letterSpacing';
  if (name.includes('spacing') || name.includes('padding') || name.includes('gap')) return 'spacing';
  if (name.includes('width') || name.includes('height') || name.includes('size')) return 'sizing';
  return 'number';
}

function cssUnitFor(variable) {
  const name = variable.name.toLowerCase();
  const type = inferTokenType(variable);

  if (type === 'fontWeights' || type === 'opacity' || type === 'number') return '';
  if (name.includes('lineheight') || name.includes('line-height')) return '';
  return 'px';
}

function formatNumber(value, variable) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  const unit = cssUnitFor(variable);
  return unit ? `${number}${unit}` : number;
}

function pathForVariable(variable, collectionsById) {
  const collection = collectionsById[variable.variableCollectionId];
  const group = normalizeCollectionName(collection && collection.name);
  return {
    group,
    keys: splitTokenName(variable.name),
  };
}

function aliasReference(value, variablesById, collectionsById) {
  const target = variablesById[value.id];
  if (!target) return `{${value.id}}`;

  const path = pathForVariable(target, collectionsById);
  return `{${path.keys.join('.')}}`;
}

function convertValue(value, variable, variablesById, collectionsById) {
  if (isVariableAlias(value)) return aliasReference(value, variablesById, collectionsById);
  if (variable.resolvedType === 'COLOR' && value && typeof value === 'object') return formatColor(value);
  if (variable.resolvedType === 'FLOAT') return formatNumber(value, variable);
  return value;
}

async function getLocalCollections() {
  if (figma.variables.getLocalVariableCollectionsAsync) {
    return figma.variables.getLocalVariableCollectionsAsync();
  }

  return figma.variables.getLocalVariableCollections();
}

async function getLocalVariables() {
  if (figma.variables.getLocalVariablesAsync) {
    return figma.variables.getLocalVariablesAsync();
  }

  return figma.variables.getLocalVariables();
}

async function exportVariables() {
  const collections = await getLocalCollections();
  const variables = await getLocalVariables();
  const collectionsById = Object.fromEntries(collections.map((collection) => [collection.id, collection]));
  const variablesById = Object.fromEntries(variables.map((variable) => [variable.id, variable]));
  const output = {
    $metadata: {
      source: 'figma-plugin-variables-api',
      fileName: figma.root.name,
      exportedAt: new Date().toISOString(),
    },
  };

  const localVariables = variables
    .filter((variable) => variable && !variable.remote)
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const variable of localVariables) {
    const collection = collectionsById[variable.variableCollectionId];
    if (!collection) continue;

    const path = pathForVariable(variable, collectionsById);
    if (!path.keys.length) continue;

    const defaultModeId = collection.defaultModeId || (collection.modes[0] && collection.modes[0].modeId);
    const modeValues = {};

    for (const mode of collection.modes || []) {
      const rawModeValue = variable.valuesByMode && variable.valuesByMode[mode.modeId];
      if (rawModeValue !== undefined) {
        modeValues[mode.name] = convertValue(rawModeValue, variable, variablesById, collectionsById);
      }
    }

    const rawDefaultValue =
      (variable.valuesByMode && variable.valuesByMode[defaultModeId]) ||
      Object.values(variable.valuesByMode || {})[0];
    const token = {
      value: convertValue(rawDefaultValue, variable, variablesById, collectionsById),
      type: inferTokenType(variable),
    };

    if (variable.description) token.description = variable.description;
    if (Object.keys(modeValues).length > 1) {
      token.$extensions = {
        figma: {
          id: variable.id,
          key: variable.key,
          collection: collection.name,
          modes: modeValues,
        },
      };
    }

    output[path.group] = output[path.group] || {};
    setDeep(output[path.group], path.keys, token);
  }

  return {
    tokens: output,
    variableCount: localVariables.length,
    collectionCount: collections.length,
  };
}

figma.showUI(__html__, { width: 520, height: 520, themeColors: true });

figma.ui.onmessage = async (message) => {
  if (!message || message.type !== 'export') return;

  try {
    const result = await exportVariables();
    figma.ui.postMessage({ type: 'export-result', ...result });
  } catch (error) {
    figma.ui.postMessage({
      type: 'export-error',
      message: error && error.message ? error.message : String(error),
    });
  }
};

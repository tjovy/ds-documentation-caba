import fs from 'fs';

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function loadFigmaCache(cachePath) {
  if (!cachePath || !fs.existsSync(cachePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

export function findFigmaSpec(cache, component) {
  const specs = cache?.figma_design_specs;
  if (!specs || typeof specs !== 'object') {
    return null;
  }

  const candidates = [
    component?.title,
    component?.name,
    String(component?.title || '').split('/').pop(),
    String(component?.name || '').split('/').pop(),
  ]
    .filter(Boolean)
    .map((value) => String(value));

  for (const candidate of candidates) {
    if (specs[candidate]) {
      return { key: candidate, spec: specs[candidate] };
    }
  }

  const normalizedCandidates = new Set(candidates.map(normalizeName));
  for (const [key, spec] of Object.entries(specs)) {
    if (normalizedCandidates.has(normalizeName(key)) || normalizedCandidates.has(normalizeName(key.split('/').pop()))) {
      return { key, spec };
    }
  }

  return null;
}

export function findRelatedFigmaSpecs(cache, matchedKey) {
  const specs = cache?.figma_design_specs;
  if (!specs || typeof specs !== 'object' || !matchedKey) {
    return [];
  }

  return Object.entries(specs)
    .filter(([key]) => key !== matchedKey && (key.startsWith(`${matchedKey}/`) || key.startsWith(`${matchedKey} `)))
    .map(([key, spec]) => ({ key, spec }));
}

function extractTextNodes(spec, trail = [], acc = []) {
  if (!spec || typeof spec !== 'object') {
    return acc;
  }

  const nextTrail = spec.name ? [...trail, spec.name] : trail;
  if (spec.type === 'TEXT') {
    acc.push({
      path: nextTrail.join(' > '),
      name: spec.name || null,
      fills: spec.fills || [],
      textStyle: spec.textStyle || null,
      width: spec.width || null,
      height: spec.height || null,
    });
  }

  for (const child of spec.children || []) {
    extractTextNodes(child, nextTrail, acc);
  }

  return acc;
}

function parseButtonVariantName(name) {
  const match = String(name || '').match(/Size=(.*?),\s*State=(.*?),\s*(?:Type|Style)=(.*)$/i);
  if (!match) return null;

  return {
    size: match[1].trim().toLowerCase(),
    state: match[2].trim().toLowerCase(),
    variant: match[3].trim().toLowerCase(),
  };
}

function extractButtonBlueprint(spec) {
  if (!spec || typeof spec !== 'object') {
    return null;
  }

  const variants = {};
  const sizes = {};
  const availableStates = new Set();
  const availableVariants = new Set();
  const availableSizes = new Set();

  for (const child of spec.children || []) {
    const meta = parseButtonVariantName(child?.name);
    if (!meta) continue;

    const labelNode = (child.children || []).find((item) => item?.type === 'TEXT') || null;
    const leftIcon = (child.children || []).find((item) => /left icon/i.test(item?.name || '')) || null;
    const rightIcon = (child.children || []).find((item) => /right icon/i.test(item?.name || '')) || null;
    const entry = {
      width: child.width || null,
      height: child.height || null,
      radius: child.cornerRadius || null,
      background: child.fills?.[0]?.color || null,
      border: child.strokes?.[0]?.color || null,
      borderWidth: child.strokes?.[0]?.weight || null,
      opacity: child.opacity ?? null,
      padding: child.autoLayout
        ? {
            top: child.autoLayout.paddingTop || null,
            right: child.autoLayout.paddingRight || null,
            bottom: child.autoLayout.paddingBottom || null,
            left: child.autoLayout.paddingLeft || null,
            gap: child.autoLayout.gap || null,
            alignItems: child.autoLayout.alignItems || null,
            justifyContent: child.autoLayout.justifyContent || null,
          }
        : null,
      label: labelNode
        ? {
            textColor: labelNode.fills?.[0]?.color || null,
            fontFamily: labelNode.textStyle?.fontFamily || null,
            fontSize: labelNode.textStyle?.fontSize || null,
            fontWeight: labelNode.textStyle?.fontWeight || null,
            lineHeight: labelNode.textStyle?.lineHeight || null,
          }
        : null,
      icons: {
        left: leftIcon
          ? {
              width: leftIcon.width || null,
              height: leftIcon.height || null,
            }
          : null,
        right: rightIcon
          ? {
              width: rightIcon.width || null,
              height: rightIcon.height || null,
            }
          : null,
      },
    };

    if (!variants[meta.variant]) {
      variants[meta.variant] = {};
    }
    variants[meta.variant][meta.state] = entry;

    if (!sizes[meta.size]) {
      sizes[meta.size] = {
        minWidth: entry.width,
        minHeight: entry.height,
        radius: entry.radius,
        padding: entry.padding,
        label: entry.label,
        icons: entry.icons,
      };
    }

    availableVariants.add(meta.variant);
    availableStates.add(meta.state);
    availableSizes.add(meta.size);
  }

  return {
    shell: {
      width: spec.width || null,
      height: spec.height || null,
      clipsContent: spec.clipsContent ?? false,
    },
    variants,
    sizes,
    availableVariants: [...availableVariants].sort(),
    availableSizes: [...availableSizes].sort(),
    availableStates: [...availableStates].sort(),
    focusNote: 'Aucune variante Focus explicite dans Figma. Utiliser le focus ring issu des tokens pour completer la matrice demandee.',
  };
}

function extractCardBlueprint(spec, relatedSpecs = []) {
  if (!spec || typeof spec !== 'object') {
    return null;
  }

  const textSpec = relatedSpecs.find(({ key }) => key === 'Card/Text')?.spec || null;
  const textNodes = extractTextNodes(textSpec || spec);
  const byName = (matcher) => textNodes.find((node) => matcher(node.name || '', node.path || '')) || null;
  const categoryText = byName((name, path) => name === 'Button' && path.includes('ButtonCategory'));
  const likesText = byName((name, path) => name === 'Button' && path.includes('ButtonLike'));
  const titleText = byName((name) => name === 'Titre');
  const subtitleText = byName((name) => name === 'Sous-titre');
  const bodyText = byName((name) => name.includes('Nullam quis risus'));
  const bottomMetaText = textNodes.filter((node) => node.name === 'Button' && node.path.includes('.button-bottom'));
  const variants = (spec.children || []).map((child) => {
    const mediaNode = (child.children || []).find((item) => item?.name === 'Visuels');
    const contentNode = (child.children || []).find((item) => item?.name === 'Card/Text');
    const frameNode = (contentNode?.children || []).find((item) => item?.name === 'Frame');
    const topRow = (frameNode?.children || []).find((item) => item?.name === '.button-top');
    const bottomRow = (frameNode?.children || []).find((item) => item?.name === '.button-bottom');
    const mediaPosition = /Visuel=Bottom/i.test(child.name || '') ? 'bottom' : 'top';

    return {
      name: child.name || null,
      variant: mediaPosition,
      width: child.width || null,
      height: child.height || null,
      cornerRadius: child.cornerRadius || null,
      background: child.fills?.[0]?.color || null,
      shadow: child.effects?.[0]?.css || null,
      media: mediaNode
        ? {
            width: mediaNode.width || null,
            height: mediaNode.height || null,
            cornerRadii: mediaNode.cornerRadii || null,
          }
        : null,
      content: frameNode
        ? {
            gap: frameNode.autoLayout?.gap || null,
            paddingTop: frameNode.autoLayout?.paddingTop || null,
            paddingRight: frameNode.autoLayout?.paddingRight || null,
            paddingBottom: frameNode.autoLayout?.paddingBottom || null,
            paddingLeft: frameNode.autoLayout?.paddingLeft || null,
          }
        : null,
      rows: {
        top: topRow?.autoLayout
          ? {
              gap: topRow.autoLayout.gap || null,
              alignItems: topRow.autoLayout.alignItems || null,
              justifyContent: topRow.autoLayout.justifyContent || null,
            }
          : null,
        bottom: bottomRow?.autoLayout
          ? {
              gap: bottomRow.autoLayout.gap || null,
              alignItems: bottomRow.autoLayout.alignItems || null,
              justifyContent: bottomRow.autoLayout.justifyContent || null,
            }
          : null,
      },
    };
  });

  const playButton = variants
    .map((item) => item && spec.children.find((child) => child.name === item.name))
    .filter(Boolean)
    .map((child) => (child.children || []).find((item) => item?.name === 'Visuels'))
    .filter(Boolean)
    .map((mediaNode) => (mediaNode.children || []).find((item) => item?.name === 'Button-play'))
    .filter(Boolean)[0];
  const playVector = playButton?.children?.[0]?.children?.[0] || null;

  return {
    shell: {
      width: variants[0]?.width || spec.width || null,
      height: variants[0]?.height || spec.height || null,
      radius: variants[0]?.cornerRadius || spec.cornerRadius || null,
      background: variants[0]?.background || null,
      shadow: variants[0]?.shadow || null,
    },
    variants,
    playButton: playButton
      ? {
          size: playButton.width || null,
          background: playButton.fills?.[0]?.color || null,
          backgroundOpacity: playButton.fills?.[0]?.opacity ?? null,
          radius: playButton.cornerRadius || null,
          iconSize: playButton.children?.[0]?.width || null,
          iconStroke: playVector?.strokes?.[0]?.color || null,
        }
      : null,
    textHierarchy: {
      category: categoryText,
      likes: likesText,
      title: titleText,
      subtitle: subtitleText,
      body: bodyText,
      bottomMeta: bottomMetaText,
    },
  };
}

export function extractDesignBlueprint(matchedKey, spec, relatedSpecs = []) {
  if (!matchedKey || !spec) {
    return null;
  }

  if (matchedKey === 'Button') {
    return extractButtonBlueprint(spec);
  }

  if (matchedKey === 'Card') {
    return extractCardBlueprint(spec, relatedSpecs);
  }

  return null;
}

export function summarizeDesignSpec(spec, depth = 0, maxDepth = 4) {
  if (!spec || typeof spec !== 'object') {
    return null;
  }

  const summary = {
    name: spec.name || null,
    type: spec.type || null,
    width: spec.width || null,
    height: spec.height || null,
    cornerRadius: spec.cornerRadius || null,
    cornerRadii: spec.cornerRadii || null,
    fills: spec.fills || [],
    strokes: spec.strokes || [],
    effects: spec.effects || [],
    autoLayout: spec.autoLayout || null,
    textStyle: spec.textStyle || null,
    opacity: spec.opacity ?? null,
    clipsContent: spec.clipsContent ?? false,
  };

  const children = Array.isArray(spec.children) ? spec.children : [];
  if (!children.length) {
    return summary;
  }

  summary.childCount = children.length;

  if (depth >= maxDepth) {
    summary.children = children.slice(0, 16).map((child) => ({
      name: child?.name || null,
      type: child?.type || null,
    }));
    return summary;
  }

  summary.children = children.slice(0, 24).map((child) => summarizeDesignSpec(child, depth + 1, maxDepth));
  return summary;
}

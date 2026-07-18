# Caba Storybook Feed

Ce dossier prépare le nouveau fichier Figma `Test caba` pour ton workflow Storybook/n8n.

Source Figma :

- File key : `rcJLbt1R5iE7MNW9JhcHzH`
- Page composants : `Components`
- Component sets : decouverts automatiquement depuis Figma quand ils correspondent a `tokens.json > component.*`

## Fichiers à pousser dans le nouveau repo

- `tokens.json` : source structurée issue de Figma
- `tokens-docs.json` : seed minimal, à enrichir par n8n uniquement
- `build/css/variables.css` : sortie CSS à utiliser par Storybook

## Export simple depuis Tokens Studio

Tu ne dois pas verifier les sets a chaque changement de couleur.

Configuration une seule fois dans Tokens Studio:

- GitHub provider vers `tjovy/ds-documentation-caba`
- branche `main`
- chemin `tokens.json`
- export en un seul fichier JSON

Ensuite, le geste normal est simplement:

1. modifier les variables/tokens dans Figma ou Tokens Studio
2. cliquer `Push to GitHub`
3. laisser GitHub generer `build/css/variables.css`

Le repo normalise automatiquement les exports Tokens Studio verbeux comme `Primitive/Value`, `Semantic/Dark`, `Typography/Value`, `Space/Value`, `Radius/Value` et `component/component` vers la forme stable utilisee par Storybook: `core`, `semantic`, `typography`, `component`.

Si Tokens Studio pousse uniquement les fondations sans groupe `component`, le repo conserve les composants existants depuis `tokens.component-fallback.json`. Ce fichier est un filet de securite pour Button/Card; il ne sert pas a modifier les couleurs au quotidien.

Pour inspecter ce que le pipeline comprend, tu peux lancer:

```bash
npm run normalize-tokens
```

Cela genere `build/tokens.normalized.json` uniquement pour controle local.

## Raccordement workflow

Le workflow n8n `ds-documentation-caba` applique ce principe :

1. GitHub lit `tokens.json` sur `main`
2. GitHub lit `tokens-docs.json`
3. n8n détecte les composants incomplets sous `component`
4. MCP/Figma fournit le contexte du composant
5. OpenAI génère uniquement le Markdown et le JSX de `tokens-docs.json`
6. n8n pousse seulement `tokens-docs.json` dans une branche review

Button et Card ont des contrats MCP specifiques :

- Button : `primary`, `secondary`, `ghost` ; tailles `sm`, `md`, `lg` ; états `default`, `hover`, `disabled`
- Card : tons `default`, `highlight` ; média `off`, `on` ; états `default`, `hover`

Les nouveaux composants peuvent etre auto-detectes si deux conditions sont reunies :

- Figma contient un component set ou composant local nomme comme le composant
- `tokens.json` contient une entree `component.<nom>`

Les composants modifies sont aussi detectes: le workflow compare les tokens et le blueprint Figma stable, puis regenere uniquement les entrees obsoletes dans `tokens-docs.json`.

Important : retire toute consigne workflow qui force `danger` pour Button ou des dimensions `400x540` pour Card, car elles ne viennent pas de ce fichier Figma.

## Vérification locale

Le forfait Figma Pro ne donne pas acces au scope REST `file_variables:read`. Pour generer `tokens.json`, utilise l'export JSON de Tokens Studio. Le repo normalise automatiquement l'export avant generation CSS et validation.

```bash
npm run normalize-tokens
npm run refresh-figma-cache
npm run workflow:preflight
npm run build-storybook
```

Le MCP et n8n sont installables comme services macOS persistants avec `npm run mcp:install-service` et `npm run n8n:install-service`.

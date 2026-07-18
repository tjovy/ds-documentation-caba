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

## Export direct depuis Figma

Le plugin local `figma-token-exporter` lit les variables natives et tous les composants du fichier. Après sa configuration initiale, un clic met à jour uniquement `tokens.json` sur GitHub. Il ne génère aucun fichier JSON intermédiaire.

```bash
npm run figma-plugin:install
npm run figma-plugin:build
```

Importer ensuite `figma-token-exporter/manifest.json` depuis `Plugins > Development > Import plugin from manifest` dans Figma Desktop. Les instructions détaillées sont dans `figma-token-exporter/README.md`.

## Export attendu

Le fichier attendu par GitHub et n8n est un seul `tokens.json` au format stable:

- `core`
- `semantic`
- `typography`
- `component`

Le plugin Figma produit directement cette forme. Aucune coche Tokens Studio ni fichier `normalized` ou `fallback` n'est necessaire dans le workflow courant.

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

Le forfait Figma Pro ne donne pas acces au scope REST `file_variables:read`. Le plugin local contourne cette limite proprement en lisant les variables natives depuis le fichier ouvert, sans utiliser l'API REST payante.

```bash
npm run refresh-figma-cache
npm run workflow:preflight
npm run build-storybook
```

Le MCP et n8n sont installables comme services macOS persistants avec `npm run mcp:install-service` et `npm run n8n:install-service`.

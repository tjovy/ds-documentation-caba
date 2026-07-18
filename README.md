# Caba Storybook Feed

Ce dossier prépare le nouveau fichier Figma `Test caba` pour ton workflow Storybook/n8n.

Source Figma :

- File key : `rcJLbt1R5iE7MNW9JhcHzH`
- Page composants : `Components`
- Component sets : `Button` (`5:116`) et `Card` (`8:45`)

## Fichiers à pousser dans le nouveau repo

- `tokens.json` : source structurée issue de Figma
- `tokens-docs.json` : seed minimal, à enrichir par n8n uniquement
- `build/css/variables.css` : sortie CSS à utiliser par Storybook

## Raccordement workflow

Le workflow n8n `ds-documentation-caba` applique ce principe :

1. GitHub lit `tokens.json` sur `main`
2. GitHub lit `tokens-docs.json`
3. n8n détecte les composants incomplets sous `component`
4. MCP/Figma fournit le contexte Button/Card
5. OpenAI génère uniquement le Markdown et le JSX de `tokens-docs.json`
6. n8n pousse seulement `tokens-docs.json` dans une branche review

Pour Caba, les variantes autorisées sont :

- Button : `primary`, `secondary`, `ghost` ; tailles `sm`, `md`, `lg` ; états `default`, `hover`, `disabled`
- Card : tons `default`, `highlight` ; média `off`, `on` ; états `default`, `hover`

Important : retire toute consigne workflow qui force `danger` pour Button ou des dimensions `400x540` pour Card, car elles ne viennent pas de ce fichier Figma.

## Vérification locale

```bash
npm run workflow:preflight
npm run build-storybook
```

Le MCP et n8n sont installables comme services macOS persistants avec `npm run mcp:install-service` et `npm run n8n:install-service`.

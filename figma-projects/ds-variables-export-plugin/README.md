# DS Variables Export

Plugin Figma local pour exporter les variables natives vers le `tokens.json` attendu par Storybook Caba.

Ce plugin utilise l'API plugin de Figma dans le fichier ouvert. Il ne depend pas de l'API REST Figma et ne demande donc pas le scope `file_variables:read`.

## Installation

1. Ouvrir Figma Desktop.
2. Aller dans `Plugins > Development > Import plugin from manifest...`.
3. Selectionner `figma-projects/ds-variables-export-plugin/manifest.json`.
4. Lancer `Plugins > Development > DS Variables Export`.

## Usage

1. Cliquer `Exporter`.
2. Cliquer `Telecharger tokens.json` ou `Copier JSON`.
3. Remplacer le fichier `tokens.json` du repo.
4. Lancer:

```bash
npm run build-css
npm run validate-css-contract
npm run refresh-figma-cache
```

# Plugin Figma Caba

Ce plugin lit les variables natives et les composants locaux du fichier Figma, puis génère un unique `tokens.json` compatible avec le Storybook, le YAML GitHub et le workflow n8n Caba.

## Installation locale

```bash
cd figma-token-exporter
npm install
npm run build
```

Dans Figma Desktop :

1. Ouvrir `Plugins > Development > Import plugin from manifest`.
2. Sélectionner `figma-token-exporter/manifest.json`.
3. Lancer `Caba - Export tokens.json`.

## Première utilisation

Dans `Réglages GitHub`, conserver :

- propriétaire : `tjovy`
- dépôt : `ds-documentation-caba`
- branche : `main`

Ajouter une fois un token GitHub fine-grained limité à ce dépôt avec la permission `Contents: Read and write`. Le token reste dans le stockage local du plugin Figma. Il n'est jamais écrit dans le fichier Figma ni dans `tokens.json`.

Ensuite, un clic sur `Générer et pousser vers GitHub` :

1. lit toutes les variables locales ;
2. indexe tous les Component Sets et composants autonomes ;
3. met à jour uniquement `tokens.json` sur GitHub ;
4. laisse le workflow GitHub générer `variables.css`.

Le bouton `Télécharger tokens.json` sert de solution de secours sans GitHub.

## Collections reconnues

- `Primitive`, `Space`, `Radius` vers `core`
- `Semantic` vers `semantic`
- `Typography` vers `typography` et `core.font`
- `Component` vers `component`
- toute autre collection vers `core.<nomCollection>` afin de ne perdre aucune variable

Les alias Figma restent des références DTCG, par exemple `{core.color.orange.400}`. Le mode par défaut de chaque collection alimente `$value`; tous les modes restent décrits dans `$extensions.com.figma.modes`.

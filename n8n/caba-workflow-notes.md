# Adaptation n8n pour Caba

## Remplacements nécessaires

Dans les nodes GitHub du workflow, pointer vers le nouveau repo Storybook/tokens :

- `owner`: à remplacer par le propriétaire GitHub du nouveau repo
- `repository`: à remplacer par le nom du nouveau repo
- `filePath`: conserver `tokens.json` et `tokens-docs.json`

## Prompt Claude

Remplacer les contraintes spéciales existantes par :

```text
Consignes speciales `button`:
- vrai element <button>
- montrer uniquement les variantes Figma: primary, secondary, ghost
- montrer sm, md, lg
- montrer default, hover, disabled
- ne pas inventer danger, active ou pressed
- utiliser uniquement les CSS vars presentes dans allowedCssVars

Consignes speciales `card`:
- montrer uniquement les variantes Figma: Tone default/highlight, Media off/on, State default/hover
- respecter 320px de largeur
- media on: hauteur de carte 304px, media 120px
- media off: hauteur de carte 168px
- ne pas inventer layout 400x540 ni top/bottom
```

## Drift detection

Le workflow peut continuer à calculer les hashes sur :

- `component.button`
- `component.card`
- les tokens référencés sous `core`, `semantic`, `typography`

Le champ `$metadata.figmaFileKey` permet de relier les artefacts au fichier Figma source.

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

## Génération documentation + code

Le workflow Caba utilise maintenant un node `Code` nommé `OpenAI GPT-5.6 Sol — Generate Markdown`.

Raison du choix :

- le contexte MCP est récupéré avant la génération, de façon explicite et traçable ;
- le modèle ne décide pas quels outils appeler, il applique un contrat MCP déjà préparé ;
- l'appel direct à l'OpenAI Responses API permet de fixer `gpt-5.6-sol`, `reasoning.effort`, `max_output_tokens` et le prompt exact ;
- `Finalize + Validate` reste le garde-fou : seul le markdown/code validé par MCP peut être poussé dans `tokens-docs.json`.

Variables d'environnement n8n nécessaires :

- `OPENAI_API_KEY` : obligatoire pour appeler l'API OpenAI ;
- `OPENAI_MODEL` : optionnel, défaut `gpt-5.6-sol` ;
- `OPENAI_REASONING_EFFORT` : optionnel, défaut `high` ;
- `OPENAI_REASONING_MODE` : optionnel, défaut `standard` ;
- `OPENAI_MAX_OUTPUT_TOKENS` : optionnel, défaut `12000`.

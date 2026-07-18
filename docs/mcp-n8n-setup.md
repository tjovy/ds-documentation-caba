# Workflow Single Source Of Truth

Le workflow canonique du Design System est le suivant:

1. La source visuelle et structurelle est **Figma**
2. Depuis Figma, on pousse **`tokens.json`** sur GitHub
3. GitHub genere **`build/css/variables.css`** depuis **`tokens.json`**
4. Le workflow n8n lit les dernieres versions de **`tokens.json`** et **`tokens-docs.json`**
5. n8n compare les composants documentes avec les tokens courants
6. Si un composant a derive, n8n appelle **OpenAI**, puis valide localement avec le MCP
7. n8n met a jour **uniquement `tokens-docs.json`**
8. n8n cree une branche GitHub et y pousse **`tokens-docs.json`**
9. Storybook charge:
   - **`tokens-docs.json`** depuis la branche review
   - **`variables.css`** depuis la build GitHub issue de `main`
10. L'edition dans Storybook modifie **uniquement `tokens-docs.json`**
11. La PR est creee ensuite par le dev ou le design ops

## Regles a respecter

- `tokens.json` reste la source brute exportee depuis Figma
- `tokens.json` reste la source canonique exploitee par n8n et le MCP local
- `build/css/variables.css` reste la source CSS generee par GitHub
- `tokens-docs.json` reste la source des specs, descriptions, do/don't et code JSX
- Storybook ne doit pas inventer de preview alternative si le JSX est invalide
- Storybook ne doit pas inventer de couleur, structure ou composant de secours
- le workflow n8n ne doit modifier que `tokens-docs.json`
- la fidelite visuelle doit venir de `Figma + tokens + variables.css`

## Storybook

Pour review une branche IA:

- recuperer `tokens-docs.json` depuis la branche de review
- recuperer `tokens.json` depuis `main`
- recuperer `build/css/variables.css` depuis `main`

Le script `scripts/sync-tokens-preview.js` suit maintenant exactement cette logique.

## Export Figma sans Tokens Studio

On peut exporter les variables natives Figma directement en JSON, sans passer par Tokens Studio.

### Option A: plugin Figma local, sans token REST

C'est l'option recommandee si le scope Figma REST `file_variables:read` n'est pas disponible dans ton compte.

1. Ouvrir Figma Desktop.
2. Aller dans `Plugins > Development > Import plugin from manifest...`.
3. Selectionner `figma-projects/ds-variables-export-plugin/manifest.json`.
4. Lancer `DS Variables Export` dans le fichier du design system.
5. Cliquer `Exporter`.
6. Cliquer `Telecharger tokens.json` ou `Copier JSON`.

Le plugin exporte les collections canoniques:

- `primitive`, convertie en `core`
- `semantic`
- `component`
- `typography`

Il ignore les collections dupliquees comme `primitive/core`, `semantic/Light`, `semantic/Dark` ou `component/component`.

### Option B: API REST Figma, avec token

Cette option necessite un compte Figma compatible avec la Variables REST API et le scope `file_variables:read`.

Prerequis:

- un token Figma avec le scope `file_variables:read`
- l'acces au fichier Figma source
- le fichier `.env.local` avec:

```bash
FIGMA_TOKEN=figd_xxx
FIGMA_FILE_KEY=rcJLbt1R5iE7MNW9JhcHzH
```

Etape 1, exporter sans ecraser le fichier courant:

```bash
npm run export-figma-tokens
```

Cette commande cree `tokens.figma-export.json`.

Etape 2, quand le resultat est valide, ecrire dans `tokens.json`:

```bash
npm run export-figma-tokens:tokens
```

Le script lit les collections Figma et les convertit vers la structure attendue par Storybook:

- `primitive` devient `core`
- `semantic` reste `semantic`
- `component` reste `component`
- `typography` reste `typography`

Les alias Figma sont conserves sous forme de references entre accolades, par exemple `{color.primary.600}`.

## Ajout automatique de composants

Le workflow peut documenter un nouveau composant sans fichier de registre manuel si le composant existe a la fois dans Figma et dans `tokens.json`.

Convention minimale:

- creer un component set ou composant local Figma nomme `Menu`
- creer les variables Figma sous `component/menu/...`
- exporter les variables avec `npm run export-figma-tokens:tokens`
- rafraichir le cache design avec `npm run refresh-figma-cache`
- pousser `tokens.json` et le cache Figma si tu veux figer ce contexte dans le repo

Le cache Caba utilise par defaut le fichier `rcJLbt1R5iE7MNW9JhcHzH`. Pour le remplacer explicitement, utilise `CABA_FIGMA_FILE_KEY`; cela evite qu'une variable globale `FIGMA_FILE_KEY` d'un autre projet change ce cache par accident.

Le MCP construit alors automatiquement un contrat generique pour `component.menu`.

Button et Card gardent leurs contrats specialises. Les nouveaux composants utilisent un contrat auto-detecte: le HTML racine est infere par nom quand c'est evident (`menu` -> `<nav>`, `badge` -> `<span>`, `card` -> `<article>`), les axes viennent du nommage des variantes Figma (`State=Default`, `Type=Primary`, etc.), et les CSS vars autorisees viennent de `component.<nom>`.

Si le cache Figma ne contient pas le composant correspondant, le workflow bloque avant OpenAI. C'est volontaire: cela evite de generer une documentation hallucinee.

## n8n

Les fichiers canoniques du workflow sont:

- `n8n/code/filter-incomplete-components.js`
- `n8n/code/get-component-generation-context.js`
- `n8n/code/finalize-component-docs.js`
- `n8n/prompts/component-doc-generator.md`
- `n8n/code/openai-generate-markdown.template.js`
- `n8n/workflows/ds-documentation-caba.json`

Le workflow live n8n doit rester aligne sur ces fichiers.

## MCP local

Lancer le serveur local:

```bash
npm run mcp:install-service
```

Endpoint:

`http://127.0.0.1:3101/mcp`

Tools utilises:

- `get_component_generation_context`
- `validate_component_markdown`

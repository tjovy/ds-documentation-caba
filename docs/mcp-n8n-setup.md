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

## Export Figma avec Tokens Studio

Tokens Studio est l'option canonique pour generer `tokens.json` avec ton forfait Figma actuel. On n'utilise pas le scope REST `file_variables:read`.

Le workflow ne doit pas t'obliger a verifier les sets a chaque changement. La configuration des sets est une operation initiale; ensuite tu modifies tes tokens et tu pousses vers GitHub.

Dans Tokens Studio, configure une seule fois le provider GitHub:

- owner: `tjovy`
- repo: `ds-documentation-caba`
- branch: `main`
- file path: `tokens.json`
- format: un seul fichier JSON

Ensuite, au quotidien:

1. Ouvrir le fichier du design system.
2. Ouvrir Tokens Studio.
3. Modifier les tokens.
4. Cliquer `Push to GitHub`.
5. Laisser GitHub generer le CSS.

Le repo accepte deux formes:

- forme canonique: `core`, `semantic`, `typography`, `component`
- forme Tokens Studio: `Primitive/Value`, `Semantic/Dark`, `Typography/Value`, `Space/Value`, `Radius/Value`, `component/component`

Avant de generer le CSS, le pipeline normalise automatiquement ces sets vers la forme canonique. Cela evite d'avoir a nettoyer l'export a la main.

Pour controler localement ce que le pipeline comprend:

```bash
npm run normalize-tokens
npm run build-css
npm run validate-css-contract
npm run refresh-figma-cache
```

Le workflow exploite ces groupes apres normalisation:

- `core`
- `semantic`
- `component`
- `typography`

Le groupe `component` est celui qui declenche la documentation automatique. Par exemple `component.button`, `component.card`, `component.accordion`, etc.

### Option REST Figma

Cette option est conservee uniquement si un futur compte Figma donne acces a la Variables REST API et au scope `file_variables:read`.

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

- creer un component set ou composant local Figma nomme comme le composant, par exemple `Accordion`, `Badge`, `Input`, etc.
- creer les variables Figma sous `component/<nom>/...`, par exemple `component/accordion/...`
- exporter les variables avec Tokens Studio au format JSON
- rafraichir le cache design avec `npm run refresh-figma-cache`
- pousser `tokens.json` et le cache Figma si tu veux figer ce contexte dans le repo

Le cache Caba utilise par defaut le fichier `rcJLbt1R5iE7MNW9JhcHzH`. Pour le remplacer explicitement, utilise `CABA_FIGMA_FILE_KEY`; cela evite qu'une variable globale `FIGMA_FILE_KEY` d'un autre projet change ce cache par accident.

Le MCP construit alors automatiquement un contrat generique pour tout composant `component.<nom>` present dans `tokens.json`.

Button et Card gardent leurs contrats specialises. Les autres composants utilisent un contrat auto-detecte: le HTML racine est infere par nom quand c'est evident (`badge` -> `<span>`, `accordion` -> `<section>`, `input` -> `<input>`), les axes viennent du nommage des variantes Figma (`State=Default`, `Type=Primary`, etc.), et les CSS vars autorisees viennent de `component.<nom>`.

Le workflow detecte aussi les modifications: le hash de derive inclut les tokens du composant, les tokens references et le blueprint Figma stable. Un simple refresh du cache sans changement visuel ne relance pas OpenAI; une modification des variantes, axes, dimensions, auto-layout ou styles Figma relance uniquement les composants concernes.

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

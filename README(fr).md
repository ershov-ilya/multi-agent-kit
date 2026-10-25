# multi-agent-kit

Une seule source de skills, d'agents, de règles, de commandes et de serveurs MCP pour **Claude Code**, **Cursor** et **Codex**. Écrivez un skill une fois, branchez les packs dont un projet a besoin, et chaque projet reçoit les mêmes fichiers à jour pour les trois outils. Les packs publics vivent ici ; vos couches privées et propres au projet restent dans vos dépôts.

> Les skills fournis sont rédigés en russe. Le moteur et le format des packs ne dépendent pas de la langue.

## Pourquoi

Si vous travaillez avec des agents de code IA sur plusieurs projets, ces problèmes vous sont sans doute familiers :

- **Les copies divergent.** Un bon skill est copié de projet en projet ; vous l'améliorez à un endroit
  et les autres copies restent anciennes.
- **Trois outils, trois formats.** Claude Code attend `.claude/skills/`, Cursor attend `.cursor/rules/*.mdc`,
  Codex attend `.agents/skills/` et des agents en TOML. Les garder synchronisés à la main est du travail inutile.
- **Le personnel et le public se mélangent.** Certains skills peuvent être partagés, d'autres contiennent vos clients, vos hôtes
  ou vos notes. Le copier-coller ne fait pas la différence.
- **Un nouvel ordinateur ou un nouveau coéquipier part de zéro.** Les skills n'existent que dans les projets où ils ont été
  copiés.
- **Chaque nouveau projet repart de rien.** Orchestrateur, agents QA et devops, traces de décisions —
  tout est remonté à chaque fois.

## Ce que vous obtenez

- **Une source, plusieurs projets.** Les skills vivent dans des packs (ce paquet npm, votre kit d'équipe, votre kit privé).
  Les projets indiquent les packs qu'ils veulent ; `sync` génère les fichiers. Améliorez un skill une fois : chaque projet
  le récupère au `sync` suivant.
- **Les trois outils d'un coup.** Un skill ou un agent devient automatiquement des fichiers `.claude/`,
  `.cursor/` et `.codex/` / `.agents/`.
- **Couches publiques et privées.** Les kits privés restent hors de git dans chaque projet qui les utilise ; les kits publics
  peuvent être partagés et améliorés par tout le monde.
- **Chaque projet choisit.** `list` montre tout ce qui est disponible ; `enable` / `disable` activent ou désactivent des packs
  ou des skills isolés.
- **Modifier n'importe où.** Vous avez corrigé un skill dans un projet, ou un agent en a créé un dans `.claude/skills/` ?
  `adopt` le renvoie vers la source, et de là vers chaque outil et chaque projet.
- **Sûr par construction.** Le moteur ne touche que les fichiers qu'il a générés (ils portent un marqueur)
  et refuse d'écraser le reste. `check` en CI attrape les fichiers périmés et les fichiers privés
  qui se sont glissés dans git.
- **Un modèle de projet prêt.** `create-multi-agent-project` démarre un monorepo avec un orchestrateur,
  des sous-agents de zone, QA, devops et un processus ADR / RFC.

## Deux commandes, deux rôles

Ce dépôt publie **deux paquets npm**. On les confond facilement :

| | `npx create-multi-agent-project my-app` | `npx multi-agent-kit <command>` |
|---|---|---|
| Ce que c'est | un générateur de projet à usage unique (comme `create-react-app`) | l'outil lui-même |
| Quand | une fois, à la naissance du projet | tous les jours, dans un projet déjà existant |
| Ce qu'il fait | crée le dossier `my-app` à partir du modèle, ajoute `multi-agent-kit` aux `devDependencies`, l'installe, génère les fichiers d'agents | `sync`, `check`, `list`, `enable`, `adopt`, `delete`, … |
| Ensuite | n'est plus nécessaire | reste dans le projet comme dépendance de développement |

Le générateur est une fine enveloppe : `npx create-multi-agent-project my-app` fait la même chose que
`npx -y multi-agent-kit create my-app --install`. `npm create multi-agent-project my-app` est une autre
écriture de la même commande.

### D'où npx prend le code, et quelle version

`npx <package>` cherche le paquet dans cet ordre et lance la première correspondance :

1. les `node_modules` du projet courant (une dépendance de développement) ;
2. une installation globale (`npm i -g`) ;
3. le cache propre de npx (`~/.npm/_npx/`), issu des lancements précédents ;
4. le registre npm : le paquet est téléchargé dans le cache, après la question « Ok to proceed? ».

Ce que cela veut dire en pratique :

| Vous écrivez | Vous obtenez |
|--------------|--------------|
| `npx multi-agent-kit sync` dans un projet avec la dépendance de développement | la version épinglée dans le `package.json` de ce projet — la même pour toute l'équipe |
| `npx -y multi-agent-kit sync` dans un dossier sans `package.json` | ce que npx trouve dans son cache, ou la dernière version sur npm ; `-y` saute la question |
| `npx -y multi-agent-kit@latest sync` | toujours la publication la plus récente |
| `npx -y multi-agent-kit@1 sync` | la 1.x la plus récente : des correctifs frais, sans mise à jour majeure surprise |
| `npx -y github:ershov-ilya/multi-agent-kit#v1.0.0 sync` | directement depuis GitHub à un tag, sans npm |

npx n'utilise **jamais** de lui-même votre clone local de ce dépôt. Pour travailler sur le kit lui-même,
lancez `node ~/code/multi-agent-kit/bin/multi-agent-kit.mjs <command>`, faites une fois `npm link` dans le
clone, ou pointez la source dessus dans `multi-agent-kit.json` :
`{ "package": "multi-agent-kit", "path": "~/code/multi-agent-kit" }`.

## Pour commencer

**Un nouveau projet** — monorepo avec `workspace/`, `web/`, `engine/`, un orchestrateur et des traces de décisions :

```bash
npx create-multi-agent-project@latest my-app
```

Puis remplissez `workspace/agent-kit/context/project.md` et `vars` dans `multi-agent-kit.json`.

**Un projet Node.js déjà existant :**

```bash
npm i -D multi-agent-kit
npx multi-agent-kit init      # écrit multi-agent-kit.json (réutilise un ancien dossier agent-kit/ s'il existe)
npx multi-agent-kit sync      # génère .claude/ .cursor/ .codex/ .agents/
```

**Un dossier sans `package.json`** (des notes, un coffre Obsidian, un projet non JS) — écrivez
`multi-agent-kit.json` (ou lancez `npx -y multi-agent-kit init`) et utilisez `npx -y multi-agent-kit@1 sync`.
Réglez `"cli": "npx -y multi-agent-kit@1"` dans la config pour que les agents de ce projet lancent la même commande.

**Un projet qui a déjà des skills copiés à la main :** écrivez la config, puis

```bash
npx multi-agent-kit sync --take-over
```

Les copies identiques à leur source deviennent gérées ; les autres sont listées pour que vous décidiez pour chacune.

**Un coéquipier clone le projet, ou vous changez d'ordinateur :**

```bash
npm install
npx multi-agent-kit sync --update   # récupère aussi les kits d'équipe et privés depuis git
```

Les projets créés à partir du modèle ont des scripts npm pour cela : `npm run agents:sync`,
`agents:update`, `agents:check`.

## Exemples du quotidien

```bash
npx multi-agent-kit sync               # régénère les fichiers à partir des sources que vous avez déjà
npx multi-agent-kit sync --update      # récupère d'abord des versions fraîches des kits git (équipe, privé), puis régénère
npx multi-agent-kit check              # ne change rien, échoue si les fichiers sont périmés — pour la CI et le pre-commit
```

`sync` utilise ce qui est sur le disque et dans le cache git ; `sync --update` récupère d'abord les sources git. `check`
n'écrit jamais rien.

```bash
npx multi-agent-kit list --long        # tout ce qui est disponible : [x] packs activés, on / ex / ovr par élément
npx multi-agent-kit enable growth      # activer un pack entier
npx multi-agent-kit enable seogeo      # activer un seul skill ; le reste de son pack reste désactivé
npx multi-agent-kit disable octalysis  # désactiver un skill
```

`enable` / `disable` modifient `packs`, `include` et `exclude` dans `multi-agent-kit.json` et lancent `sync`.

```bash
npx multi-agent-kit adopt .claude/skills/nudge/SKILL.md    # vous avez modifié un fichier généré : renvoyer la modification vers sa source
npx multi-agent-kit adopt --new                            # un skill a été créé à la main dans .claude/skills/ : le déplacer vers la couche locale
npx multi-agent-kit adopt --new --to acme-kit:team         # … ou vers un kit d'équipe, pour que les autres projets l'aient aussi
```

`adopt <file>` sert aux **modifications** d'éléments existants ; `adopt --new` sert aux éléments **nouveaux**
qu'aucune source ne contient encore. Réglez `"autoAdopt": "local"` dans la config pour adopter les nouveaux éléments à chaque `sync`.

```bash
npx multi-agent-kit delete old-skill        # aperçu : ce qui serait retiré, et où
npx multi-agent-kit delete old-skill --yes  # retirer des sources accessibles en écriture, des fichiers générés et des copies faites à la main
```

Supprimer depuis un kit partagé touche chaque projet qui l'utilise ; les sources en lecture seule
(le paquet npm, les caches git) reçoivent à la place un `exclude` dans ce projet.

## Aide-mémoire

| Je veux… | Lancer |
|----------|--------|
| démarrer un nouveau projet | `npx create-multi-agent-project@latest my-app` |
| ajouter le kit à un projet existant | `npm i -D multi-agent-kit && npx multi-agent-kit init` |
| régénérer les fichiers d'agents | `npx multi-agent-kit sync` (`npm run agents:sync`) |
| obtenir des kits d'équipe / privés à jour | `npx multi-agent-kit sync --update` (`npm run agents:update`) |
| vérifier en CI | `npx multi-agent-kit check` (`npm run agents:check`) |
| reprendre des skills copiés à la main | `npx multi-agent-kit sync --take-over` |
| voir ce qui est disponible | `npx multi-agent-kit list --long` |
| activer ou désactiver un pack ou un skill | `npx multi-agent-kit enable <name>` / `disable <name>` |
| conserver une modification faite dans un fichier généré | `npx multi-agent-kit adopt <file>` |
| publier un skill créé à la main | `npx multi-agent-kit adopt --new [--to source:pack]` |
| retirer un skill partout | `npx multi-agent-kit delete <name>` → `--yes` |
| démarrer un kit d'équipe ou privé | `npx multi-agent-kit new-kit acme-team-kit` |
| vérifier les packs avant publication | `npx multi-agent-kit lint packs --deny lint-deny.txt` |
| consigner une décision | `npx multi-agent-kit decisions create ADR platform topic` |
| utiliser une fois le kit le plus récent | `npx -y multi-agent-kit@latest <command>` |

## Comment ça marche

```
multi-agent-kit.json ──► sources ──► packs ──► local layer ──► .claude/ .cursor/ .codex/ .agents/ .mcp.json AGENTS.md
                         (paquet npm,  (core,    (vos propres
                          git, path)    product…) agents, règles)
```

- **Les sources** sont des endroits qui contiennent `packs/` : ce paquet npm, un dépôt git, ou un dossier local.
- **Les packs** sont des dossiers avec `skills/`, `agents/`, `commands/`, `rules/`, `context/`, `mcp/`.
- **La couche locale** est le dossier propre du projet, au même format. Elle l'emporte sur les packs.
- Les couches plus tardives écrasent les précédentes par nom d'élément (`skills/nudge`, `agents/qa`, …).
- Les fichiers générés portent un marqueur `Generated by multi-agent-kit. Source: …`. Le moteur ne
  touche que les fichiers qui ont ce marqueur et refuse d'écraser le reste.
- Rien n'est activé par défaut, sauf le pack `core` : un projet reçoit exactement les packs qu'il liste.

### Configuration

```json
{
  "name": "my-app",
  "targets": ["claude", "cursor", "codex"],
  "sources": [
    "multi-agent-kit",
    { "git": "git@github.com:me/my-private-kit.git", "ref": "main", "path": "~/code/my-private-kit", "private": true, "optional": true }
  ],
  "packs": ["core", "decisions", "product", "safety", "personal"],
  "include": ["growth/skills/seogeo"],
  "exclude": ["octalysis"],
  "local": "workspace/agent-kit",
  "vars": { "prod_host": "app-1", "domain": "example.com" },
  "decisions": { "directory": "workspace/docs/decisions", "scopes": ["platform", "web", "engine"] }
}
```

| Clé | Signification |
|-----|---------------|
| `targets` | pour quels outils générer : `claude`, `cursor`, `codex` |
| `sources` | `"package-name"`, `{ "package" }`, `{ "git", "ref" }` ou `{ "path" }` ; `path` l'emporte s'il existe |
| `packs` | packs à activer ; écrivez `source-id:pack` quand deux sources ont le même nom de pack |
| `include` / `exclude` | éléments isolés pris dans d'autres packs / éléments à écarter |
| `local` | la couche propre du projet |
| `vars` | valeurs de `{{vars.name}}` dans les fichiers de packs (les valeurs par défaut viennent de `pack.json`) |
| `decisions` | active le processus RFC / ADR / OPS et la commande `multi-agent-kit decisions` |
| `cli` | comment les agents de ce projet doivent appeler l'outil (par défaut `npx multi-agent-kit`) |
| `commitPrivate` | commiter aussi les fichiers des sources privées (par défaut : les laisser hors de git) |
| `autoAdopt` | `"local"` ou `"source:pack"` : à chaque `sync`, déplacer dans cette couche les éléments ajoutés à la main |

### Couches publiques et privées

Marquez une source `"private": true` (ou placez `"private": true` dans son `multi-agent-kit.source.json`).
Les fichiers générés à partir d'elle sont listés dans `.git/info/exclude`, jamais dans les manifestes commités, et
`multi-agent-kit check` échoue si l'un d'eux est suivi par git. Un élément privé ne peut pas partager un nom
avec un élément public : le même chemin n'est donc jamais public dans un checkout et privé dans un autre. Les coéquipiers
sans accès à une source marquée `"optional": true` reçoivent un avertissement au lieu d'une erreur.

### Vos propres kits

Les processus d'équipe, les services internes et les notes personnelles vivent dans des kits : des dépôts
séparés (en général privés) au même format. Démarrez-en un avec `npx multi-agent-kit new-kit acme-team-kit` et
suivez [docs/private-and-team-kits.md](docs/private-and-team-kits.md).

## Toutes les commandes

| Commande | Ce qu'elle fait |
|----------|-----------------|
| `sync [--update] [--take-over]` | génère les fichiers ; `--update` rafraîchit d'abord les sources git ; signale les éléments ajoutés à la main |
| `check` | mode CI : ne change rien, échoue si les fichiers générés sont périmés ou si des fichiers privés sont suivis |
| `list [--long] [--enabled] [--json]` | catalogue de chaque source (publique, équipe, privée) : packs, éléments et leur état ici |
| `enable <pack\|item>` / `disable <pack\|item>` | active ou désactive un pack ou un skill, un agent ou une règle, puis synchronise |
| `adopt <file>…` | recopie vers la source les modifications manuelles de fichiers générés |
| `adopt --new [--to local\|source:pack] [--from .claude]` | déplace dans une couche les skills, agents et règles ajoutés à la main et les génère pour chaque outil |
| `delete <item> [--yes]` | retire un élément des sources accessibles en écriture, des fichiers produits et des copies faites à la main (aperçu sans `--yes`) |
| `lint [dir] [--deny file]` | valide les packs : métadonnées, liens, secrets, mots interdits |
| `decisions create TYPE scope topic` / `decisions index` | documents RFC / ADR / OPS numérotés |
| `init` | crée `multi-agent-kit.json` (réutilise un ancien dossier `agent-kit/`) |
| `create <dir> [--name] [--install] [--no-git]` | démarre un projet à partir du modèle (ce qu'appelle `create-multi-agent-project`) |
| `new-kit <dir> [--public]` | démarre une source de packs privée ou d'équipe |

Les commandes qui agissent sur un projet acceptent `--root <dir>` pour s'exécuter dans un autre dossier.

## Packs de ce paquet npm

| Pack | Contenu |
|------|---------|
| `core` | processus agent-kit, `/do`, `/refresh-context`, `/summary`, agent `search` |
| `decisions` | processus RFC / ADR / OPS, `/adr`, agent `decision-review` |
| `thinking` | `exothinking` — partenaire de réflexion pour les problèmes ouverts |
| `product` | `jobs-to-be-done`, `octalysis`, `nudge`, `user-best-practices-and-habits`, `presentation`, `state-transitions` |
| `growth` | `seogeo`, `internet-marketing`, `micro-markup` (Open Graph, JSON-LD) |
| `safety` | `secure-by-design`, `legal` (droit russe et international pour les produits numériques) |

## Contribuer

Les nouveaux skills et les correctifs sont les bienvenus : voir [CONTRIBUTING.md](CONTRIBUTING.md) et le
[format des packs](docs/pack-format.md).

## Licence

[MIT](LICENSE)

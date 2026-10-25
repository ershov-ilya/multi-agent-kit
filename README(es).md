# multi-agent-kit

Una sola fuente de skills, agentes, reglas, comandos y servidores MCP para **Claude Code**, **Cursor** y **Codex**. Escribe un skill una vez, conecta los packs que un proyecto necesita, y cada proyecto recibe los mismos archivos al día para las tres herramientas. Los packs públicos viven aquí; tus capas privadas y las propias del proyecto se quedan en tus repositorios.

> Los skills incluidos están escritos en ruso. El motor y el formato de los packs no dependen del idioma.

## Por qué

Si trabajas con agentes de código con IA en varios proyectos, estos problemas te sonarán:

- **Las copias se separan.** Un buen skill se copia de proyecto en proyecto; lo mejoras en un sitio
  y las demás copias se quedan viejas.
- **Tres herramientas, tres formatos.** Claude Code espera `.claude/skills/`, Cursor espera `.cursor/rules/*.mdc`,
  Codex espera `.agents/skills/` y agentes en TOML. Mantenerlos sincronizados a mano es trabajo inútil.
- **Lo personal y lo público se mezclan.** Unos skills se pueden compartir; otros contienen tus clientes, hosts
  o notas. Copiar y pegar no distingue unos de otros.
- **Un portátil nuevo o un compañero nuevo empiezan de cero.** Los skills solo viven en los proyectos a los que se
  copiaron.
- **Cada proyecto nuevo se monta desde cero.** Orquestador, agentes de QA y devops, registros de decisiones:
  hay que configurarlos otra vez.

## Qué obtienes

- **Una fuente, muchos proyectos.** Los skills viven en packs (este paquete npm, tu kit de equipo, tu kit privado).
  Los proyectos dicen qué packs quieren; `sync` genera los archivos. Mejora un skill una vez: cada proyecto
  lo recoge en el siguiente `sync`.
- **Las tres herramientas a la vez.** Un skill o un agente se convierte automáticamente en archivos de `.claude/`,
  `.cursor/` y `.codex/` / `.agents/`.
- **Capas públicas y privadas.** Los kits privados se quedan fuera de git en cada proyecto que los usa; los públicos
  se pueden compartir y mejorar entre todos.
- **Cada proyecto elige lo suyo.** `list` muestra todo lo disponible; `enable` / `disable` activan o desactivan packs
  o skills sueltos.
- **Editar desde cualquier sitio.** ¿Corregiste un skill dentro de un proyecto, o un agente creó uno nuevo en `.claude/skills/`?
  `adopt` lo devuelve a la fuente, y desde ahí a todas las herramientas y proyectos.
- **Seguro por diseño.** El motor solo toca los archivos que él mismo generó (llevan un marcador)
  y se niega a sobrescribir todo lo demás. `check` en CI detecta archivos obsoletos y archivos privados
  que se colaron en git.
- **Una plantilla de proyecto lista.** `create-multi-agent-project` arranca un monorepo con un orquestador,
  subagentes de zona, QA, devops y un proceso ADR / RFC.

## Dos comandos, dos tareas

Este repositorio publica **dos paquetes npm**. Es fácil confundirlos:

| | `npx create-multi-agent-project my-app` | `npx multi-agent-kit <command>` |
|---|---|---|
| Qué es | un generador de proyecto de un solo uso (como `create-react-app`) | la herramienta en sí |
| Cuándo | una vez, cuando nace el proyecto | cada día, dentro de un proyecto que ya existe |
| Qué hace | crea la carpeta `my-app` a partir de la plantilla, añade `multi-agent-kit` a `devDependencies`, lo instala, genera los archivos de agentes | `sync`, `check`, `list`, `enable`, `adopt`, `delete`, … |
| Después | ya no hace falta | se queda en el proyecto como dependencia de desarrollo |

El generador es una envoltura fina: `npx create-multi-agent-project my-app` hace lo mismo que
`npx -y multi-agent-kit create my-app --install`. `npm create multi-agent-project my-app` es otra
forma de escribir lo mismo.

### De dónde saca npx el código, y qué versión

`npx <package>` busca el paquete en este orden y ejecuta la primera coincidencia:

1. los `node_modules` del proyecto actual (una dependencia de desarrollo);
2. una instalación global (`npm i -g`);
3. la caché propia de npx (`~/.npm/_npx/`) de ejecuciones anteriores;
4. el registro de npm: descarga el paquete a la caché, después de preguntar «Ok to proceed?».

Qué significa esto en la práctica:

| Escribes | Obtienes |
|----------|----------|
| `npx multi-agent-kit sync` en un proyecto con la dependencia de desarrollo | la versión fijada en el `package.json` de ese proyecto: la misma para todo el equipo |
| `npx -y multi-agent-kit sync` en una carpeta sin `package.json` | lo que npx encuentre en su caché, o la última versión de npm; `-y` se salta la pregunta |
| `npx -y multi-agent-kit@latest sync` | siempre la publicación más reciente |
| `npx -y multi-agent-kit@1 sync` | la 1.x más reciente: correcciones nuevas, sin una actualización mayor por sorpresa |
| `npx -y github:ershov-ilya/multi-agent-kit#v1.0.0 sync` | directo desde GitHub en un tag, sin npm |

npx **nunca** usa por su cuenta tu clon local de este repositorio. Para trabajar en el kit mismo,
ejecuta `node ~/code/multi-agent-kit/bin/multi-agent-kit.mjs <command>`, haz `npm link` una vez en el
clon, o apunta la fuente a él en `multi-agent-kit.json`:
`{ "package": "multi-agent-kit", "path": "~/code/multi-agent-kit" }`.

## Por dónde empezar

**Un proyecto nuevo** — monorepo con `workspace/`, `web/`, `engine/`, un orquestador y registros de decisiones:

```bash
npx create-multi-agent-project@latest my-app
```

Después rellena `workspace/agent-kit/context/project.md` y `vars` en `multi-agent-kit.json`.

**Un proyecto Node.js que ya existe:**

```bash
npm i -D multi-agent-kit
npx multi-agent-kit init      # escribe multi-agent-kit.json (reutiliza una carpeta agent-kit/ antigua, si existe)
npx multi-agent-kit sync      # genera .claude/ .cursor/ .codex/ .agents/
```

**Una carpeta sin `package.json`** (notas, una bóveda de Obsidian, un proyecto que no es JS) — escribe
`multi-agent-kit.json` (o ejecuta `npx -y multi-agent-kit init`) y usa `npx -y multi-agent-kit@1 sync`.
Pon `"cli": "npx -y multi-agent-kit@1"` en la config para que los agentes de ese proyecto ejecuten el mismo comando.

**Un proyecto que ya tiene skills copiados a mano:** escribe la config y luego

```bash
npx multi-agent-kit sync --take-over
```

Las copias idénticas a su fuente pasan a estar gestionadas; el resto se lista para que decidas una por una.

**Un compañero clona el proyecto, o estrenas portátil:**

```bash
npm install
npx multi-agent-kit sync --update   # también trae los kits de equipo y privados desde git
```

Los proyectos creados desde la plantilla tienen scripts npm para esto: `npm run agents:sync`,
`agents:update`, `agents:check`.

## Ejemplos de cada día

```bash
npx multi-agent-kit sync               # regenerar los archivos a partir de las fuentes que ya tienes
npx multi-agent-kit sync --update      # primero traer versiones nuevas de los kits git (equipo, privado) y luego regenerar
npx multi-agent-kit check              # no cambiar nada; fallar si los archivos están obsoletos — para CI y pre-commit
```

`sync` usa lo que hay en disco y en la caché de git; `sync --update` trae primero las fuentes git. `check`
no escribe nada.

```bash
npx multi-agent-kit list --long        # todo lo disponible: [x] packs activados, on / ex / ovr por elemento
npx multi-agent-kit enable growth      # activar un pack entero
npx multi-agent-kit enable seogeo      # activar un solo skill; el resto de su pack sigue apagado
npx multi-agent-kit disable octalysis  # apagar un skill
```

`enable` / `disable` editan `packs`, `include` y `exclude` en `multi-agent-kit.json` y ejecutan `sync`.

```bash
npx multi-agent-kit adopt .claude/skills/nudge/SKILL.md    # editaste un archivo generado: llevar el cambio a su fuente
npx multi-agent-kit adopt --new                            # un skill se creó a mano en .claude/skills/: moverlo a la capa local
npx multi-agent-kit adopt --new --to acme-kit:team         # … o a un kit de equipo, para que lo reciban también otros proyectos
```

`adopt <file>` es para **cambios** de elementos que ya existen; `adopt --new` es para elementos **nuevos** que todavía
no tiene ninguna fuente. Pon `"autoAdopt": "local"` en la config para adoptar los elementos nuevos en cada `sync`.

```bash
npx multi-agent-kit delete old-skill        # vista previa: qué se quitaría y de dónde
npx multi-agent-kit delete old-skill --yes  # quitar de las fuentes con permiso de escritura, de los archivos generados y de las copias hechas a mano
```

Borrar de un kit compartido afecta a cada proyecto que lo usa; las fuentes de solo lectura
(el paquete npm, las cachés de git) reciben un `exclude` en este proyecto en lugar del borrado.

## Chuleta

| Quiero… | Ejecutar |
|---------|----------|
| empezar un proyecto nuevo | `npx create-multi-agent-project@latest my-app` |
| añadir el kit a un proyecto existente | `npm i -D multi-agent-kit && npx multi-agent-kit init` |
| regenerar los archivos de agentes | `npx multi-agent-kit sync` (`npm run agents:sync`) |
| obtener kits de equipo / privados al día | `npx multi-agent-kit sync --update` (`npm run agents:update`) |
| comprobar en CI | `npx multi-agent-kit check` (`npm run agents:check`) |
| hacerse cargo de skills copiados a mano | `npx multi-agent-kit sync --take-over` |
| ver qué hay disponible | `npx multi-agent-kit list --long` |
| activar o desactivar un pack o un skill | `npx multi-agent-kit enable <name>` / `disable <name>` |
| conservar un cambio hecho en un archivo generado | `npx multi-agent-kit adopt <file>` |
| publicar un skill creado a mano | `npx multi-agent-kit adopt --new [--to source:pack]` |
| quitar un skill de todas partes | `npx multi-agent-kit delete <name>` → `--yes` |
| empezar un kit de equipo o privado | `npx multi-agent-kit new-kit acme-team-kit` |
| comprobar los packs antes de publicarlos | `npx multi-agent-kit lint packs --deny lint-deny.txt` |
| registrar una decisión | `npx multi-agent-kit decisions create ADR platform topic` |
| usar una vez el kit más reciente | `npx -y multi-agent-kit@latest <command>` |

## Cómo funciona

```
multi-agent-kit.json ──► sources ──► packs ──► local layer ──► .claude/ .cursor/ .codex/ .agents/ .mcp.json AGENTS.md
                         (paquete npm, (core,    (tus propios
                          git, path)    product…) agentes, reglas)
```

- **Las fuentes** son sitios con `packs/`: este paquete npm, un repositorio git o una carpeta local.
- **Los packs** son carpetas con `skills/`, `agents/`, `commands/`, `rules/`, `context/`, `mcp/`.
- **La capa local** es la carpeta propia del proyecto, en el mismo formato. Gana a los packs.
- Las capas posteriores pisan a las anteriores por nombre de elemento (`skills/nudge`, `agents/qa`, …).
- Los archivos generados llevan un marcador `Generated by multi-agent-kit. Source: …`. El motor solo
  toca los archivos con ese marcador y se niega a sobrescribir todo lo demás.
- Por defecto no hay nada activado salvo el pack `core`: un proyecto recibe exactamente los packs que lista.

### Configuración

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

| Clave | Significado |
|-------|-------------|
| `targets` | para qué herramientas generar: `claude`, `cursor`, `codex` |
| `sources` | `"package-name"`, `{ "package" }`, `{ "git", "ref" }` o `{ "path" }`; `path` gana si la ruta existe |
| `packs` | packs que activar; escribe `source-id:pack` cuando dos fuentes tienen el mismo nombre de pack |
| `include` / `exclude` | elementos sueltos de otros packs / elementos que hay que descartar |
| `local` | la capa propia del proyecto |
| `vars` | valores de `{{vars.name}}` en los archivos de los packs (los valores por defecto salen de `pack.json`) |
| `decisions` | activa el proceso RFC / ADR / OPS y el comando `multi-agent-kit decisions` |
| `cli` | cómo deben llamar a la herramienta los agentes de este proyecto (por defecto `npx multi-agent-kit`) |
| `commitPrivate` | hacer commit también de los archivos de fuentes privadas (por defecto se quedan fuera de git) |
| `autoAdopt` | `"local"` o `"source:pack"`: en cada `sync`, mover a esa capa los elementos añadidos a mano |

### Capas públicas y privadas

Marca una fuente con `"private": true` (o pon `"private": true` en su `multi-agent-kit.source.json`).
Los archivos generados a partir de ella se listan en `.git/info/exclude`, nunca en los manifiestos commiteados, y
`multi-agent-kit check` falla si alguno está seguido por git. Un elemento privado no puede compartir nombre
con uno público, así que la misma ruta no es pública en un checkout y privada en otro. Quienes no tengan
acceso a una fuente marcada con `"optional": true` reciben un aviso, no un error.

### Tus propios kits

Los procesos de equipo, los servicios internos y las notas personales viven en kits: repositorios
aparte (normalmente privados) con el mismo formato. Empieza uno con `npx multi-agent-kit new-kit acme-team-kit` y
sigue [docs/private-and-team-kits.md](docs/private-and-team-kits.md).

## Todos los comandos

| Comando | Qué hace |
|---------|----------|
| `sync [--update] [--take-over]` | genera archivos; `--update` actualiza primero las fuentes git; informa de los elementos añadidos a mano |
| `check` | modo CI: no cambia nada, falla si los archivos generados están obsoletos o si hay archivos privados seguidos por git |
| `list [--long] [--enabled] [--json]` | catálogo de cada fuente (pública, de equipo, privada): packs, elementos y su estado aquí |
| `enable <pack\|item>` / `disable <pack\|item>` | activa o desactiva un pack o un skill, agente o regla, y luego sincroniza |
| `adopt <file>…` | copia de vuelta a la fuente los cambios manuales de archivos generados |
| `adopt --new [--to local\|source:pack] [--from .claude]` | mueve a una capa los skills, agentes y reglas añadidos a mano y los genera para cada herramienta |
| `delete <item> [--yes]` | quita un elemento de las fuentes con permiso de escritura, de las salidas y de las copias hechas a mano (sin `--yes`, vista previa) |
| `lint [dir] [--deny file]` | valida los packs: metadatos, enlaces, secretos, palabras prohibidas |
| `decisions create TYPE scope topic` / `decisions index` | documentos RFC / ADR / OPS numerados |
| `init` | crea `multi-agent-kit.json` (reutiliza una carpeta `agent-kit/` heredada) |
| `create <dir> [--name] [--install] [--no-git]` | empieza un proyecto desde la plantilla (lo que llama `create-multi-agent-project`) |
| `new-kit <dir> [--public]` | empieza una fuente de packs privada o de equipo |

Los comandos que trabajan sobre un proyecto aceptan `--root <dir>` para ejecutarse en otra carpeta.

## Packs de este paquete npm

| Pack | Contenido |
|------|-----------|
| `core` | flujo de trabajo de agent-kit, `/do`, `/refresh-context`, `/summary`, agente `search` |
| `decisions` | proceso RFC / ADR / OPS, `/adr`, agente `decision-review` |
| `thinking` | `exothinking` — compañero de pensamiento para problemas abiertos |
| `product` | `jobs-to-be-done`, `octalysis`, `nudge`, `user-best-practices-and-habits`, `presentation`, `state-transitions` |
| `growth` | `seogeo`, `internet-marketing`, `micro-markup` (Open Graph, JSON-LD) |
| `safety` | `secure-by-design`, `legal` (derecho ruso e internacional para productos digitales) |

## Contribuir

Se agradecen skills nuevos y correcciones: véase [CONTRIBUTING.md](CONTRIBUTING.md) y el
[formato de los packs](docs/pack-format.md).

## Licencia

[MIT](LICENSE)

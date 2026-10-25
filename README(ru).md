# multi-agent-kit

Один источник скиллов, агентов, правил, команд и MCP-серверов для **Claude Code**, **Cursor** и **Codex**. Скилл пишется один раз, проект подключает нужные паки — и каждый проект получает одни и те же актуальные файлы для всех трёх инструментов. Публичные паки живут здесь; приватные и проектные слои остаются в ваших собственных репозиториях.

> Скиллы в комплекте написаны на русском. Движок и формат паков не зависят от языка.

## Зачем

Если вы работаете с ИИ-агентами для кода в нескольких проектах, эти проблемы вам знакомы:

- **Копии расходятся.** Хороший скилл копируют из проекта в проект; вы улучшаете его в одном месте,
  а остальные копии остаются старыми.
- **Три инструмента — три формата.** Claude Code ждёт `.claude/skills/`, Cursor — `.cursor/rules/*.mdc`,
  Codex — `.agents/skills/` и агентов в TOML. Держать их в синхроне вручную — пустая работа.
- **Личное и публичное перемешиваются.** Одни скиллы можно отдавать наружу, в других — клиенты, хосты
  или заметки. Копирование не различает одно и другое.
- **Новый ноутбук или новый коллега начинают с нуля.** Скиллы живут только в тех проектах, куда их
  когда-то скопировали.
- **Каждый новый проект собирается заново.** Оркестратор, агенты QA и devops, записи решений —
  настраиваются каждый раз с начала.

## Что вы получаете

- **Один источник, много проектов.** Скиллы живут в паках (этот npm-пакет, командный kit, личный kit).
  Проекты указывают, какие паки им нужны; `sync` генерирует файлы. Улучшили скилл один раз — каждый
  проект подхватит его при следующем `sync`.
- **Все три инструмента сразу.** Один скилл или агент автоматически становится файлами в `.claude/`,
  `.cursor/` и `.codex/` / `.agents/`.
- **Публичные и приватные слои.** Приватные kit-ы не попадают в git ни в одном проекте, который их
  использует; публичные можно отдавать и улучшать всем вместе.
- **Каждому проекту — своё.** `list` показывает всё доступное; `enable` / `disable` включают и
  выключают паки или отдельные скиллы.
- **Правки откуда угодно.** Поправили скилл внутри проекта или агент создал новый в `.claude/skills/`?
  `adopt` возвращает его в источник, а оттуда — во все инструменты и проекты.
- **Безопасно по устройству.** Движок трогает только файлы, которые сам создал (у них есть маркер),
  и отказывается перезаписывать всё остальное. `check` в CI ловит устаревшие файлы и приватные файлы,
  которые просочились в git.
- **Готовый шаблон проекта.** `create-multi-agent-project` поднимает монорепозиторий с оркестратором,
  зональными субагентами, QA, devops и процессом ADR / RFC.

## Две команды, две задачи

Этот репозиторий публикует **два npm-пакета**. Их легко перепутать:

| | `npx create-multi-agent-project my-app` | `npx multi-agent-kit <command>` |
|---|---|---|
| Что это | одноразовый генератор проекта (как `create-react-app`) | сам инструмент |
| Когда | один раз, когда проект рождается | каждый день, внутри уже существующего проекта |
| Что делает | создаёт папку `my-app` из шаблона, добавляет `multi-agent-kit` в `devDependencies`, устанавливает его, генерирует файлы агентов | `sync`, `check`, `list`, `enable`, `adopt`, `delete`, … |
| Дальше | больше не нужен | остаётся в проекте как dev-зависимость |

Генератор — тонкая обёртка: `npx create-multi-agent-project my-app` делает то же самое, что
`npx -y multi-agent-kit create my-app --install`. `npm create multi-agent-project my-app` — другое
написание того же самого.

### Откуда npx берёт код и какую версию

`npx <package>` ищет пакет в таком порядке и запускает первое совпадение:

1. `node_modules` текущего проекта (dev-зависимость);
2. глобальная установка (`npm i -g`);
3. собственный кэш npx (`~/.npm/_npx/`) от прошлых запусков;
4. реестр npm: пакет скачивается в кэш, перед этим спрашивается «Ok to proceed?».

Что это значит на практике:

| Вы пишете | Вы получаете |
|-----------|--------------|
| `npx multi-agent-kit sync` в проекте с dev-зависимостью | версию, зафиксированную в `package.json` этого проекта — одну и ту же для всей команды |
| `npx -y multi-agent-kit sync` в папке без `package.json` | то, что npx найдёт в кэше, или последнюю версию с npm; `-y` пропускает вопрос |
| `npx -y multi-agent-kit@latest sync` | всегда самый свежий релиз |
| `npx -y multi-agent-kit@1 sync` | самую новую 1.x: свежие исправления, без внезапного мажорного обновления |
| `npx -y github:ershov-ilya/multi-agent-kit#v1.0.0 sync` | прямо с GitHub по тегу, npm не участвует |

Локальный клон этого репозитория npx **сам по себе никогда** не использует. Чтобы работать над самим
kit-ом, либо запускайте `node ~/code/multi-agent-kit/bin/multi-agent-kit.mjs <command>`, либо один раз
сделайте `npm link` в клоне, либо укажите источник в `multi-agent-kit.json`:
`{ "package": "multi-agent-kit", "path": "~/code/multi-agent-kit" }`.

## С чего начать

**Новый проект** — монорепозиторий с `workspace/`, `web/`, `engine/`, оркестратором и записями решений:

```bash
npx create-multi-agent-project@latest my-app
```

Затем заполните `workspace/agent-kit/context/project.md` и `vars` в `multi-agent-kit.json`.

**Уже существующий проект на Node.js:**

```bash
npm i -D multi-agent-kit
npx multi-agent-kit init      # пишет multi-agent-kit.json (переиспользует старую папку agent-kit/, если она есть)
npx multi-agent-kit sync      # генерирует .claude/ .cursor/ .codex/ .agents/
```

**Папка без `package.json`** (заметки, хранилище Obsidian, не-JS проект) — напишите
`multi-agent-kit.json` (или запустите `npx -y multi-agent-kit init`) и используйте `npx -y multi-agent-kit@1 sync`.
Пропишите в конфиге `"cli": "npx -y multi-agent-kit@1"`, чтобы агенты в этом проекте вызывали ту же команду.

**Проект, в котором скиллы уже скопированы вручную:** напишите конфиг, затем

```bash
npx multi-agent-kit sync --take-over
```

Копии, совпадающие с источником, становятся управляемыми; остальные выводятся списком, чтобы вы решили по каждой.

**Коллега клонирует проект, или у вас новый ноутбук:**

```bash
npm install
npx multi-agent-kit sync --update   # заодно подтягивает командные и приватные kit-ы из git
```

У проектов из шаблона для этого есть npm-скрипты: `npm run agents:sync`,
`agents:update`, `agents:check`.

## Повседневные примеры

```bash
npx multi-agent-kit sync               # перегенерировать файлы из источников, которые уже есть
npx multi-agent-kit sync --update      # сначала подтянуть свежие версии git-kit-ов (команда, личное), затем перегенерировать
npx multi-agent-kit check              # ничего не менять, упасть, если файлы устарели — для CI и pre-commit
```

`sync` берёт то, что лежит на диске и в git-кэше; `sync --update` сначала забирает git-источники. `check`
ничего не записывает.

```bash
npx multi-agent-kit list --long        # всё доступное: [x] включённые паки, on / ex / ovr по каждому элементу
npx multi-agent-kit enable growth      # включить целый пак
npx multi-agent-kit enable seogeo      # включить один скилл, остальной пак остаётся выключенным
npx multi-agent-kit disable octalysis  # выключить один скилл
```

`enable` / `disable` правят `packs`, `include` и `exclude` в `multi-agent-kit.json` и запускают `sync`.

```bash
npx multi-agent-kit adopt .claude/skills/nudge/SKILL.md    # вы правили сгенерированный файл: перенести правку в его источник
npx multi-agent-kit adopt --new                            # скилл создан вручную в .claude/skills/: перенести его в локальный слой
npx multi-agent-kit adopt --new --to acme-kit:team         # … или в командный kit, чтобы его получили и другие проекты
```

`adopt <file>` — для **изменений** существующих элементов; `adopt --new` — для **новых** элементов, которых
ещё нет ни в одном источнике. Поставьте в конфиге `"autoAdopt": "local"`, чтобы новые элементы подхватывались при каждом `sync`.

```bash
npx multi-agent-kit delete old-skill        # предпросмотр: что и откуда будет удалено
npx multi-agent-kit delete old-skill --yes  # удалить из записываемых источников, сгенерированных файлов и ручных копий
```

Удаление из общего kit-а затрагивает каждый проект, который его использует; для источников только для чтения
(npm-пакет, git-кэши) в этом проекте вместо удаления ставится `exclude`.

## Шпаргалка

| Я хочу… | Запустить |
|---------|-----------|
| начать новый проект | `npx create-multi-agent-project@latest my-app` |
| добавить kit в существующий проект | `npm i -D multi-agent-kit && npx multi-agent-kit init` |
| перегенерировать файлы агентов | `npx multi-agent-kit sync` (`npm run agents:sync`) |
| получить свежие командные / приватные kit-ы | `npx multi-agent-kit sync --update` (`npm run agents:update`) |
| проверить в CI | `npx multi-agent-kit check` (`npm run agents:check`) |
| забрать скиллы, скопированные вручную | `npx multi-agent-kit sync --take-over` |
| увидеть, что доступно | `npx multi-agent-kit list --long` |
| включить или выключить пак или скилл | `npx multi-agent-kit enable <name>` / `disable <name>` |
| сохранить правку сгенерированного файла | `npx multi-agent-kit adopt <file>` |
| опубликовать скилл, созданный вручную | `npx multi-agent-kit adopt --new [--to source:pack]` |
| удалить скилл везде | `npx multi-agent-kit delete <name>` → `--yes` |
| начать командный или приватный kit | `npx multi-agent-kit new-kit acme-team-kit` |
| проверить паки перед публикацией | `npx multi-agent-kit lint packs --deny lint-deny.txt` |
| записать решение | `npx multi-agent-kit decisions create ADR platform topic` |
| один раз взять самый новый kit | `npx -y multi-agent-kit@latest <command>` |

## Как это устроено

```
multi-agent-kit.json ──► sources ──► packs ──► local layer ──► .claude/ .cursor/ .codex/ .agents/ .mcp.json AGENTS.md
                         (package,    (core,    (ваши собственные
                          git, path)   product…) агенты, правила)
```

- **Источники** — места с `packs/`: этот npm-пакет, git-репозиторий или локальная папка.
- **Паки** — папки со `skills/`, `agents/`, `commands/`, `rules/`, `context/`, `mcp/`.
- **Локальный слой** — собственная папка проекта в том же формате. Она перекрывает паки.
- Более поздние слои перекрывают более ранние по имени элемента (`skills/nudge`, `agents/qa`, …).
- У сгенерированных файлов есть маркер `Generated by multi-agent-kit. Source: …`. Движок трогает
  только файлы с этим маркером и отказывается перезаписывать всё остальное.
- По умолчанию ничего не включено, кроме пака `core`: проект получает ровно те паки, которые перечислил.

### Конфиг

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

| Ключ | Значение |
|------|----------|
| `targets` | для каких инструментов генерировать: `claude`, `cursor`, `codex` |
| `sources` | `"package-name"`, `{ "package" }`, `{ "git", "ref" }` или `{ "path" }`; `path` побеждает, если путь существует |
| `packs` | какие паки включить; пишите `source-id:pack`, когда у двух источников одинаковое имя пака |
| `include` / `exclude` | отдельные элементы из других паков / элементы, которые нужно отбросить |
| `local` | собственный слой проекта |
| `vars` | значения для `{{vars.name}}` в файлах паков (значения по умолчанию берутся из `pack.json`) |
| `decisions` | включает процесс RFC / ADR / OPS и команду `multi-agent-kit decisions` |
| `cli` | как агенты в этом проекте должны вызывать инструмент (по умолчанию `npx multi-agent-kit`) |
| `commitPrivate` | коммитить и файлы из приватных источников (по умолчанию они остаются вне git) |
| `autoAdopt` | `"local"` или `"source:pack"`: при каждом `sync` переносить элементы, добавленные вручную, в этот слой |

### Публичные и приватные слои

Пометьте источник `"private": true` (или положите `"private": true` в его `multi-agent-kit.source.json`).
Файлы, сгенерированные из него, попадают в `.git/info/exclude`, никогда — в закоммиченные манифесты, а
`multi-agent-kit check` падает, если такой файл отслеживается git. Приватный элемент не может делить имя
с публичным, поэтому один и тот же путь не бывает публичным в одном чекауте и приватным в другом. У коллег
без доступа к источнику с `"optional": true` будет предупреждение, а не ошибка.

### Свои kit-ы

Командные процессы, внутренние сервисы и личные заметки живут в kit-ах: отдельных (обычно приватных)
репозиториях того же формата. Начните с `npx multi-agent-kit new-kit acme-team-kit` и следуйте
[docs/private-and-team-kits.md](docs/private-and-team-kits.md).

## Все команды

| Команда | Что делает |
|---------|------------|
| `sync [--update] [--take-over]` | генерирует файлы; `--update` сначала обновляет git-источники; сообщает об элементах, добавленных вручную |
| `check` | режим CI: ничего не меняет, падает, если сгенерированные файлы устарели или приватные файлы отслеживаются git |
| `list [--long] [--enabled] [--json]` | каталог каждого источника (публичный, командный, приватный): паки, элементы и их состояние здесь |
| `enable <pack\|item>` / `disable <pack\|item>` | включает или выключает пак или один скилл/агента/правило, затем синхронизирует |
| `adopt <file>…` | копирует ручные правки сгенерированных файлов обратно в источник |
| `adopt --new [--to local\|source:pack] [--from .claude]` | переносит скиллы/агентов/правила, добавленные вручную, в слой и генерирует их для каждого инструмента |
| `delete <item> [--yes]` | удаляет элемент из записываемых источников, выходных файлов и ручных копий (без `--yes` — предпросмотр) |
| `lint [dir] [--deny file]` | проверяет паки: метаданные, ссылки, секреты, запрещённые слова |
| `decisions create TYPE scope topic` / `decisions index` | нумерованные документы RFC / ADR / OPS |
| `init` | создаёт `multi-agent-kit.json` (переиспользует устаревшую папку `agent-kit/`) |
| `create <dir> [--name] [--install] [--no-git]` | начинает проект из шаблона (это вызывает `create-multi-agent-project`) |
| `new-kit <dir> [--public]` | начинает приватный или командный источник паков |

Команды, которые работают с проектом, принимают `--root <dir>`, чтобы запуститься в другой папке.

## Паки в этом npm-пакете

| Пак | Содержимое |
|-----|------------|
| `core` | рабочий процесс agent-kit, `/do`, `/refresh-context`, `/summary`, агент `search` |
| `decisions` | процесс RFC / ADR / OPS, `/adr`, агент `decision-review` |
| `thinking` | `exothinking` — партнёр по мышлению для открытых задач |
| `product` | `jobs-to-be-done`, `octalysis`, `nudge`, `user-best-practices-and-habits`, `presentation`, `state-transitions` |
| `growth` | `seogeo`, `internet-marketing`, `micro-markup` (Open Graph, JSON-LD) |
| `safety` | `secure-by-design`, `legal` (российское и международное право для цифровых продуктов) |

## Участие

Новые скиллы и исправления приветствуются: см. [CONTRIBUTING.md](CONTRIBUTING.md) и
[формат паков](docs/pack-format.md).

## Лицензия

[MIT](LICENSE)

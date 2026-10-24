# {{project.name}}

Монорепо с одним git-корнем, созданное `create-multi-agent-project`. В IDE три корня: оркестрация,
клиент, движок.

Карта для агента — [`../AGENTS.md`](../AGENTS.md). Каталог решений —
[`docs/decisions/ACTIVE.md`](docs/decisions/ACTIVE.md).

## Как открыть

В Cursor или VS Code: File → Open Workspace from File → `workspace/{{project.name}}.code-workspace`.
Claude Code и Codex запускайте из корня репозитория.

## Агенты, скиллы и правила

Собираются из `multi-agent-kit.json` в корне:

- общие паки — из пакета `multi-agent-kit` (и приватных источников, если подключены);
- своё для проекта — `workspace/agent-kit/` (agents, rules, commands, skills, context, mcp).

```bash
npm run agents:sync     # пересобрать .cursor/, .claude/, .codex/, .agents/
npm run agents:check    # проверка для CI: всё ли собрано
npm run agents:update   # подтянуть свежие git-источники
```

Сгенерированные файлы вручную не правьте. Если правка уже сделана в них, перенесите её в исходник:
`npx multi-agent-kit adopt <файл>`.

## Первые шаги

1. Заполните `workspace/agent-kit/context/project.md`: продукт, пользователи, границы.
2. Задайте `vars` в `multi-agent-kit.json`: стек, хост, домен, каталог выкладки, БД. Только имена
   и адреса, без паролей.
3. Зафиксируйте ADR про стек клиента и границу между `web/` и `engine/` и только после этого
   пишите код.

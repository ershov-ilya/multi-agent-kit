# Новый субпроект

Новый корень (например, `admin/` или `bot/`) заводится в том же git соседней папкой.

1. ADR в `workspace/docs/decisions/` о зоне нового корня и его границе с остальными.
2. Папка `<имя>/` с `AGENTS.md`, `CLAUDE.md` (`@AGENTS.md`), `.gitignore` и `docs/{decisions,expose,project}/`.
3. Строка в `folders` файла `workspace/*.code-workspace`.
4. Scope `<имя>` в `decisions.scopes` файла `multi-agent-kit.json`.
5. Агент `<имя>-subagent` в `workspace/agent-kit/agents/` и строка в таблице агентов корневого `AGENTS.md`.
6. `npm run agents:sync`.

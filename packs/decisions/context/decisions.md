# Процесс RFC, ADR и OPS

Настройки — раздел `decisions` в `multi-agent-kit.json`. Каталог документов: `{{mak.decisions}}`.
Допустимые scope: {{mak.scopes}}. Перенос инфраструктуры другого проекта не допускается.

- RFC — предложение: `draft`, `approved`, `implemented`, `rejected`.
- ADR — решение: `proposed`, `accepted`, `superseded`, `deprecated`.
- Внедрение ADR — отдельное поле `implementation`: `pending`, `in_progress`, `done`.
- OPS — обновляемый опыт внедрения, проверки и ловушки; содержит `related_adr`.
- Исторический статус ADR `done` читается как `accepted` с внедрением `done`.
  Исторические документы ради смены формата не переписываются.

Принятый ADR сохраняется. Смена решения требует нового ADR со ссылкой
`supersedes`; у старого обновляются отметка `superseded`, ссылка и индекс.
Допустимы исправления опечаток, ссылок и метаданных внедрения без смены решения.
RFC можно редактировать до принятия. OPS можно дополнять по результатам работ.

Имена: `NNNN-{RFC,ADR,OPS}-scope-topic.md`. Нумерация общая; следующий номер
выделяет `{{mak.cli}} decisions create` по именам существующих документов.
OPS к ADR получает тот же номер и тему через параметр `--adr`.
ACTIVE.md автоматически строится из документов и не служит счётчиком.
0000-plan.md — необязательный план, не второй реестр решений.

Создание: `{{mak.cli}} decisions create ADR <scope> <topic>`.
Для RFC и OPS меняется TYPE. Парный OPS:
`{{mak.cli}} decisions create OPS <scope> <topic> --adr 0001`.
После заполнения: `{{mak.cli}} decisions index`. Секреты в документы не записываются.

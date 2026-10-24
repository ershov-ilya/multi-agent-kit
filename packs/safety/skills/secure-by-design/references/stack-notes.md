# Заметки по стекам

Конкретика для написания и ревью кода. Читать только при работе с кодом; принципы и угрозы — в файлах доменов. Разделы независимы; для другого проекта оставь нужные.

## Node.js / TypeScript / Fastify

**Ввод (D1)**
- Схема на каждый роут: `schema: { body, querystring, params, headers }` с `additionalProperties: false`; Fastify использует Ajv и отбрасывает лишнее при `removeAdditional`, но безопаснее запрещать. `maxLength`, `minimum/maximum`, `enum`, `format`.
- `bodyLimit` на сервере и на роуте; `connectionTimeout`, `requestTimeout`, `keepAliveTimeout`.
- Postgres: `pg` с `$1` плейсхолдерами; `postgres.js` с тег-шаблоном `sql\`…\`` (параметризует); идентификаторы — только `sql(name)` из allow-list или `pg-format` `%I`. Никогда `` `SELECT … ${x}` `` как строка.
- Shell: `child_process.execFile`/`spawn` с массивом, без `shell: true`; аргументы через allow-list.
- Регулярки: `safe-regex2`/`recheck` в линтере; ограничение длины до теста; Node 20+ без линейного движка — осторожно.
- JSON: `JSON.parse` безопасен от кода, но не от `__proto__` при последующем merge — `Object.create(null)` или проверка ключей; `--disable-proto=delete`.
- YAML: `js-yaml` `load` безопасен с v4 (`DEFAULT_SCHEMA`), но проверь версию; XML: `fast-xml-parser` без DTD-обработки.

**Браузер (D2)**
- `@fastify/helmet` с явным CSP (`contentSecurityPolicy.directives`), nonce через `helmet.contentSecurityPolicy` + hook; `@fastify/cookie` с `secure`, `httpOnly`, `sameSite: 'lax'`, `signed` при необходимости; `@fastify/cors` с точным `origin` (функция или массив), `credentials` только если нужно; `@fastify/csrf-protection` при cookie-сессиях с формами.
- `trustProxy` — конкретное значение (`'127.0.0.1'` или число хопов), не `true`.
- Статика: `@fastify/static` с `dotfiles: 'deny'`, без `index` для каталогов пользователей.

**Аутентификация (D3)**
- `crypto.randomInt(0, 1_000_000)` для кода, `crypto.randomBytes(32).toString('base64url')` для токенов; хеш кода `crypto.createHmac('sha256', KEY).update(code).digest()`; сравнение `crypto.timingSafeEqual` с буферами одинаковой длины.
- Пароли: `argon2` (`argon2id`, `memoryCost: 19456+`, `timeCost: 2+`), или `bcrypt` с cost 12 и проверкой длины ≤ 72 байт.
- Сессии: `@fastify/secure-session` (шифрованная cookie) или серверные в Postgres/Redis с `@fastify/session`; ротация `session.regenerate()` при входе.
- JWT: `jose` с `jwtVerify(token, key, { algorithms: ['EdDSA'], issuer, audience })`; `fast-jwt` с явным `algorithms`. Никакого `jsonwebtoken.decode` вместо `verify`.
- Лимиты: `@fastify/rate-limit` с `keyGenerator` по пользователю/email для `/auth/*`, отдельные более строгие лимиты, `ban` после N; хранилище Redis для нескольких процессов.

**Авторизация (D4)**
- Паттерн: `preHandler` загружает субъекта; репозиторий требует `ctx: { userId, communityId }` обязательным параметром; запросы `WHERE id = $1 AND community_id = $2`. Тест на каждый объектный роут: owner 200, чужой в сообществе 404, чужое сообщество 404, аноним 401.
- RLS: `SET LOCAL app.community_id = $1` в начале транзакции через пул с `BEGIN`; роль приложения без `BYPASSRLS`.
- Сериализация ответа через `schema.response` — Fastify отдаёт только описанные поля (`fast-json-stringify`): это и производительность, и защита от лишних полей (BOPLA). Контакт появляется в схеме ответа только для состояния «обе стороны согласились», отдельным роутом или отдельной схемой.

**SSE / реальное время**
- Проверка `Origin`, cookie с SameSite, фильтрация событий по `userId` на сервере, лимит соединений на пользователя, heartbeat, закрытие при истечении сессии, `Cache-Control: no-store`.

**Ошибки и логи (D10)**
- `setErrorHandler`: `5xx` → `{ code: 'internal', correlationId }`, детали в `request.log.error`; `4xx` с кодом ошибки без эха ввода. `pino` с `redact: ['req.headers.authorization', 'req.headers.cookie', 'body.password', 'body.code', '*.token']`; `disableRequestLogging` или кастомный сериализатор без тела.
- `process.on('unhandledRejection')` → лог и аккуратное завершение, не продолжение в неизвестном состоянии.

**Исходящие (D5)**
- `undici`/`fetch` с `AbortSignal.timeout()`, лимит размера ответа, проверка хоста до запроса (резолв и фильтр приватных диапазонов), `redirect: 'manual'`.
- Вебхуки: HMAC `crypto.createHmac('sha256', secret).update(rawBody)` — нужен сырой body (`addContentTypeParser` с `parseAs: 'buffer'`), `timingSafeEqual`, проверка timestamp.

**Поставка (D8)**
- `.npmrc`: `ignore-scripts=true`, `save-exact=true`, `audit=true`; `npm ci` в CI; `engines` + `.nvmrc`; `npm audit signatures`; `overrides` для транзитивных фиксов; Renovate с `minimumReleaseAge: '3 days'`.
- `eslint-plugin-security`, `eslint-plugin-no-unsanitized`, Semgrep `p/nodejs`, `p/typescript`.

**Процесс (D9)**
- PM2 под пользователем приложения; `ecosystem.config.js` без секретов, `env_file` вне репозитория с правами 600; `--max-memory-restart`; `NODE_ENV=production`; `NODE_OPTIONS=--disable-proto=delete`.

## Rust

- Инъекции в SQL те же: `sqlx::query!`/`query()` с биндами, `tokio-postgres` с `$1`; никогда `format!` в запрос; идентификаторы — allow-list.
- `std::process::Command` с `.arg()` по одному, без `sh -c`.
- `regex` — линейный движок, ReDoS нет, но лимит размера (`RegexBuilder::size_limit`) и длины ввода.
- `unsafe` — ревью вторым человеком; `#![forbid(unsafe_code)]` в крейтах, где не нужен; `cargo geiger`.
- Десериализация: `serde` с `#[serde(deny_unknown_fields)]` для внешних входов; лимит размера до разбора; `serde_json::from_slice` на ограниченном буфере; `bincode` с лимитами.
- Крипто: `ring`, `aws-lc-rs`, `rustls`, `argon2` (RustCrypto), `ed25519-dalek`, `chacha20poly1305`; `rand::rngs::OsRng` для секретов; `subtle::ConstantTimeEq` для сравнения; `zeroize` для ключей в памяти.
- Целые: `checked_*`/`saturating_*` для величин из ввода; overflow в release молчит без `overflow-checks = true`.
- Паника на входе = DoS: `unwrap()` на данных из ввода запрещён; `catch_unwind` не стратегия.
- Поставка: `cargo audit`, `cargo deny check` (advisories, licenses, bans, sources), `Cargo.lock` в git, `cargo vet` для критичных; `[profile.release] overflow-checks = true` для сервисов.
- napi/FFI в Node: граница — ввод; валидировать типы и длины на Rust-стороне; не паниковать через FFI.

## Postgres

- Роли: `api_app` (DML на нужные таблицы, `NOBYPASSRLS`), `migrator` (DDL, запускается только при деплое), `backup_ro` (`pg_read_all_data`), без `SUPERUSER` у приложений. `REVOKE CREATE ON SCHEMA public FROM PUBLIC`.
- `pg_hba.conf`: `local all all scram-sha-256` или `peer` для системных пользователей; `host … 127.0.0.1/32 scram-sha-256`; никакого `trust` и `0.0.0.0/0`; `listen_addresses = 'localhost'`.
- RLS: `ALTER TABLE core.offers ENABLE ROW LEVEL SECURITY; ALTER TABLE core.offers FORCE ROW LEVEL SECURITY; CREATE POLICY by_community ON core.offers USING (community_id = current_setting('app.community_id', true)::uuid);` — `true` во втором аргументе возвращает NULL, а не ошибку, если переменная не задана → политика отбрасывает всё (fail closed).
- `statement_timeout = '5s'` для роли приложения, `idle_in_transaction_session_timeout`, `lock_timeout`.
- Логи: `log_statement = 'ddl'`, `log_min_duration_statement = 1000`, `log_connections = on`; не `all` (ПДн).
- Чувствительные колонки: `pgcrypto` для полевого шифрования только с ключом из приложения, не из БД; blind index через HMAC для поиска по email.
- Гонки: уникальные индексы на бизнес-ключи (`(offer_id, responder_id)`), `UPDATE … WHERE status = 'pending' RETURNING id` и проверка `rowCount`, `SELECT … FOR UPDATE` для read-decide-write.
- Бэкап: `pg_dump -Fc` под `backup_ro`, `| age -r <pubkey>`, перенос по SSH с ключом `command=` ограничением, проверка `pg_restore --list` и регулярное тестовое восстановление в отдельную БД.
- Minor-обновления регулярно; `pg_stat_statements` для поиска аномальных запросов.

## nginx

```
server_tokens off;
ssl_protocols TLSv1.2 TLSv1.3; ssl_prefer_server_ciphers off;  # Mozilla intermediate
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'" always;  # уточнить под приложение
client_max_body_size 2m; client_body_timeout 10s; client_header_timeout 10s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
location /v1/auth/ { limit_req zone=auth burst=5 nodelay; proxy_pass …; }
location ~ /\. { deny all; }   # .git, .env
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme;
```
Отдельный `server` с другим доменом для пользовательских файлов, `add_header Content-Disposition attachment` для не-изображений, `default_server` с `return 444`.

## Flutter Web и браузерный клиент

- Клиент ничего не решает: показ контакта, роли, лимиты — только по ответу сервера.
- Токены: предпочтительно httpOnly-cookie сессия; если токен в памяти — не в `localStorage`/`sessionStorage`; при перезагрузке — refresh через cookie.
- `Html`/`WebView`/`dart:html` `innerHtml` — не использовать с данными; markdown-рендер без raw HTML; ссылки через `url_launcher` с проверкой схемы `https`.
- Секреты третьих сторон не вшиваются в сборку (всё в `main.dart.js` публично); вызовы — через свой API.
- CSP с nonce для `index.html` задаёт сервер; `flutter build web --csp` отключает `eval`-зависимые пути.
- Deep links и параметры URL — ввод: валидация `next`/`redirect` по allow-list.
- Версия Dart/Flutter и пакеты из `pubspec.lock`; `dart pub outdated`; издатели с верификацией на pub.dev.
- Мобильные сборки позже: certificate pinning с планом ротации, secure storage для токенов, запрет скриншотов на экранах с контактами (по необходимости).

## Telegram-боты и relay

- Токен бота — секрет вне git и образа; relay-сервис с allow-list методов (`getUpdates`, `sendMessage`, `sendChatAction`), аутентификацией вызывающего (mTLS/токен) и лимитами.
- Вебхук: `secret_token` в `setWebhook`, проверка `X-Telegram-Bot-Api-Secret-Token`; при polling — один потребитель, `allowed_updates` минимум.
- Привязка аккаунта: одноразовый код/deep-link `start=<token>` с TTL, хеш в БД; не по `username` (меняется, подделывается).
- Входящий текст — ввод: лимит длины, никаких команд из текста для LLM-инструментов, кодирование при показе в веб-клиенте, parse_mode-экранирование при отправке (`MarkdownV2` требует экранирования пользовательских строк, иначе инъекция форматирования и ссылок).
- Исходящие сообщения не содержат контактов до двух согласий; лог событий без текста.

## PM2 / systemd

PM2: отдельный пользователь, `pm2 startup` под ним, `env_file` 600, без `--watch` в проде, логи с ротацией (`pm2-logrotate`), `--max-memory-restart`. systemd (предпочтительно): `User=`, `NoNewPrivileges=true`, `ProtectSystem=strict`, `ProtectHome=true`, `PrivateTmp=true`, `PrivateDevices=true`, `ReadWritePaths=/var/lib/app`, `EnvironmentFile=/etc/app/env` (600), `CapabilityBoundingSet=`, `RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX`, `MemoryMax=`, `Restart=on-failure`, `RestartSec=5`.

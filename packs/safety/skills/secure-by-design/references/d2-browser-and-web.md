# D2. Браузер и веб-платформа

> Браузер исполняет чужой код от имени пользователя. Защита строится на двух опорах: правильное кодирование всего, что становится HTML/JS, и правильные заголовки, которые ограничивают, что чужой origin может сделать с нашим.

OWASP A05:2025 (XSS), A02:2025 (заголовки, CORS); CWE-79 XSS (#1 в CWE Top 25:2025), CWE-352 CSRF (#3), CWE-601 Open Redirect, CWE-1021 Clickjacking, CWE-942 CORS. ASVS 5.0: V3 Web Frontend Security, V5 File Handling, V12 Secure Communication.

## XSS: три вида, одна причина

| Вид | Где нагрузка | Где срабатывает | Пример |
|---|---|---|---|
| **Reflected** | В запросе | Сервер вставляет в ответ | `?q=<script>` в «вы искали: …» |
| **Stored** | В БД | Сервер отдаёт всем | Имя пользователя `<img onerror=…>` в списке |
| **DOM-based** | В URL/фрагменте/postMessage | Клиентский JS пишет в DOM | `el.innerHTML = location.hash` |

Причина одна: строка из ввода стала разметкой или кодом. Последствия: кража сессии (если cookie без httpOnly), действия от имени пользователя (всегда), фишинг внутри доверенного домена, кейлоггер, обход CSRF-защит.

### Защита, по приоритету

1. **Кодирование под контекст вывода** (OWASP XSS Prevention Cheat Sheet):

| Контекст | Что кодировать | Инструмент |
|---|---|---|
| HTML-тело `<div>…</div>` | `& < > " '` → `&amp;` и т. д. | Шаблонизатор с автоэкранированием (React/Flutter/Handlebars по умолчанию); никаких `dangerouslySetInnerHTML`, `innerHTML`, `v-html`, `bypassSecurityTrust` |
| HTML-атрибут `<a title="…">` | То же плюс всегда кавычки | То же |
| URL-атрибут `href`, `src` | Только allow-list схем `https:`, `mailto:`; `javascript:` и `data:` запрещены | Проверка схемы после парсинга URL, не regex |
| JS-строка внутри `<script>` | Не вставлять данные в JS. Если нужно — в `data-*` атрибут или JSON в `<script type="application/json">` с экранированием `</` | `JSON.stringify` + замена `<` на `<` |
| CSS | Не вставлять ввод в стили; allow-list значений | — |
| Пользовательский HTML (редактор) | Санитизация с allow-list тегов и атрибутов | DOMPurify на клиенте, аналог на сервере; хранить как есть, санитизировать при выводе |
| Markdown | Рендер с запретом raw HTML, ссылки через allow-list схем | Настройка рендерера |

2. **Content Security Policy** как второй эшелон. Минимально полезная: `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`. Nonce генерируется на каждый ответ из CSPRNG. `'unsafe-inline'` в `script-src` обнуляет защиту. Запускай сначала в `Content-Security-Policy-Report-Only` с `report-to`, потом enforce. Для SPA/Flutter Web nonce в index.html задаёт сервер.
3. **Trusted Types** (`require-trusted-types-for 'script'`): браузер запрещает запись строки в опасные стоки DOM. Работает в Chromium; дешёвая страховка для DOM XSS.
4. **Cookie `HttpOnly`** не лечит XSS, но убирает кражу сессии как самый дешёвый профит.
5. **Фреймворки**: автоэкранирование есть, но обходится. Ищи в коде: `innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML`, `eval`, `setTimeout(string)`, `location = userInput`, `dangerouslySetInnerHTML`, `v-html`, `[innerHTML]`, `bypassSecurityTrustHtml`, jQuery `.html()`, `$()` со строкой из ввода.

## CSRF

Браузер прикладывает cookie к любому запросу на ваш домен, даже с чужой страницы. Если действие меняет состояние по cookie без второго доказательства, чужой сайт выполнит его от имени пользователя.

Защита (нужны минимум две):
- **`SameSite=Lax`** (дефолт современных браузеров) или `Strict` на cookie сессии. `Lax` пропускает top-level GET-навигацию, поэтому GET не должен менять состояние.
- **Синхронизатор-токен** (в форме/заголовке, привязан к сессии) или **double-submit с подписью** (cookie + заголовок, значение подписано HMAC с сессией).
- Для API, который вызывается только JS: требование **кастомного заголовка** (`X-Requested-With`, `Content-Type: application/json` без простого CORS) — чужой origin не сможет его поставить без preflight. Но убедись, что CORS не разрешает его чужому origin.
- Проверка `Origin`/`Sec-Fetch-Site` на сервере для state-changing запросов: `Sec-Fetch-Site: cross-site` → отказ.
- Токены в заголовке `Authorization` (не cookie) CSRF не подвержены, но подвержены XSS-краже. Выбор — в `d3`.
- Login CSRF: залогинить жертву в аккаунт атакующего. Защита — тот же токен на форме входа и ротация сессии при входе.

## Cookie-флаги

`Secure` (только HTTPS) · `HttpOnly` (недоступна JS) · `SameSite=Lax|Strict` · префикс `__Host-` (требует Secure, без Domain, Path=/ — защищает от подмены поддоменом) · `Path` и `Domain` минимально широкие · `Max-Age` ограничен · значение — непредсказуемый id или подписанный blob, не данные.

## CORS

CORS **ослабляет** same-origin policy, не усиливает. Ошибки: `Access-Control-Allow-Origin: *` с `Allow-Credentials: true` (браузер запретит, но некоторые прокси «чинят»); отражение любого `Origin` в ответ; allow-list по подстроке (`endsWith('example.com')` пропускает `evil-example.com`); `null` origin. Правильно: точный allow-list origin'ов, `Vary: Origin`, минимальные методы и заголовки, credentials только когда нужны, короткий `Access-Control-Max-Age`. Если клиент и API на одном origin, CORS вообще не нужен.

## Clickjacking

Ваша страница в невидимом iframe поверх кнопки «Выиграть». Защита: `Content-Security-Policy: frame-ancestors 'none'` (или allow-list), `X-Frame-Options: DENY` для старых браузеров. Для действий с деньгами/согласием — подтверждение, которое нельзя кликнуть вслепую (повторный ввод, капча-подобный шаг).

## Открытые редиректы (CWE-601)

`?next=https://evil` после входа — фишинг с доверенного домена и утечка токенов в `Referer`. Защита: относительные пути из allow-list, проверка после парсинга URL (не `startsWith('/')`, т. к. `//evil.com` и `/\evil.com` — тоже внешние), маппинг «имя → путь» вместо URL в параметре.

## Транспорт

- **HSTS**: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`. Включать после уверенности, что весь трафик HTTPS.
- TLS 1.2+ (лучше только 1.3), современные шифры, редирект 80→443, отсутствие смешанного контента. Детали в `d6` и `d9`.
- **SRI** для скриптов с чужих CDN: `integrity="sha384-…" crossorigin="anonymous"`. Ещё лучше — не грузить чужой JS вовсе (supply chain, см. `d8`).

## Остальные заголовки безопасности

`X-Content-Type-Options: nosniff` · `Referrer-Policy: strict-origin-when-cross-origin` (или `no-referrer` для страниц с токенами в URL, которых быть не должно) · `Permissions-Policy: camera=(), microphone=(), geolocation=()` · `Cross-Origin-Opener-Policy: same-origin` и `Cross-Origin-Resource-Policy: same-site` (изоляция от Spectre и утечек через `window.opener`) · `Cache-Control: no-store` на ответах с личными данными · убрать `Server`, `X-Powered-By`. Проверка — securityheaders.com или Mozilla Observatory.

## postMessage, WebSocket, SSE

- `postMessage`: получатель проверяет `event.origin` по точному allow-list; отправитель указывает целевой origin, не `*`; данные — как ввод (валидация, никакого `eval`/`innerHTML`).
- WebSocket: handshake не защищён CORS — проверяй `Origin` на сервере (Cross-Site WebSocket Hijacking); аутентификация в первом сообщении или по cookie с SameSite; лимиты на размер и частоту сообщений; закрывать при истечении сессии.
- SSE: обычный GET — cookie с SameSite и проверка `Origin`; не отдавать чужие события (фильтр по сессии на сервере); ограничение числа соединений на пользователя; heartbeat и таймауты.

## Загрузка и отдача файлов

См. `d1-injection.md`, раздел «Файлы». Для браузера главное: отдавать пользовательский контент с **отдельного origin** (`usercontent.example.com` или sandbox-домен), чтобы SVG/HTML/PDF с JS не исполнялись в origin приложения; `Content-Disposition: attachment` для всего, что не картинка; `nosniff`; CSP `sandbox` на этом origin.

## HTTP на уровне протокола

- **Request smuggling** (CWE-444): расхождение в трактовке `Content-Length`/`Transfer-Encoding` между прокси и приложением. Защита: HTTP/2 end-to-end или один современный прокси, отклонять запросы с обоими заголовками, обновлять nginx/Node.
- **Cache poisoning**: кэш ключуется по URL, а ответ зависит от незакэшированного заголовка (`X-Forwarded-Host`). Защита: `Vary`, не отражать небезопасные заголовки, не кэшировать персональные ответы.
- **Host header**: не строить ссылки (сброс пароля!) из `Host`/`X-Forwarded-Host` — брать из конфига.
- **HTTP parameter pollution**: `?id=1&id=2` — какой возьмёт фреймворк? Валидация схемы отбрасывает массив там, где ждём скаляр.

## Вопросы для брейншторма

1. Где пользовательские строки попадают в HTML: имена, описания, сообщения ассистента, markdown? Через какой механизм кодирования?
2. Есть ли `innerHTML`/`dangerouslySetInnerHTML`/`v-html`/raw markdown в клиенте? Зачем?
3. Какой CSP сейчас? Есть ли `unsafe-inline` в `script-src`? Откуда грузятся скрипты и шрифты?
4. Какие флаги у cookie сессии? Есть ли state-changing GET?
5. Чем защищены POST/PUT/DELETE от CSRF, если клиент использует cookie?
6. Что в CORS allow-list и зачем? Нужен ли CORS вообще?
7. Куда ведут редиректы после входа и выхода? Кто формирует `next`?
8. С какого origin отдаются аватары и загруженные файлы?
9. Проверяется ли `Origin` на WebSocket/SSE?
10. Какие заголовки безопасности отдаёт edge, и проверены ли они сканером?

## Признаки проблемы

`innerHTML =` с данными · `script-src 'unsafe-inline'` · cookie без `HttpOnly`/`Secure`/`SameSite` · `Access-Control-Allow-Origin: *` при credentials · редирект по полному URL из параметра · аватары с основного домена с `Content-Type` от клиента · ссылка на сброс пароля строится из `Host`.

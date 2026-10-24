# Карта стандартов и глоссарий

## Какой стандарт для чего

| Стандарт | Что это | Когда открывать |
|---|---|---|
| **OWASP Top 10:2025** | Десять категорий риска веб-приложений, по данным и опросу | Язык для разговора с бизнесом, приоритизация, маппинг на домены (`SKILL.md`) |
| **OWASP Top 10:2021** | Предыдущая редакция | Старые отчёты и требования заказчиков |
| **OWASP API Security Top 10:2023** | Риски API | Проектирование и аудит API (`d5`) |
| **OWASP Top 10 for LLM:2025** | Риски LLM-приложений | Любая фича с моделью (`d12`) |
| **OWASP Top 10 for Agentic Applications:2026** | Риски агентов (ASI01–ASI10) | Агенты с инструментами (`d12`) |
| **OWASP ASVS 5.0** (2025) | Проверяемые требования по 17 главам и 3 уровням | Чеклист приёмки и ревью (`d13`) |
| **OWASP Cheat Sheet Series** | Практические инструкции по темам | Конкретный вопрос «как правильно» |
| **OWASP SAMM 2.0** | Модель зрелости процесса | Планирование процесса (`d13`) |
| **OWASP Automated Threats (OAT)** | 21 класс автоматизированных злоупотреблений | Боты и бизнес-логика (`d11`) |
| **OWASP Threat Dragon, pytm** | Инструменты моделирования угроз | DFD и STRIDE (`principles-and-threat-modeling.md`) |
| **CWE** / **CWE Top 25:2025** | Классификация слабостей кода; 25 самых опасных | Именование находок, фокус SAST |
| **CAPEC** | Классификация паттернов атак | Деревья атак |
| **CVE / NVD / OSV** | Реестры уязвимостей в продуктах и пакетах | SCA, реакция на CVE |
| **CVSS 4.0** | Оценка серьёзности уязвимости | Приоритизация конкретной находки |
| **EPSS** | Вероятность эксплуатации CVE | Приоритизация патчей |
| **CISA KEV** | Каталог эксплуатируемых уязвимостей | «Чинить немедленно» |
| **MITRE ATT&CK** | Тактики и техники противника | Детекция, red team, разбор инцидентов |
| **MITRE ATLAS** | ATT&CK для ML-систем | Угрозы моделям (`d12`) |
| **NIST CSF 2.0** (2024) | Функции Govern/Identify/Protect/Detect/Respond/Recover | Структура программы безопасности |
| **NIST SP 800-53 r5** | Каталог контролей | Требования заказчиков, госсектор |
| **NIST SP 800-63-4** (2025) | Цифровая идентичность: A (проверка личности), B (аутентификация), C (федерация) | Пароли, MFA, passkeys, восстановление (`d3`) |
| **NIST SP 800-207** | Zero Trust Architecture | Архитектура доступа (`principles-and-threat-modeling.md`) |
| **NIST SP 800-61r3** (2025) | Реагирование на инциденты | План инцидента (`d10`) |
| **NIST SP 800-218 SSDF** | Практики безопасной разработки | Процесс (`d13`) |
| **NIST AI RMF** | Управление рисками ИИ | Политика ИИ (`d12`) |
| **SLSA v1.0** | Уровни целостности цепочки поставки | Сборка и артефакты (`d8`) |
| **CycloneDX / SPDX** | Форматы SBOM | Инвентарь зависимостей (`d8`) |
| **Sigstore / cosign** | Подпись артефактов и provenance | Подпись образов и релизов (`d8`) |
| **OpenSSF Scorecard** | Оценка здоровья open-source проекта | Выбор зависимостей (`d8`) |
| **CIS Benchmarks** | Чеклисты харденинга ОС, БД, контейнеров, облаков | Хост и Postgres (`d9`) |
| **CISA Secure by Design** (2023) | Принципы ответственности производителя | Аргументы для безопасных дефолтов |
| **ISO/IEC 27001:2022** | СМИБ, сертифицируемый стандарт | Когда требуют заказчики |
| **ISO/IEC 27701** | Расширение для приватности | Программа приватности |
| **SOC 2** | Аттестация контролей (Trust Services Criteria) | B2B-продажи в США |
| **PCI DSS 4.0** | Платёжные карты | Платежи: не хранить карты, провайдер |
| **GDPR** | Защита данных в ЕС | Пользователи из ЕС (`d7`) |
| **152-ФЗ** | Персональные данные в РФ | Пользователи из РФ (`d7`) |
| **Приказ ФСТЭК № 21** | Меры защиты ПДн в ИСПДн по уровням защищённости | Когда определён уровень защищённости |
| **ГОСТ Р 56939-2024** | Безопасная разработка ПО (РФ) | Требования госзаказчиков |
| **RFC 9700** (2025) | OAuth 2.0 Security Best Current Practice | OAuth/OIDC (`d3`) |
| **RFC 9116** | security.txt | Раскрытие уязвимостей (`d10`) |
| **WebAuthn L3 / FIDO2** | Passkeys | Фишинг-устойчивый вход (`d3`) |

## OWASP Top 10: 2021 → 2025

| 2021 | 2025 | Что изменилось |
|---|---|---|
| A01 Broken Access Control | A01 Broken Access Control | Остался первым; поглотил SSRF (A10:2021) |
| A02 Cryptographic Failures | A04 Cryptographic Failures | Опустился |
| A03 Injection | A05 Injection | Опустился; XSS внутри |
| A04 Insecure Design | A06 Insecure Design | Опустился |
| A05 Security Misconfiguration | A02 Security Misconfiguration | Поднялся на три позиции |
| A06 Vulnerable and Outdated Components | A03 Software Supply Chain Failures | Расширен до всей цепочки поставки, третье место |
| A07 Identification and Authentication Failures | A07 Authentication Failures | Переименован |
| A08 Software and Data Integrity Failures | A08 Software or Data Integrity Failures | Сохранён |
| A09 Security Logging and Monitoring Failures | A09 Security Logging & Alerting Failures | Акцент на алерты |
| A10 SSRF | — | Влит в A01 |
| — | A10 Mishandling of Exceptional Conditions | Новая: обработка ошибок, fail open, нештатные условия |

## ASVS 5.0: главы

V1 Encoding and Sanitization · V2 Validation and Business Logic · V3 Web Frontend Security · V4 API and Web Service · V5 File Handling · V6 Authentication · V7 Session Management · V8 Authorization · V9 Self-contained Tokens · V10 OAuth and OIDC · V11 Cryptography · V12 Secure Communication · V13 Configuration · V14 Data Protection · V15 Secure Coding and Architecture · V16 Security Logging and Error Handling · V17 WebRTC. Уровни L1 (минимум), L2 (стандарт для продуктов с данными), L3 (критичные). Авторитетный текст — github.com/OWASP/ASVS.

## CWE Top 25:2025

Опубликован MITRE/CISA в ноябре 2025 по данным ~39 000 CVE. Полный список и методика — cwe.mitre.org/top25. Порядок:

| # | CWE | Название | Домен |
|---|---|---|---|
| 1 | CWE-79 | Cross-site Scripting | D2 |
| 2 | CWE-89 | SQL Injection | D1 |
| 3 | CWE-352 | Cross-Site Request Forgery | D2 |
| 4 | CWE-862 | Missing Authorization | D4 |
| 5 | CWE-787 | Out-of-bounds Write | память (C/C++/unsafe Rust) |
| 6 | CWE-22 | Path Traversal | D1 |
| 7 | CWE-416 | Use After Free | память |
| 8 | CWE-125 | Out-of-bounds Read | память |
| 9 | CWE-78 | OS Command Injection | D1 |
| 10 | CWE-94 | Code Injection | D1 |
| 11 | CWE-120 | Classic Buffer Overflow | память |
| 12 | CWE-434 | Unrestricted Upload of File with Dangerous Type | D1, D2 |
| 13 | CWE-476 | NULL Pointer Dereference | D10 |
| 14 | CWE-121 | Stack-based Buffer Overflow | память |
| 15 | CWE-20 | Improper Input Validation | D1 |
| 16 | CWE-122 | Heap-based Buffer Overflow | память |
| 17 | CWE-200 | Exposure of Sensitive Information | D7, D10 |
| 18 | CWE-863 | Incorrect Authorization | D4 |
| 19 | CWE-284 | Improper Access Control | D4 |
| 20 | CWE-918 | Server-Side Request Forgery | D5 |
| 21 | CWE-190 | Integer Overflow or Wraparound | D1, D11 |
| 22 | CWE-77 | Command Injection | D1 |
| 23 | CWE-502 | Deserialization of Untrusted Data | D1 |
| 24 | CWE-639 | Authorization Bypass Through User-Controlled Key | D4 |
| 25 | CWE-770 | Allocation of Resources Without Limits or Throttling | D5 |

Позиции 12–23 — по редакции 2025; при цитировании в отчётах сверяй с официальной страницей. Для сервисов на Node/Rust-safe большинство «памятных» CWE не применимы, зато 1–4, 6, 9, 10, 12, 15, 17–25 — ежедневная практика.

## Другие часто цитируемые CWE

CWE-287 Improper Authentication · CWE-307 нет лимита попыток · CWE-384 Session Fixation · CWE-613 нет истечения сессии · CWE-640 слабое восстановление · CWE-798 жёстко прошитые учётные данные · CWE-327/328 слабая криптография · CWE-330/338 слабая случайность · CWE-916 хеш пароля без растяжения · CWE-347 нет проверки подписи · CWE-532 чувствительное в логах · CWE-209 ошибка раскрывает лишнее · CWE-755 неправильная обработка исключений · CWE-636 fail open · CWE-117 лог-инъекция · CWE-611 XXE · CWE-1333 ReDoS · CWE-915 mass assignment · CWE-1321 prototype pollution · CWE-1336 SSTI · CWE-601 open redirect · CWE-942 CORS · CWE-1021 clickjacking · CWE-444 request smuggling · CWE-362 race condition · CWE-367 TOCTOU · CWE-840 business logic · CWE-799 нет контроля частоты · CWE-1395 уязвимая зависимость · CWE-829 код из ненадёжной сферы · CWE-494 загрузка без проверки целостности · CWE-250 лишние привилегии · CWE-276 неверные права по умолчанию · CWE-1188 небезопасные дефолты · CWE-359 утечка личной информации.

## Глоссарий

**AAL** — Authentication Assurance Level (NIST 800-63B), уровень уверенности в аутентификации, 1–3.
**ABAC / RBAC / ReBAC** — модели доступа по атрибутам / ролям / отношениям.
**AEAD** — шифрование с аутентификацией (AES-GCM, ChaCha20-Poly1305): конфиденциальность и целостность одной операцией.
**ATO** — Account Takeover, захват аккаунта.
**BFLA / BOLA / BOPLA** — сломанная авторизация на уровне функции / объекта / свойства объекта (API Top 10).
**BFF** — Backend for Frontend: сервер, хранящий токены за клиент и выдающий ему cookie-сессию.
**CSP** — Content Security Policy, заголовок, ограничивающий источники скриптов и ресурсов.
**CSPRNG** — криптографически стойкий генератор случайных чисел.
**CSRF** — подделка межсайтового запроса: чужой сайт заставляет браузер отправить запрос с вашей cookie.
**CVSS / EPSS / KEV** — оценка серьёзности / вероятность эксплуатации / список реально эксплуатируемых.
**DAST / SAST / SCA / IAST** — тестирование снаружи (динамическое) / анализ кода (статический) / анализ зависимостей / инструментированное.
**DFD** — диаграмма потоков данных с границами доверия.
**DPA** — Data Processing Agreement, договор с обработчиком ПДн.
**Envelope encryption** — данные шифруются ключом данных (DEK), который шифруется мастер-ключом (KEK).
**Fail open / fail closed** — при ошибке пропускать / отказывать.
**IDOR** — Insecure Direct Object Reference, доступ к чужому объекту по id; частный случай BOLA.
**Least privilege** — минимум прав на минимум времени.
**Lethal trifecta** — приватные данные + недоверенный контент + канал наружу в одной LLM-системе.
**LINDDUN** — методика угроз приватности.
**Magic link** — одноразовая ссылка для входа.
**Mass assignment** — запись в поля модели напрямую из тела запроса.
**MFA / step-up** — несколько факторов / повторная аутентификация для чувствительного действия.
**mTLS** — взаимная TLS-аутентификация сервисов.
**Passkey** — учётные данные WebAuthn/FIDO2, фишинг-устойчивые, синхронизируемые.
**PKCE** — Proof Key for Code Exchange, защита кода авторизации OAuth.
**Prompt injection** — инструкции в данных, меняющие поведение модели; прямая и косвенная.
**Provenance / SLSA** — подтверждение, кто и из чего собрал артефакт; уровни зрелости сборки.
**ReDoS** — отказ в обслуживании через регулярное выражение с катастрофическим backtracking.
**RLS** — Row Level Security в Postgres, политики доступа к строкам.
**SBOM** — Software Bill of Materials, список компонентов артефакта.
**SRI** — Subresource Integrity, хеш для внешнего скрипта.
**SSRF** — сервер делает запрос по URL, подконтрольному атакующему.
**SSTI** — инъекция в серверный шаблон.
**STRIDE** — Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege.
**TOCTOU** — Time-of-check to time-of-use, гонка между проверкой и использованием.
**Trust boundary** — граница, за которой меняется уровень доверия к данным и субъектам.
**XSS** — выполнение чужого скрипта в контексте вашего сайта.
**XXE** — внешние сущности XML, чтение файлов и SSRF через парсер.
**Zero Trust** — ни одному запросу не доверяют по признаку сети; каждый аутентифицируется и авторизуется.

---
name: micro-markup
description: >-
  Audits and authors share metadata (Open Graph, Twitter Cards) and Schema.org JSON-LD for
  public pages: canonical URL, og:image card, Organization, WebSite, Service, Course,
  BreadcrumbList, FAQPage. Use when adding микроразметка, Open Graph, og:image, Twitter cards,
  JSON-LD, schema markup, structured data, Rich Results, share preview, Telegram/WhatsApp/Slack
  preview, or when a public page or landing ships.
---

# Микроразметка

Два независимых слоя. Не смешивать их назначение.

| Слой | Для кого | Механизм |
| ---- | -------- | -------- |
| Share | Telegram, WhatsApp, Slack, LinkedIn, Facebook, X | Open Graph + Twitter Cards в **серверном** HTML |
| SEO-граф | Поисковики, AI-ассистенты | JSON-LD Schema.org, каркасы в [templates.md](templates.md) |

Telegram **не** имеет своей микроразметки и **почти не** читает JSON-LD. Превью ссылки строится по
Open Graph из первого HTML-ответа. Не добавлять OG только через клиентский JS. Не переписывать
JSON-LD «ради Telegram».

Если в проекте есть свой скилл или документ с контрактом SEO-полей (имя организации, каноникал,
CDN, маршруты, пути в коде), сначала прочитай его: значения берутся оттуда, а не из примеров ниже.

## Правило совпадения

Размечайте только то, что показано на странице: название, описание, услуги, курс, FAQ, люди, цены,
контакты. Title/description/og:image должны совпадать с видимым смыслом страницы.

Не копируй имена из шаблонов, если на сайте другое. Не выдумывай email, телефон, адрес, рейтинги и
курсы «на будущее».

## Слой A — share (Open Graph / Twitter)

### Обязательно на каждой публичной странице

Один нормализованный абсолютный URL в трёх местах: `link rel="canonical"`, `og:url`, `twitter:url`.
Главная — со слешем на конце (`https://example.com/`), одинаково во всех трёх полях.

Open Graph (серверный HTML):

- `og:title`, `og:description`
- `og:url` = canonical
- `og:site_name` — имя бренда как на сайте
- `og:locale` — например `ru_RU`
- `og:type` = `website` (или `article` для статей)
- `og:image` — абсолютный HTTPS URL
- `og:image:secure_url` — тот же URL
- `og:image:type` — реальный MIME (`image/jpeg` или `image/png`)
- `og:image:width`, `og:image:height` — **реальные** пиксели файла, не выдуманные 1200×630
- `og:image:alt`

Twitter Card:

- `twitter:card` = `summary_large_image`
- `twitter:title`, `twitter:description`
- `twitter:url` = canonical
- `twitter:image`
- `twitter:image:alt`

Тексты — из контента страницы, не хардкод длинных копий в layout.

### Карточка изображения

Перед публикацией `curl -I` по URL картинки:

- HTTP 200, HTTPS, без авторизации, cookies, JS-челленджа, hotlink-защиты
- `Content-Type: image/jpeg` или `image/png`
- ориентир размера 1200×630 (≈1.91:1); если файл другой — в мета пиши фактические width/height
- вес желательно ≤ 1–2 МБ
- важный текст и логотип в центральной зоне, без мелкого текста «для превью»

У главной — карточка бренда. У значимых посадочных — своя карточка, а не общая картинка главной.

### Карточки по маршрутам

Уникальные title, description, canonical, og:url, og:image у каждого значимого маршрута: главная,
каталог, «о нас», страницы продуктов и услуг, статьи. Составь таблицу «маршрут → карточка» и сверяй
с ней.

### Проверка share

`curl -L https://example.com/` (и другие маршруты) содержит `property="og:*"` и `name="twitter:*"`
в первом ответе, не после гидратации.

После деплоя Telegram кеширует превью: проверяй в новом чате; query `?preview=…` только для теста и
не должен попадать в `og:url`/canonical; публичные ссылки без тестовых параметров.

Внешние отладчики: Facebook Sharing Debugger, LinkedIn Post Inspector, X Card Validator, фактическая
отправка в Slack/WhatsApp.

### Next.js

- Метаданные — `generateMetadata()` на маршруте и общий helper для полей страницы.
- `metadataBase` не гарантирует слеш у корня: канонический URL главной часто приходится рисовать
  самому, а `og:url` держать **тем же** URL. После сборки всегда сверяй rendered HTML.
- `<script type="application/ld+json">` внутри компонента попадёт в body: по возможности выводи
  JSON-LD из layout или metadata в `<head>`, не внутри визуальных секций. Не ломай серверные OG-теги
  ради переноса JSON-LD.

## Слой B — JSON-LD (Schema.org)

Каркасы: [templates.md](templates.md). JSON-LD не заменяет Open Graph. Не меняй граф, чтобы
«починить Telegram».

### Приоритет типов

| Приоритет | Разметка | Где | Зачем |
| --------- | -------- | --- | ----- |
| Критичный | Organization или ProfessionalService | Главная, единообразно на сайте | Компания, имя, URL, логотип, соцсети |
| Высокий | WebSite | Весь сайт | Связь с организацией; SearchAction — только при живом поиске |
| Высокий | Service | Страницы и блоки услуг | Отдельные услуги, не один общий description |
| Высокий | Course | Посадочные курсов | Только если страница курса есть |
| Средний | BreadcrumbList | Вложенные страницы | Структура разделов |
| Средний | FAQPage | Только видимый FAQ | Не прятать вопросы ради сниппета |
| Условный | Person | Страница эксперта | Реальные профили |
| Условный | Review / AggregateRating | Проверяемые отзывы | Не выдумывать |

Стабильные `@id`: `https://example.com/#organization`, `https://example.com/#website`, услуги
`https://example.com/#<slug>`, курс `https://example.com/<slug>#course`.

Нет внутреннего поиска — не добавляй `SearchAction`. Нет офлайн-адреса — не `LocalBusiness`.
Удалённая работа — `ProfessionalService` или `Organization`. Имя в схеме — как на сайте.

### Рабочий цикл JSON-LD

1. Эталон — видимый HTML и контент страницы: имя, лид, услуги, FAQ, ссылки.
2. Что можно разметить по таблице — и чего на сайте ещё нет.
3. `@graph` со стабильными `@id`. Каркас из templates.md, поля без факта выкинуть.
4. Код: один builder графа и один компонент тега. Тексты — из контента. `sameAs` — только ссылки,
   которые уже есть на сайте.
5. Вложенные страницы — BreadcrumbList. FAQPage/Course — только при видимом блоке или посадочной.
6. В HTML есть `application/ld+json`, `@id` организации один, описания совпадают с h1/лидом.
7. Валидаторы: [Schema Markup Validator](https://validator.schema.org/),
   [Rich Results Test](https://search.google.com/test/rich-results). Валидность ≠ расширенный сниппет.

## Аудит

Не выдумывай услуги и курсы. Веди снимок разметки проекта (что размечено, где, дата проверки, зазор
с сайтом) рядом с SEO-контрактом проекта и обновляй его после сдачи share и JSON-LD.

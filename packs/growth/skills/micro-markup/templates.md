# Каркасы JSON-LD

Поля в угловых скобках необходимо заполнить реальными данными; не следует добавлять адрес, телефон,
логотип, соцсети или цены, если их нет на сайте либо они неактуальны. `https://example.com` —
замените на домен проекта.

## Главная: связанный @graph

```
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ProfessionalService",
      "@id": "https://example.com/#organization",
      "name": "<имя как на сайте>",
      "url": "https://example.com/",
      "description": "<описание как в лиде главной>",
      "logo": {
        "@type": "ImageObject",
        "url": "https://<cdn>/<путь-к-логотипу>"
      },
      "email": "<публичный-email>",
      "telephone": "<публичный-телефон>",
      "sameAs": [
        "<URL-на-Telegram>",
        "<URL-на-другую-подтверждённую-соцсеть>"
      ],
      "areaServed": {
        "@type": "Country",
        "name": "<страна>"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://example.com/#website",
      "url": "https://example.com/",
      "name": "<имя сайта>",
      "publisher": {
        "@id": "https://example.com/#organization"
      },
      "inLanguage": "ru-RU"
    },
    {
      "@type": "Service",
      "@id": "https://example.com/#<slug-услуги>",
      "name": "<название услуги как на странице>",
      "provider": {
        "@id": "https://example.com/#organization"
      },
      "description": "<описание услуги как на странице>"
    }
  ]
}
</script>
```

Имя и description бери из видимого HTML. Логотип — абсолютный URL реально существующего файла.

`email` / `telephone` в граф не ставь, пока их нет в публичном контенте. `sameAs` — только URL,
которые уже стоят в футере или в тексте.

Отдельные `Service` добавляй, когда блок услуги реально есть на странице. Не склеивай разные услуги
в один description.

## Курс

У каждого курса — собственная посадочная страница и отдельный блок Course. Пока посадочной нет — блок
**не** публиковать.

```
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Course",
  "@id": "https://example.com/<slug-kursa>#course",
  "name": "<точное-название-курса>",
  "description": "<описание, полностью соответствующее тексту страницы>",
  "url": "https://example.com/<slug-kursa>",
  "inLanguage": "ru-RU",
  "provider": {
    "@type": "Organization",
    "@id": "https://example.com/#organization",
    "name": "<имя организации>",
    "sameAs": "https://example.com/"
  },
  "hasCourseInstance": {
    "@type": "CourseInstance",
    "courseMode": "online",
    "inLanguage": "ru-RU"
  }
}
</script>
```

## BreadcrumbList

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Главная", "item": "https://example.com/" },
    { "@type": "ListItem", "position": 2, "name": "<раздел>", "item": "https://example.com/<раздел>" }
  ]
}
```

## FAQPage (только видимый FAQ)

```json
{
  "@type": "FAQPage",
  "@id": "https://example.com/<страница>#faq",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "<вопрос как в HTML>",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "<ответ как в HTML>"
      }
    }
  ]
}
```

Вопросы и ответы копируй дословно со страницы. Не добавляй FAQPage на страницы без видимого FAQ.

# Multilingual Content Guide

## Goal

Keep the project simple for both frontend and backend:

- UI labels and static messages stay in `i18n`
- Dynamic content comes from the backend in a bilingual shape
- Frontend reads that content through one shared helper

## 1. Use `i18n` only for UI text

Examples:

- navbar labels
- button text
- validation messages
- empty states
- section titles

Examples in code:

```js
t.nav_home
t.login_title
t.footer_contact
```

Do not store product names, article titles, doctor bios, or pharmacy descriptions inside the UI translation file.

## 2. Backend content shape

Use this shape for any field that should support Arabic and English:

```json
{
  "name": {
    "ar": "بانادول اكسترا",
    "en": "Panadol Extra"
  },
  "description": {
    "ar": "مسكن للألم وخافض للحرارة",
    "en": "Pain reliever and fever reducer"
  }
}
```

This is the preferred contract for:

- medicines
- pharmacies
- doctors
- articles
- categories
- dashboard cards if they come from the backend

## 3. Supported locales

The project currently supports:

- `ar`
- `en`

If a translation is missing, frontend should fall back in this order:

1. requested locale
2. Arabic
3. English

## 4. Frontend helper

Use:

```js
import { getLocalizedText } from "./src/utils/localization";
```

Example:

```jsx
const { lang } = useLang();

<h1>{getLocalizedText(product.name, lang)}</h1>
<p>{getLocalizedText(product.description, lang)}</p>
```

This helper also supports old plain strings, so migration can happen gradually.

## 5. Recommended frontend hook

For daily usage inside React components, use:

```js
import { useLocalizedContent } from "./src/hooks/useLocalizedContent";
```

Example:

```jsx
const { text, list, entity, isRtl } = useLocalizedContent();

<h1>{text(product.name)}</h1>
<p>{text(product.description)}</p>
```

This keeps components simple and avoids repeating locale logic on every page.

## 6. Migration rule

Old shape:

```json
{
  "name": "بانادول اكسترا"
}
```

New shape:

```json
{
  "name": {
    "ar": "بانادول اكسترا",
    "en": "Panadol Extra"
  }
}
```

Frontend helper accepts both during migration.

## 7. Recommended API examples

### Medicine

```json
{
  "id": 1,
  "name": {
    "ar": "بانادول اكسترا",
    "en": "Panadol Extra"
  },
  "description": {
    "ar": "مسكن للألم وخافض للحرارة",
    "en": "Pain reliever and fever reducer"
  },
  "category": {
    "ar": "مسكنات",
    "en": "Pain relief"
  },
  "activeIngredient": {
    "ar": "باراسيتامول + كافيين",
    "en": "Paracetamol + Caffeine"
  }
}
```

### Pharmacy

```json
{
  "id": 15,
  "name": {
    "ar": "صيدلية العزبي - التجمع",
    "en": "El Ezaby Pharmacy - Tagamoa"
  },
  "area": {
    "ar": "التجمع الخامس",
    "en": "Fifth Settlement"
  }
}
```

### Article

```json
{
  "id": 8,
  "title": {
    "ar": "أهمية شرب الماء للصحة العامة",
    "en": "The Importance of Drinking Water for General Health"
  },
  "excerpt": {
    "ar": "الماء هو أساس الحياة...",
    "en": "Water is the foundation of life..."
  }
}
```

## 8. Backend team rules

- Always send bilingual values for content fields whenever possible
- Keep locale keys stable: only `ar` and `en`
- Do not send mixed shapes for the same field in the same API response unless migration is temporary
- Brand names can stay identical in both languages when appropriate
- If automatic translation is used, save the result so content is stable and reviewable

## 9. Frontend team rules

- Use `i18n` for UI
- Use `getLocalizedText()` for backend content
- Prefer `useLocalizedContent()` inside React components
- Do not write repeated `lang === "ar" ? ... : ...` for dynamic content
- Migrate page by page without breaking old string-based data

## 10. Practical adoption order

1. Medicines
2. Pharmacies
3. Doctors
4. Articles
5. Admin/doctor/pharmacy dashboards

## 11. Helper reference

The shared helper lives here:

- [src/utils/localization.js](src/utils/localization.js)
- [src/hooks/useLocalizedContent.js](src/hooks/useLocalizedContent.js)

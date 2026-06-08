// i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en', // ← this handles / → /en automatically
});

export type Locale = (typeof routing.locales)[number];
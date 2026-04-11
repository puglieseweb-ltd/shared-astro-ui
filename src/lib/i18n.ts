/**
 * Shared i18n utilities for Astro websites.
 *
 * Translation files (en.json, it.json, etc.) live in each product repo.
 * These utilities are generic — they accept translations as a parameter.
 */

export function getLangFromUrl(
  url: URL,
  supportedLangs: string[],
  defaultLang: string = 'en',
): string {
  const [, lang] = url.pathname.split('/');
  if (lang && supportedLangs.includes(lang)) return lang;
  return defaultLang;
}

export function useTranslations(
  translations: Record<string, Record<string, unknown>>,
  lang: string,
  replacements?: Record<string, string>,
) {
  const t = translations[lang] ?? translations[Object.keys(translations)[0]];

  return function translate(key: string): string {
    const parts = key.split('.');
    let value: unknown = t;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }
    if (typeof value !== 'string') return key;
    if (!replacements) return value;
    return Object.entries(replacements).reduce(
      (result, [k, v]) => result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v),
      value,
    );
  };
}

export function getLocalePath(
  path: string,
  lang: string,
  defaultLang: string = 'en',
): string {
  if (lang === defaultLang) return path;
  return `/${lang}${path}`;
}

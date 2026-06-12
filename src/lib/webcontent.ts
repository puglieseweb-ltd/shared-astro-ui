/**
 * Build-time content fetcher — reads active content from the chatbot
 * content API (backed by DynamoDB).
 *
 * Falls back to null when the API is unavailable (local dev, missing
 * credentials), allowing callers to use i18n defaults.
 *
 * Usage in an Astro page:
 *   import { createWebContent } from '@puglieseweb-ltd/shared-astro-ui/lib/webcontent';
 *   const wc = createWebContent({ apiBase: '...', tenantId: '...' });
 *   const headline = await wc.getActiveContent('homepage-slogan', 'en');
 */

export interface WebContentConfig {
  /** Content API base URL (e.g. "https://api.puglieseweb.com/chatbot") */
  apiBase: string;
  /** Tenant identifier (e.g. "puglieseweb", "hookedonhair") */
  tenantId: string;
  /** Request timeout in milliseconds (default: 5000) */
  timeoutMs?: number;
}

export interface ContentVariant {
  /** Active variant object with locale keys (e.g. { en: "...", it: "..." }) */
  [locale: string]: string;
}

export interface ContentItem {
  contentKey: string;
  type: string;
  activeIndex: number;
  activeVariant: ContentVariant;
  variants: ContentVariant[];
  updatedAt: string;
}

export function createWebContent(config: WebContentConfig) {
  const { apiBase, tenantId, timeoutMs = 5000 } = config;

  /**
   * Fetch the active variant for a content key at build time.
   *
   * @param key     Content key (e.g. "homepage-slogan")
   * @param locale  Locale code (e.g. "en", "it")
   * @returns       The active text for the given locale, or null if unavailable
   */
  async function getActiveContent(
    key: string,
    locale: string,
  ): Promise<string | null> {
    try {
      const url = `${apiBase}/content/${tenantId}?key=${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) return null;

      const data: ContentItem = await res.json();
      const variant = data?.activeVariant;
      if (!variant) return null;

      return variant[locale] || variant['en'] || null;
    } catch (err) {
      console.log(
        `[webcontent] Could not fetch "${key}": ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  /**
   * Fetch all active content items for the tenant, optionally filtered by type.
   */
  async function getAllContent(type?: string): Promise<ContentItem[]> {
    try {
      const params = type ? `?type=${encodeURIComponent(type)}` : '';
      const url = `${apiBase}/content/${tenantId}${params}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) return [];

      const data = await res.json();
      return data?.items || [];
    } catch (err) {
      console.log(
        `[webcontent] Could not fetch content: ${err instanceof Error ? err.message : err}`,
      );
      return [];
    }
  }

  return { getActiveContent, getAllContent };
}

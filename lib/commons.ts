/**
 * Помошници за Wikimedia Commons.
 *
 * Во мастерот колоната „Слика (Wikimedia Commons)“ содржи **страници** од
 * Commons (`/wiki/File:…` или `/wiki/Category:…`), не директни слики. Ако ги
 * ставиме во `<img src>`, браузерот добива HTML и прикажува скршена слика.
 *
 * Затоа:
 *  - `File:` страниците ги претвораме во `Special:FilePath` - стабилен
 *    redirect на upload.wikimedia.org со thumbnails,
 *  - `Category:` страниците немаат еквивалент, па не добиваат `<img>`.
 */

const COMMONS_BASE = 'https://commons.wikimedia.org/wiki/';

/**
 * Го враќа директниот линк до сликата ако изворот е `File:`-страница,
 * инаку `null`. `width` = 800 px е доволно за картичката (600 CSS px @2x).
 */
export function commonsImageUrl(url: string | null, width = 800): string | null {
  if (!url) return null;
  const prefix = `${COMMONS_BASE}File:`;
  if (!url.startsWith(prefix)) return null;
  const file = decodeURIComponent(url.slice(prefix.length));
  if (!file) return null;
  return `${COMMONS_BASE}Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
}

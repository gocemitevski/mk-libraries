/**
 * Домени што повеќе не постојат: DNS враќа NXDOMAIN (проверено 14.11.2026).
 * Записот во базата останува како што е — го покажува она што го навел
 * изворот — но страницата не прави активна врска до мртов домен, за да не
 * испраќа посетители (и пребарувачи) во празно.
 */
const DEAD_HOSTS = new Set([
  'nubgdst.edu.mk',
  'bibliotekagevgelija.edu.mk',
  'biblioteka-kumanovo.eu.mk',
]);

/** Дали адресата покажува на домен што повеќе не постои. */
export function isDeadSite(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return DEAD_HOSTS.has(new URL(url).hostname.replace(/^www\./, '').toLowerCase());
  } catch {
    return false;
  }
}

/** Враќа href само ако доменот сè уште постои; инаку null (се прикажува без врска). */
export function websiteHref(url: string | null | undefined): string | null {
  return url && !isDeadSite(url) ? url : null;
}

/** Транслитерација и нормализација — се користат за слагови, пребарување и сортирање. */

const MK_TO_LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ѓ: 'gj', е: 'e', ж: 'zh', з: 'z', и: 'i',
  ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', ќ: 'kj', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', џ: 'dz', ш: 'sh',
};

/** Кирилица → латиница (македонска транслитерација). Незнаечките знаци остануваат. */
export function translit(input: string): string {
  let out = '';
  for (const ch of input.toLowerCase()) out += MK_TO_LAT[ch] ?? ch;
  return out;
}

/** Општа нормализација за пребарување: мали букви, без интерпункција, единечни празнини. */
export function normalizeForSearch(input: string): string {
  return input
    .toLowerCase()
    .replace(/[„“”"'’`«»]/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Нормализирана латинична форма — се спојува со кириличната во индексот за пребарување. */
export function normalizeAscii(input: string): string {
  return normalizeForSearch(translit(input));
}

/** Слаг за URL: транслитериран, само мали букви/цифри, разделени со цртички. */
export function slugify(input: string): string {
  return normalizeAscii(input).replace(/\s+/g, '-');
}

/** Раздвојува повеќе вредности во една ќелија: „а; б“ или „а\nб“. */
export function splitMulti(input: string): string[] {
  return input
    .split(/[;\n]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Ги отстранува телефонските броеви од текст — се користи за контакт-лица,
 * каде објавуваме име и функција, но не приватни броеви (план §4.7).
 */
export function stripPhoneNumbers(input: string): string {
  return input
    .replace(/тел\.?\s*:?\s*[+0-9][0-9\s\-()/.]*/gi, ' ')
    .replace(/\b(?:лок|lok)\.?\s*:?\s*\d+/gi, ' ')
    .replace(/\+389[\d\s\-()]+/g, ' ')
    .replace(/\b0\d{2}[\d\s\-()]{5,}\d\b/g, ' ')
    .replace(/[/|]\s*/g, ' ')
    .replace(/\s*,\s*,\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/(?:\s*[,:;]\s*)+$/, '')
    .trim();
}

/** Дали текстот изгледа како домен (ќелии со веб-адреси се без протокол). */
export function looksLikeHost(input: string): boolean {
  const v = input.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
  if (/\s/.test(v)) return false;
  return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s]*)?$/i.test(v);
}

/**
 * Нормализира веб-адреса: додава https://, го отстранува www, ја чува патеката.
 * Враќа null ако ќелијата не е веб-адреса (некои ќелии содржат проза).
 */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (!looksLikeHost(raw)) return null;
  const withoutScheme = raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
  return `https://${withoutScheme}`;
}

/** Датум „12.10.2026“ → „2026-10-12“; ако не е таков формат, враќа null. */
export function parseDdMmYyyy(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Ги раздвојува „Извор: вредност“ редови (адреси, работно време по извор). */
export function parseLabeledLines(input: string): { source: string; value: string }[] {
  const out: { source: string; value: string }[] = [];
  for (const line of input.split(/\n+/g)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^([^:]{1,40}):\s*(.+)$/);
    if (m) out.push({ source: m[1].trim(), value: m[2].trim() });
    else out.push({ source: 'извор', value: trimmed });
  }
  return out;
}

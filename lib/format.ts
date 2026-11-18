/** Форматирање на броеви и датуми на македонски. */

const numberFormat = new Intl.NumberFormat('mk-MK');

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/**
 * Трите множински форми: еднина / родителен (2–4) / множина.
 * Пример за „запис“: 1 запис, 21 запис, 22 записа, 152 записа, 8 записи.
 */
export type PluralForms = readonly [one: string, few: string, many: string];

/**
 * Ја бира правилната македонска множина за даден број.
 *
 * Правило: број што завршува на 1 (освен 11) зема еднина; број што завршува
 * на 2–4 (освен 12–14) зема родителен еднински облик; сè останато - множина.
 */
export function plural(n: number, forms: PluralForms): string {
  const abs = Math.abs(Math.trunc(n)) % 100;
  const last = abs % 10;
  if (last === 1 && abs !== 11) return forms[0];
  if (last >= 2 && last <= 4 && (abs < 12 || abs > 14)) return forms[1];
  return forms[2];
}

/** Најчестите именки во интерфејсот - за да не се повторува правилото. */
export const NOUNS = {
  запис: ['запис', 'записа', 'записи'],
  извор: ['извор', 'извора', 'извори'],
  општина: ['општина', 'општини', 'општини'],
  место: ['место', 'места', 'места'],
  'населено место': ['населено место', 'населени места', 'населени места'],
  библиотека: ['библиотека', 'библиотеки', 'библиотеки'],
  страница: ['страница', 'страници', 'страници'],
} as const satisfies Record<string, PluralForms>;

const dateFormat = new Intl.DateTimeFormat('mk-MK', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** „2026-10-12“ → „12 октомври 2026“ */
export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return dateFormat.format(date);
}

/** „2026-10-12“ → „12.10.2026“ (компактно, за одбивачи) */
export function formatDateShort(iso: string | null): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return null;
  return `${d}.${m}.${y}`;
}

/** Го претвора телефонскиот линк во href. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** Насоки: ако има координати - точна локација, инаку пребарување по адреса. */
export function directionsHref(input: { lat: number | null; lon: number | null; address: string | null; place: string }): string {
  if (input.lat !== null && input.lon !== null) {
    return `https://www.openstreetmap.org/?mlat=${input.lat}&mlon=${input.lon}#map=17/${input.lat}/${input.lon}`;
  }
  const q = [input.address, input.place, 'Северна Македонија'].filter(Boolean).join(', ');
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`;
}

/** Го додава https:// ако веќе го нема - за приказ на домени. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

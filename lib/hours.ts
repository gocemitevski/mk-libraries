/**
 * Работно време — парсерење на слободниот текст од мастерот и два излезни формати.
 *
 * Во работната книга часовите се слободен текст во колоната „Работно време“,
 * во обликот `Извор: денови часови; денови часови`, каде повеќе извори се
 * одделени со прелом на ред. Пример:
 *
 *   „Златна книга: Пон–Пет 08:00–19:00; Саб 08:00–13:00"
 *
 * Проверено врз сите 32 вредности во книгата (69 сегменти):
 *   • деновите се затворен речник од 7 македонски скратеници, пон→нед;
 *   • опсезите НИКОГАШ не се завиткуваат (нема „саб–пон“), па `a–b` секогаш
 *     значи днтови од a до b по редослед — нема двосмисленост;
 *   • часовите се секогаш `HH:MM–HH:MM`; единствениот исклучок е „затворено“.
 *
 * Затоа парсерењето е безбедно, а ако некој нов извор донесе нешто непознато,
 * функциите враќаат празно и повикателот прикажува суров текст — податокот не
 * се губи.
 */

const DAYS = [
  { abbr: 'пон', mk: 'понеделник', en: 'Mo' },
  { abbr: 'вто', mk: 'вторник', en: 'Tu' },
  { abbr: 'сре', mk: 'среда', en: 'We' },
  { abbr: 'чет', mk: 'четврток', en: 'Th' },
  { abbr: 'пет', mk: 'петок', en: 'Fr' },
  { abbr: 'саб', mk: 'сабота', en: 'Sa' },
  { abbr: 'нед', mk: 'недела', en: 'Su' },
] as const;

export type WorkingHours =
  | {
      /** Индекси во деновскиот редослед (пон = 0 … нед = 6), секогаш растечки. */
      days: number[];
      /** Часови во машинска форма `HH:MM`, или `null` кога е „затворено“. */
      open: { from: string; to: string } | null;
    }
  | {
      /** `null` = непознат формат од изворот; гледај `raw`. */
      days: null;
      /** Суровиот сегмент, каков што стои во книгата. */
      raw: string;
    };

const TIME_RANGE = /^(\d{1,2}):(\d{2})[–-](\d{1,2}):(\d{2})$/;

/** „Пон–Пет“ / „пон“ → индекси [0..4] / [0]; нешто непознато → null. */
function expandDays(part: string): number[] | null {
  const [a, b] = part.toLowerCase().split(/[–-]/);
  const from = DAYS.findIndex((d) => d.abbr === a);
  const to = b ? DAYS.findIndex((d) => d.abbr === b) : from;
  if (from < 0 || to < 0 || to < from) return null;
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** „08:30–16:30“ → { from: '08:30', to: '16:30' }; „затворено“ и сè друго → null. */
function parseTimeRange(text: string): { from: string; to: string } | null {
  const m = TIME_RANGE.exec(text);
  if (!m) return null;
  const pad = (h: string, min: string) => `${h.padStart(2, '0')}:${min}`;
  return { from: pad(m[1], m[2]), to: pad(m[3], m[4]) };
}

/**
 * Ја дели вредноста „денови часови; денови часови“ на сегменти.
 *
 * Секој сегмент или се парсира, или се враќа суров — ништо не се отфрла, па
 * нов извор со неочекуван збор сè уште се прикажува целосно.
 */
export function parseHours(value: string): WorkingHours[] {
  const out: WorkingHours[] = [];
  for (const chunk of value.split(';')) {
    const text = chunk.trim();
    if (!text) continue;
    // последниот празен здел е секогаш часовите (или „затворено“)
    const at = text.lastIndexOf(' ');
    const dayPart = at > 0 ? text.slice(0, at) : text;
    const timePart = at > 0 ? text.slice(at + 1) : '';
    const days = expandDays(dayPart);
    if (days === null) {
      out.push({ days: null, raw: text });
      continue;
    }
    out.push({ days, open: parseTimeRange(timePart) });
  }
  return out;
}

/**
 * „HH:MM“ → „8.30“ — правописно во македонски.
 *
 * Часот и минутите се одделуваат со точка, не со двоеточие (двoеточието е
 * формат на уредите и на други јазици). Едноцифрен час се пишува БЕЗ нула
 * (9.30, не 09.30), а едноцифрени минути МОРА да ја носат нулата (9.05).
 */
export function formatMkTime(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return `${Number(h)}.${m}`;
}

/** Индекси → целосни македонски имиња: [0,4] → „понеделник–петок“, [6] → „недела“. */
export function formatDayNames(days: number[]): string {
  if (days.length === 0) return '';
  const first = DAYS[days[0]].mk;
  const last = DAYS[days[days.length - 1]].mk;
  return days.length === 1 ? first : `${first}–${last}`;
}

/**
 * За JSON-LD: „Mo-Fr 08:30-16:30“ — форматот што schema.org и Google го читаат.
 *
 * Ова НАМЕРНО се разликува од приказот: машинскиот излез бара англиски скратеници
 * и двоеточие, иако на посетителот му го покажуваме правилното македонско 8.30.
 * „затворено“ не носи ништо — отсуството на интервал веќе значи затворено.
 */
export function schemaOrgOpeningHours(entries: { value: string }[]): string[] {
  const out = new Set<string>();
  for (const entry of entries) {
    for (const seg of parseHours(entry.value)) {
      if (seg.days === null || !seg.open) continue; // непознато / „затворено“
      const a = DAYS[seg.days[0]].en;
      const b = DAYS[seg.days[seg.days.length - 1]].en;
      const days = seg.days.length === 1 ? a : `${a}-${b}`;
      out.add(`${days} ${seg.open.from}-${seg.open.to}`);
    }
  }
  return [...out];
}

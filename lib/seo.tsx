import type { Library } from '@/src/lib/schema';
import { libraries, publicLibraries, stats } from '@/lib/data';
import { schemaOrgOpeningHours } from '@/lib/hours';
import { formatNumber } from '@/lib/format';
import { websiteHref } from '@/lib/links';

const SITE = 'https://biblioteki.mk';

/** Го вметнува JSON-LD како скрипт — го користат сите страници. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

/** Schema.org „Library“ за деталната страница. */
export function libraryJsonLd(library: Library, url: string): Record<string, unknown> {
  const sameAs = [
    library.cobiss.profileUrl,
    library.cobiss.aspiUrl,
    library.links.wikipedia,
    library.links.wikidata,
  ].filter((u): u is string => Boolean(u));

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': library.type === 'nacionalna-ustanova' ? 'GovernmentLibrary' : 'Library',
    '@id': `${url}#library`,
    name: library.name,
    alternateName: library.aliases.slice(0, 5),
    url: url,
    identifier: library.id,
  };

  if (library.location.address || library.location.place) {
    data.address = {
      '@type': 'PostalAddress',
      streetAddress: library.location.address ?? undefined,
      addressLocality: library.location.place,
      postalCode: library.location.postalCode ?? undefined,
      addressCountry: 'MK',
    };
  }

  if (library.location.lat !== null && library.location.lon !== null) {
    data.geo = {
      '@type': 'GeoCoordinates',
      latitude: library.location.lat,
      longitude: library.location.lon,
    };
  }

  if (library.contacts.phones.length) data.telephone = library.contacts.phones[0];
  if (library.contacts.emails.length) data.email = library.contacts.emails[0];
  const website = websiteHref(library.contacts.website);
  if (website) data.mainEntityOfPage = website;
  if (sameAs.length) data.sameAs = sameAs;

  // „Mo-Fr 08:30-16:30“ — ја чита и Google. Суровиот македонски текст
  // („Пон–Пет 08:30–16:30“) не се разбира како OpeningHours, па овде го
  // претвораме во машинскиот формат; приказот кон човекот останува македонски.
  const hours = schemaOrgOpeningHours(library.contacts.hours);
  if (hours.length) {
    data.openingHours = hours;
  }

  if (library.cobiss.stats2024.fund !== null) {
    data.numberOfItems = library.cobiss.stats2024.fund;
  }

  // Свежина за пребарувачот: проверката на самиот запис, а кога ја нема —
  // проверката на базата. Истиот редослед како во sitemap.xml, за двата
  // сигнали да не се разидат.
  data.dateModified = library.lastVerified ?? stats.dataVerifiedOn ?? undefined;

  return data;
}

/** Деловите на описот: тип, адреса, место. */
function descriptionBits(library: Library): string[] {
  return [library.typeLabel, library.location.address, library.location.place].filter(
    (bit): bit is string => Boolean(bit),
  );
}

/** Редот за фондот — го додава само записот што го има. */
function fundLine(library: Library): string {
  return library.cobiss.stats2024.fund !== null
    ? ` Фонд според COBISS 2024: ${formatNumber(library.cobiss.stats2024.fund)} примероци.`
    : '';
}

/** Мета-описот без името — основа по која се бараат повторувања. */
function baseMetaDescription(library: Library): string {
  return `${descriptionBits(library).join(' · ')}.${fundLine(library)} Податоци и извори.`;
}

/** Страниците чиј мета-опис се повторува со друга: 30 записи од ист тип во
 *  истото место и без адреса (18 скопски факултети, 8 институти, 2 училишта,
 *  2 ограноци). Тие го додаваат и името — единственото поле што ги разликува —
 *  а останатите 122 остануваат како што се. Сетот се пресметува од базата,
 *  па ако се смени записот, описот го следи. */
const metaCounts = new Map<string, number>();
for (const l of libraries) {
  const key = baseMetaDescription(l);
  metaCounts.set(key, (metaCounts.get(key) ?? 0) + 1);
}
const repeatedMetaDescriptions = new Set(
  libraries.filter((l) => (metaCounts.get(baseMetaDescription(l)) ?? 0) > 1).map((l) => l.slug),
);

/** Мета-опис на библиотека: тип, адреса, место — го користат и деталната
 *  страница и листовите со записи, за описите да се совпаѓаат. */
export function libraryDescription(library: Library): string {
  const bits = descriptionBits(library);
  if (repeatedMetaDescriptions.has(library.slug)) bits.push(library.name);
  return bits.join(' · ');
}

/** Колку знаци собира описот во резултатот од пребарувачот (~155). */
const META_DESCRIPTION_LIMIT = 155;

/** Го сече описот на граница на збор — подобро ние да го скратиме
 *  уредно, отколку пребарувачот да го пресече среде збор. Последните
 *  одделувачи („ /“, „–“, „·“) исто паѓаат: „…ентериер /…“ не е опис. */
function fitMetaDescription(text: string): string {
  if (text.length <= META_DESCRIPTION_LIMIT) return text;
  const cut = text.slice(0, META_DESCRIPTION_LIMIT - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const head = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd();
  return `${head.replace(/[\s/,·–—-]+$/u, '')}…`;
}

/** Мета-опис за <meta name="description"> на страницата на библиотеката. */
export function libraryMetaDescription(library: Library): string {
  const bits = libraryDescription(library);
  const full = `${bits}.${fundLine(library)} Податоци и извори.`;
  if (full.length <= META_DESCRIPTION_LIMIT) return full;

  // Наместо да ја сечеме опашката, ги отфрламе шаблонските делови: прво
  // фондот, потоа „Податоци и извори.“. Така името — единственото што ги
  // разликува повторените описи — останува цело.
  const noFund = `${bits}. Податоци и извори.`;
  if (noFund.length <= META_DESCRIPTION_LIMIT) return noFund;

  return fitMetaDescription(bits);
}

/** WebSite + SearchAction за почетната страница. */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Библиотеки.мк',
    url: SITE,
    inLanguage: 'mk',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/biblioteki/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** ItemList за листови со записи — му дава на пребарувачот структура на резултатите. */
export function itemListJsonLd(items: { name: string; url: string; description?: string }[], name: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: item.url,
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}

/** Dataset за /statistika — го прави материјалот цитабилен. */
export function datasetJsonLd(stats: { totals: { records: number }; dataVerifiedOn: string | null }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Мастер-база на библиотеки во Северна Македонија',
    description:
      'Структурирани податоци за библиотеките во Северна Македонија, собрани и споени од јавни извори (МКТ, COBISS, Централен регистар, Википедија и други).',
    url: `${SITE}/statistika/`,
    keywords: ['библиотеки', 'Северна Македонија', 'COBISS', 'отворени податоци'],
    license: 'https://creativecommons.org/licenses/by/4.0/',
    creator: { '@type': 'Organization', name: 'Библиотеки.мк' },
    datePublished: stats.dataVerifiedOn ?? undefined,
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Записи во базата', value: stats.totals.records },
      { '@type': 'PropertyValue', name: 'Прикажани библиотеки', value: publicLibraries.length },
    ],
    distribution: [
      { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${SITE}/data/libraries.json` },
      { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${SITE}/data/biblioteki.csv` },
    ],
  };
}

export const SITE_URL = SITE;

import type { Library } from '@/src/lib/schema';
import { publicLibraries } from '@/lib/data';

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
  if (library.contacts.website) data.mainEntityOfPage = library.contacts.website;
  if (sameAs.length) data.sameAs = sameAs;

  const hours = library.contacts.hours.map((h) => h.value).join('; ');
  if (hours) {
    data.openingHours = hours;
  }

  if (library.cobiss.stats2024.fund !== null) {
    data.numberOfItems = library.cobiss.stats2024.fund;
  }

  return data;
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

import { publicLibraries } from '@/lib/data';
import { toSearchRecord, type SearchRecord } from '@/src/lib/search-index';
import type { TypeGroup } from '@/src/lib/taxonomy';

/**
 * Намалени записи за клиентските компоненти.
 *
 * ВАЖНО: овој модул смеат да го увезуваат **само серверски** компоненти.
 * Ако клиентски компонент го увезе, во бандлот влегува и libraries.json
 * (534 kB). Намалените полиња се пренесуваат како обични props, па
 * serialization-от во RSC payload останува ~10 пати помал.
 *
 * Исклучок: SearchBox на почетната страница — таму брзото пребарување е
 * вредно од 58 kB payload. На 404 страницата индексот се вчитува по барање
 * од /data/search-index.json.
 */

/** Податок за филтерите и картичките во адресарот. */
export interface DirectoryRecord {
  slug: string;
  name: string;
  shortName: string | null;
  aliases: string[];
  typeGroup: TypeGroup;
  typeLabel: string;
  verification: { level: 'confirmed' | 'partial' | 'unconfirmed'; label: string };
  location: { place: string; address: string | null; lat: number | null; lon: number | null };
  contacts: { website: string | null; phones: string[] };
  cobiss: { sigla: string | null; acronym: string | null; stats2024: { fund: number | null } };
  parent: { name: string };
}

/** Индекс за SearchBox на почетната страница. */
export const searchIndex: SearchRecord[] = publicLibraries.map(toSearchRecord);

/** Индекс за /biblioteki/ — ги содржи полињата на филтерите, сортирањето и картичката. */
export const directoryIndex: DirectoryRecord[] = publicLibraries.map((l) => ({
  slug: l.slug,
  name: l.name,
  shortName: l.shortName,
  aliases: l.aliases,
  typeGroup: l.typeGroup,
  typeLabel: l.typeLabel,
  verification: { level: l.verification.level, label: l.verification.label },
  location: {
    place: l.location.place,
    address: l.location.address,
    lat: l.location.lat,
    lon: l.location.lon,
  },
  contacts: { website: l.contacts.website, phones: l.contacts.phones },
  cobiss: {
    sigla: l.cobiss.sigla,
    acronym: l.cobiss.acronym,
    stats2024: { fund: l.cobiss.stats2024.fund },
  },
  parent: { name: l.parent.name },
}));

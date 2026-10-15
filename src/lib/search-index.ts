import type { Library } from './schema';

/**
 * Намален запис за пребарување.
 *
 * Живее во src/lib/ за да може да го користат и пайплинот (scripts/) и
 * апликацијата (lib/search.ts) — двата пати со релативен пат, без
 * path-алијаси, за да работи и под tsx.
 */
export interface SearchRecord {
  slug: string;
  name: string;
  shortName: string | null;
  aliases: string[];
  place: string;
  typeLabel: string;
  sigla: string | null;
  acronym: string | null;
}

/**
 * Го претвора целиот запис во индекс за пребарување.
 *
 * Овие полиња се целосно покриени со клучевите на SearchBox (види
 * components/search-box.tsx) — ништо повеќе не се пренесува на клиентот.
 */
export function toSearchRecord(l: Library): SearchRecord {
  return {
    slug: l.slug,
    name: l.name,
    shortName: l.shortName,
    aliases: l.aliases,
    place: l.location.place,
    typeLabel: l.typeLabel,
    sigla: l.cobiss.sigla,
    acronym: l.cobiss.acronym,
  };
}

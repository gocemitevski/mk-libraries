import type { Candidate, CoverageEntry, Library, ProvenanceEntry, Stats } from '@/src/lib/schema';
import librariesJson from '@/src/data/libraries.json';
import coverageJson from '@/src/data/coverage.json';
import candidatesJson from '@/src/data/candidates.json';
import provenanceJson from '@/src/data/provenance.json';
import statsJson from '@/src/data/stats.json';
import placeCentroidsJson from '@/src/data/place-centroids.json';
import {
  TYPE_BY_SLUG,
  TYPE_GROUP_LABEL,
  TYPE_GROUP_ORDER,
  type TypeGroup,
} from '@/src/lib/taxonomy';

/**
 * Сите податоци се вчитуваат на ниво на модул - се пререндираат при build
 * и не постои runtime на сервер (output: 'export').
 */

export const libraries = librariesJson as Library[];
export const coverage = coverageJson as CoverageEntry[];
export const candidates = candidatesJson as Candidate[];
export const stats = statsJson as Stats;

const SLUG_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ѓ: 'gj', е: 'e', ж: 'zh', з: 'z', и: 'i',
  ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', ќ: 'kj', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', џ: 'dz', ш: 'sh',
};

/** Кирилица → латиница за слагови на URL (места, општини). */
export function slugify(input: string): string {
  let out = '';
  for (const ch of input.toLowerCase()) out += SLUG_MAP[ch] ?? ch;
  return out
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

const provenanceFile = provenanceJson as { byId: Record<string, ProvenanceEntry[]>; unmerged: ProvenanceEntry[] };

/** Само записи што се прикажуваат во адресарот (не-библиотеките се исклучени). */
export const publicLibraries = libraries.filter((l) => l.public);

export const librariesBySlug = new Map(libraries.map((l) => [l.slug, l]));
export const librariesById = new Map(libraries.map((l) => [l.id, l]));

export function getLibrary(slug: string): Library | undefined {
  return librariesBySlug.get(slug);
}

export function getProvenance(id: string): ProvenanceEntry[] {
  return provenanceFile.byId[id] ?? [];
}

// ── географија ──────────────────────────────────────────────────────────────

export interface PlaceSummary {
  slug: string;
  name: string;
  count: number;
}

const placeCount = new Map<string, number>();
for (const l of publicLibraries) {
  placeCount.set(l.location.place, (placeCount.get(l.location.place) ?? 0) + 1);
}

/** Сите населени места, подредени по број на библиотеки (па по азбучен ред). */
export const places: PlaceSummary[] = [...placeCount.entries()]
  .map(([name, count]) => ({ name, count, slug: placeSlug(name) }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'mk'));

export function placeSlug(name: string): string {
  return slugify(name);
}

const librariesByPlaceSlug = new Map<string, Library[]>();
for (const l of publicLibraries) {
  const slug = placeSlug(l.location.place);
  const list = librariesByPlaceSlug.get(slug) ?? [];
  list.push(l);
  librariesByPlaceSlug.set(slug, list);
}

export function getLibrariesByPlace(slug: string): Library[] {
  return (librariesByPlaceSlug.get(slug) ?? []).slice().sort(byName);
}

export const placeBySlug = new Map(places.map((p) => [p.slug, p]));

// ── типови ──────────────────────────────────────────────────────────────────

export interface TypeGroupSummary {
  slug: TypeGroup;
  label: string;
  count: number;
  types: { slug: string; label: string; shortLabel: string; description: string; count: number }[];
}

const typeGroupCounts = new Map<TypeGroup, number>();
const typeCounts = new Map<string, number>();
for (const l of publicLibraries) {
  typeGroupCounts.set(l.typeGroup, (typeGroupCounts.get(l.typeGroup) ?? 0) + 1);
  typeCounts.set(l.type, (typeCounts.get(l.type) ?? 0) + 1);
}

/** Групите на библиотеки за /tipovi/[slug] - само групи со записи. */
export const typeGroups: TypeGroupSummary[] = TYPE_GROUP_ORDER.filter((g) => (typeGroupCounts.get(g) ?? 0) > 0).map(
  (slug) => ({
    slug,
    label: TYPE_GROUP_LABEL[slug],
    count: typeGroupCounts.get(slug) ?? 0,
    // TYPES е клучирани по назив, а typeCounts по l.type (шифра) - затоа
    // се оди низ TYPE_BY_SLUG, инаку секој број е 0 и листата останува празна.
    types: Object.entries(TYPE_BY_SLUG)
      .filter(([, meta]) => meta.group === slug)
      .map(([typeSlug, meta]) => ({
        slug: typeSlug,
        label: meta.label,
        shortLabel: meta.shortLabel,
        description: meta.description,
        count: typeCounts.get(typeSlug) ?? 0,
      }))
      .filter((t) => t.count > 0),
  }),
);

/** Групите по слаг - клучот е string за да се спојува со параметарот на рутата. */
export const typeGroupBySlug = new Map<string, TypeGroupSummary>(
  typeGroups.map((g) => [g.slug, g]),
);

const librariesByTypeGroup = new Map<string, Library[]>();
for (const l of publicLibraries) {
  pushInto(librariesByTypeGroup, l.typeGroup, l);
}

/** Го додава записот во мапата-список по клуч (создава ја листата ако ја нема). */
function pushInto(map: Map<string, Library[]>, key: string, value: Library): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function getLibrariesByTypeGroup(groupSlug: string): Library[] {
  return (librariesByTypeGroup.get(groupSlug) ?? []).slice().sort(byName);
}

export const typeBySlug = TYPE_BY_SLUG;

// ── општини ─────────────────────────────────────────────────────────────────

export const coverageBySlug = new Map(coverage.map((c) => [c.slug, c]));

/**
 * Го отстранува додатокот што го носат некои записи („Чаир (според loc.mk)“)
 * за да се спојуваат со имињата во листот за покриеност.
 */
function normalizeMunicipality(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/\s*\(според loc\.mk\)\s*$/i, '').trim();
}

/** Сите места - ги користи спојувањето општина ↔ населено место. */
const placeNames = new Set(publicLibraries.map((l) => l.location.place));

/**
 * Записите што припаѓаат на општина.
 *
 * Мастерот има дупла географија: `Населено место` и `Општина / дел од град`,
 * а второто е пополнето само кај 69 од 144-те прикажани записи. Затоа:
 *  1. директен спој по општина (со отстранет додаток),
 *  2. ако општината е и населено место (33 од 81), ги додаваме и записите
 *     од тоа место што немаат утврдена општина - освен за Скопје, каде што
 *     еден град се протега низ 10 општини и тоа не е безбедно,
 *  3. записите без утврдена општина од Скопје одат во посебната кофа.
 */
export function getLibrariesForMunicipality(name: string): Library[] {
  const target = normalizeMunicipality(name);
  if (!target) return [];

  const isSkopjeUndetermined = target.startsWith('Скопје (општина неутврдена)');
  const isSkopjeDistrict = target !== 'Скопје' && target.startsWith('Скопје');

  const out: Library[] = [];
  const seen = new Set<string>();

  for (const l of publicLibraries) {
    const m = normalizeMunicipality(l.location.municipality);

    const belongs =
      isSkopjeUndetermined
        ? // кофа за Скопје: само градските записи без утврдена општина
          l.location.place === 'Скопје' && m === null
        : m === target ||
          // безбедно само надвор од Скопје: името е и општина и населено место
          (!isSkopjeDistrict &&
            l.location.place === target &&
            m === null &&
            placeNames.has(target));

    if (belongs && !seen.has(l.id)) {
      seen.add(l.id);
      out.push(l);
    }
  }
  return out.slice().sort(byName);
}

// ── поврзувања ──────────────────────────────────────────────────────────────

export function getBranches(library: Library): Library[] {
  return library.branches.map((id) => librariesById.get(id)).filter((l): l is Library => Boolean(l));
}

export function getParent(library: Library): Library | null {
  return library.parent.slug ? (librariesBySlug.get(library.parent.slug) ?? null) : null;
}

/** Истото населено место + истиот тип - за „поврзани“ на деталната страница. */
export function getRelated(library: Library, limit = 6): Library[] {
  const samePlace = publicLibraries.filter(
    (l) => l.id !== library.id && l.location.place === library.location.place,
  );
  const sameType = publicLibraries.filter((l) => l.id !== library.id && l.type === library.type);
  const seen = new Set<string>();
  const out: Library[] = [];
  for (const l of [...samePlace, ...sameType]) {
    if (seen.has(l.id)) continue;
    seen.add(l.id);
    out.push(l);
    if (out.length >= limit) break;
  }
  return out;
}

export function byName(a: Library, b: Library): number {
  return a.name.localeCompare(b.name, 'mk');
}

// ── географија за мапата ────────────────────────────────────────────────────

interface RawCentroid {
  name: string;
  lat: number;
  lon: number;
}

const centroidByName = new Map(
  (placeCentroidsJson as RawCentroid[]).map((c) => [c.name, { lat: c.lat, lon: c.lon }]),
);

/**
 * Центроидите по населено место за мапата (план §6): точките од записите се
 * само 10/152, па ги користиме центроидите на 42-те места. Секогаш се означени
 * како приближни - вистинската адреса останува на деталната страница.
 */
export const mapPlaces = places
  .map((p) => {
    const c = centroidByName.get(p.name);
    return c ? { name: p.name, slug: p.slug, lat: c.lat, lon: c.lon, count: p.count } : null;
  })
  .filter((p): p is { name: string; slug: string; lat: number; lon: number; count: number } => p !== null)
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'mk'));

/**
 * Реалниот број записи во базата по општина (спојот од getLibrariesForMunicipality).
 * Се разликува од coverage.publicCount - тој е класификација од изворните податоци.
 */
export const recordCountsBySlug: Record<string, number> = Object.fromEntries(
  coverage.map((c) => [c.slug, getLibrariesForMunicipality(c.name).length]),
);


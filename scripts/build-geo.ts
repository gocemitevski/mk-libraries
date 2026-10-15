/**
 * Го приготвува општинскиот GeoJSON за мапата:
 *  - ги здружува 4-те поранешни општини на Кичево со самата Кичево (споени во 2013 → 80 општини)
 *  - ги врзува латиничните имиња на geoBoundaries со кириличните од coverage.json
 *  - ја заострува геометријата и зачувува во public/data/municipalities.geojson
 *
 *   npx tsx scripts/build-geo.ts <патека-до-geojson>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { CoverageEntry } from '../src/lib/schema';

/**
 * Поранешни општини споени во Кичево (2013). Изворот ги уште ги носи како засебни
 * полиња, а „Kichevo“ е само стариот урбано јадро (0.005°²) — па ако тие четири
 * едноставно се отстранат, од денешната општина остануваат 6% од површината и на
 * мапата останува дупка од ~750 km². Затоа се здружуваат со Кичево, а не се бришат.
 */
const MERGED_INTO_KICHEVO = ['Drugovo', 'Oslomej', 'Zajas', 'Vraneshtitsa'] as const;
const MERGED_SET = new Set<string>(MERGED_INTO_KICHEVO);

/** Латиничното име на општината во која се здружуваат горенаведените четири. */
const KICHEVO_LATIN = 'Kichevo';

/**
 * Рачна врска: латинично име од geoBoundaries → кирилично од coverage.json.
 * Сè што не е во овој сефаат се бара нормализирано; овде се само нејасните.
 */
const EXPLICIT: Record<string, string> = {
  'Gjorche Petrov': 'Ѓорче Петров',
  'Chair': 'Чаир',
  'Chashka': 'Чашка',
  'Cheshinovo - Obleshevo': 'Чешиново-Облешево',
  'Chucher - Sandevo': 'Чучер-Сандево',
  'Debartsa': 'Дебрца',
  'Centar Zhupa': 'Центар Жупа',
  'Shuto Orizari': 'Шуто Оризари',
  'Teartse': 'Теарце',
  'Novo Selo': 'Ново Село',
  'Mavrovo and Rostusha': 'Маврово и Ростуше',
  'Saraj': 'Сарај',
  // geoBoundaries користи малку поинаква транслитерација (k/ch/s наместо k/c/z)
  'Kavadartsi': 'Кавадарци',
  'Vinitsa': 'Виница',
  'Zrnovtsi': 'Зрновци',
  'Karbintsi': 'Карбинци',
  'Makedonska Kamenitsa': 'Македонска Каменица',
  'Plasnitsa': 'Пласница',
  'Bogdantsi': 'Богданци',
  'Strumitsa': 'Струмица',
  'Novatsi': 'Новаци',
  'Brvenitsa': 'Брвеница',
  'Jegunovtse': 'Јегуновце',
  'Rankovtse': 'Ранковце',
  'Petrovets': 'Петровец',
};

/** Кирилица → латиница, истата табела што ја користи пайплинот. */
const MK_TO_LAT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ѓ: 'gj', е: 'e', ж: 'zh', з: 'z', и: 'i',
  ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', ќ: 'kj', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', џ: 'dz', ш: 'sh',
};

/** Го отстранува дијакритиката и интерпункцијата за споредба (кирилица и латиница). */
function norm(s: string): string {
  const translit = [...s.toLowerCase()].map((ch) => MK_TO_LAT[ch] ?? ch).join('');
  return translit
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

interface Feature {
  properties: { shapeName: string };
  geometry: { type: string; coordinates: unknown };
}

/** Го заострува прстенот: ја задржува секоја n-та точка и ги отстранува дупките. */
function simplifyRing(ring: number[][]): number[][] {
  if (ring.length <= 8) return ring;
  const step = Math.max(1, Math.floor(ring.length / 60));
  const out: number[][] = [];
  for (let i = 0; i < ring.length - 1; i += step) {
    const [x, y] = ring[i];
    out.push([Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000]);
  }
  out.push(out[0]);
  return out;
}

function simplifyFeature(f: Feature): Feature {
  if (f.geometry.type === 'Polygon') {
    return {
      ...f,
      geometry: {
        type: 'Polygon',
        coordinates: (f.geometry.coordinates as number[][][]).map(simplifyRing),
      },
    };
  }
  return {
    ...f,
    geometry: {
      type: 'MultiPolygon',
      coordinates: (f.geometry.coordinates as number[][][][])
        .map((poly) => poly.map(simplifyRing))
        .filter((poly) => poly[0].length >= 4),
    },
  };
}

type Ring = number[][];

/** Ги собира надворешните прстени на едно поле (секој полигон по еден). */
function collectRings(f: Feature): Ring[] {
  const g = f.geometry;
  if (g.type === 'Polygon') return [(g.coordinates as Ring[])[0]];
  return (g.coordinates as Ring[][]).map((poly) => poly[0]);
}

/**
 * Ги здружува соседните полиња во еден надворешен прстен. Работа што се јавува
 * двапати е внатрешна граница меѓу споените полиња и се отстранува; останатите
 * се низаат во затворен прстен.
 *
 * Бара работите на изворот да се совпаѓаат точка-во-точка, што ADM2-податоците
 * го прават — проверено: 245 уникатни работи, 87 внатрешни, ниту една работа
 * зафаќа повеќе од два прстени, а остататото се затвора во еден прстен.
 */
function unionRings(rings: Ring[]): Ring[] {
  const key = (p: number[]) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`;
  const edgeOf = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

  const counts = new Map<string, number>();
  const point = new Map<string, number[]>();
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const a = key(ring[i]);
      const b = key(ring[i + 1]);
      const edge = edgeOf(a, b);
      counts.set(edge, (counts.get(edge) ?? 0) + 1);
      point.set(a, ring[i]);
      point.set(b, ring[i + 1]);
    }
  }

  const adj = new Map<string, string[]>();
  for (const [edge, n] of counts) {
    if (n !== 1) continue;
    const [a, b] = edge.split('|');
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  }

  const out: Ring[] = [];
  const used = new Set<string>();
  for (const [start, neighbours] of adj) {
    if (!neighbours.length || used.has(edgeOf(start, neighbours[0]))) continue;
    const ring: Ring = [point.get(start)!];
    let cur = start;
    let step = neighbours[0];
    for (;;) {
      used.add(edgeOf(cur, step));
      ring.push(point.get(step)!);
      cur = step;
      if (cur === start) break;
      const next = (adj.get(cur) ?? []).find((n) => !used.has(edgeOf(cur, n)));
      if (!next) break;
      step = next;
    }
    // Затворен прстен: првата точка се повторува на крајот (како во изворот).
    if (ring.length >= 4) {
      ring.push([...ring[0]]);
      out.push(ring);
    }
  }
  return out;
}

function main(): void {
  const input = process.argv[2];
  if (!input) {
    console.error('Користење: npx tsx scripts/build-geo.ts <geojson-path>');
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(input, 'utf8')) as { features: Feature[] };
  const coverage = JSON.parse(
    readFileSync(path.join(process.cwd(), 'src', 'data', 'coverage.json'), 'utf8'),
  ) as CoverageEntry[];

  // Спојувањето на Кичево се пресметува еднаш, пред парсењето: изворот носи 84
  // општини (поделбата пред 2013), а денешните се 80.
  const byLatin = new Map(raw.features.map((f) => [f.properties.shapeName, f]));
  const needed = [KICHEVO_LATIN, ...MERGED_INTO_KICHEVO];
  const absent = needed.filter((n) => !byLatin.has(n));
  if (absent.length) {
    console.error(`Во изворот ги нема: ${absent.join(', ')}`);
    process.exit(1);
  }
  const kichevoRings = unionRings(needed.map((n) => byLatin.get(n)!).flatMap(collectRings));
  if (!kichevoRings.length) {
    console.error('Здружувањето на Кичево не даде затворен прстен.');
    process.exit(1);
  }
  const kichevoGeometry =
    kichevoRings.length === 1
      ? { type: 'Polygon', coordinates: [kichevoRings[0]] }
      : { type: 'MultiPolygon', coordinates: kichevoRings.map((r) => [r]) };

  const byNorm = new Map<string, string>();
  for (const c of coverage) byNorm.set(norm(c.name), c.name);
  const coverageSlugs = new Map(coverage.map((c) => [c.name, c.slug]));

  const features: Record<string, unknown>[] = [];
  const matched: string[] = [];
  const merged: string[] = [];
  const unmatched: string[] = [];

  for (const f of raw.features) {
    const latin = f.properties.shapeName;
    if (MERGED_SET.has(latin)) {
      merged.push(latin);
      continue;
    }

    const cyrillic =
      EXPLICIT[latin] ?? byNorm.get(norm(latin)) ?? coverage.find((c) => norm(c.name) === norm(latin))?.name;

    if (!cyrillic || !coverageSlugs.has(cyrillic)) {
      unmatched.push(latin);
      continue;
    }

    const c = coverage.find((x) => x.name === cyrillic)!;
    // Кичево добива здружена геометрија; сите останати ја носат својата.
    const source = latin === KICHEVO_LATIN ? { ...f, geometry: kichevoGeometry } : f;
    const simplified = simplifyFeature(source);
    features.push({
      type: 'Feature',
      properties: {
        slug: c.slug,
        name: c.name,
        publicCount: c.publicCount,
        branchCount: c.branchCount,
        priority: c.priority,
        priorityLabel: c.priorityLabel,
      },
      geometry: simplified.geometry,
    });
    matched.push(c.name);
  }

  // Општината на која ѝ припаѓаат записите без утврдена општина нема полигон —
  // ќе се прикаже само во табелата.
  const withoutPolygon = coverage.filter((c) => !matched.includes(c.name));

  const out = {
    type: 'FeatureCollection',
    license:
      'geoBoundaries MKD-ADM2 (CC BY 4.0) — EuroGeographics / NTES, year represented 2016; simplified for web use.',
    generated: 'via scripts/build-geo.ts',
    features,
  };

  const outDir = path.join(process.cwd(), 'public', 'data');
  mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'municipalities.geojson');
  writeFileSync(outFile, JSON.stringify(out), 'utf8');

  console.log(`Полигони: ${features.length}`);
  console.log(`Здружени во Кичево (${kichevoRings.length} прстен): ${merged.join(', ')}`);
  if (unmatched.length) console.log(`НЕСПОРЕДЕНИ: ${unmatched.join(' | ')}`);
  console.log(`Без полигон: ${withoutPolygon.map((c) => c.name).join(', ')}`);
  console.log(`Запишано: ${outFile} (${(JSON.stringify(out).length / 1024).toFixed(1)} kB)`);
}

main();

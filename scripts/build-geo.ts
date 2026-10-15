/**
 * Го приготвува општинскиот GeoJSON за мапата:
 *  - ги отстранува 4-те поранешни општини на Кичево (споени во 2013 → 80 општини)
 *  - ги врзува латиничните имиња на geoBoundaries со кириличните од coverage.json
 *  - го заострува геометријата и засчувa во public/data/municipalities.geojson
 *
 *   npx tsx scripts/build-geo.ts <патека-до-geojson>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { CoverageEntry } from '../src/lib/schema';

/** Поранешни општини споени во Кичево (2013) — ги нема во денешната поделба. */
const MERGED_INTO_KICHEVO = new Set(['Drugovo', 'Oslomej', 'Zajas', 'Vraneshtitsa']);

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

  const byNorm = new Map<string, string>();
  for (const c of coverage) byNorm.set(norm(c.name), c.name);
  const coverageSlugs = new Map(coverage.map((c) => [c.name, c.slug]));

  const features: Record<string, unknown>[] = [];
  const matched: string[] = [];
  const skipped: string[] = [];
  const unmatched: string[] = [];

  for (const f of raw.features) {
    const latin = f.properties.shapeName;
    if (MERGED_INTO_KICHEVO.has(latin)) {
      skipped.push(latin);
      continue;
    }

    const cyrillic =
      EXPLICIT[latin] ?? byNorm.get(norm(latin)) ?? coverage.find((c) => norm(c.name) === norm(latin))?.name;

    if (!cyrillic || !coverageSlugs.has(cyrillic)) {
      unmatched.push(latin);
      continue;
    }

    const c = coverage.find((x) => x.name === cyrillic)!;
    const simplified = simplifyFeature(f);
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
  console.log(`Прескокнато (споени во Кичево): ${skipped.join(', ')}`);
  if (unmatched.length) console.log(`НЕСПОРЕДЕНИ: ${unmatched.join(' | ')}`);
  console.log(`Без полигон: ${withoutPolygon.map((c) => c.name).join(', ')}`);
  console.log(`Запишано: ${outFile} (${(JSON.stringify(out).length / 1024).toFixed(1)} kB)`);
}

main();

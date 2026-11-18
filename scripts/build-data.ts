/**
 * Го претвора master_biblioteki_mk.xlsx во валидирани JSON-податоци во src/data/.
 *
 *   npm run data:build   - ги пишува фајловите
 *   npm run data:check   - само валидира (за CI), излегува со код 1 при грешка
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildAll, DATA_DIR, MASTER_XLSX } from './lib/build.ts';
import type { Library } from '../src/lib/schema.ts';
import { toSearchRecord } from '../src/lib/search-index.ts';

const checkOnly = process.argv.includes('--check');

/** Јавно достапните копии - овие ги гледа браузерот преку /data/*.json. */
const PUBLIC_DATA_DIR = path.join(process.cwd(), 'public', 'data');

const result = await buildAll(MASTER_XLSX);

const errors = result.issues.filter((i) => i.level === 'error');
const warnings = result.issues.filter((i) => i.level === 'warn');

const json = (value: unknown) => `${JSON.stringify(value, null, 1)}\n`;

/** CSV со цитати околу секоја вредност - безбедно за извоз во табеларни програми. */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(rows: unknown[][]): string {
  // UTF-8 BOM за да го отвори Excel правилно (кирилица)
  return `\ufeff${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

function buildCsv(libraries: Library[]): string {
  const header = [
    'id', 'slug', 'назив', 'краток назив', 'тип', 'тип (група)', 'населено место',
    'општина / дел од град', 'адреса', 'поштенски број', 'телефони', 'е-пошта',
    'мрежно место', 'сигла COBISS', 'фонд 2024', 'верификација', 'сигурност',
    'датум на проверка', 'ДЗС категорија', 'статус', 'матична библиотека',
    'број на извори', 'ширина', 'долготина', 'координати (извор)',
  ];
  const rows: unknown[][] = libraries.map((l) => [
    l.id,
    l.slug,
    l.name,
    l.shortName ?? '',
    l.typeLabel,
    l.typeGroup,
    l.location.place,
    l.location.municipality ?? '',
    l.location.address ?? '',
    l.location.postalCode ?? '',
    l.contacts.phones.join(' ; '),
    l.contacts.emails.join(' ; '),
    l.contacts.website ?? '',
    l.cobiss.sigla ?? '',
    l.cobiss.stats2024.fund ?? '',
    l.verification.label,
    l.confidence,
    l.lastVerified ?? '',
    l.dzsLabel,
    l.status,
    l.parent.name ?? '',
    l.sources.count,
    l.location.lat ?? '',
    l.location.lon ?? '',
    l.location.coordsSource ?? '',
  ]);
  return toCsv([header, ...rows]);
}

if (!checkOnly) {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(PUBLIC_DATA_DIR, { recursive: true });
  const files: [string, unknown][] = [
    ['libraries.json', result.libraries],
    ['coverage.json', result.coverage],
    ['candidates.json', result.candidates],
    ['provenance.json', result.provenance],
    ['stats.json', result.stats],
  ];
  for (const [name, data] of files) {
    await writeFile(path.join(DATA_DIR, name), json(data), 'utf8');
    // Иста содржина и во public/ - страницата /statistika/ нуди преземање.
    await writeFile(path.join(PUBLIC_DATA_DIR, name), json(data), 'utf8');
  }
  await writeFile(path.join(DATA_DIR, 'methodology.md'), result.methodology.markdown, 'utf8');
  // Копија и во public/ за преземање од страницата за методологија.
  await writeFile(path.join(PUBLIC_DATA_DIR, 'methodology.md'), result.methodology.markdown, 'utf8');
  // Индексот го користи 404-страницата (без записите во секој RSC payload).
  // Минифициран - се вчитува по барање од браузерот.
  await writeFile(
    path.join(PUBLIC_DATA_DIR, 'search-index.json'),
    `${JSON.stringify(result.libraries.filter((l) => l.public).map(toSearchRecord))}\n`,
    'utf8',
  );
  await writeFile(
    path.join(PUBLIC_DATA_DIR, 'biblioteki.csv'),
    buildCsv(result.libraries),
    'utf8',
  );
}

// ── извештај ────────────────────────────────────────────────────────────────
const pub = result.libraries.filter((l) => l.public);
const fmt = (n: number) => n.toLocaleString('mk-MK');

console.log(`\nОбработени записи:      ${fmt(result.libraries.length)} (прикажани: ${fmt(pub.length)})`);
console.log(`Општини:                ${fmt(result.coverage.length)}`);
console.log(`Кандидати (непотврд.):  ${fmt(result.candidates.length)}`);
console.log(`Мапирање на извори:     ${fmt(Object.values(result.provenance.byId).flat().length)} редови` +
  ` + ${fmt(result.provenance.unmerged.length)} неспоени`);
console.log(`Просек извори/запис:     ${result.stats.sources.averagePerRecord} (макс. ${result.stats.sources.maxPerRecord})`);
console.log(`COBISS фонд 2024:        ${fmt(result.stats.cobiss.fund)} примероци` +
  ` од ${fmt(result.stats.cobiss.libraries)} библиотеки`);
console.log(`ДЗС вкупно:              ${fmt(result.stats.dzs.officialTotal)} официјално` +
  ` / ${fmt(result.stats.dzs.confirmedTotal)} потврдено во мастер`);
console.log(`Општини без библиотека:  ${fmt(result.stats.geography.coverage.none)}` +
  ` (делумно: ${fmt(result.stats.geography.coverage.partial)},` +
  ` има: ${fmt(result.stats.geography.coverage.withLibrary)})`);
console.log(`Проблеми:                ${errors.length} грешки, ${warnings.length} предупредувања`);

if (warnings.length) {
  const byField = new Map<string, number>();
  for (const w of warnings) byField.set(w.field, (byField.get(w.field) ?? 0) + 1);
  console.log('\nПредупредувања по поле:');
  for (const [field, n] of [...byField.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${field}`);
  }
  console.log('\nПримери:');
  for (const w of warnings.slice(0, 8)) console.log(`  ${w.id} · ${w.field}: ${w.message}`);
}

if (errors.length) {
  console.error('\nГРЕШКИ (ги запираат изградбата):');
  for (const e of errors.slice(0, 20)) console.error(`  ${e.id} · ${e.field}: ${e.message}`);
  process.exit(1);
}

if (!checkOnly) {
  console.log(`\nЗапишано во ${DATA_DIR}/ и во ${PUBLIC_DATA_DIR}/\n`);
}

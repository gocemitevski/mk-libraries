import path from 'node:path';
import type ExcelJS from 'exceljs';
import {
  COVERAGE_LABEL,
  COVERAGE_PRIORITY,
  CONFIDENCE,
  CONFIDENCE_LABEL,
  DZS_CATEGORY,
  DZS_LABEL,
  IS_LIBRARY,
  TYPES,
  TYPE_GROUP_LABEL,
  TYPE_SLUG_BY_LABEL,
  type TypeGroup,
  type TypeSlug,
  VERIFICATION_LABEL,
  VERIFICATION_LEVEL,
} from '../../src/lib/taxonomy.ts';
import {
  CandidateSchema,
  CoverageSchema,
  LibrarySchema,
  ProvenanceEntrySchema,
  ProvenanceFileSchema,
  StatsSchema,
  type Candidate,
  type CoverageEntry,
  type DzsRow,
  type Library,
  type ProvenanceEntry,
  type ProvenanceFile,
  type Stats,
} from '../../src/lib/schema.ts';
import { sheetColumn, sheetToRows, readWorkbook, type Row } from './sheet.ts';
import {
  normalizeForSearch,
  normalizeUrl,
  parseDdMmYyyy,
  parseLabeledLines,
  slugify,
  splitMulti,
  stripPhoneNumbers,
} from './translit.ts';

/** Имиња на колоните во изворните податоци — едно изворно место, без печатни грешки. */
const C = {
  id: 'ID',
  name: 'Назив (стандардизиран)',
  shortName: 'Краток назив',
  place: 'Населено место',
  municipality: 'Општина / дел од град',
  type: 'Тип на установа (стандардизиран)',
  isLibrary: 'Е библиотека?',
  workStatus: 'Статус на работа',
  mkCategory: 'Категорија (МКТ)',
  verification: 'Статус на верификација',
  dzs: 'Категорија според ДЗС (изведена)',
  dzsBasis: 'Основа за ДЗС-категорија',
  confidence: 'Најниска сигурност на спојување',
  needsCheck: 'Потребна проверка',
  comment: 'Коментар / дилеми',
  address: 'Адреса (примарна)',
  postalCode: 'Поштенски број',
  allAddresses: 'Сите адреси по извор',
  lat: 'Геогр. ширина (dec)',
  lon: 'Геогр. должина (dec)',
  phone: 'Телефон (примарен)',
  allPhones: 'Сите телефони',
  email: 'Е-пошта',
  website: 'Мрежно место (примарно)',
  otherWebsites: 'Други веб-адреси (варијанти)',
  hours: 'Работно време',
  embs: 'ЕМБС',
  edb: 'ЕДБ',
  crName: 'Назив во Централен регистар',
  crRelation: 'Однос со правното лице (ЦР)',
  cwStatus: 'Статус (CompanyWall, 10.2026)',
  cwStaff: 'Број на вработени (CompanyWall)',
  cobissName: 'Назив во COBISS',
  cobissNameEn: 'Назив на англиски (COBISS)',
  cobissAcronym: 'Акроним COBISS',
  cobissAcronymCyr: 'Акроним (кирилица)',
  cobissSigla: 'Сигла COBISS',
  cobissType: 'Вид на библиотека (COBISS)',
  cobissStatus: 'Статус (COBISS)',
  cobissMembership: 'Членство во COBISS',
  cobissMemberSince: 'Членка на COBISS од',
  cobissDb: 'COBISS 2024: записи во локалната база',
  cobissIncrement: 'COBISS 2024: прираст на фондот (примероци)',
  cobissFund: 'COBISS 2024: вкупен фонд (примероци)',
  cobissKind: 'Вид во COBISS статистика 2025',
  director: 'Директор / раководител (COBISS)',
  contactCobiss: 'Лице за контакт (COBISS)',
  contactAspi: 'Лице за контакт (ASPI)',
  founded: 'Основана (Wiki)',
  foundedWeb: 'Основана / отворена (веб-извор)',
  updated: 'Обновена / проширена (Wiki)',
  fundWiki: 'Библиотечен фонд (Wiki)',
  branchesWiki: 'Подрачни библиотеки / огранци (Wiki)',
  membersWiki: 'Број на членови (Wiki)',
  staff: 'Број на вработени',
  awards: 'Награди / признанија',
  protectedObj: 'Заштитен објект / наследство (Wiki)',
  braille: 'Книги на Брајово писмо',
  digital: 'Дигитална библиотека',
  history: 'Историја / дополнително (Wiki)',
  wikipedia: 'Википедија',
  commonsImage: 'Слика (Wikimedia Commons)',
  wikidata: 'Wikidata',
  commonsCategory: 'Commons категорија',
  otherLinks: 'Други линкови',
  cobissProfile: 'COBISS профил',
  aspiProfile: 'ASPI профил',
  zk: 'Златна книга (zk.mk)',
  loc: 'loc.mk',
  abv: 'abv.mk',
  webSources: 'Веб-извори (верификација)',
  webCheckDate: 'Датум на веб-проверка',
  nameVariants: 'Варијанти на името во изворите',
  sources: 'Извори',
  sourcesCount: 'Број на извори',
  parent: 'Во состав на / матична установа',
} as const;

export interface BuildIssue {
  level: 'error' | 'warn';
  id: string;
  field: string;
  message: string;
}

export interface BuildResult {
  libraries: Library[];
  coverage: CoverageEntry[];
  candidates: Candidate[];
  provenance: ProvenanceFile;
  dzsRows: DzsRow[];
  stats: Stats;
  methodology: { markdown: string; headings: string[] };
  issues: BuildIssue[];
}

/**
 * Цртички: книгата ја означува празната ќелија со „—“, а прозата ја дели со „ — “.
 * И двете стануваат обичен цртички „-“, за да се совпадне со текстот на страницата.
 *
 * Врските се исклучок: навестувањето на Википедија е „_—_“, без празнина на ниту
 * една страна, па не се допира — страницата постои само во тој облик (проверено:
 * со цртички враќа 404). Затоа правилото е „целосно „—“ или „ — “ со празнини“,
 * а не замена на секој знак.
 */
const mkDash = (text: string): string =>
  text === '—' ? '-' : text.replace(/ — /g, ' - ');

/** Текст од ќелија: без празнини на крајот и со цртичкита усогласена со страницата. */
const str = (row: Row, key: string): string => mkDash((row[key] ?? '').toString().trim());

/**
 * Наводниците во изворите доаѓаат во три неисправни облици: два отворачи
 * („…„), затворач без отвор (“…“) или само затворач. Ги враќаме во еден
 * пар, а текстот што е веќе уреден не го допираме. Се применува само врз
 * варијантите на името — тие се препишани од извори со различен правопис.
 */
const mkQuotes = (text: string): string => {
  let open = false;
  let out = '';
  for (const ch of text) {
    if (ch === '„' || ch === '“' || ch === '”') {
      out += open ? '“' : '„';
      open = !open;
    } else {
      out += ch;
    }
  }
  return open ? `${out}“` : out;
};
const num = (row: Row, key: string): number | null => {
  const v = row[key];
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = (v ?? '').toString().trim().replace(/\s/g, '');
  if (!s) return null;
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const float = (row: Row, key: string): number | null => {
  const v = row[key];
  const s = (v ?? '').toString().trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const yes = (row: Row, key: string): boolean => str(row, key).toUpperCase() === 'ДА';

/** Стандарден формат на институционален телефон: +389 X XXX XXXX или +389 XX XXX XXX. */
const PHONE_SHAPE = /^\+389 \d{1,2} \d{3} \d{3,4}$/;

function urls(list: string[], issues: BuildIssue[], id: string, field: string): string[] {
  const out: string[] = [];
  for (const item of list) {
    const u = normalizeUrl(item);
    if (u) out.push(u);
    else if (item.trim()) issues.push({ level: 'warn', id, field, message: `невалиден URL: ${item}` });
  }
  return [...new Set(out)];
}

function emails(list: string[], issues: BuildIssue[], id: string): string[] {
  const out: string[] = [];
  for (const item of list) {
    const e = item.trim().replace(/^<|>$/g, '');
    if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e)) out.push(e);
    else if (e) issues.push({ level: 'warn', id, field: 'Е-пошта', message: `невалидна е-пошта: ${e}` });
  }
  return [...new Set(out)];
}

/** Ги задржува само валидните телефонски форми; остатокот (ноти и расипани броеви) се пријавува. */
function cleanPhones(list: string[], issues: BuildIssue[], id: string): string[] {
  const out: string[] = [];
  for (const item of list) {
    if (PHONE_SHAPE.test(item)) out.push(item);
    else if (item) issues.push({ level: 'warn', id, field: 'Телефон', message: `неформатиран телефон: ${item}` });
  }
  return [...new Set(out)];
}

/**
 * Работната книга го нарекува адресарот „директориум“ — збор што на македонски
 * најчесто значи папка во датотечниот систем, па така и се учи („Папка (фолдер,
 * директориум, каталог)“ во учебникот по информатика). Станицата се вика „адресар“,
 * по образецот на „Адресар на општини“, „Адресар на граѓанските организации“.
 *
 * Работната книга не се менува: усогласуваме само изведениот текст што оди до
 * корисникот — деталот на верификацијата и methodology.md. Истото веќе го прави
 * и VERIFICATION_LABEL, кое од „Делумно“ прави „Делумно потврдено“.
 *
 * Редот е важен: „директориум“ е префикс на другите две форми, па мора последно.
 */
const DIRECTORY_TERM: [RegExp, string][] = [
  [/директориуми/g, 'адресари'],
  [/директориумот/g, 'адресарот'],
  [/директориум/g, 'адресар'],
  [/Директориуми/g, 'Адресари'],
  [/Директориумот/g, 'Адресарот'],
  [/Директориум/g, 'Адресар'],
];

const mkDirectoryTerm = (text: string): string =>
  DIRECTORY_TERM.reduce((out, [from, to]) => out.replace(from, to), text);

/** Го извлекува првиот запис од мастерот со што е можно повеќе полиња. */
function parseMaster(rows: Row[], issues: BuildIssue[]): Library[] {
  const records: Library[] = [];

  for (const row of rows) {
    const id = str(row, C.id);
    const name = str(row, C.name);
    const place = str(row, C.place);

    if (!id || !name || !place) {
      issues.push({ level: 'error', id, field: 'ID/Назив/Место', message: 'задолжително поле недостасува' });
      continue;
    }

    const typeLabel = str(row, C.type);
    const typeMeta = TYPES[typeLabel];
    if (!typeMeta) {
      issues.push({ level: 'error', id, field: C.type, message: `непознат тип: „${typeLabel}“` });
    }
    const typeSlug = typeSlugOf(typeLabel);

    const libCode = IS_LIBRARY[str(row, C.isLibrary)]?.code ?? 'uncertain';
    const verRaw = str(row, C.verification);
    const verPrefix = verRaw.split(/[–-]/)[0].trim();
    const verLevel = VERIFICATION_LEVEL[verPrefix] ?? 'unconfirmed';
    const verDetail = verRaw.includes('–')
      ? mkDirectoryTerm(verRaw.slice(verRaw.indexOf('–') + 1).trim())
      : null;

    const confidence = CONFIDENCE[str(row, C.confidence)] ?? 'single';

    // ── локација ──────────────────────────────────────────────────────────────
    const lat = float(row, C.lat);
    const lon = float(row, C.lon);
    const hasCoords = lat !== null && lon !== null;
    const address = str(row, C.address) || null;

    // ── контакти ─────────────────────────────────────────────────────────────
    let website = normalizeUrl(str(row, C.website));
    const otherWebsitesRaw = splitMulti(str(row, C.otherWebsites));
    const others = urls(otherWebsitesRaw, issues, id, C.otherWebsites);
    if (!website && others.length > 0) {
      // понекогаш примарната ќелија е проза, а варијантите се валидни домени
      website = others.shift() ?? null;
    }

    const contactPerson = [str(row, C.contactCobiss), str(row, C.contactAspi)]
      .map(stripPhoneNumbers)
      .filter(Boolean)
      .join(' · ') || null;

    const phoneList = cleanPhones(splitMulti(str(row, C.allPhones)), issues, id);

    // ── историја / статистика ────────────────────────────────────────────────
    const founded = str(row, C.founded) || null;
    const foundedWeb = str(row, C.foundedWeb) || null;

    // ── извори ───────────────────────────────────────────────────────────────
    const sourceList = splitMulti(str(row, C.sources));
    const declaredCount = num(row, C.sourcesCount);
    if (declaredCount !== null && declaredCount !== sourceList.length) {
      issues.push({
        level: 'warn',
        id,
        field: C.sourcesCount,
        message: `број на извори ${declaredCount} ≠ избројани ${sourceList.length}`,
      });
    }

    const record: Library = {
      id,
      slug: slugify(`${name}-${place}`),
      name,
      shortName: str(row, C.shortName) || null,
      aliases: splitMulti(str(row, C.nameVariants)).map(mkQuotes).filter((a) => a !== name),
      type: typeSlug,
      typeLabel: typeMeta?.label ?? typeLabel,
      typeGroup: typeMeta?.group ?? 'ostanati',
      dzsCategory: DZS_CATEGORY[str(row, C.dzs)] ?? 'neutvrdeno',
      dzsLabel: DZS_LABEL[DZS_CATEGORY[str(row, C.dzs)] ?? 'neutvrdeno'],
      isLibrary: libCode,
      public: libCode !== 'no',
      status: str(row, C.workStatus),
      active: str(row, C.workStatus).startsWith('Активна'),
      verification: { level: verLevel, label: VERIFICATION_LABEL[verLevel], detail: verDetail },
      confidence,
      needsCheck: yes(row, C.needsCheck),
      location: {
        place,
        municipality: str(row, C.municipality) || null,
        address,
        postalCode: str(row, C.postalCode) || null,
        lat: hasCoords ? lat : null,
        lon: hasCoords ? lon : null,
        coordsSource: hasCoords ? 'exact' : 'none',
      },
      contacts: {
        phones: phoneList,
        emails: emails(splitMulti(str(row, C.email)), issues, id),
        website,
        otherWebsites: others,
        hours: parseLabeledLines(str(row, C.hours)),
        contactPerson,
        director: stripPhoneNumbers(str(row, C.director)) || null,
      },
      legal: {
        embs: str(row, C.embs) || null,
        edb: str(row, C.edb) || null,
        registerName: str(row, C.crName) || null,
        relation: str(row, C.crRelation) || null,
        crStatus: str(row, C.cwStatus) || null,
        employees: num(row, C.cwStaff),
      },
      cobiss: {
        sigla: str(row, C.cobissSigla) || null,
        acronym: str(row, C.cobissAcronym) || null,
        acronymCyr: str(row, C.cobissAcronymCyr) || null,
        nameEn: str(row, C.cobissNameEn) || null,
        profileUrl: normalizeUrl(str(row, C.cobissProfile)),
        aspiUrl: normalizeUrl(str(row, C.aspiProfile)),
        type: str(row, C.cobissType) || null,
        status: str(row, C.cobissStatus) || null,
        membership: str(row, C.cobissMembership) || null,
        memberSince: str(row, C.cobissMemberSince) || null,
        stats2024: {
          records: num(row, C.cobissDb),
          increment: num(row, C.cobissIncrement),
          fund: num(row, C.cobissFund),
          kind: str(row, C.cobissKind) || null,
        },
      },
      history: {
        founded,
        foundedWeb,
        updated: str(row, C.updated) || null,
        note: str(row, C.history) || null,
        protectedObj: str(row, C.protectedObj) || null,
      },
      links: {
        wikipedia: normalizeUrl(str(row, C.wikipedia)),
        wikidata: normalizeUrl(str(row, C.wikidata)),
        commonsImage: normalizeUrl(str(row, C.commonsImage)),
        commonsCategory: normalizeUrl(str(row, C.commonsCategory)),
        zk: normalizeUrl(str(row, C.zk)),
        loc: normalizeUrl(str(row, C.loc)),
        abv: normalizeUrl(str(row, C.abv)),
        digital: str(row, C.digital) || null,
        other: urls(splitMulti(str(row, C.otherLinks)), issues, id, C.otherLinks),
      },
      parent: { name: str(row, C.parent), slug: null },
      branches: [],
      sources: {
        list: sourceList,
        count: sourceList.length,
        addressVariants: parseLabeledLines(str(row, C.allAddresses)),
        allAddresses: str(row, C.allAddresses) || null,
        allPhones: phoneList,
      },
      notes: mkDirectoryTerm(str(row, C.comment)) || null,
      lastVerified: parseDdMmYyyy(str(row, C.webCheckDate)),
      verificationUrls: urls(splitMulti(str(row, C.webSources)), issues, id, C.webSources),
    };

    records.push(record);
  }

  linkParents(records);
  return records;
}

/** Шифра на типот од таксономијата — невалидниот назив паѓа во „непознато“. */
function typeSlugOf(label: string): TypeSlug {
  return TYPE_SLUG_BY_LABEL[label] ?? 'nepoznato';
}

/**
 * Ги поврзува огранците со матичните записи: „Во состав на …“ се бара меѓу
 * називите во мастерот (најдолгото совпаѓање победува).
 */
function linkParents(records: Library[]): void {
  const byNormName = records
    .map((r) => ({ slug: r.slug, norm: normalizeForSearch(r.name) }))
    .filter((r) => r.norm.length >= 4)
    .sort((a, b) => b.norm.length - a.norm.length);

  for (const r of records) {
    if (!r.parent.name) continue;
    const parentText = ` ${normalizeForSearch(r.parent.name)} `;
    const match = byNormName.find((c) => c.slug !== r.slug && parentText.includes(` ${c.norm} `));
    if (match) {
      r.parent.slug = match.slug;
      const parent = records.find((p) => p.slug === match.slug);
      if (parent) parent.branches.push(r.id);
    }
  }
}

function parseCoverage(rows: Row[], issues: BuildIssue[]): CoverageEntry[] {
  const out: CoverageEntry[] = [];
  for (const row of rows) {
    const name = str(row, 'Општина');
    if (!name) continue;
    const priorityText = str(row, 'Приоритет за барање').split('–')[0].trim();
    const priority = COVERAGE_PRIORITY[priorityText] ?? 'medium';
    const entry: CoverageEntry = {
      name,
      slug: slugify(name),
      publicCount: num(row, 'Јавни библиотеки (мастер)') ?? 0,
      branchCount: num(row, 'Огранци / подрачни (мастер)') ?? 0,
      otherCount: num(row, 'Други библиотеки (мастер)') ?? 0,
      publicNames: splitMulti(str(row, 'Јавни библиотеки – називи')),
      culturalHomes: str(row, 'Домови/центри за култура во ЦР') || null,
      priority,
      priorityLabel: COVERAGE_LABEL[priority],
      note: str(row, 'Забелешка') || null,
    };
    const parsed = CoverageSchema.safeParse(entry);
    if (!parsed.success) {
      issues.push({ level: 'error', id: name, field: 'Покриеност', message: parsed.error.issues[0].message });
      continue;
    }
    out.push(parsed.data);
  }
  return out;
}

function parseCandidates(rows: Row[], issues: BuildIssue[]): Candidate[] {
  const out: Candidate[] = [];
  for (const row of rows) {
    const name = str(row, 'Установа (кандидат)');
    if (!name) continue;
    const entry: Candidate = {
      number: num(row, 'Бр.') ?? out.length + 1,
      name,
      place: str(row, 'Место'),
      parentInstitution: str(row, 'Матична установа / универзитет') || null,
      expectedDzs: str(row, 'Очекувана ДЗС-категорија') || null,
      confirmed: str(row, 'Што е потврдено') || null,
      webCheck: str(row, 'Резултат од веб-проверката') || null,
      nextStep: str(row, 'Следен чекор') || null,
      sourceUrl: normalizeUrl(str(row, 'Извор')),
    };
    const parsed = CandidateSchema.safeParse(entry);
    if (!parsed.success) {
      issues.push({ level: 'error', id: name, field: 'Кандидати', message: parsed.error.issues[0].message });
      continue;
    }
    out.push(parsed.data);
  }
  return out;
}

function parseProvenance(rows: Row[], issues: BuildIssue[]): ProvenanceFile {
  const byId: Record<string, ProvenanceEntry[]> = {};
  const unmerged: ProvenanceEntry[] = [];

  for (const row of rows) {
    const entry = {
      source: str(row, 'Извор'),
      file: str(row, 'Фајл'),
      row: num(row, 'Ред во фајлот'),
      nameInSource: str(row, 'Назив во изворот'),
      placeInSource: str(row, 'Место во изворот'),
      basis: str(row, 'Основа за поврзување'),
      confidence: str(row, 'Сигурност'),
      note: str(row, 'Забелешка') || null,
    };
    const parsed = ProvenanceEntrySchema.safeParse(entry);
    if (!parsed.success) {
      issues.push({ level: 'warn', id: str(row, 'Извор'), field: 'Мапирање', message: parsed.error.issues[0].message });
      continue;
    }
    const id = str(row, 'ID во мастер');
    if (id) (byId[id] ??= []).push(parsed.data);
    else unmerged.push(parsed.data);
  }
  return ProvenanceFileSchema.parse({ byId, unmerged });
}

const DZS_CATEGORIES = new Set([
  'Национална библиотека',
  'Библиотеки – национални установи',
  'Јавни (народни) библиотеки',
  'Високошколски библиотеки',
  'Специјализирани библиотеки',
  'Неспецијализирани (општонаучни) библиотеки',
]);

function parseDzs(rows: Row[]): { dzsRows: DzsRow[]; officialTotal: number | null } {
  const dzsRows: DzsRow[] = [];
  let officialTotal: number | null = null;

  for (const row of rows) {
    const category = str(row, 'Категорија според ДЗС');
    if (!category) continue;
    if (category === 'Вкупно') {
      officialTotal = num(row, 'Број според ДЗС (2025)');
      continue;
    }
    if (!DZS_CATEGORIES.has(category)) continue;
    dzsRows.push({
      category,
      official: num(row, 'Број според ДЗС (2025)') ?? 0,
      confirmedInMaster: num(row, 'Потврдени во мастер') ?? 0,
      allInMaster: num(row, 'Сите записи во мастер (вкл. непотврдени)') ?? 0,
      difference: num(row, 'Разлика (ДЗС − потврдени)') ?? 0,
      note: str(row, 'Забелешка') || null,
    });
  }
  return { dzsRows, officialTotal };
}

/**
 * Наслови од мастерот што не се прикажуваат на страницата.
 *
 * Мастер-книгата не се менува, па одбивањето се прави овде, при парсирањето.
 * Секој од нив е цела секција: насловот и сите редови до следниот нумериран
 * ред. Бришењето е по точен наслов, не по позиција — ако книгата подоцна
 * додаде нова секција, таа останува.
 */
const METHODOLOGY_SKIP = new Set([
  'Исклучен извор: biblioteki_15_with_media.xlsx',
  'Забелешки за квалитетот на изворите',
  'Бои во листот „Мастер“',
  'Колони без податоци за повеќето записи',
]);

/**
 * Го претвора листот „Легенда и методологија“ во markdown.
 * Нумерираните редови („1. …“, „2. …“) стануваат наслови од второ ниво.
 */
function parseMethodology(lines: string[]): { markdown: string; headings: string[] } {
  const headings: string[] = [];
  const md: string[] = ['# Методологија и извори', ''];
  let skipping = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      // Празниот ред се турка само кога не сме во избришана секција, инаку
      // останува дупол празен ред пред следниот наслов.
      if (!skipping && md.at(-1) !== '') md.push('');
      continue;
    }
    const heading = line.match(/^(\d{1,2})\.\s+(.+)$/);
    if (heading) {
      const title = heading[2].trim();
      skipping = METHODOLOGY_SKIP.has(title);
      if (skipping) continue;
      headings.push(title);
      md.push(`## ${title}`, '');
      continue;
    }
    if (skipping) continue;
    md.push(line.replace(/^•\s*/, '- '));
  }
  return { markdown: `${md.join('\n').trimEnd()}\n`, headings };
}

function computeStats(input: {
  libraries: Library[];
  coverage: CoverageEntry[];
  provenance: ProvenanceFile;
  dzsRows: DzsRow[];
  officialTotal: number | null;
}): Stats {
  const { libraries, coverage, provenance, dzsRows, officialTotal } = input;
  const pub = libraries.filter((l) => l.public);

  const countBy = (items: Library[], key: (l: Library) => string) => {
    const map = new Map<string, number>();
    for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };

  const typeCounts = countBy(pub, (l) => l.type);
  const groupCounts = countBy(pub, (l) => l.typeGroup);
  const verCounts = countBy(pub, (l) => l.verification.level);
  const verAllCounts = countBy(libraries, (l) => l.verification.level);
  const confCounts = countBy(pub, (l) => l.confidence);
  const placeCounts = countBy(pub, (l) => l.location.place);

  const countItem = (slug: string, label: string, count: number) => ({ slug, label, count });

  const cobissLibs = pub.filter((l) => l.cobiss.stats2024.fund !== null);
  const sum = (sel: (l: Library) => number | null) =>
    pub.reduce((acc, l) => acc + (sel(l) ?? 0), 0);

  const perSource = new Map<string, number>();
  for (const entries of Object.values(provenance.byId)) {
    for (const e of entries) perSource.set(e.source, (perSource.get(e.source) ?? 0) + 1);
  }
  const sourceCounts = [...perSource.entries()].sort((a, b) => b[1] - a[1]);

  const declaredCounts = libraries.map((l) => l.sources.count);
  const verifiedDates = libraries.map((l) => l.lastVerified).filter((d): d is string => Boolean(d));
  const dataVerifiedOn = verifiedDates.sort().at(-1) ?? '1970-01-01';

  return StatsSchema.parse({
    // детерминиран „датум на изработка“ — изведен од податоците, не од часовникот,
    // за да нема разлики меѓу две изградби на истиот xlsx
    generatedAt: `${dataVerifiedOn}T00:00:00.000Z`,
    dataVerifiedOn,
    totals: {
      records: libraries.length,
      public: pub.length,
      excluded: libraries.length - pub.length,
      byType: typeCounts.map(([slug, count]) =>
        countItem(slug, TYPES[Object.keys(TYPES).find((k) => typeSlugOf(k) === slug) ?? '']?.shortLabel ?? slug, count),
      ),
      byTypeGroup: groupCounts.map(([slug, count]) =>
        countItem(slug, TYPE_GROUP_LABEL[slug as TypeGroup] ?? slug, count),
      ),
      byVerification: verCounts.map(([level, count]) => countItem(level, VERIFICATION_LABEL[level as keyof typeof VERIFICATION_LABEL], count)),
      byVerificationAll: verAllCounts.map(([level, count]) => countItem(level, VERIFICATION_LABEL[level as keyof typeof VERIFICATION_LABEL], count)),
      byConfidence: confCounts.map(([c, count]) => countItem(c, CONFIDENCE_LABEL[c as keyof typeof CONFIDENCE_LABEL], count)),
    },
    geography: {
      places: placeCounts.length,
      exactCoordinates: libraries.filter((l) => l.location.coordsSource === 'exact').length,
      topPlaces: placeCounts.slice(0, 15).map(([place, count]) => countItem(slugify(place), place, count)),
      coverage: {
        municipalities: coverage.length,
        withLibrary: coverage.filter((c) => c.priority === 'none').length,
        partial: coverage.filter((c) => c.priority === 'medium').length,
        none: coverage.filter((c) => c.priority === 'high').length,
      },
    },
    cobiss: {
      libraries: cobissLibs.length,
      fund: sum((l) => l.cobiss.stats2024.fund),
      increment: sum((l) => l.cobiss.stats2024.increment),
      records: sum((l) => l.cobiss.stats2024.records),
    },
    dzs: {
      officialTotal: officialTotal ?? dzsRows.reduce((a, r) => a + r.official, 0),
      confirmedTotal: dzsRows.reduce((a, r) => a + r.confirmedInMaster, 0),
      rows: dzsRows,
    },
    sources: {
      averagePerRecord: Math.round((declaredCounts.reduce((a, b) => a + b, 0) / declaredCounts.length) * 10) / 10,
      maxPerRecord: Math.max(...declaredCounts),
      bySource: sourceCounts.map(([source, count]) => countItem(slugify(source), source, count)),
    },
  });
}

/** Го зема листот; ако го нема, обработката мора да запре (името се сменило во xlsx-от). */
function mustSheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`листот „${name}“ не постои во workbook-от`);
  return ws;
}

/** Целосна обработка: xlsx → валидирани низи податоци. */
export async function buildAll(xlsxPath: string): Promise<BuildResult> {
  const issues: BuildIssue[] = [];
  const wb = await readWorkbook(xlsxPath);

  const master = sheetToRows(mustSheet(wb, 'Мастер'));
  const libraries = parseMaster(master, issues);

  // Овие листови имаат празна колона A и наслови во првите редови: header = ред 4.
  const coverage = parseCoverage(sheetToRows(mustSheet(wb, 'Покриеност по општини'), 4), issues);
  const candidates = parseCandidates(sheetToRows(mustSheet(wb, 'Кандидати (непотврдени)'), 4), issues);
  const provenance = parseProvenance(sheetToRows(mustSheet(wb, 'Мапирање на извори')), issues);
  const { dzsRows, officialTotal } = parseDzs(sheetToRows(mustSheet(wb, 'Усогласување со ДЗС'), 4));
  const methodologyRaw = parseMethodology(sheetColumn(mustSheet(wb, 'Легенда и методологија')));
  const methodology = { ...methodologyRaw, markdown: mkDirectoryTerm(methodologyRaw.markdown) };

  // Задолжителна проверка на сите записи низ схемата
  for (const lib of libraries) {
    const parsed = LibrarySchema.safeParse(lib);
    if (!parsed.success) {
      for (const err of parsed.error.issues) {
        issues.push({ level: 'error', id: lib.id, field: err.path.join('.'), message: err.message });
      }
    }
  }

  const stats = computeStats({ libraries, coverage, provenance, dzsRows, officialTotal });

  return { libraries, coverage, candidates, provenance, dzsRows, stats, methodology, issues };
}

export const DATA_DIR = path.join(process.cwd(), 'src', 'data');
export const MASTER_XLSX = path.join(process.cwd(), 'master_biblioteki_mk.xlsx');

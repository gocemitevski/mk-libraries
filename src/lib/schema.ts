import { z } from 'zod';

/** Извор по кој е земен податокот (нпр. „МКТ“, „COBISS (профили)“). */
export const SourceVariantSchema = z.object({
  source: z.string().min(1),
  value: z.string().min(1),
});

export const CobissStatsSchema = z.object({
  /** Записи во локалната база на 31.12.2024 */
  records: z.number().int().nonnegative().nullable(),
  /** Прираст на фондот во 2024 (примероци) */
  increment: z.number().int().nonnegative().nullable(),
  /** Вкупен фонд на 31.12.2024 (примероци) */
  fund: z.number().int().nonnegative().nullable(),
  /** Вид во COBISS статистика 2025 */
  kind: z.string().nullable(),
});

export const CobissSchema = z.object({
  sigla: z.string().nullable(),
  acronym: z.string().nullable(),
  acronymCyr: z.string().nullable(),
  nameEn: z.string().nullable(),
  profileUrl: z.url().nullable(),
  aspiUrl: z.url().nullable(),
  type: z.string().nullable(),
  status: z.string().nullable(),
  membership: z.string().nullable(),
  memberSince: z.string().nullable(),
  stats2024: CobissStatsSchema,
});

export const LegalSchema = z.object({
  embs: z.string().nullable(),
  edb: z.string().nullable(),
  registerName: z.string().nullable(),
  relation: z.string().nullable(),
  crStatus: z.string().nullable(),
  /** Број на вработени според CompanyWall — индикативно. */
  employees: z.number().int().nonnegative().nullable(),
});

export const LibrarySchema = z.object({
  id: z.string().regex(/^MK-BIB-\d{3}$/),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(1),
  shortName: z.string().nullable(),
  /** Имиња од други извори — се користат во пребарувањето, не како наслов. */
  aliases: z.array(z.string().min(1)),
  /** Шифра на типот — од таксономијата; невалидната вредност ја фаќа build-от. */
  type: z.enum([
    'nacionalna-ustanova', 'javna', 'visokoskolska', 'specijalizirana', 'ogranok',
    'ucilisna', 'stranski-centar', 'zdruzenie', 'nepoznato', 'ne-e-biblioteka',
  ]),
  typeLabel: z.string(),
  /** Групата за /tipovi/[slug] — 6 индексирани страници. */
  typeGroup: z.enum(['nacionalni', 'javni', 'visokoskolski', 'specijalizirani', 'ogranoci', 'ostanati']),
  dzsCategory: z.string(),
  dzsLabel: z.string(),
  /** „Е библиотека?“ */
  isLibrary: z.enum(['yes', 'partial', 'uncertain', 'no']),
  /** Се прикажува во адресарот? (false = не е библиотека) */
  public: z.boolean(),
  status: z.string(),
  active: z.boolean(),
  verification: z.object({
    level: z.enum(['confirmed', 'partial', 'unconfirmed']),
    label: z.string(),
    detail: z.string().nullable(),
  }),
  confidence: z.enum(['high', 'medium', 'single']),
  needsCheck: z.boolean(),
  location: z.object({
    place: z.string().min(1),
    municipality: z.string().nullable(),
    address: z.string().nullable(),
    postalCode: z.string().nullable(),
    lat: z.number().min(35).max(45).nullable(),
    lon: z.number().min(15).max(30).nullable(),
    coordsSource: z.enum(['exact', 'settlement', 'none']),
  }),
  contacts: z.object({
    phones: z.array(z.string()),
    emails: z.array(z.email()),
    website: z.url().nullable(),
    otherWebsites: z.array(z.url()),
    hours: z.array(SourceVariantSchema),
    /** Име и функција на контактното лице — БЕЗ приватни телефони (види §4.7). */
    contactPerson: z.string().nullable(),
    director: z.string().nullable(),
  }),
  legal: LegalSchema,
  cobiss: CobissSchema,
  history: z.object({
    founded: z.string().nullable(),
    foundedWeb: z.string().nullable(),
    updated: z.string().nullable(),
    note: z.string().nullable(),
    protectedObj: z.string().nullable(),
  }),
  links: z.object({
    wikipedia: z.url().nullable(),
    wikidata: z.url().nullable(),
    commonsImage: z.url().nullable(),
    commonsCategory: z.url().nullable(),
    zk: z.url().nullable(),
    loc: z.url().nullable(),
    abv: z.url().nullable(),
    digital: z.string().nullable(),
    other: z.array(z.url()),
  }),
  parent: z.object({ name: z.string(), slug: z.string().nullable() }),
  /** Ограноци на овој запис (IDs на други записи). */
  branches: z.array(z.string()),
  sources: z.object({
    list: z.array(z.string()),
    count: z.number().int().nonnegative(),
    addressVariants: z.array(SourceVariantSchema),
    allAddresses: z.string().nullable(),
    allPhones: z.array(z.string()),
  }),
  notes: z.string().nullable(),
  lastVerified: z.iso.date().nullable(),
  verificationUrls: z.array(z.url()),
});

export const CoverageSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  publicCount: z.number().int().nonnegative(),
  branchCount: z.number().int().nonnegative(),
  otherCount: z.number().int().nonnegative(),
  publicNames: z.array(z.string()),
  culturalHomes: z.string().nullable(),
  priority: z.enum(['high', 'medium', 'none']),
  priorityLabel: z.string(),
  note: z.string().nullable(),
});

export const CandidateSchema = z.object({
  number: z.number().int().positive(),
  name: z.string().min(1),
  place: z.string().min(1),
  parentInstitution: z.string().nullable(),
  expectedDzs: z.string().nullable(),
  confirmed: z.string().nullable(),
  webCheck: z.string().nullable(),
  nextStep: z.string().nullable(),
  sourceUrl: z.url().nullable(),
});

export const ProvenanceEntrySchema = z.object({
  source: z.string(),
  file: z.string(),
  /** Ред во изворниот фајл; null кога изворот е веб/документ без редови. */
  row: z.number().int().positive().nullable(),
  nameInSource: z.string(),
  placeInSource: z.string(),
  basis: z.string(),
  confidence: z.string(),
  note: z.string().nullable(),
});

export const ProvenanceFileSchema = z.object({
  byId: z.record(z.string(), z.array(ProvenanceEntrySchema)),
  unmerged: z.array(ProvenanceEntrySchema),
});

export const DzsRowSchema = z.object({
  category: z.string(),
  official: z.number().int(),
  confirmedInMaster: z.number().int(),
  allInMaster: z.number().int(),
  difference: z.number().int(),
  note: z.string().nullable(),
});

export const CountSchema = z.object({ slug: z.string(), label: z.string(), count: z.number().int() });

export const StatsSchema = z.object({
  generatedAt: z.iso.datetime(),
  dataVerifiedOn: z.iso.date().nullable(),
  totals: z.object({
    records: z.number().int(),
    public: z.number().int(),
    excluded: z.number().int(),
    byType: z.array(CountSchema),
    byTypeGroup: z.array(CountSchema),
    byVerification: z.array(CountSchema),
    byConfidence: z.array(CountSchema),
  }),
  geography: z.object({
    places: z.number().int(),
    topPlaces: z.array(CountSchema),
    coverage: z.object({
      municipalities: z.number().int(),
      withLibrary: z.number().int(),
      partial: z.number().int(),
      none: z.number().int(),
    }),
  }),
  cobiss: z.object({
    libraries: z.number().int(),
    fund: z.number().int(),
    increment: z.number().int(),
    records: z.number().int(),
  }),
  dzs: z.object({
    officialTotal: z.number().int(),
    confirmedTotal: z.number().int(),
    rows: z.array(DzsRowSchema),
  }),
  sources: z.object({
    averagePerRecord: z.number(),
    maxPerRecord: z.number().int(),
    bySource: z.array(CountSchema),
  }),
});

export type Library = z.infer<typeof LibrarySchema>;
export type CoverageEntry = z.infer<typeof CoverageSchema>;
export type Candidate = z.infer<typeof CandidateSchema>;
export type ProvenanceEntry = z.infer<typeof ProvenanceEntrySchema>;
export type ProvenanceFile = z.infer<typeof ProvenanceFileSchema>;
export type Stats = z.infer<typeof StatsSchema>;
export type DzsRow = z.infer<typeof DzsRowSchema>;
export type SourceVariant = z.infer<typeof SourceVariantSchema>;

export interface MethodologyDoc {
  markdown: string;
  headings: string[];
}

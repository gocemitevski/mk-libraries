/**
 * Таксономија — едно изворно место за сите шифри и називи.
 * Ги користат и скриптата за податоци и веб-апликацијата.
 */

export type TypeSlug =
  | 'nacionalna-ustanova'
  | 'javna'
  | 'visokoskolska'
  | 'specijalizirana'
  | 'ogranok'
  | 'ucilisna'
  | 'stranski-centar'
  | 'zdruzenie'
  | 'nepoznato'
  | 'ne-e-biblioteka';

export interface TypeMeta {
  label: string;
  shortLabel: string;
  /** Групирање за /tipovi/[group] — 6 индексирани страници, не 10. */
  group: TypeGroup;
  description: string;
}

export type TypeGroup = 'nacionalni' | 'javni' | 'visokoskolski' | 'specijalizirani' | 'ogranoci' | 'ostanati';

export const TYPE_GROUP_LABEL: Record<TypeGroup, string> = {
  nacionalni: 'Национални библиотеки',
  javni: 'Јавни (народни) библиотеки',
  visokoskolski: 'Високошколски библиотеки',
  specijalizirani: 'Специјализирани библиотеки',
  ogranoci: 'Подрачни библиотеки и ограноци',
  ostanati: 'Останати библиотеки и читални',
};

/** Клуч = вредноста во „Тип на установа (стандардизиран)“ во мастер-листот. */
export const TYPES: Record<string, TypeMeta> = {
  'Национална библиотечна установа': {
    label: 'Национална библиотечна установа',
    shortLabel: 'Национална',
    group: 'nacionalni',
    description: 'НУБ и националните установи што ги води Министерството за култура.',
  },
  'Јавна (локална/општинска) библиотека': {
    label: 'Јавна (локална/општинска) библиотека',
    shortLabel: 'Јавна',
    group: 'javni',
    description: 'Народни и општински библиотеки достапни за граѓаните.',
  },
  'Високошколска / универзитетска библиотека': {
    label: 'Високошколска / универзитетска библиотека',
    shortLabel: 'Високошколска',
    group: 'visokoskolski',
    description: 'Универзитетски и факултетски библиотеки.',
  },
  'Специјализирана библиотека': {
    label: 'Специјализирана библиотека',
    shortLabel: 'Специјализирана',
    group: 'specijalizirani',
    description: 'Научни, институтски, музејски и други специјализирани збирки.',
  },
  'Подрачна библиотека / огранок': {
    label: 'Подрачна библиотека / огранок',
    shortLabel: 'Огранок',
    group: 'ogranoci',
    description: 'Ограноци и подрачни единици на матичните библиотеки.',
  },
  'Училишна библиотека': {
    label: 'Училишна библиотека',
    shortLabel: 'Училишна',
    group: 'ostanati',
    description: 'Библиотеки при основни и средни училишта.',
  },
  'Странски културен центар / читална / катче': {
    label: 'Странски културен центар / читална / катче',
    shortLabel: 'Читална',
    group: 'ostanati',
    description: 'Читални и катчиња при културни центри - службено „делумно“ библиотеки.',
  },
  'Здружение / приватна библиотека': {
    label: 'Здружение / приватна библиотека',
    shortLabel: 'Приватна',
    group: 'ostanati',
    description: 'Здруженија и приватни збирки.',
  },
  'Непознато – потребна проверка': {
    label: 'Непознато – потребна проверка',
    shortLabel: 'Непознато',
    group: 'ostanati',
    description: 'Записи кај кои типот не е јасно утврден - податокот е во проверка.',
  },
  'Не е библиотека (друга дејност)': {
    label: 'Не е библиотека (друга дејност)',
    shortLabel: 'Не е библиотека',
    group: 'ostanati',
    description: 'Изведени записи што не се библиотеки - не се прикажуваат во адресарот.',
  },
};

export const TYPE_GROUP_ORDER: TypeGroup[] = [
  'nacionalni',
  'javni',
  'visokoskolski',
  'specijalizirani',
  'ogranoci',
  'ostanati',
];

/** Шифра на тип ↔ назив во мастер-листот — едно изворно место за pipeline и апликација. */
export const TYPE_SLUG_BY_LABEL: Record<string, TypeSlug> = {
  'Национална библиотечна установа': 'nacionalna-ustanova',
  'Јавна (локална/општинска) библиотека': 'javna',
  'Високошколска / универзитетска библиотека': 'visokoskolska',
  'Специјализирана библиотека': 'specijalizirana',
  'Подрачна библиотека / огранок': 'ogranok',
  'Училишна библиотека': 'ucilisna',
  'Странски културен центар / читална / катче': 'stranski-centar',
  'Здружение / приватна библиотека': 'zdruzenie',
  'Непознато – потребна проверка': 'nepoznato',
  'Не е библиотека (друга дејност)': 'ne-e-biblioteka',
};

export const TYPE_BY_SLUG: Record<TypeSlug, TypeMeta> = Object.fromEntries(
  Object.entries(TYPE_SLUG_BY_LABEL).map(([label, slug]) => [slug, TYPES[label]]),
) as Record<TypeSlug, TypeMeta>;

/** „Е библиотека?“ → шифра + приказ. */
export const IS_LIBRARY: Record<string, { code: 'yes' | 'partial' | 'uncertain' | 'no'; label: string }> = {
  ДА: { code: 'yes', label: 'ДА' },
  'ДЕЛУМНО (читална/медијатека)': { code: 'partial', label: 'ДЕЛУМНО' },
  НЕСИГУРНО: { code: 'uncertain', label: 'НЕСИГУРНО' },
  НЕ: { code: 'no', label: 'НЕ' },
};

/** „Статус на верификација“ → ниво. */
export const VERIFICATION_LEVEL: Record<string, 'confirmed' | 'partial' | 'unconfirmed'> = {
  'Потврдено': 'confirmed',
  'Делумно': 'partial',
  'Непотврдено': 'unconfirmed',
};

export const VERIFICATION_LABEL = {
  confirmed: 'Потврдено',
  partial: 'Делумно потврдено',
  unconfirmed: 'Непотврдено',
} as const;

/** „Најниска сигурност на спојување“ → шифра. */
export const CONFIDENCE: Record<string, 'high' | 'medium' | 'single'> = {
  'Висока': 'high',
  'Средна': 'medium',
  'Еден извор': 'single',
};

export const CONFIDENCE_LABEL = {
  high: 'Висока сигурност',
  medium: 'Средна сигурност',
  single: 'Еден извор',
} as const;

/** „Категорија според ДЗС (изведена)“ → шифра. */
export const DZS_CATEGORY: Record<string, string> = {
  'Национална библиотека': 'nacionalna',
  'Библиотека – национална установа': 'nacionalna-ustanova',
  'Јавна (народна)': 'javna',
  'Високошколска': 'visokoskolska',
  'Специјализирана': 'specijalizirana',
  'Не се брои посебно (огранок) – претпоставка': 'ogranok',
  'Не е во ДЗС-класификацијата (училишна)': 'ucilisna',
  'Неутврдено': 'neutvrdeno',
  'Не е библиотека': 'ne-e-biblioteka',
};

export const DZS_LABEL: Record<string, string> = {
  nacionalna: 'Национална библиотека',
  'nacionalna-ustanova': 'Библиотека – национална установа',
  javna: 'Јавна (народна)',
  visokoskolska: 'Високошколска',
  specijalizirana: 'Специјализирана',
  ogranok: 'Не се брои посебно (огранок)',
  ucilisna: 'Училишна (не е во ДЗС-класификацијата)',
  neutvrdeno: 'Неутврдено',
  'ne-e-biblioteka': 'Не е библиотека',
};

/** Приоритет од листот „Покриеност по општини“. */
export const COVERAGE_PRIORITY: Record<string, 'high' | 'medium' | 'none'> = {
  'ВИСОК': 'high',
  'СРЕДЕН': 'medium',
  '-': 'none',
};

export const COVERAGE_LABEL = {
  high: 'Нема јавна библиотека',
  medium: 'Нема потврдена јавна библиотека',
  none: 'Има јавна библиотека',
} as const;

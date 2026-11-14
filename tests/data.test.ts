import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { buildAll, MASTER_XLSX } from '../scripts/lib/build.ts';
import { normalizeForSearch, normalizeUrl, parseDdMmYyyy, slugify, stripPhoneNumbers } from '../scripts/lib/translit.ts';
import type { BuildResult } from '../scripts/lib/build.ts';

let result: BuildResult;

before(async () => {
  result = await buildAll(MASTER_XLSX);
}, { timeout: 120_000 });

describe('транслитерација и нормализација', () => {
  it('прави слагови на латиница', () => {
    assert.equal(slugify('НУ НУБ „Св. Климент Охридски“ Скопје'), 'nu-nub-sv-kliment-ohridski-skopje');
    assert.equal(slugify('Градска библиотека „Браќа Миладиновци“'), 'gradska-biblioteka-brakja-miladinovci');
    assert.equal(slugify('Општина Арачиново'), 'opshtina-arachinovo');
  });

  it('не остава кирилица во слаговите', () => {
    for (const lib of result.libraries) assert.match(lib.slug, /^[a-z0-9-]+$/);
    for (const cov of result.coverage) assert.match(cov.slug, /^[a-z0-9-]+$/);
  });

  it('нормализира URL без протокол', () => {
    assert.equal(normalizeUrl('nubsk.edu.mk'), 'https://nubsk.edu.mk');
    assert.equal(normalizeUrl('www.nubsk.edu.mk/'), 'https://nubsk.edu.mk');
    assert.equal(normalizeUrl('https://loc.mk/mk/place/ohrid/x'), 'https://loc.mk/mk/place/ohrid/x');
    // gbsk.mk не служи TLS — http:// е единствениот облик што работи
    assert.equal(normalizeUrl('https://gbsk.mk'), 'http://gbsk.mk');
    assert.equal(normalizeUrl('gbsk.mk/'), 'http://gbsk.mk');
    assert.equal(normalizeUrl('не е адреса'), null);
    assert.equal(normalizeUrl(''), null);
  });

  it('парсира датуми', () => {
    assert.equal(parseDdMmYyyy('12.10.2026'), '2026-10-12');
    assert.equal(parseDdMmYyyy('1.2.2026'), '2026-02-01');
    assert.equal(parseDdMmYyyy('несомалатум'), null);
  });

  it('ги отстранува телефоните од контакт-лицата', () => {
    assert.equal(stripPhoneNumbers('Јовица Никчевски, тел. +389 2 322 68 46'), 'Јовица Никчевски');
    assert.equal(stripPhoneNumbers('Илија џајкоски, 078 272 880'), 'Илија џајкоски');
    assert.equal(stripPhoneNumbers('Арсена Глигорова'), 'Арсена Глигорова');
    // телефон на крај, со локален број и со разделувачи — не смеат да останат запирки
    assert.equal(
      stripPhoneNumbers('Весна Бошева Русовски, тел. +389 2 311 51 77 / , lok. 113'),
      'Весна Бошева Русовски',
    );
    assert.equal(stripPhoneNumbers('Тања Гошева, тел. +389 70 37 16 15'), 'Тања Гошева');
    assert.equal(stripPhoneNumbers('Бинас Пајазити, 075 268 778, 044 338 797'), 'Бинас Пајазити');
  });

  it('не остава заостанати одделувачи ни кај едно контакт-лице', () => {
    for (const lib of result.libraries) {
      for (const field of [lib.contacts.contactPerson, lib.contacts.director]) {
        if (!field) continue;
        assert.doesNotMatch(field, /[,;:|/]\s*$/, `${lib.id}: ${field}`);
        assert.doesNotMatch(field, /\s{2,}|,\s*,/, `${lib.id}: ${field}`);
      }
    }
  });

  it('ги задржува кирилицата и латиницата во нормализацијата', () => {
    assert.equal(normalizeForSearch('„НУБ“ Св. Климент'), 'нуб св климент');
  });
});

describe('мастер-база', () => {
  it('ги содржи сите 152 записи, 144 прикажани', () => {
    assert.equal(result.libraries.length, 152);
    assert.equal(result.libraries.filter((l) => l.public).length, 144);
    assert.equal(result.libraries.filter((l) => !l.public).length, 8);
  });

  it('има唯一ни слагови', () => {
    const slugs = result.libraries.map((l) => l.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });

  it('има唯一ни ID-а', () => {
    const ids = result.libraries.map((l) => l.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('сите типови се од познатата таксономија', () => {
    const known = new Set([
      'nacionalna-ustanova', 'javna', 'visokoskolska', 'specijalizirana', 'ogranok',
      'ucilisna', 'stranski-centar', 'zdruzenie', 'nepoznato', 'ne-e-biblioteka',
    ]);
    for (const l of result.libraries) assert.ok(known.has(l.type), `${l.id}: ${l.type}`);
  });

  it('ги пресметува типовите како листот „Преглед“', () => {
    const expected: Record<string, number> = {
      'Високошколска / универзитетска библиотека': 36,
      'Специјализирана библиотека': 31,
      'Јавна (локална/општинска) библиотека': 29,
      'Подрачна библиотека / огранок': 22,
      'Не е библиотека (друга дејност)': 8,
      'Непознато – потребна проверка': 7,
      'Училишна библиотека': 6,
      'Национална библиотечна установа': 5,
      'Странски културен центар / читална / катче': 5,
      'Здружение / приватна библиотека': 3,
    };
    for (const [label, count] of Object.entries(expected)) {
      assert.equal(result.libraries.filter((l) => l.typeLabel === label).length, count, label);
    }
  });

  it('ги пресметува верификацијата како листот „Преглед“', () => {
    const counts = { confirmed: 113, partial: 17, unconfirmed: 22 };
    for (const [level, count] of Object.entries(counts)) {
      assert.equal(result.libraries.filter((l) => l.verification.level === level).length, count, level);
    }
  });

  it('ги пресметува сигурноста како листот „Преглед“', () => {
    const counts = { high: 82, medium: 11, single: 59 };
    for (const [c, count] of Object.entries(counts)) {
      assert.equal(result.libraries.filter((l) => l.confidence === c).length, count, c);
    }
  });

  it('сите веб-страни се валидни адреси', () => {
    for (const l of result.libraries) {
      if (l.contacts.website) {
        assert.match(l.contacts.website, /^https?:\/\/[^/]+\.[a-z]{2,}/i, l.id);
        // http е дозволен само за домаќини без TLS (gbsk.mk)
        if (l.contacts.website.startsWith('http://')) {
          assert.match(l.contacts.website, /^http:\/\/gbsk\.mk(\/|$)/, l.id);
        }
      }
      for (const w of l.contacts.otherWebsites) assert.match(w, /^https:\/\//, l.id);
    }
  });

  it('ги балансира наводниците во варијантите на името', () => {
    for (const l of result.libraries) {
      for (const alias of l.aliases) {
        assert.equal(
          (alias.match(/„/g) ?? []).length,
          (alias.match(/“/g) ?? []).length,
          `${l.id}: ${alias}`,
        );
        assert.doesNotMatch(alias, /„[^„“]*„/, `${l.id}: ${alias}`);
        assert.doesNotMatch(alias, /”/, `${l.id}: ${alias}`);
      }
    }
  });

  it('сите координати се во опсегот на Македонија', () => {
    for (const l of result.libraries) {
      const { lat, lon } = l.location;
      if (lat === null || lon === null) continue;
      assert.ok(lat > 40.8 && lat < 42.4, `${l.id} lat`);
      assert.ok(lon > 20.4 && lon < 23.1, `${l.id} lon`);
      assert.equal(l.location.coordsSource, 'exact');
    }
    assert.equal(result.libraries.filter((l) => l.location.lat !== null).length, 10);
  });

  it('секој запис има барем еден извор', () => {
    for (const l of result.libraries) {
      assert.ok(l.sources.list.length >= 1, `${l.id}: извори`);
      assert.equal(l.sources.count, l.sources.list.length, l.id);
    }
  });

  it('датумот на проверка постои само кај веб-проверените записи', () => {
    const checked = result.libraries.filter((l) => l.lastVerified !== null);
    assert.equal(checked.length, 58, 'записи со „Веб-проверка (12.10.2026)“');
    for (const l of checked) {
      assert.equal(l.lastVerified, '2026-10-12', l.id);
      assert.ok(l.verificationUrls.length > 0, `${l.id}: URL-а од проверката`);
    }
    for (const l of result.libraries.filter((l) => l.lastVerified === null)) {
      assert.equal(l.verificationUrls.length, 0, l.id);
    }
  });

  it('ги поврзува огранците со матичните библиотеки', () => {
    const linked = result.libraries.filter((l) => l.parent.slug !== null);
    assert.ok(linked.length >= 20, `поврзани огранци: ${linked.length}`);
    for (const l of linked) {
      const parent = result.libraries.find((p) => p.slug === l.parent.slug);
      assert.ok(parent, `${l.id}: мајчин запис постои`);
      assert.ok(parent.branches.includes(l.id), `${l.id}: е во огранци на родителот`);
    }
  });

  it('секој огранок покажува конзистентен родител', () => {
    for (const l of result.libraries) {
      for (const branchId of l.branches) {
        const child = result.libraries.find((c) => c.id === branchId);
        assert.equal(child?.parent.slug, l.slug, `${l.id} → ${branchId}`);
      }
    }
  });
});

describe('безбедност и приватност (план §4.7)', () => {
  it('не објавува приватни телефони кај контакт-лица', () => {
    for (const l of result.libraries) {
      for (const field of [l.contacts.contactPerson, l.contacts.director]) {
        if (!field) continue;
        assert.doesNotMatch(field, /\+389|\b0\d{2}[\d\s-]{5,}/, `${l.id}: ${field}`);
      }
    }
  });

  it('приватните телефони не се ни во излезниот JSON', () => {
    const raw = JSON.stringify(result.libraries);
    for (const l of result.libraries) {
      if (!l.contacts.contactPerson) continue;
      const phone = l.contacts.contactPerson.match(/\d{3}\s?\d{3}\s?\d{3}/)?.[0];
      if (phone) assert.ok(!raw.includes(phone), `${l.id}: телефонот се појавува во JSON`);
    }
  });

  it('телефоните се во стандардниот формат +389 X XXX XXXX', () => {
    for (const l of result.libraries) {
      for (const p of l.contacts.phones) assert.match(p, /^\+389 \d{1,2} \d{3} \d{3,4}$/, `${l.id}: ${p}`);
    }
    // „Сите телефони“ и „контакт“ мора да се истиот исчистен список
    for (const l of result.libraries) assert.deepEqual(l.sources.allPhones, l.contacts.phones, l.id);
  });
});

describe('географија и покриеност', () => {
  it('ги содржи сите 81 општини', () => {
    assert.equal(result.coverage.length, 81);
    const slugs = result.coverage.map((c) => c.slug);
    assert.equal(new Set(slugs).size, slugs.length);
  });

  it('ги пресметува приоритетите 35/11/35', () => {
    const none = result.coverage.filter((c) => c.priority === 'none').length;
    const medium = result.coverage.filter((c) => c.priority === 'medium').length;
    const high = result.coverage.filter((c) => c.priority === 'high').length;
    assert.deepEqual({ none, medium, high }, { none: 35, medium: 11, high: 35 });
  });

  it('општините со јавна библиотека имаат и барем еден назив', () => {
    for (const c of result.coverage.filter((c) => c.publicCount > 0)) {
      assert.ok(c.publicNames.length > 0, c.name);
    }
  });

  it('ги брои населените места', () => {
    const places = new Set(result.libraries.filter((l) => l.public).map((l) => l.location.place));
    assert.equal(places.size, result.stats.geography.places);
    assert.ok(places.has('Скопје'));
  });
});

describe('извори и трага на потекло', () => {
  it('ги покрива сите 152 ID-а', () => {
    const ids = Object.keys(result.provenance.byId);
    assert.equal(ids.length, 152);
    for (const l of result.libraries) assert.ok(result.provenance.byId[l.id]?.length, l.id);
  });

  it('ги брои записите по извор како листот „Преглед“ (по колоната „Извори“)', () => {
    const countInField = (source: string) =>
      result.libraries.filter((l) => l.sources.list.includes(source)).length;
    assert.equal(countInField('МКТ'), 21);
    assert.equal(countInField('COBISS (профили)'), 67);
    assert.equal(countInField('COBISS-членки'), 67);
    assert.equal(countInField('COBISS статистика 2024 (PDF)'), 74);
    assert.equal(countInField('Википедија'), 19);
    assert.equal(countInField('Златна книга (zk.mk)'), 43);
    assert.equal(countInField('Централен регистар (дејност 91)'), 31);
  });

  it('провенансот ги покрива сите извори од колоната „Извори“', () => {
    for (const l of result.libraries) {
      const provSources = new Set((result.provenance.byId[l.id] ?? []).map((e) => e.source));
      for (const s of l.sources.list) {
        // Познато отстапување: MK-BIB-072 има ред од ЦР (дејност 91) во мапирањето,
        // но колоната „Извори“ во мастерот наведува само „Веб-проверка“.
        if (l.id === 'MK-BIB-072' && s === 'Веб-проверка (12.10.2026)') continue;
        assert.ok(provSources.has(s), `${l.id}: изворот „${s}“ го нема во мапирањето`);
      }
    }
  });

  it('го чува изворот што не е споен', () => {
    assert.ok(result.provenance.unmerged.length > 0);
    assert.ok(result.provenance.unmerged.every((e) => e.basis.length > 0));
  });

  it('секој извор е URL или име на фајл', () => {
    for (const entries of Object.values(result.provenance.byId)) {
      for (const e of entries) {
        assert.ok(e.file.length > 0 || e.source.length > 0, e.source);
        assert.ok(e.row === null || e.row > 0, `${e.source} ред ${e.row}`);
      }
    }
  });
});

describe('ДЗС и статистика', () => {
  it('ги пресметува бројките 170 / 102', () => {
    assert.equal(result.stats.dzs.officialTotal, 170);
    assert.equal(result.stats.dzs.confirmedTotal, 102);
    assert.equal(result.dzsRows.length, 6);
  });

  it('го пресметува фондот на COBISS 2024', () => {
    assert.equal(result.stats.cobiss.fund, 2_762_541);
    assert.equal(result.stats.cobiss.libraries, 70);
    assert.ok(result.stats.cobiss.increment > 0);
  });

  it('го пресметува просечниот број на извори', () => {
    assert.ok(result.stats.sources.averagePerRecord >= 3 && result.stats.sources.averagePerRecord <= 4);
    assert.equal(result.stats.sources.maxPerRecord, 14);
  });

  it('податоците се проверени на 12.10.2026', () => {
    assert.equal(result.stats.dataVerifiedOn, '2026-10-12');
  });

  it('статистиката е конзистентна со записите', () => {
    assert.equal(result.stats.totals.records, result.libraries.length);
    assert.equal(result.stats.totals.public, result.libraries.filter((l) => l.public).length);
    const sumTypes = result.stats.totals.byType.reduce((a, t) => a + t.count, 0);
    assert.equal(sumTypes, result.stats.totals.public);
    // верификацијата низ целата база — ја користи /statistika/ наместо рачен број
    const sumAll = result.stats.totals.byVerificationAll.reduce((a, v) => a + v.count, 0);
    assert.equal(sumAll, result.stats.totals.records);
    const exact = result.libraries.filter((l) => l.location.coordsSource === 'exact').length;
    assert.equal(result.stats.geography.exactCoordinates, exact);
  });
});

describe('кандидати и методологија', () => {
  it('ги содржи сите 69 кандидати', () => {
    assert.equal(result.candidates.length, 69);
    for (const c of result.candidates) assert.ok(c.place.length > 0, c.name);
  });

  it('методологијата има наслови', () => {
    // 9: колку што останува откако се отфрлени четирите секции од
    // METHODOLOGY_SKIP. Прагот е намерно еднаков на тековниот број — секое
    // идно отфрлање на секција ќе го прекине тестот и ќе бара свесна одлука.
    assert.ok(result.methodology.headings.length >= 9);
    assert.ok(result.methodology.markdown.startsWith('# Методологија'));
  });
});

describe('излезни фајлови', () => {
  it('комитираните JSON-фајлови се свежи (исти со новата обработка)', async () => {
    const read = async (name: string) => JSON.parse(await readFile(`src/data/${name}`, 'utf8'));
    assert.deepEqual(await read('libraries.json'), result.libraries);
    assert.deepEqual(await read('coverage.json'), result.coverage);
    assert.deepEqual(await read('candidates.json'), result.candidates);
    assert.deepEqual(await read('stats.json'), result.stats);
    assert.deepEqual(await read('provenance.json'), result.provenance);
  });
});

import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Icon } from '@/components/icon';
import { JsonLd } from '@/lib/seo';
import { stats } from '@/lib/data';
import { NOUNS, plural } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Методологија и извори',
  description:
    'Како е собрана, споена и проверена базата - едноставен опис на постапката, во обични зборови.',
  alternates: { canonical: '/metodologija/' },
};

/**
 * Изворите се редиме рачно по важност, но нивните имиња - вклучувајќи го и
 * датумот во „Веб-проверка“ - доаѓаат од базата, за да не застарее рачно.
 */
const webCheckSource = stats.sources.bySource.find((s) => s.slug.startsWith('veb-proverka'))?.label;

const SOURCE_ORDER = [
  'МКТ – одговор од Министерството за култура и туризам',
  'COBISS – профили на библиотеките во COBISS.MK',
  'COBISS-членки – листа на членки и акроними',
  'ASPI',
  'Википедија',
  'Златна книга (zk.mk)',
  'Жолти страници',
  'loc.mk',
  'abv.mk',
  ...(webCheckSource ? [webCheckSource] : []),
];

export default function MethodologyPage() {
  return (
    <div className="container py-4">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'Методологија и извори',
          inLanguage: 'mk',
          dateModified: stats.dataVerifiedOn ?? undefined,
          about: 'Собирање и спојување на податоци за библиотеките во Северна Македонија',
        }}
      />
      <Breadcrumbs items={[{ label: 'Методологија' }]} />

      <div className="row g-4 mt-1">
        <div className="col-lg-8">
          <header className="mb-4">
            <h1 className="mb-2">Методологија и извори</h1>
            <p className="text-secondary mb-0">
              Оваа страница објаснува, со едноставни зборови, како е собрана и проверена базата.
              Секоја бројка на страницата за статистика потекнува од овој процес.
            </p>
          </header>

          {/* Три куси секции: што е направено, како се избрани изворите, како се
              проверени. Без имиња на листови, колони и фајлови - оние податоци
              остануваат во methodology.md, кој не се прикажува овде. */}
          <article>
            <section className="detail-section pt-4 pb-3" id="sto-napravivme">
              <h2 className="h4">Што направивме</h2>
              <p className="mb-0">
                Собравме податоци за библиотеките во Северна Македонија од јавно достапни извори
                и ги поврзавме во еден запис за секоја установа. Така настана адресарот:{' '}
                {stats.totals.records} {plural(stats.totals.records, NOUNS.запис)} за{' '}
                {stats.geography.coverage.municipalities}{' '}
                {plural(stats.geography.coverage.municipalities, NOUNS.општина)}, од кои{' '}
                {stats.totals.public} се прикажани на страницата.
              </p>
            </section>

            <section className="detail-section pt-4 pb-3" id="kako-izborivme">
              <h2 className="h4">Како изборивме и подредивме извори</h2>
              <p>
                Изворите ги редиме по важност: најпрво одговорите од министерството за култура,
                па библиотечниот систем COBISS, па останатите јавни извори. За секој податок
                земаме вредност од првиот извор што ја има, а сите останати варијанти ги чуваме,
                за да не се изгуби ништо.
              </p>
              <p>
                Извори за кои не сме сигурни дека се точни не влегуваат во базата - остануваат
                настрана, за проверка подоцна.
              </p>

              <div className="card mb-4">
                <div className="card-body">
                  <h3 className="h5 mb-3">Редослед на приоритет на изворите</h3>
                  <ol className="mb-0">
                    {SOURCE_ORDER.map((s) => (
                      <li key={s} className="mb-1">{s}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>

            <section className="detail-section pt-4 pb-3" id="kako-gi-proverivme">
              <h2 className="h4">Како ги проверивме</h2>
              <p className="mb-0">
                Секој запис доаѓа од барем еден јавен извор, а на секој е запишано колку сме
                сигурни во него. Каде податокот не е потврден, тоа е јасно означено наместо да
                се претпостави. Кога изворите се разликуваат, го земаме посигурниот, а разликата
                ја забележуваме.
              </p>
            </section>
          </article>
        </div>

        {/* ── Странична колона ─────────────────────────────────────────── */}
        <aside className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <h2 className="card-title h6">Брзи врски</h2>
              <ul className="list-unstyled small mb-0">
                <li className="mb-2"><Link href="/statistika/">Статистика и преземање</Link></li>
                <li className="mb-2"><Link href="/opstini/">Мапа на покриеноста</Link></li>
                <li className="mb-2"><Link href="/za-proektot/">За проектот</Link></li>
              </ul>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 className="card-title h6">Што објавуваме, што не</h2>
              <p className="card-text small mb-2">
                <strong>Објавуваме:</strong> име, улога и функција на контакт-лицата, институциски
                телефони и е-пошти, јавни профили (COBISS, Википедија, Wikidata).
              </p>
              <p className="card-text small mb-0">
                <strong>Не објавуваме:</strong> лични телефонски броеви на директори и вработени -
                се отстрануваат при градењето на базата.
              </p>
            </div>
          </div>

          <div className="alert alert-secondary small mb-0">
            <Icon name="info-circle" size={18} className="me-2" />
            <strong>Дајте забелешка.</strong> Ако наидете на неточен податок, проверете го прво во{' '}
            <Link href="/biblioteki/">адресарот</Link> - записите се означени со степенот на
            сигурност и со целосната листа на извори.
          </div>
        </aside>
      </div>
    </div>
  );
}

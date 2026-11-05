import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/lib/seo';
import { candidates, coverage, publicLibraries, stats } from '@/lib/data';
import { formatNumber, NOUNS, plural } from '@/lib/format';

export const metadata: Metadata = {
  title: 'За проектот',
  description: `Што е Библиотеки.мк, како се собираат податоците, што се објавува а што не - и зошто ${formatNumber(stats.totals.excluded)} записи остануваат надвор од адресарот.`,
  alternates: { canonical: '/za-proektot/' },
};

export default function AboutPage() {
  return (
    <div className="container py-4">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'За проектот Библиотеки.мк',
          inLanguage: 'mk',
          url: 'https://biblioteki.mk/za-proektot/',
        }}
      />
      <Breadcrumbs items={[{ label: 'За проектот' }]} />

      <div className="row g-4 mt-1">
        <div className="col-lg-8">
          <header className="mb-4">
            <h1 className="mb-2">За проектот</h1>
            <p className="lead mb-0">
              Библиотеки.мк е јавен адресар на библиотеките во Северна Македонија - да се најде
              адреса, телефон и мрежно место на библиотека, и да се види каде системот има дупки.
            </p>
          </header>

          <section className="detail-section py-4">
            <h2 className="h4 mb-3">Зошто постои</h2>
            <p>
              Податоците за библиотеките постојат, но се разпрснати: во одговори на министерството,
              во COBISS, во регистри на деловни субјекти, во Википедија и по локални адресари -
              често со различни адреси и различни називи за истата установа.
            </p>
            <p>
              Овој проект ги собира во една база, според фиксен редослед на приоритет, и покрај секој
              запис наведува од кои извори е составен и колку е сигурен. Целта не е да се биде
              апсолутен авторитет, туку да се биде пресметливо точен: секоја бројка има патека назад
              кон изворот.
            </p>
          </section>

          <section className="detail-section py-4">
            <h2 className="h4 mb-3">Што содржи базата</h2>
            <div className="row g-3 mb-3">
              {[
                { n: stats.totals.records, l: `${plural(stats.totals.records, NOUNS.запис)} вкупно` },
                { n: stats.totals.public, l: 'прикажани во адресарот' },
                { n: stats.totals.excluded, l: 'исклучени (не се библиотеки)' },
                { n: candidates.length, l: 'кандидати во проверка' },
              ].map((s) => (
                <div className="col-6" key={s.l}>
                  <div className="card h-100">
                    <div className="card-body">
                      <div className="stat-number h4 mb-0">{formatNumber(s.n)}</div>
                      <div className="small text-secondary">{s.l}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p>
              Покрај 144-те прикажани записи, уште {stats.totals.excluded} ќелији во мастер-листот се
              означени „не е библиотека“ (музеи, архиви, друга дејност). Остануваат во базата и во
              JSON-извозот, но се со <code>noindex</code> и не се пребаруваат - за да не се мами
              пребарувачот.
            </p>
            <p>
              Уште {candidates.length} установи се во посебен лист како <strong>кандидати</strong>:
              потврдено е дека постојат, но не и дека имаат библиотека. И тие не се во адресарот.
            </p>
          </section>

          <section className="detail-section py-4">
            <h2 className="h4 mb-3">Што објавуваме, а што не</h2>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="card h-100">
                  <div className="card-body">
                    <h3 className="card-title h5 text-success">Објавуваме</h3>
                    <ul className="small mb-0">
                      <li>назив, адреса, населено место, општина</li>
                      <li>институциски телефони и е-пошти</li>
                      <li>мрежно место и јавни профили</li>
                      <li>име и функција на контакт-лице</li>
                      <li>фонд и статистика од COBISS кога постојат</li>
                      <li>сите алтернативни називи и адреси по извор</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card h-100">
                  <div className="card-body">
                    <h3 className="card-title h5 text-danger">Не објавуваме</h3>
                    <ul className="small mb-0">
                      <li>лични телефони на директори и вработени</li>
                      <li>адреси на е-пошти што изгледаат лични</li>
                      <li>податоци без наведен извор</li>
                      <li>записи што не се потврдени како библиотеки</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <p className="small text-secondary mt-3 mb-0">
              Подетално: <Link href="/metodologija/">Методологија и извори</Link>.
            </p>
          </section>

          <section className="detail-section py-4">
            <h2 className="h4 mb-3">Отвореност</h2>
            <p>
              Целата база е достапна во JSON и CSV, под лиценца CC-BY-4.0. Може да ја преземете,
              сортирате и обработувате - само наведете го изворот.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <Link href="/statistika/" className="btn btn-primary">Статистика и преземање</Link>
              <Link href="/metodologija/" className="btn btn-outline-secondary">Методологија</Link>
            </div>
          </section>

          <section className="detail-section py-4">
            <h2 className="h4 mb-3">Ограничувања</h2>
            <ul>
              <li>
                Само 10 од {formatNumber(stats.totals.records)} {plural(stats.totals.records, NOUNS.запис)} имаат точни координати. Мапата затоа користи
                центроиди по населено место и е јасно означена како приближна.
              </li>
              <li>
                Работното време е преземено од адресари и често е застарено - секогаш проверете
                на мрежното место на библиотеката.
              </li>
              <li>
                {formatNumber(stats.dzs.officialTotal)} {plural(stats.dzs.officialTotal, NOUNS.запис)} се водат кај ДЗС, а{' '}
                {formatNumber(stats.dzs.confirmedTotal)} се потврдени во базата. Разликата е прикажана по категорија на страницата за
                статистика.
              </li>
              <li>
                {coverage.length - stats.geography.coverage.withLibrary} општини немаат јавна
                библиотека или немаат потврдена - види ја <Link href="/opstini/">мапата</Link>.
              </li>
            </ul>
          </section>
        </div>

        <aside className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <h2 className="card-title h6">Почеток</h2>
              <ul className="list-unstyled small mb-0">
                <li className="mb-2"><Link href="/biblioteki/">Сите библиотеки</Link></li>
                <li className="mb-2"><Link href="/naseleni-mesta/">По населено место</Link></li>
                <li className="mb-2"><Link href="/tipovi/">По тип</Link></li>
                <li className="mb-2"><Link href="/opstini/">Општини</Link></li>
                <li className="mb-2"><Link href="/statistika/">Статистика</Link></li>
              </ul>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h2 className="card-title h6">Клучни бројки</h2>
              <dl className="small mb-0">
                <dt className="text-secondary">Извори</dt>
                <dd>{stats.sources.bySource.length} различни, просечно {stats.sources.averagePerRecord} по запис</dd>
                <dt className="text-secondary">Датум на проверка</dt>
                <dd><time dateTime={stats.dataVerifiedOn ?? undefined}>{stats.dataVerifiedOn}</time></dd>
                <dt className="text-secondary">Лиценца</dt>
                <dd>CC-BY-4.0</dd>
              </dl>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

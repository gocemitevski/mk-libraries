import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '@/components/icon';
import { SearchBox } from '@/components/search-box';
import { TypeBadge } from '@/components/library-card';
import { JsonLd, websiteJsonLd } from '@/lib/seo';
import { coverage, places, publicLibraries, stats, typeGroups, uncoveredMunicipalities } from '@/lib/data';
import { searchIndex } from '@/lib/search';
import { formatNumber } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Библиотеки во Северна Македонија — адресар',
  description:
    `${stats.totals.public} библиотеки во ${stats.geography.places} населени места во Северна Македонија. Пребарајте по име, населено место или тип и најдете адреса, телефон, мрежно место и податоци од COBISS.`,
  alternates: { canonical: '/' },
};

export default function HomePage() {
  const featured = publicLibraries.slice(0, 6);

  return (
    <>
      <JsonLd data={websiteJsonLd()} />

      {/* ── Насловна секција ───────────────────────────────────────────
          Лентата оди од крај до крај на прозорецот и се придружува на
          header-от; внатрешниот container ја држи содржината усогласена
          со остатокот од страницата. Затоа нема нит агли, нит надворешен
          padding — тоа го прави container-от. */}
      <section className="hero py-lg-4">
        <div className="container py-4 py-md-5">
          <div className="row align-items-center g-lg-5">
            <div className="col-lg-7">
              <h1 className="display-5 display-md-3 mb-3">
                {stats.totals.public} библиотеки
                <br className="d-none d-md-block" /> во Северна Македонија
              </h1>
              <p className="lead mb-4">
                Еден пребарувач за целиот библиотечен систем — од НУБ „Св. Климент Охридски“ до
                подрачните ограноци. Податоците се собрани и проверени од {stats.sources.bySource.length} јавни извори.
              </p>
              <SearchBox records={searchIndex} />
              <p className="small mt-3 mb-lg-0 text-white-50">
                Пробајте: <span className="text-white">НУБ</span> ·{' '}
                <span className="text-white">Григор Прличев</span> ·{' '}
                <span className="text-white">Битола</span> ·{' '}
                <span className="text-white">UBBIT</span>
              </p>
            </div>

            <div className="col-lg-5">
              <div className="row g-3">
                {[
                  { value: stats.totals.public, label: 'библиотеки', icon: 'bookshelf' as const },
                  { value: stats.geography.places, label: 'населени места', icon: 'geo-alt' as const },
                  { value: coverage.length, label: 'општини', icon: 'buildings' as const },
                  { value: stats.cobiss.fund, label: 'примероци во COBISS', icon: 'stack' as const },
                ].map((s) => (
                  <div className="col-6" key={s.label}>
                    <div className="bg-white bg-opacity-10 rounded-3 p-3 h-100">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div className="stat-number h4 mb-0">{formatNumber(s.value)}</div>
                        <Icon name={s.icon} size={20} className="text-white text-opacity-75 flex-shrink-0" />
                      </div>
                      {/* `.text-opacity-75`, не deprecated `.text-white-50`: на 14px
                          белиот текст на полупроѕирната плочка мора да ја помине
                          AA-границата од 4.5:1 — со `.50` меревме 3.7:1, а со `.75`
                          одиме на 6.3:1. Двете се standard Bootstrap utilities; самата
                          `.text-white-50` е deprecated во Bootstrap 5.3.
                          Иконата ја следи ознаката, иста непроѕирност. */}
                      <div className="small text-white text-opacity-75">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container pt-4 pt-md-5 pb-4 pb-md-5">
        {/* ── Предупредување за покриеноста ────────────────────────────── */}
        <section className="alert alert-warning d-flex flex-wrap align-items-center gap-3 mb-5" role="note">
          <div className="flex-grow-1">
            <Icon name="info-circle" size={18} className="me-2" />
            <strong>{uncoveredMunicipalities.length} општини</strong> во базата немаат ниедна јавна библиотека.
            Проверете ја мапата на покриеноста или видете ги сите општини.
          </div>
          <Link href="/opstini/" className="btn btn-sm btn-primary">
            Мапа на покриеноста
          </Link>
        </section>

        {/* ── Типови ───────────────────────────────────────────────────── */}
        <section className="mb-5">
          <div className="d-flex justify-content-between align-items-end mb-4 mx-4">
            <div>
              <span className="section-label">Таксономија</span>
              <h2 className="mb-1">Библиотеки по тип</h2>
              <p className="text-secondary mb-0">Изберете група за целосен список.</p>
            </div>
            <Link href="/tipovi/" className="text-decoration-none">
              Сите типови →
            </Link>
          </div>
          <div className="row g-3">
            {typeGroups.map((group) => (
              <div className="col-md-6 col-lg-4" key={group.slug}>
                <Link href={`/tipovi/${group.slug}/`} className="text-decoration-none">
                  <div className={`card type-card h-100 type-${group.slug}`}>
                    <div className="card-body">
                      <div className="hstack gap-3">
                        <h3 className="card-title h5 mb-0 flex-fill">{group.label}</h3>
                        {/* Иста значка како на /tipovi/ и во заглавието на групата. */}
                        <span className="badge text-truncate flex-shrink-0 type-badge">{group.count}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── Населени места ───────────────────────────────────────────── */}
        <section className="mb-5">
          <div className="d-flex justify-content-between align-items-end mb-4 mx-3">
            <div>
              <span className="section-label">Географија</span>
              <h2 className="mb-1">Населени места со најмногу библиотеки</h2>
              <p className="text-secondary mb-0">Првите 18 од {stats.geography.places} населени места.</p>
            </div>
            <Link href="/naseleni-mesta/" className="text-decoration-none">
              Сите населени места →
            </Link>
          </div>
          <div className="d-flex flex-wrap gap-2 mx-3">
            {places.slice(0, 18).map((place) => (
              <Link
                key={place.slug}
                href={`/naseleni-mesta/${place.slug}/`}
                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2"
              >
                {place.name}
                <span className="badge text-truncate flex-shrink-0 bg-secondary-subtle text-secondary-emphasis">{place.count}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Истакнати записи ─────────────────────────────────────────── */}
        <section className="mb-5">
          <div className='mx-4'>
          <span className="section-label">Истакнато</span>
          <h2 className="mb-4">Записи со најмногу податоци</h2>
          </div>
          <div className="row g-3">
            {featured.map((library) => (
              <div className="col-md-6 col-xl-4" key={library.slug}>
                <Link href={`/biblioteki/${library.slug}/`} className="text-decoration-none">
                  <div className={`card lib-card h-100 type-${library.typeGroup}`}>
                    <div className="card-body">
                      <h3 className="card-title h6">{library.name}</h3>
                      <div className="d-flex flex-wrap gap-2 mb-2">
                        <TypeBadge library={library} />
                      </div>
                      <p className="card-text small text-secondary mb-0">
                        {library.location.address ? `${library.location.address}, ` : ''}
                        {library.location.place}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── Транспарентност ──────────────────────────────────────────── */}
        <section className="card">
          <div className="card-body">
            <h2 className="card-title h5">Од каде се овие податоци?</h2>
            <p className="card-text text-secondary">
              Секој запис е споен од повеќе извори по фиксен редослед на приоритет. Просечно{' '}
              <strong>{stats.sources.averagePerRecord}</strong> извора по запис, максимум{' '}
              <strong>{stats.sources.maxPerRecord}</strong>. Кај сите записи што се во проверка, тоа е јасно означено.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <Link href="/metodologija/" className="btn btn-sm btn-outline-secondary">
                Методологија и извори
              </Link>
              <Link href="/statistika/" className="btn btn-sm btn-outline-secondary">
                Статистика
              </Link>
              <a href="/data/libraries.json" download className="btn btn-sm btn-outline-secondary">
                <Icon name="filetype-json" className="me-2" />
                Преземи ги податоците (JSON)
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

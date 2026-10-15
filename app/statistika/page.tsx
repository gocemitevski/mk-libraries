import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Icon } from '@/components/icon';
import { JsonLd, datasetJsonLd } from '@/lib/seo';
import { coverage, publicLibraries, stats } from '@/lib/data';
import { formatNumber, NOUNS, plural } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Статистика и отворени податоци',
  description: `${formatNumber(stats.totals.records)} ${plural(stats.totals.records, NOUNS.запис)}, ${formatNumber(stats.cobiss.fund)} примероци во COBISS, ${stats.sources.bySource.length} извори — бројки, табели и преземање на податоците.`,
  alternates: { canonical: '/statistika/' },
};

function Bar({ value, max, label, count }: { value: number; max: number; label: string; count: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="d-flex justify-content-between small mb-1">
        <span>{label}</span>
        <span className="stat-number">{formatNumber(count)}</span>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${count}`}
        style={{ height: '0.5rem' }}
      >
        <div className="progress-bar bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function StatsPage() {
  const maxType = Math.max(...stats.totals.byType.map((t) => t.count));
  const maxGroup = Math.max(...stats.totals.byTypeGroup.map((t) => t.count));
  const maxPlace = Math.max(...stats.geography.topPlaces.map((t) => t.count));
  const maxSource = Math.max(...stats.sources.bySource.map((s) => s.count));

  const tiles = [
    {
      value: stats.totals.records,
      label: `${plural(stats.totals.records, NOUNS.запис)} вкупно`,
      sub: `од нив ${stats.totals.public} се прикажани`,
    },
    { value: stats.geography.places, label: 'населени места', sub: `од ${coverage.length} општини` },
    { value: stats.cobiss.fund, label: 'примероци во COBISS', sub: `во ${stats.cobiss.libraries} библиотеки` },
    { value: stats.sources.bySource.length, label: 'различни извори', sub: `просечно ${stats.sources.averagePerRecord} по запис` },
    {
      value: stats.dzs.officialTotal,
      label: `${plural(stats.dzs.officialTotal, NOUNS.запис)} кај ДЗС`,
      sub: `${stats.dzs.confirmedTotal} потврдени во базата`,
    },
    {
      value: stats.cobiss.records,
      label: `${plural(stats.cobiss.records, NOUNS.запис)} во COBISS базите`,
      sub: `прираст 2024: ${formatNumber(stats.cobiss.increment)}`,
    },
  ];

  return (
    <div className="container py-4">
      <JsonLd data={datasetJsonLd(stats)} />
      <Breadcrumbs items={[{ label: 'Статистика' }]} />

      <header className="mt-3 mb-4">
        <h1 className="h2 mb-2">Статистика и отворени податоци</h1>
        <p className="text-secondary mb-0">
          Сите бројки подолу се пресметани од истиот записник што ја гради страницата. Податоците се
          проверени на{' '}
          <time dateTime={stats.dataVerifiedOn ?? undefined}>{stats.dataVerifiedOn}</time> и се
          достапни за преземање.
        </p>
      </header>

      {/* ── Клучни бројки ─────────────────────────────────────────────── */}
      <section className="mb-5" aria-labelledby="key-figures">
        <h2 id="key-figures" className="h4 mb-3">Клучни бројки</h2>
        <div className="row g-3">
          {tiles.map((t) => (
            <div className="col-6 col-md-4" key={t.label}>
              <div className="card h-100">
                <div className="card-body">
                  <div className="stat-number h4 mb-0">{formatNumber(t.value)}</div>
                  <div className="small text-secondary">{t.label}</div>
                  <div className="small text-secondary">{t.sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="row g-4 mb-5">
        {/* ── По тип ──────────────────────────────────────────────────── */}
        <section className="col-lg-6" aria-labelledby="by-type">
          <div className="card h-100">
            <div className="card-body">
              <h2 id="by-type" className="card-title h5">По тип на установа</h2>
              {stats.totals.byType.map((t) => (
                <Bar key={t.slug} label={t.label} count={t.count} value={t.count} max={maxType} />
              ))}
              <p className="card-text small text-secondary mt-3 mb-0">
                Сите {formatNumber(152)} {plural(152, NOUNS.запис)}, вклучувајќи ги и 8-те што не се библиотеки.
              </p>
            </div>
          </div>
        </section>

        {/* ── По група ────────────────────────────────────────────────── */}
        <section className="col-lg-6" aria-labelledby="by-group">
          <div className="card h-100">
            <div className="card-body">
              <h2 id="by-group" className="card-title h5">По група типови</h2>
              {stats.totals.byTypeGroup.map((t) => (
                <div className="mb-2" key={t.slug}>
                  <div className="d-flex justify-content-between small mb-1">
                    <Link href={`/tipovi/${t.slug}/`} className="text-decoration-none">
                      {t.label}
                    </Link>
                    <span className="stat-number">{formatNumber(t.count)}</span>
                  </div>
                  <div className="progress" style={{ height: '0.5rem' }}>
                    <div
                      className="progress-bar bg-primary"
                      style={{ width: `${Math.round((t.count / maxGroup) * 100)}%` }}
                      role="progressbar"
                      aria-valuenow={t.count}
                      aria-valuemin={0}
                      aria-valuemax={maxGroup}
                      aria-label={`${t.label}: ${t.count}`}
                    />
                  </div>
                </div>
              ))}
              <p className="card-text small text-secondary mt-3 mb-0">
                Овие шест групи се и индексираните страници на /tipovi/.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="row g-4 mb-5">
        {/* ── Верификација ───────────────────────────────────────────── */}
        <section className="col-lg-6" aria-labelledby="verification">
          <div className="card h-100">
            <div className="card-body">
              <h2 id="verification" className="card-title h5">Сигурност на податоците</h2>
              <table className="table table-sm mb-3">
                <caption className="visually-hidden">
                  Распределба на прикажаните {formatNumber(144)} {plural(144, NOUNS.запис)} по верификација и сигурност
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Категорија</th>
                    <th scope="col" className="text-end">Записи</th>
                    <th scope="col" className="text-end">Удел</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.totals.byVerification.map((v) => (
                    <tr key={v.slug}>
                      <th scope="row" className="fw-normal">{v.label}</th>
                      <td className="text-end">{v.count}</td>
                      <td className="text-end">
                        {Math.round((v.count / stats.totals.public) * 100)}%
                      </td>
                    </tr>
                  ))}
                  {stats.totals.byConfidence.map((c) => (
                    <tr key={`c-${c.slug}`}>
                      <th scope="row" className="fw-normal text-secondary">{c.label}</th>
                      <td className="text-end text-secondary">{c.count}</td>
                      <td className="text-end text-secondary">
                        {Math.round((c.count / stats.totals.public) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="card-text small text-secondary mb-0">
                Овие бројки ги покриваат <strong>144-те прикажани</strong> записи. Низ целата база
                од 152, распределбата е 113 / 17 / 22. <Link href="/metodologija/">Како се пресметува →</Link>
              </p>
            </div>
          </div>
        </section>

        {/* ── Географија ──────────────────────────────────────────────── */}
        <section className="col-lg-6" aria-labelledby="geography">
          <div className="card h-100">
            <div className="card-body">
              <h2 id="geography" className="card-title h5">Географска распределба</h2>
              <p className="card-text small text-secondary">
                Скопје сочинува{' '}
                {Math.round(
                  ((stats.geography.topPlaces.find((p) => p.slug === 'skopje')?.count ?? 0) /
                    stats.totals.public) *
                    100,
                )}
                % од сите записи — остатокот е распределен по уште {stats.geography.places - 1} места.
              </p>
              {stats.geography.topPlaces.slice(0, 10).map((p) => (
                <div className="mb-2" key={p.slug}>
                  <div className="d-flex justify-content-between small mb-1">
                    <Link href={`/naseleni-mesta/${p.slug}/`} className="text-decoration-none">{p.label}</Link>
                    <span className="stat-number">{formatNumber(p.count)}</span>
                  </div>
                  <div className="progress" style={{ height: '0.5rem' }}>
                    <div
                      className="progress-bar bg-primary"
                      style={{ width: `${Math.round((p.count / maxPlace) * 100)}%` }}
                      role="progressbar"
                      aria-valuenow={p.count}
                      aria-valuemin={0}
                      aria-valuemax={maxPlace}
                      aria-label={`${p.label}: ${p.count}`}
                    />
                  </div>
                </div>
              ))}
              <div className="d-flex flex-wrap gap-3 small mt-3">
                <span className="coverage-ok">■ има библиотека: {stats.geography.coverage.withLibrary}</span>
                <span className="coverage-mid">■ без потврдена: {stats.geography.coverage.partial}</span>
                <span className="coverage-none">■ нема: {stats.geography.coverage.none}</span>
              </div>
              <p className="card-text small mt-2 mb-0">
                <Link href="/opstini/">Целосна табела и мапа →</Link>
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ── ДЗС ───────────────────────────────────────────────────────── */}
      <section className="mb-5" aria-labelledby="dzs">
        <h2 id="dzs" className="h4 mb-3">Споредба со Државниот завод за статистика</h2>
        <div className="table-responsive">
          <table className="table">
            <caption className="visually-hidden">
              Категории на библиотеки според ДЗС во однос на записите во базата
            </caption>
            <thead>
              <tr>
                <th scope="col">Категорија според ДЗС</th>
                <th scope="col" className="text-end">Официјално</th>
                <th scope="col" className="text-end">Потврдено во базата</th>
                <th scope="col" className="text-end">Вкупно во базата</th>
                <th scope="col" className="text-end">Разлика</th>
                <th scope="col">Забелешка</th>
              </tr>
            </thead>
            <tbody>
              {stats.dzs.rows.map((r) => (
                <tr key={r.category}>
                  <th scope="row" className="fw-normal">{r.category}</th>
                  <td className="text-end">{formatNumber(r.official)}</td>
                  <td className="text-end">{formatNumber(r.confirmedInMaster)}</td>
                  <td className="text-end">{formatNumber(r.allInMaster)}</td>
                  <td className={`text-end ${r.difference > 0 ? 'text-danger' : ''}`}>
                    {r.difference > 0 ? `+${r.difference}` : r.difference}
                  </td>
                  <td className="small text-secondary">{r.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="fw-semibold">
                <th scope="row">Вкупно</th>
                <td className="text-end">{formatNumber(stats.dzs.officialTotal)}</td>
                <td className="text-end">{formatNumber(stats.dzs.confirmedTotal)}</td>
                <td className="text-end">{formatNumber(stats.totals.records)}</td>
                <td className="text-end text-danger">
                  +{stats.dzs.officialTotal - stats.dzs.confirmedTotal}
                </td>
                <td className="small text-secondary">Категориите со 0 во базата се „нема“.</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ── Извори ────────────────────────────────────────────────────── */}
      <section className="mb-5" aria-labelledby="sources">
        <h2 id="sources" className="h4 mb-3">Извори</h2>
        <div className="row g-3">
          <div className="col-lg-7">
            {stats.sources.bySource.map((s) => (
              <div className="mb-2" key={s.slug}>
                <div className="d-flex justify-content-between small mb-1">
                  <span>{s.label}</span>
                  <span className="stat-number">{formatNumber(s.count)}</span>
                </div>
                <div className="progress" style={{ height: '0.5rem' }}>
                  <div
                    className="progress-bar bg-accent"
                    style={{ width: `${Math.round((s.count / maxSource) * 100)}%`, background: '#c9822b' }}
                    role="progressbar"
                    aria-valuenow={s.count}
                    aria-valuemin={0}
                    aria-valuemax={maxSource}
                    aria-label={`${s.label}: ${s.count}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="col-lg-5">
            <div className="card">
              <div className="card-body">
                <h3 className="h6 mb-2">Како се спојуваат</h3>
                <p className="card-text small text-secondary mb-3">
                  Просечно {stats.sources.averagePerRecord} извора по запис, со максимум{' '}
                  {formatNumber(stats.sources.maxPerRecord)} {plural(stats.sources.maxPerRecord, NOUNS.извор)}. Редоследот
                  на приоритет е фиксен и ист за сите записи — види ја{' '}
                  <Link href="/metodologija/">методологијата</Link>.
                </p>
                <h3 className="h6 mb-2">Покриеност на COBISS</h3>
                <p className="card-text small text-secondary mb-0">
                  {stats.cobiss.libraries} од {stats.totals.public} прикажани библиотеки имаат
                  достапни бројки за 2024: вкупно {formatNumber(stats.cobiss.fund)} примероци и{' '}
                  {formatNumber(stats.cobiss.increment)} прираст во текот на годината.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Преземање ─────────────────────────────────────────────────── */}
      <section aria-labelledby="downloads">
        <div className="card">
          <div className="card-body">
            <h2 id="downloads" className="card-title h5">Преземање на податоците</h2>
            <p className="card-text text-secondary">
              Податоците се под лиценца CC-BY-4.0. JSON-датотеките се истиот записник што ја гради
              оваа страница, а CSV-то е излез за табеларни програми.
            </p>
            {/* CSV-то е главното преземање; преостанатите се втор степен. */}
            <div className="d-flex flex-wrap gap-2">
              <a href="/data/biblioteki.csv" download className="btn btn-primary">
                <Icon name="filetype-csv" className="me-2" />
                biblioteki.csv
              </a>
              <a href="/data/libraries.json" download className="btn btn-outline-secondary">
                <Icon name="filetype-json" className="me-2" />
                libraries.json
              </a>
              <a href="/data/coverage.json" download className="btn btn-outline-secondary">
                <Icon name="filetype-json" className="me-2" />
                coverage.json
              </a>
              <a href="/data/candidates.json" download className="btn btn-outline-secondary">
                <Icon name="filetype-json" className="me-2" />
                candidates.json
              </a>
              <a href="/data/provenance.json" download className="btn btn-outline-secondary">
                <Icon name="filetype-json" className="me-2" />
                provenance.json
              </a>
              <a href="/data/stats.json" download className="btn btn-outline-secondary">
                <Icon name="filetype-json" className="me-2" />
                stats.json
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

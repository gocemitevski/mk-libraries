import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { LazyCoverageMap } from '@/components/lazy-coverage-map';
import { Icon } from '@/components/icon';
import { JsonLd, itemListJsonLd, SITE_URL } from '@/lib/seo';
import { coverage, mapPlaces, publicLibraries, recordCountsBySlug, stats } from '@/lib/data';
import { formatNumber, NOUNS, plural } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Покриеност по општини',
  description: `${coverage.length} општини во Северна Македонија - ${stats.geography.coverage.withLibrary} со јавна библиотека, ${stats.geography.coverage.partial} без потврдена, ${stats.geography.coverage.none} без ниту една. Мапа и целосна табела.`,
  alternates: { canonical: '/opstini/' },
};

// Редоследот го следи заглавието и легендата на мапата: прво општините со
// библиотека, па оние без потврдена, на крај оние без ниту една. `ORDER` го
// одредува редоследот на JSON-LD-то, а `groups` — на табелите; мора да се
// разидат за списокот да не оди во спротивна насока од страницата.
const ORDER = { none: 0, medium: 1, high: 2 } as const;

export default function CoveragePage() {
  // Кофата за Скопје е обичен запис во `coverage`. Ја бараме по име, наместо да
  // ја цврстиме транслитерацијата во маркапот — `slug` ја одредува build-data и
  // ако еднаш се промени, врската ќе ја следи без да пука. Ако кофата исчезне,
  // и забелешката паѓа: таа тврди токму за неа.
  const skopjeUndetermined = coverage.find((c) => c.name.startsWith('Скопје (општина'));

  const sorted = [...coverage].sort(
    (a, b) => ORDER[a.priority] - ORDER[b.priority] || a.name.localeCompare(b.name, 'mk'),
  );
  const groups = [
    { key: 'none' as const, label: 'Има јавна библиотека', cls: 'coverage-ok' },
    { key: 'medium' as const, label: 'Нема потврдена јавна библиотека', cls: 'coverage-mid' },
    { key: 'high' as const, label: 'Нема јавна библиотека', cls: 'coverage-none' },
  ];

  return (
    <div className="container py-4">
      <JsonLd
        data={itemListJsonLd(
          sorted.map((c) => ({
            name: c.name,
            url: `${SITE_URL}/opstini/${c.slug}/`,
            description: c.priorityLabel,
          })),
          'Општини и библиотечна покриеност',
        )}
      />
      <Breadcrumbs items={[{ label: 'Општини' }]} />

      <header className="mt-3 mb-4">
        <h1 className="mb-2">Покриеност по општини</h1>
        <p className="text-secondary mb-0">
          Од {coverage.length} општини во базата,{' '}
          <strong className="coverage-ok">{stats.geography.coverage.withLibrary} имаат јавна
          библиотека</strong>,{' '}
          <strong className="coverage-mid">{stats.geography.coverage.partial} немаат потврдена</strong> и{' '}
          <strong className="coverage-none">{stats.geography.coverage.none} немаат ниту една</strong>. Мапата и табелата ги
          прикажуваат и {formatNumber(publicLibraries.length)}-те прикажани записи.
        </p>
      </header>

      {/* ── Мапа ─────────────────────────────────────────────────────── */}
      <section className="mb-3" aria-labelledby="map-heading">
        <h2 id="map-heading" className="h4 mb-2">
          <Icon name="map" className="me-2" />
          Мапа
        </h2>
        <LazyCoverageMap coverage={coverage} places={mapPlaces} counts={recordCountsBySlug} />
        <p className="small text-secondary mt-2 mb-0">
          Точките по населено место се <strong>приближни</strong> - ги користиме центроидите на местата
          бидејќи само {stats.geography.exactCoordinates} од {formatNumber(stats.totals.records)}{' '}
          {plural(stats.totals.records, NOUNS.запис)} имаат точни координати. Општинските граници се од
          geoBoundaries (CC BY 4.0). За точна адреса, погледнете ја страницата на библиотеката.
        </p>
      </section>

      {/* ── Табела: пристапен паралелен извор ───────────────────────── */}
      <section className="mt-5" aria-labelledby="table-heading">
        <h2 id="table-heading" className="h2 mb-3 mx-2">Библиотеки по општини</h2>

        {groups.map((group) => {
          const entries = sorted.filter((c) => c.priority === group.key);
          return (
            <div className="mb-4" key={group.key}>
              <div className="table-responsive">
                {/* Групата е caption на табелата, не посебен наслов над неа: така
                    скринерите ја чуваат како име на табелата, а насловот останува
                    h3 во хиерархијата. `.caption-top` е готова класа на Bootstrap —
                    без неа caption-от паѓа на дното (Bootstrap го фаќа caption-side:
                    bottom). `text-start` го враќа порамнувањето одлево бидејќи
                    прелилнувачите го центрираат caption-от по default. */}
                <table className="table align-middle caption-top">
                  <caption className={`text-start pb-2 px-2 ${group.cls}`}>
                    <h3 className="h4 hstack gap-2">
                      <span>{group.label}</span>
                      <span className="badge text-truncate flex-shrink-0 bg-secondary-subtle text-secondary-emphasis">{entries.length}</span>
                    </h3>
                    <span className="visually-hidden">
                      Општини со статус: {group.label}. Колоните „Јавни / Ограноци / Останати“ се
                      класификација од мастер-листот; „Записи“ е бројот што се прикажува во базата.
                    </span>
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Општина</th>
                      <th scope="col" className="text-end">Јавни</th>
                      <th scope="col" className="text-end">Ограноци</th>
                      <th scope="col" className="text-end">Останати</th>
                      <th scope="col" className="text-end">Записи во базата</th>
                      <th scope="col">Јавни библиотеки (називи)</th>
                      <th scope="col">Забелешка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((c) => (
                      <tr key={c.slug}>
                        <th scope="row" className="fw-normal">
                          <Link href={`/opstini/${c.slug}/`}>{c.name}</Link>
                        </th>
                        <td className="text-end">{c.publicCount}</td>
                        <td className="text-end">{c.branchCount}</td>
                        <td className="text-end">{c.otherCount}</td>
                        <td className="text-end">{recordCountsBySlug[c.slug] ?? 0}</td>
                        <td>
                          {c.publicNames.length > 0 ? (
                            <ul className="list-unstyled mb-0 small">
                              {c.publicNames.map((n) => (
                                <li key={n}>{n}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-secondary">-</span>
                          )}
                        </td>
                        <td className="small text-secondary">{c.note ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Град Скопје ──────────────────────────────────────────────── */}
      {skopjeUndetermined && (
        <div className="alert alert-secondary mt-3 hstack gap-3">
          <Icon name="info-circle" size={18} className='flex-shrink-0' />
          <p className='mb-0 lh-sm'><strong>Забелешка за Скопје:</strong> градските библиотеки често се водат на ниво на
          Град Скопје, а не по поединечна општина. Затоа дел од скопските општини изгледаат без
          јавна библиотека и покрај присутните ограноци - види ги{' '}
          <Link href={`/opstini/${skopjeUndetermined.slug}/`}>
            записите без утврдена општина
          </Link>
          .</p>
        </div>
      )}
    </div>
  );
}

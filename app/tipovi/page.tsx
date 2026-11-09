import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd, itemListJsonLd } from '@/lib/seo';
import { publicLibraries, stats, typeGroups, typeBySlug } from '@/lib/data';
import { formatNumber, NOUNS, plural } from '@/lib/format';
import { TYPES } from '@/src/lib/taxonomy';
import { SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Библиотеки по тип',
  description: `Шест групи библиотеки во Северна Македонија - национални, јавни, високошколски, специјализирани, подрачни ограноци и останати. ${formatNumber(publicLibraries.length)} ${plural(publicLibraries.length, NOUNS.запис)} вкупно.`,
  alternates: { canonical: '/tipovi/' },
};

export default function TypesPage() {
  return (
    <div className="container py-4">
      <JsonLd
        data={itemListJsonLd(
          typeGroups.map((g) => ({
            name: g.label,
            url: `${SITE_URL}/tipovi/${g.slug}/`,
            description: g.types.map((t) => t.description).join(' · '),
          })),
          'Типови библиотеки',
        )}
      />
      <Breadcrumbs items={[{ label: 'Типови' }]} />

      <header className="mt-3 mb-4">
        <h1 className="mb-2">Библиотеки по тип</h1>
        <p className="text-secondary mb-0">
          Изворните податоци користат десет стандардизирани типа. Овде се групирани во шест групи за полесно
          прелистување; засебниот тип „Не е библиотека“ останува во базата, но не се прикажува во адресарот.
        </p>
      </header>

      <div className="row g-3">
        {typeGroups.map((group) => (
          <div className="col-md-6 col-xl-4" key={group.slug}>
            <Link href={`/tipovi/${group.slug}/`} className="text-decoration-none">
              <div className={`card type-card h-100 type-${group.slug}`}>
                <div className="card-body">
                  <div className="hstack gap-3 mb-2">
                    <h2 className="card-title h5 mb-0 flex-fill">{group.label}</h2>
                    {/* Истата значка како во заглавието на групата — бројот ја квалификува,
                        не ја води, затоа е значка, не голем број. */}
                    <span className="badge text-truncate flex-shrink-0 type-badge">{group.count}</span>
                  </div>
                  <ul className="list-unstyled small text-secondary mb-0">
                    {group.types.map((t) => (
                      <li key={t.slug} className="mb-1">
                        <strong className="text-body">{t.label}</strong> <span className="text-nowrap">- {formatNumber(t.count)}</span>
                        <div>{t.description}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="card mt-4">
        <div className="card-body">
          <h2 className="card-title h5">Зошто има двојна класификација?</h2>
          <p className="card-text text-secondary mb-0">
            Покрај типот, секој запис носи и категорија што ја користи Државниот завод за статистика: од{' '}
            {formatNumber(stats.totals.records)} {plural(stats.totals.records, NOUNS.запис)}, {formatNumber(stats.dzs.officialTotal)} се врзани за официјална категорија (истоветна со шифрата на типот), а{' '}
            {formatNumber(stats.dzs.confirmedTotal)} имаат потврден опис. Разликата е прикажана на{' '}
            <Link href="/metodologija/">страницата за методологија</Link>.
          </p>
        </div>
      </div>

      <p className="small text-secondary mt-3 mb-0">
        Користени типови: {Object.keys(typeBySlug).length} од {Object.keys(TYPES).length} стандардизирани.
      </p>
    </div>
  );
}

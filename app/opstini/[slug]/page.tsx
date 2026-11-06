import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Icon } from '@/components/icon';
import { LibraryCard } from '@/components/library-card';
import { JsonLd, itemListJsonLd, SITE_URL } from '@/lib/seo';
import { coverage, coverageBySlug, getLibrariesForMunicipality, placeSlug, stats } from '@/lib/data';
import { NOUNS, plural } from '@/lib/format';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return coverage.map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

const PRIORITY_CLASS: Record<string, string> = {
  high: 'coverage-none',
  medium: 'coverage-mid',
  none: 'coverage-ok',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = coverageBySlug.get(slug);
  if (!entry) return {};

  const title = `Библиотеки во општина ${entry.name}`;
  const description = `${entry.priorityLabel} во општина ${entry.name}. ${entry.publicCount} јавни, ${entry.branchCount} ограноци и ${entry.otherCount} останати библиотеки во базата.`;

  return {
    title,
    description,
    alternates: { canonical: `/opstini/${entry.slug}/` },
    openGraph: { title, description, url: `/opstini/${entry.slug}/` },
  };
}

export default async function MunicipalityPage({ params }: Props) {
  const { slug } = await params;
  const entry = coverageBySlug.get(slug);
  if (!entry) notFound();

  const libraries = getLibrariesForMunicipality(entry.name);
  const url = `${SITE_URL}/opstini/${entry.slug}/`;

  // Библиотеките од оваа општина — ги групираме по населено место за подобар преглед.
  const byPlace = new Map<string, typeof libraries>();
  for (const l of libraries) {
    const list = byPlace.get(l.location.place) ?? [];
    list.push(l);
    byPlace.set(l.location.place, list);
  }
  const placesList = [...byPlace.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'mk'),
  );

  return (
    <div className="container py-4">
      <JsonLd
        data={itemListJsonLd(
          libraries.map((l) => ({ name: l.name, url: `${SITE_URL}/biblioteki/${l.slug}/` })),
          `Библиотеки во општина ${entry.name}`,
        )}
      />
      <Breadcrumbs items={[{ label: 'Општини', href: '/opstini/' }, { label: entry.name }]} />

      <header className="mt-3 mb-4">
        <div className="hstack flex-wrap gap-3 mb-2">
          <h1 className="mb-0">Општина {entry.name}</h1>
          <span className={`badge text-truncate flex-shrink-0 ${PRIORITY_CLASS[entry.priority]} border`}>
            {entry.priorityLabel}
          </span>
        </div>
        <p className="text-secondary mb-0">
          {libraries.length > 0 ? (
            <>
              <strong>{libraries.length}</strong>{' '}
              {plural(libraries.length, NOUNS.запис)} во базата.
            </>
          ) : (
            <>Нема записи што се водат на оваа општина.</>
          )}{' '}
          Според мастер-листот: {entry.publicCount} јавни, {entry.branchCount} ограноци и{' '}
          {entry.otherCount} останати.
        </p>
      </header>

      {entry.note && (
        <div className="alert alert-secondary mb-3 hstack gap-3">
          <Icon name="info-circle" size={18} />
          <div className="hstack gap-2">
            <strong>Забелешка од базата:</strong>
            <span>{entry.note}</span>
          </div>
        </div>
      )}

      {libraries.length === 0 ? (
        <div className="alert alert-secondary hstack gap-3">
          <Icon name="info-circle" size={18} />
          <div className="hstack gap-2">
            <span>
              Во базата нема записи што се водат на оваа општина.
              {entry.priority === 'high' && (
                <>
                  {' '}
                  Ова е една од {stats.geography.coverage.none}-те општини без јавна библиотека - видете ја{' '}
                  <Link href="/opstini/">мапата на покриеноста</Link> за целиот преглед.
                </>
              )}
            </span>
          </div>
        </div>
      ) : (
        <>
          <section className="mb-4" aria-labelledby="by-place">
            <h2 id="by-place" className="h4 mb-3">
              По населено место
            </h2>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {placesList.map(([place, list]) => (
                <Link
                  key={place}
                  href={`/naseleni-mesta/${placeSlug(place)}/`}
                  className="btn btn-sm btn-outline-secondary hstack gap-2"
                >
                  <span>{place}</span>
                  <span className="badge text-truncate flex-shrink-0 bg-secondary-subtle text-secondary-emphasis">{list.length}</span>
                </Link>
              ))}
            </div>
          </section>

          <div className="row g-3">
            {libraries.map((library) => (
              <div className="col-md-6 col-xl-4" key={library.slug}>
                <LibraryCard library={library} />
              </div>
            ))}
          </div>
        </>
      )}

      {entry.culturalHomes && (
        <div className="card mt-4">
          <div className="card-body">
            <h2 className="card-title h5">Културни домови и други установи</h2>
            <p className="card-text small text-secondary mb-0">{entry.culturalHomes}</p>
          </div>
        </div>
      )}

      <nav className="mt-4 d-flex flex-wrap gap-2" aria-label="Други општини">
        <Link href="/opstini/" className="btn btn-sm btn-outline-secondary">
          ← Сите општини
        </Link>
        {coverage
          .filter((c) => c.slug !== entry.slug && c.priority === entry.priority)
          .slice(0, 6)
          .map((c) => (
            <Link key={c.slug} href={`/opstini/${c.slug}/`} className="btn btn-sm btn-outline-secondary">
              {c.name}
            </Link>
          ))}
      </nav>
    </div>
  );
}

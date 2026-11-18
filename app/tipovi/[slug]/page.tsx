import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { LibraryCard } from '@/components/library-card';
import { JsonLd, itemListJsonLd, libraryDescription, OG_IMAGE, SITE_URL } from '@/lib/seo';
import { getLibrariesByTypeGroup, typeGroupBySlug, typeGroups } from '@/lib/data';
import { formatNumber, NOUNS, plural } from '@/lib/format';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return typeGroups.map((g) => ({ slug: g.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const group = typeGroupBySlug.get(slug);
  if (!group) return {};

  const title = `${group.label} во Северна Македонија`;
  const description = `${group.count} ${plural(group.count, NOUNS.библиотека)} од типот „${group.label}“ во Северна Македонија - адреси, телефони, мрежни места и податоци од COBISS.`;

  return {
    title,
    description,
    alternates: { canonical: `/tipovi/${group.slug}/` },
    openGraph: {
      title,
      description,
      url: `/tipovi/${group.slug}/`,
      images: [OG_IMAGE],
    },
  };
}

export default async function TypeGroupPage({ params }: Props) {
  const { slug } = await params;
  const group = typeGroupBySlug.get(slug);
  if (!group) notFound();

  const libraries = getLibrariesByTypeGroup(slug);
  const url = `${SITE_URL}/tipovi/${group.slug}/`;

  return (
    <div className="container py-4">
      <JsonLd
        data={itemListJsonLd(
          libraries.map((l) => ({
            name: l.name,
            url: `${SITE_URL}/biblioteki/${l.slug}/`,
            description: libraryDescription(l),
          })),
          group.label,
        )}
      />
      <Breadcrumbs items={[{ label: 'Типови', href: '/tipovi/' }, { label: group.label }]} />

      <header className={`mt-3 mb-4 type-${group.slug}`}>
        <div className="hstack flex-wrap gap-3 mb-2">
          <h1 className="mb-0">{group.label}</h1>
          {/* Бројачот е значка, не текст - инаку ја надминува главниот наслов. */}
          <span className="badge text-truncate flex-shrink-0 type-badge">{formatNumber(group.count)}</span>
        </div>
        {group.types.length === 1 && (
          <p className="text-secondary mb-0">
            Групата го опфаќа типот{' '}
            <strong className="text-body">„{group.types[0].label}“</strong>.
          </p>
        )}
        {group.types.length > 1 && (
          <p className="text-secondary mb-0">
            Групата ги опфаќа следниве типови:{' '}
            {group.types.map((t, i) => (
              <span key={t.slug}>
                {i === 0 ? '' : ', '}
                <strong className="text-body">„{t.label}“</strong> ({formatNumber(t.count)})
              </span>
            ))}
            .
          </p>
        )}
      </header>

      <div className="row g-3">
        {libraries.map((library) => (
          <div className="col-md-6 col-xl-4" key={library.slug}>
            <LibraryCard library={library} headingLevel="h2" />
          </div>
        ))}
      </div>

      <nav className="mt-5" aria-label="Други типови">
        <h2 className="mb-3">Други типови</h2>
        <div className="d-flex flex-wrap gap-2">
          {typeGroups
            .filter((g) => g.slug !== group.slug)
            .map((g) => (
              <Link
                key={g.slug}
                href={`/tipovi/${g.slug}/`}
                className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2"
              >
                {g.label}
                <span className="badge text-truncate flex-shrink-0 bg-secondary-subtle text-secondary-emphasis">
                  {g.count}
                </span>
              </Link>
            ))}
        </div>
      </nav>
    </div>
  );
}

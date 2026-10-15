import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { LibraryCard } from '@/components/library-card';
import { JsonLd, itemListJsonLd, SITE_URL } from '@/lib/seo';
import { getLibrariesByPlace, placeBySlug, places } from '@/lib/data';
import { formatNumber, NOUNS, plural } from '@/lib/format';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return places.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const place = placeBySlug.get(slug);
  if (!place) return {};

  const title = `Библиотеки во ${place.name}`;
  const description = `${place.count} ${plural(place.count, NOUNS.библиотека)} во ${place.name} — адреси, телефони, мрежни места и податоци од COBISS.`;

  return {
    title,
    description,
    alternates: { canonical: `/naseleni-mesta/${place.slug}/` },
    openGraph: { title, description, url: `/naseleni-mesta/${place.slug}/` },
  };
}

export default async function PlacePage({ params }: Props) {
  const { slug } = await params;
  const place = placeBySlug.get(slug);
  if (!place) notFound();

  const libraries = getLibrariesByPlace(slug);
  const url = `${SITE_URL}/naseleni-mesta/${place.slug}/`;

  return (
    <div className="container py-4">
      <JsonLd
        data={itemListJsonLd(
          libraries.map((l) => ({ name: l.name, url: `${SITE_URL}/biblioteki/${l.slug}/` })),
          `Библиотеки во ${place.name}`,
        )}
      />
      <Breadcrumbs items={[{ label: 'Населени места', href: '/naseleni-mesta/' }, { label: place.name }]} />

      <header className="mt-3 mb-4">
        <h1 className="h2 mb-2">Библиотеки во {place.name}</h1>
        <p className="text-secondary mb-0">
          {formatNumber(place.count)} {plural(place.count, NOUNS.библиотека)} во населеното место{' '}
          <strong>{place.name}</strong>. Погледнете ги сите {places.length} места со библиотеки.
        </p>
      </header>

      <div className="row g-3">
        {libraries.map((library) => (
          <div className="col-md-6 col-xl-4" key={library.slug}>
            <LibraryCard library={library} headingLevel="h2" />
          </div>
        ))}
      </div>
    </div>
  );
}

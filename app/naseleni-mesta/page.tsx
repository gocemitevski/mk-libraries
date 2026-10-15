import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd, itemListJsonLd } from '@/lib/seo';
import { places, publicLibraries } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Библиотеки по населено место',
  description: `Библиотеки во ${places.length} населени места во Северна Македонија — изберете населено место за целосен список.`,
  alternates: { canonical: '/naseleni-mesta/' },
};

export default function PlacesPage() {
  return (
    <div className="container py-4">
      <JsonLd
        data={itemListJsonLd(
          places.map((p) => ({ name: p.name, url: `https://biblioteki.mk/naseleni-mesta/${p.slug}/` })),
          'Населени места со библиотеки',
        )}
      />
      <Breadcrumbs items={[{ label: 'Населени места' }]} />
      <header className="mt-3 mb-4">
        <h1 className="mb-2">Библиотеки по населено место</h1>
        <p className="text-secondary mb-0">
          {publicLibraries.length} библиотеки во {places.length} населени места. Скопје сочинува{' '}
          {Math.round(((places.find((p) => p.name === 'Скопје')?.count ?? 0) / publicLibraries.length) * 100)}% од
          сите записи.
        </p>
      </header>

      <div className="row g-3">
        {places.map((place) => (
          <div className="col-6 col-md-4 col-lg-3" key={place.slug}>
            <Link href={`/naseleni-mesta/${place.slug}/`} className="text-decoration-none">
              <div className="card place-card h-100">
                <div className="card-body d-flex justify-content-between align-items-baseline g-3">
                  <h2 className="card-title h5 mb-0">{place.name}</h2>
                  <span className="badge text-truncate flex-shrink-0 bg-secondary-subtle text-secondary-emphasis">{place.count}</span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Directory } from '@/components/directory';
import { JsonLd, itemListJsonLd, libraryDescription } from '@/lib/seo';
import { places, publicLibraries, typeGroups } from '@/lib/data';
import { SITE_URL } from '@/lib/seo';
import { formatNumber, NOUNS, plural } from '@/lib/format';
import { directoryIndex } from '@/lib/search';

export const metadata: Metadata = {
  title: 'Сите библиотеки',
  description:
    'Целосен адресар на библиотеките во Северна Македонија - пребарајте и филтрирајте по населено место, тип, верификација и достапни податоци.',
  alternates: { canonical: '/biblioteki/' },
};

export default function DirectoryPage() {
  const itemList = itemListJsonLd(
    publicLibraries.slice(0, 50).map((l) => ({
      name: l.name,
      url: `${SITE_URL}/biblioteki/${l.slug}/`,
      description: libraryDescription(l),
    })),
    'Библиотеки во Северна Македонија',
  );

  return (
    <div className="container py-4">
      <JsonLd data={itemList} />
      <Breadcrumbs items={[{ label: 'Библиотеки' }]} />
      <header className="mt-3 mb-4">
        <h1 className="mb-2">Сите библиотеки</h1>
        <p className="text-secondary mb-0">
          {formatNumber(publicLibraries.length)} {plural(publicLibraries.length, NOUNS.запис)} во{' '}
          {formatNumber(places.length)} {plural(places.length, NOUNS['населено место'])}. Пребарајте по име, краток назив,
          алтернативен назив (алијас) или сигла од COBISS.
        </p>
      </header>

      <Directory
        records={directoryIndex}
        places={places}
        typeGroups={typeGroups.map((g) => ({ slug: g.slug, label: g.label, count: g.count }))}
      />
    </div>
  );
}

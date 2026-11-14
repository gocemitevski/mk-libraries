import { ImageResponse } from 'next/og';
import { ogImage } from '@/lib/og';
import { coverage, coverageBySlug, getLibrariesForMunicipality } from '@/lib/data';
import { NOUNS, plural } from '@/lib/format';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

interface Props {
  params: Promise<{ slug: string }>;
}

export const alt = 'Библиотечна покриеност по општина';

export function generateStaticParams() {
  return coverage.map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: Props): Promise<ImageResponse> {
  const { slug } = await params;
  const entry = coverageBySlug.get(slug);
  if (!entry) return ogImage({ title: 'Покриеност по општини' });

  const libraries = getLibrariesForMunicipality(entry.name);
  const names = entry.publicNames.slice(0, 2).join(' · ');

  return ogImage({
    title: `Општина ${entry.name}`,
    subtitle: entry.priorityLabel,
    meta:
      libraries.length > 0
        ? `${libraries.length} ${plural(libraries.length, NOUNS.запис)}${names ? ` · ${names}` : ''}`
        : 'Нема записи во базата',
  });
}

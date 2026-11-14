import { ImageResponse } from 'next/og';
import { ogImage } from '@/lib/og';
import { getLibrariesByPlace, placeBySlug, places } from '@/lib/data';
import { NOUNS, plural } from '@/lib/format';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

interface Props {
  params: Promise<{ slug: string }>;
}

export const alt = 'Библиотеки во населено место';

export function generateStaticParams() {
  return places.map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: Props): Promise<ImageResponse> {
  const { slug } = await params;
  const place = placeBySlug.get(slug);
  if (!place) return ogImage({ title: 'Библиотеки во Северна Македонија' });

  const libraries = getLibrariesByPlace(slug);

  return ogImage({
    title: `Библиотеки во ${place.name}`,
    subtitle: libraries.slice(0, 3).map((l) => l.name).join(' · '),
    meta: `${place.count} ${plural(place.count, NOUNS.библиотека)} во населеното место`,
  });
}

import { ImageResponse } from 'next/og';
import { ogImage } from '@/lib/og';
import { getLibrariesByTypeGroup, typeGroupBySlug, typeGroups } from '@/lib/data';
import { NOUNS, plural } from '@/lib/format';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

interface Props {
  params: Promise<{ slug: string }>;
}

export const alt = 'Библиотеки по тип';

export function generateStaticParams() {
  return typeGroups.map((g) => ({ slug: g.slug }));
}

export default async function Image({ params }: Props): Promise<ImageResponse> {
  const { slug } = await params;
  const group = typeGroupBySlug.get(slug);
  if (!group) return ogImage({ title: 'Библиотеки по тип' });

  const libraries = getLibrariesByTypeGroup(slug);

  return ogImage({
    title: group.label,
    subtitle: libraries.slice(0, 3).map((l) => l.name).join(' · '),
    meta: `${group.count} ${plural(group.count, NOUNS.библиотека)} · Северна Македонија`,
  });
}

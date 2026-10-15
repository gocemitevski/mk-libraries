import { ImageResponse } from 'next/og';
import { ogImage } from '@/lib/og';
import { getLibrary, libraries } from '@/lib/data';
import { formatNumber } from '@/lib/format';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-static';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return libraries.map((l) => ({ slug: l.slug }));
}

export async function generateAlt({ params }: Props): Promise<string> {
  const { slug } = await params;
  const library = getLibrary(slug);
  return library ? `${library.name} — ${library.typeLabel}, ${library.location.place}` : 'Библиотеки';
}

export default async function Image({ params }: Props): Promise<ImageResponse> {
  const { slug } = await params;
  const library = getLibrary(slug);

  if (!library) {
    return ogImage({ title: 'Библиотеки во Северна Македонија' });
  }

  const address = [library.location.address, library.location.place].filter(Boolean).join(', ');
  const subtitle = [library.typeLabel, address].filter(Boolean).join(' · ');
  const fund =
    library.cobiss.stats2024.fund !== null
      ? `Фонд COBISS 2024: ${formatNumber(library.cobiss.stats2024.fund)} примероци`
      : library.verification.label;

  return ogImage({ title: library.name, subtitle, meta: fund });
}

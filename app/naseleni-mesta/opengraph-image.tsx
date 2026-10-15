import { ImageResponse } from 'next/og';
import { ogImage } from '@/lib/og';
import { places } from '@/lib/data';
import { formatNumber, NOUNS, plural } from '@/lib/format';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Библиотеки по населено место';
export const dynamic = 'force-static';

export default async function Image(): Promise<ImageResponse> {
  return ogImage({
    title: 'Библиотеки по населено место',
    subtitle: places.slice(0, 6).map((p) => `${p.name} (${p.count})`).join(' · '),
    meta: `${formatNumber(places.length)} ${plural(places.length, NOUNS['населено место'])} во Северна Македонија`,
  });
}

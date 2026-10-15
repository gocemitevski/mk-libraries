import { ImageResponse } from 'next/og';
import { ogImage } from '@/lib/og';
import { typeGroups } from '@/lib/data';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Библиотеки по тип на установа';
export const dynamic = 'force-static';

export default async function Image(): Promise<ImageResponse> {
  return ogImage({
    title: 'Библиотеки по тип',
    subtitle: typeGroups.map((g) => `${g.label} (${g.count})`).join(' · '),
    meta: `${typeGroups.length} групи · Северна Македонија`,
  });
}

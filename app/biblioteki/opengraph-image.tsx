import { ImageResponse } from 'next/og';
import { ogImage } from '@/lib/og';
import { places, publicLibraries, typeGroups } from '@/lib/data';
import { formatNumber, NOUNS, plural } from '@/lib/format';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Сите библиотеки во Северна Македонија';
export const dynamic = 'force-static';

export default async function Image(): Promise<ImageResponse> {
  return ogImage({
    title: 'Сите библиотеки',
    subtitle: 'Филтрирајте по населено место, тип, верификација и достапни податоци — адреси, телефони и мрежни места на едно место.',
    meta: `${formatNumber(publicLibraries.length)} ${plural(publicLibraries.length, NOUNS.запис)} · ${formatNumber(places.length)} ${plural(places.length, NOUNS['населено место'])} · ${typeGroups.length} групи типови`,
  });
}

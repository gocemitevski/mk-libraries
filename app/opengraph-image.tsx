import { ImageResponse } from 'next/og';
import { ogImage } from '@/lib/og';
import { stats } from '@/lib/data';
import { formatNumber } from '@/lib/format';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Библиотеки во Северна Македонија';
export const dynamic = 'force-static';

export default async function Image(): Promise<ImageResponse> {
  return ogImage({
    title: `${formatNumber(stats.totals.public)} библиотеки во Северна Македонија`,
    subtitle:
      'Пребарајте по име, населено место или тип - адреса, телефон, мрежно место и податоци од COBISS, собрани и проверени од јавни извори.',
    meta: `${formatNumber(stats.geography.places)} населени места · ${stats.sources.bySource.length} извори`,
  });
}

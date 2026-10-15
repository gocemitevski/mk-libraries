import { ImageResponse } from 'next/og';
import { ogImage } from '@/lib/og';
import { stats } from '@/lib/data';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Методологија и извори';
export const dynamic = 'force-static';

export default async function Image(): Promise<ImageResponse> {
  return ogImage({
    title: 'Методологија и извори',
    subtitle: 'Редослед на спојување, критериуми за верификација, пресликување со ДЗС и белешки за квалитетот на секој извор.',
    meta: `${stats.sources.bySource.length} јавни извори · просечно ${stats.sources.averagePerRecord} по запис`,
  });
}

import { ImageResponse } from 'next/og';
import { ogImage } from '@/lib/og';
import { stats } from '@/lib/data';
import { formatNumber, NOUNS, plural } from '@/lib/format';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Статистика и отворени податоци за библиотеките';
export const dynamic = 'force-static';

export default async function Image(): Promise<ImageResponse> {
  return ogImage({
    title: 'Статистика и отворени податоци',
    subtitle: `${formatNumber(stats.totals.records)} ${plural(stats.totals.records, NOUNS.запис)}, ${stats.sources.bySource.length} извори и ${stats.geography.coverage.municipalities} општини — сè пресметано од истиот записник.`,
    meta: `COBISS фонд 2024: ${stats.cobiss.fund.toLocaleString('mk-MK')} примероци · CC-BY-4.0`,
  });
}

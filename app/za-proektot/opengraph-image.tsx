import { ImageResponse } from 'next/og';
import { ogImage } from '@/lib/og';
import { candidates, stats } from '@/lib/data';
import { formatNumber, NOUNS, plural } from '@/lib/format';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'За проектот Библиотеки.мк';
export const dynamic = 'force-static';

export default async function Image(): Promise<ImageResponse> {
  return ogImage({
    title: 'За проектот',
    subtitle: 'Податоците постојат, но се распрснати. Ги собираме во една база со фиксен редослед на приоритет и јасен степен на сигурност.',
    meta: `${formatNumber(stats.totals.records)} ${plural(stats.totals.records, NOUNS.запис)} · ${candidates.length} кандидати во проверка · CC-BY-4.0`,
  });
}

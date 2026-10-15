import { ImageResponse } from 'next/og';
import { ogImage } from '@/lib/og';
import { stats } from '@/lib/data';
import { formatNumber, NOUNS, plural } from '@/lib/format';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Покриеност на библиотеки по општини';
export const dynamic = 'force-static';

export default async function Image(): Promise<ImageResponse> {
  const c = stats.geography.coverage;
  return ogImage({
    title: 'Покриеност по општини',
    subtitle: `${c.withLibrary} со јавна библиотека · ${c.partial} без потврдена · ${c.none} без ниту една`,
    meta: `${formatNumber(c.municipalities)} ${plural(c.municipalities, NOUNS.општина)} · мапа и целосна табела`,
  });
}

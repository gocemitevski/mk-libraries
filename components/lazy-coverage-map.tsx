'use client';

import dynamic from 'next/dynamic';
import type { CoverageEntry } from '@/src/lib/schema';

/**
 * Мапата се вчитува динамично и само на клиентот (план §6):
 * Leaflet бара window, а статичниот извоз не смее да чека на неа.
 */
const CoverageMap = dynamic(
  () => import('@/components/coverage-map').then((m) => m.CoverageMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="d-flex align-items-center justify-content-center border rounded-3 text-secondary"
        style={{ height: 'min(70vh, 560px)' }}
      >
        <span className="spinner-border me-2" aria-hidden="true" />
        Се вчитува мапата…
      </div>
    ),
  },
);

interface PlacePoint {
  name: string;
  slug: string;
  lat: number;
  lon: number;
  count: number;
}

export function LazyCoverageMap(props: {
  coverage: CoverageEntry[];
  places: PlacePoint[];
  counts: Record<string, number>;
}) {
  return <CoverageMap {...props} />;
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import type { CoverageEntry } from '@/src/lib/schema';
import { NOUNS, plural } from '@/lib/format';

/** Боја по приоритет - истите три вредности низ целата страница. */
const PRIORITY_COLOR: Record<string, string> = {
  high: '#b3402f', // нема јавна библиотека
  medium: '#a86a12', // нема потврдена јавна библиотека
  none: '#2f7d4f', // има јавна библиотека
};

/** Редослед во легендата - истиот што го следи табелата на /opstini/. */
const PRIORITY_LEGEND = [
  ['none', 'Има јавна библиотека'],
  ['medium', 'Нема потврдена'],
  ['high', 'Нема јавна библиотека'],
] as const;

interface PlacePoint {
  name: string;
  slug: string;
  lat: number;
  lon: number;
  count: number;
}

interface Props {
  coverage: CoverageEntry[];
  /** Центроиди по населено место - приближни (план §6). */
  places: PlacePoint[];
  /** Клуч → број на записи; клучевите на општините се нивните slug-ови. */
  counts: Record<string, number>;
}

/** Го вклопува границите на државата во видливиот дел од мапата. */
function FitBounds({ geojson }: { geojson: GeoJSON.FeatureCollection | null }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson) return;
    const bounds = L.geoJSON(geojson as GeoJSON.GeoJsonObject).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [16, 16] });
  }, [map, geojson]);
  return null;
}

export function CoverageMap({ coverage, places, counts }: Props) {
  const [geo, setGeo] = useState<GeoJSON.FeatureCollection | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // GeoJSON се вчитува само откако мапата е монтирана - почетната страница не чека на него.
  useEffect(() => {
    let cancelled = false;
    fetch('/data/municipalities.geojson')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: GeoJSON.FeatureCollection) => {
        if (!cancelled) setGeo(data);
      })
      .catch(() => {
        /* Табелата под мапата е главниот извор; мапата е декоративна. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const bySlug = useMemo(() => new Map(coverage.map((c) => [c.slug, c])), [coverage]);

  // Бројките во легендата се пресметуваат од истиот `coverage` што ја полни табелата
  // - два пати истите бројки рачно би можеле да се разидат.
  const legendCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of coverage) counts.set(entry.priority, (counts.get(entry.priority) ?? 0) + 1);
    return counts;
  }, [coverage]);

  const geoStyle = useMemo(
    () => (feature?: GeoJSON.Feature): L.PathOptions => {
      const slug = feature?.properties?.slug as string | undefined;
      const priority = feature?.properties?.priority as string | undefined;
      const isActive = slug === activeSlug;
      return {
        fillColor: PRIORITY_COLOR[priority ?? ''] ?? '#94a3b8',
        fillOpacity: isActive ? 0.8 : 0.5,
        color: isActive ? '#12263f' : '#98857d',
        weight: isActive ? 3 : 1,
        opacity: 1,
      };
    },
    [activeSlug],
  );

  const onEachFeature = useMemo(() => {
    return (feature: GeoJSON.Feature, layer: L.Layer) => {
      const props = feature.properties as { slug: string; name: string; priorityLabel: string };
      const entry = bySlug.get(props.slug);
      const count = counts[props.slug] ?? 0;
      if (!entry) return;

      layer.bindPopup(
        [
          `<strong style="font-size:15px">${entry.name}</strong>`,
          `<span style="color:${PRIORITY_COLOR[entry.priority] ?? '#666'}">${entry.priorityLabel}</span>`,
          `<span>${count} ${plural(count, NOUNS.библиотека)} во базата</span>`,
          `<a href="/opstini/${entry.slug}/">Детали за општината →</a>`,
        ].join('<br/>'),
      );
      layer.on({
        mouseover: () => setActiveSlug(props.slug),
        mouseout: () => setActiveSlug(null),
        click: () => setActiveSlug(props.slug),
      });
    };
  }, [bySlug, counts]);

  return (
    <div className="position-relative">
      <div
        className="border rounded-3 overflow-hidden"
        style={{ height: 'min(70vh, 560px)', width: '100%' }}
        role="region"
        aria-label="Карта на библиотечна покриеност по општини"
      >
        <MapContainer
          center={[41.6, 21.7]}
          zoom={8}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          {/* Монокроматска база: земјата е речиси една нијанса на сиво, па
              полигоните со боја остануваат главен носител на информацијата. */}
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>, <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> соработници'
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          />
          {geo && (
            <>
              <FitBounds geojson={geo} />
              <GeoJSON data={geo} style={geoStyle} onEachFeature={onEachFeature} />
            </>
          )}

          {/* Центроиди по населено место - приближни, со потпис во легендата */}
          {places.map((p) => (
            <CircleMarker
              key={p.slug}
              center={[p.lat, p.lon]}
              radius={Math.max(5, Math.min(17, 5 + Math.sqrt(p.count) * 2.4))}
              pathOptions={{
                fillColor: '#c9822b',
                color: '#7a4c12',
                weight: 1.5,
                fillOpacity: 0.85,
              }}
            >
              <Popup>
                <strong>{p.name}</strong>
                <br />
                {p.count} {plural(p.count, NOUNS.библиотека)}
                <br />
                <Link href={`/naseleni-mesta/${p.slug}/`}>Види ги →</Link>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Легенда - ја објаснува бојата без интеракција */}
      <div
        className="position-absolute bottom-0 start-0 m-2 bg-white border rounded-3 p-2 small shadow-sm"
        style={{ zIndex: 500, lineHeight: 1.5 }}
      >
        <div className="fw-semibold mb-1">Покриеност на општини</div>
        {PRIORITY_LEGEND.map(([key, label]) => (
          <div key={key}>
            <span
              className="d-inline-block rounded-circle me-1"
              style={{ width: 10, height: 10, background: PRIORITY_COLOR[key] }}
              aria-hidden="true"
            />
            {label} ({legendCounts.get(key) ?? 0})
          </div>
        ))}
        <div className="mt-1 text-secondary" style={{ fontSize: '0.72rem' }}>
          <span
            className="d-inline-block rounded-circle me-1"
            style={{ width: 10, height: 10, background: '#c9822b' }}
            aria-hidden="true"
          />
          Населено место (приближно)
        </div>
      </div>
    </div>
  );
}

/**
 * Еднократно геокодирање на населените места од базата.
 *
 * Резултатот се засчувa во src/data/place-centroids.json и станува дел од
 * репозиториот — изградбата останува детерминирана (нема мрежа при build).
 *
 *   npx tsx scripts/geocode-places.ts
 */
import { writeFileSync } from 'node:fs';
import { DATA_DIR } from './lib/build.ts';

const OSM_NOMINATIM = 'https://nominatim.openstreetmap.org';

interface Place {
  name: string;
  municipality?: string | null;
}

interface Result {
  name: string;
  lat: number;
  lon: number;
  display: string;
}

/** Го чита списокот на места директно од изградениот запис. */
async function main(): Promise<void> {
  const { default: libraries } = (await import('../src/data/libraries.json', {
    with: { type: 'json' },
  })) as { default: { location: { place: string; municipality?: string | null }; public: boolean }[] };

  const places = [
    ...new Map(
      libraries
        .filter((l) => l.public)
        .map((l) => [l.location.place, { name: l.location.place, municipality: l.location.municipality }]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, 'mk'));

  console.log(`Геокодирам ${places.length} места…`);

  const results: Result[] = [];
  for (const [i, place] of places.entries()) {
    const q = `${place.name}, North Macedonia`;
    const url = `${OSM_NOMINATIM}/search?format=json&limit=1&countrycodes=mk&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'mk-libraries-build/1.0 (static directory of Macedonian libraries)' },
    });
    if (!res.ok) {
      console.error(`  [${i + 1}] ${place.name}: HTTP ${res.status}`);
      continue;
    }
    const json = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    if (json.length === 0) {
      console.error(`  [${i + 1}] ${place.name}: нема резултат`);
      continue;
    }
    const hit = json[0];
    results.push({
      name: place.name,
      lat: Number(Number(hit.lat).toFixed(6)),
      lon: Number(Number(hit.lon).toFixed(6)),
      display: hit.display_name,
    });
    console.log(`  [${i + 1}] ${place.name} → ${hit.lat}, ${hit.lon}  (${hit.display_name})`);

    // Nominatim бара ≥1 помеѓу барањата
    await new Promise((r) => setTimeout(r, 1100));
  }

  const out = `${DATA_DIR}/place-centroids.json`;
  writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  console.log(`\nЗапишано: ${out} (${results.length}/${places.length})`);
}

void main();

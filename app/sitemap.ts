import type { MetadataRoute } from 'next';
import { coverage, places, publicLibraries, stats, typeGroups } from '@/lib/data';

const SITE = 'https://biblioteki.mk';

// Статичен извоз: сitemap-от се пререндира при build.
export const dynamic = 'force-static';

/**
 * Датумот на последна измена е изведен од податоците (check-workbook),
 * не од часовникот — изградбата останува детерминирана (план §7).
 */
const LASTMOD = stats.dataVerifiedOn ?? undefined;

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: LASTMOD, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/biblioteki/`, lastModified: LASTMOD, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE}/naseleni-mesta/`, lastModified: LASTMOD, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/tipovi/`, lastModified: LASTMOD, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/opstini/`, lastModified: LASTMOD, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE}/statistika/`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE}/metodologija/`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/za-proektot/`, lastModified: LASTMOD, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Деталните страници — само 144-те прикажани записи. 8-те „не е библиотека“
  // записи носат robots: noindex, а noindex-URL-от не сме да биде во
  // sitemap (Google тоа го третира како противречие).
  const libraryRoutes: MetadataRoute.Sitemap = publicLibraries.map((l) => ({
    url: `${SITE}/biblioteki/${l.slug}/`,
    lastModified: l.lastVerified ?? LASTMOD,
    changeFrequency: 'monthly',
    priority: 0.9,
  }));

  const placeRoutes: MetadataRoute.Sitemap = places.map((p) => ({
    url: `${SITE}/naseleni-mesta/${p.slug}/`,
    lastModified: LASTMOD,
    changeFrequency: 'weekly',
    priority: p.count > 5 ? 0.8 : 0.6,
  }));

  const typeRoutes: MetadataRoute.Sitemap = typeGroups.map((g) => ({
    url: `${SITE}/tipovi/${g.slug}/`,
    lastModified: LASTMOD,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const municipalityRoutes: MetadataRoute.Sitemap = coverage.map((c) => ({
    url: `${SITE}/opstini/${c.slug}/`,
    lastModified: LASTMOD,
    changeFrequency: 'weekly',
    priority: c.priority === 'high' ? 0.7 : 0.6,
  }));

  // Кандидатите (69) не добиваат страници — се надвор од обемот на планот;
  // остануваат во candidates.json за преземање.
  return [
    ...staticRoutes,
    ...libraryRoutes,
    ...placeRoutes,
    ...typeRoutes,
    ...municipalityRoutes,
  ];
}

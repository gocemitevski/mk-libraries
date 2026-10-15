import type { MetadataRoute } from 'next';

const SITE = 'https://biblioteki.mk';

// Статичен извоз: мора експлицитно да се каже дека рутата е статична.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Страниците на 8-те „не е библиотека“ записи носат noindex на ниво на
        // metadata; овде дополнително ги исклучуваме од најавениот сканиралник.
        disallow: ['/data/'],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/data/'],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}

import type { Metadata } from 'next';
import './globals.scss';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

// Без сопствен фонт: се користи системскиот стек на Bootstrap, па нема
// барање кон надворешен сервер и нема CLS од фонт што се вчитува.

export const metadata: Metadata = {
  metadataBase: new URL('https://biblioteki.mk'),
  title: {
    default: 'Библиотеки во Северна Македонија — директориум',
    template: '%s | Библиотеки.мк',
  },
  description:
    'Пребарувајте ги библиотеките во Северна Македонија по населено место, тип и статус. Податоци проверени од јавни извори: МКТ, COBISS, Централен регистар и Википедија.',
  keywords: ['библиотеки', 'Северна Македонија', 'директориум', 'COBISS', 'народна библиотека'],
  openGraph: {
    type: 'website',
    locale: 'mk_MK',
    siteName: 'Библиотеки.мк',
    title: 'Библиотеки во Северна Македонија',
    description:
      'Пребарувајте ги библиотеките во Северна Македонија по населено место, тип и статус.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Библиотеки во Северна Македонија',
    description: 'Директориум на библиотеки во Северна Македонија со податоци од јавни извори.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mk">
      <body className="d-flex flex-column min-vh-100">
        <a className="skip-link" href="#main">
          Прескокни до содржината
        </a>
        <SiteHeader />
        <main id="main" className="flex-grow-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}

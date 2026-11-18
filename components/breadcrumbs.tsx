import Link from 'next/link';

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Патека со структурирани податоци - ја користат сите страници.
 * `jsonLd={false}` гаси Script-тегот на noindex-страниците (BreadcrumbList
 * на страница што не е во индексот е непотребен сигнал).
 */
export function Breadcrumbs({ items, jsonLd = true }: { items: Crumb[]; jsonLd?: boolean }) {
  const all: Crumb[] = [{ label: 'Почетна', href: '/' }, ...items];
  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `https://biblioteki.mk${c.href}` } : {}),
    })),
  };

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdData) }} />
      )}
      <nav aria-label="Патека на страницата">
        <ol className="breadcrumb mb-0">
          {all.map((c, i) => {
            const last = i === all.length - 1;
            return (
              <li className={`breadcrumb-item${last ? ' active' : ''}`} key={`${c.label}-${i}`} aria-current={last ? 'page' : undefined}>
                {c.href && !last ? <Link href={c.href}>{c.label}</Link> : c.label}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

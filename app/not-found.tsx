import Link from 'next/link';
import { Icon } from '@/components/icon';
import { SearchBox } from '@/components/search-box';
import { places, typeGroups } from '@/lib/data';

export default function NotFound() {
  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8 text-center">
          <p className="display-3 fw-bold mb-2">404</p>
          <h1 className="h2 mb-3">
            <Icon name="signpost-split" className="me-2" />
            Страницата не постои
          </h1>
          <p className="text-secondary mb-4">
            Линкот е погрешен или страницата е преместена. Пребарајте или изберете од долунаведените.
          </p>

          {/*
            Без records: Next ја вградува оваа страница во RSC payload-от на
            секоја рута, па индексот се вчитува по барање при прв фокус.
          */}
          <div className="text-start mx-auto" style={{ maxWidth: 560 }}>
            <SearchBox />
          </div>

          <div className="mt-4 d-flex flex-wrap justify-content-center gap-2">
            <Link href="/" className="btn btn-primary">Почетна</Link>
            <Link href="/biblioteki/" className="btn btn-outline-secondary">Сите библиотеки</Link>
            <Link href="/naseleni-mesta/" className="btn btn-outline-secondary">Населени места</Link>
            <Link href="/opstini/" className="btn btn-outline-secondary">Општини</Link>
          </div>

          <div className="mt-4 text-start">
            <h2 className="h6 text-secondary">Населени места со најмногу библиотеки</h2>
            <div className="d-flex flex-wrap gap-2">
              {places.slice(0, 8).map((p) => (
                <Link
                  key={p.slug}
                  href={`/naseleni-mesta/${p.slug}/`}
                  className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2"
                >
                  {p.name}
                  <span className="badge text-truncate flex-shrink-0 bg-secondary-subtle text-secondary-emphasis">{p.count}</span>
                </Link>
              ))}
            </div>

            <h2 className="h6 text-secondary mt-4">Типови</h2>
            <div className="d-flex flex-wrap gap-2">
              {typeGroups.map((g) => (
                <Link
                  key={g.slug}
                  href={`/tipovi/${g.slug}/`}
                  className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-2"
                >
                  {g.label}
                  <span className="badge text-truncate flex-shrink-0 bg-secondary-subtle text-secondary-emphasis">{g.count}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

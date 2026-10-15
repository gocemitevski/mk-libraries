import Link from 'next/link';
import { Icon } from '@/components/icon';
import { stats } from '@/lib/data';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer mt-5">
      <div className="container py-5">
        <div className="row g-4">
          <div className="col-md-4">
            <p className="h5 fw-bold mb-2">
              Библиотеки<span className="text-accent">.</span>мк
            </p>
            <p className="small mb-0">
              Директориум на библиотеки во Северна Македонија, изработен од јавно достапни извори.
              Податоците се проверени на{' '}
              {stats.dataVerifiedOn ? <time dateTime={stats.dataVerifiedOn}>12.10.2026</time> : '12.10.2026'}.
            </p>
          </div>
          <div className="col-6 col-md-3">
            <p className="h6 fw-semibold mb-2">Директориум</p>
            <ul className="list-unstyled small mb-0">
              <li className="mb-1"><Link href="/biblioteki/">Сите библиотеки</Link></li>
              <li className="mb-1"><Link href="/naseleni-mesta/">По населено место</Link></li>
              <li className="mb-1"><Link href="/tipovi/">По тип</Link></li>
              <li className="mb-1"><Link href="/opstini/">Општини</Link></li>
            </ul>
          </div>
          <div className="col-6 col-md-2">
            <p className="h6 fw-semibold mb-2">За проектот</p>
            <ul className="list-unstyled small mb-0">
              <li className="mb-1"><Link href="/statistika/">Статистика</Link></li>
              <li className="mb-1"><Link href="/metodologija/">Методологија</Link></li>
              <li className="mb-1"><Link href="/za-proektot/">За проектот</Link></li>
            </ul>
          </div>
          <div className="col-md-3">
            <p className="h6 fw-semibold mb-2">Отворени податоци</p>
            <ul className="list-unstyled small mb-0">
              <li className="mb-1"><a href="/data/libraries.json" download><Icon name="filetype-json" className="me-2" />libraries.json</a></li>
              <li className="mb-1"><a href="/data/coverage.json" download><Icon name="filetype-json" className="me-2" />coverage.json</a></li>
              <li className="mb-1"><a href="/data/stats.json" download><Icon name="filetype-json" className="me-2" />stats.json</a></li>
              <li className="mb-1"><a href="/data/biblioteki.csv" download><Icon name="filetype-csv" className="me-2" />biblioteki.csv</a></li>
            </ul>
          </div>
        </div>
        <hr className="border-light my-4" />
        <p className="small mb-0">
          © {year} Библиотеки.мк · Податоците се под CC-BY-4.0 · Извор: {stats.sources.bySource.length} јавни извори,
          просечно {stats.sources.averagePerRecord} по запис
        </p>
      </div>
    </footer>
  );
}

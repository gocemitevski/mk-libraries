'use client';

import { usePathname } from 'next/navigation';
import Fuse from 'fuse.js';
import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { LibraryCard } from '@/components/library-card';
import { useDisclosure } from '@/components/ui/behaviour';
import { Offcanvas } from '@/components/ui/overlay';
import type { DirectoryRecord } from '@/lib/search';

const PAGE_SIZE = 24;

interface TypeGroupOption {
  slug: string;
  label: string;
  count: number;
}

interface Props {
  records: DirectoryRecord[];
  places: { slug: string; name: string; count: number }[];
  typeGroups: TypeGroupOption[];
}

type SortKey = 'name' | 'place' | 'fund';

/**
 * Адресарот: пребарување + филтри, сè на клиентот.
 *
 * Состојбата се чита од URL-от при монтирање и се запишува назад со
 * history.replaceState — не користиме useSearchParams, бидејќи тој бара
 * Suspense-граница и тогаш статичниот HTML на /biblioteki/ содржи само
 * фолбек, наместо филтерите и првите 24 картички. /naseleni-mesta и /tipovi
 * остануваат влезните точки за пребарувачите.
 */
export function Directory({ records, places, typeGroups }: Props) {
  const pathname = usePathname();
  const filters = useDisclosure(false);

  const [query, setQuery] = useState('');
  const [typeGroup, setTypeGroup] = useState('');
  const [place, setPlace] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [hasWebsite, setHasWebsite] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [hasCoords, setHasCoords] = useState(false);
  const [sort, setSort] = useState<SortKey>('name');
  const [page, setPage] = useState(1);

  // Филтерската табла се прикажува двапати (колона на десктоп и Offcanvas на
  // телефон). Секоја копија добива свој префикс за id/name — инаку би имало
  // дупликати во DOM-от и label[for] би водел на првата копија.
  const uid = useId();

  // Првото запишување се прескокнува — инаку би го избришало ?q=… од URL-то
  // пред ефектот за читање да го примени.
  const firstWrite = useRef(true);

  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      setQuery(params.get('q') ?? '');
      setTypeGroup(params.get('tip') ?? '');
      setPlace(params.get('grad') ?? '');
      setVerifiedOnly(params.get('potvrdeni') === '1');
      setPage(Math.max(1, Number(params.get('stranica') ?? '1') || 1));
    };

    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  // Споделување на состојбата преку URL (без навигација и без мрежно барање)
  useEffect(() => {
    if (firstWrite.current) {
      firstWrite.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (typeGroup) params.set('tip', typeGroup);
    if (place) params.set('grad', place);
    if (verifiedOnly) params.set('potvrdeni', '1');
    if (page > 1) params.set('stranica', String(page));
    const qs = params.toString();
    window.history.replaceState(window.history.state, '', `${pathname}${qs ? `?${qs}` : ''}`);
  }, [pathname, query, typeGroup, place, verifiedOnly, page]);

  const fuse = useMemo(
    () =>
      new Fuse(records, {
        keys: [
          { name: 'name', weight: 0.45 },
          { name: 'shortName', weight: 0.15 },
          { name: 'aliases', weight: 0.2 },
          { name: 'cobiss.sigla', weight: 0.05 },
          { name: 'cobiss.acronym', weight: 0.05 },
          { name: 'location.place', weight: 0.1 },
          { name: 'location.address', weight: 0.05 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [records],
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    let list = q.length >= 2 ? fuse.search(q, { limit: 500 }).map((r) => r.item) : [...records];

    if (typeGroup) list = list.filter((l) => l.typeGroup === typeGroup);
    if (place) list = list.filter((l) => l.location.place === place);
    if (verifiedOnly) list = list.filter((l) => l.verification.level === 'confirmed');
    if (hasWebsite) list = list.filter((l) => Boolean(l.contacts.website));
    if (hasPhone) list = list.filter((l) => l.contacts.phones.length > 0);
    if (hasCoords) list = list.filter((l) => l.location.lat !== null);

    const collator = new Intl.Collator('mk');
    list.sort((a, b) => {
      if (sort === 'place') return collator.compare(a.location.place, b.location.place) || collator.compare(a.name, b.name);
      if (sort === 'fund') return (b.cobiss.stats2024.fund ?? -1) - (a.cobiss.stats2024.fund ?? -1);
      return collator.compare(a.name, b.name);
    });
    return list;
  }, [records, fuse, query, typeGroup, place, verifiedOnly, hasWebsite, hasPhone, hasCoords, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const activeFilterCount = [typeGroup, place, verifiedOnly, hasWebsite, hasPhone, hasCoords].filter(Boolean).length;

  const reset = () => {
    setTypeGroup('');
    setPlace('');
    setVerifiedOnly(false);
    setHasWebsite(false);
    setHasPhone(false);
    setHasCoords(false);
    setPage(1);
  };

  const goToPage = (n: number) => {
    // Секогаш во опсег — спречува празна страница ако некој повик мине
    // покрај оневозможеното копче (чинителен фокус, стар URL со ?stranica=…).
    setPage(Math.min(Math.max(1, n), totalPages));
    document.getElementById('results')?.scrollIntoView({ block: 'start' });
  };

  const filterPanel = (idPrefix: string) => (
    <fieldset className="border-0 p-0 m-0">
      <legend className="visually-hidden">Филтри за библиотеки</legend>

      <div className="filter-group mb-4">
        <h3 className="h6 mb-2">Тип</h3>
        <div className="d-flex flex-column gap-1">
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name={`${uid}-${idPrefix}-type`}
              id={`${uid}-${idPrefix}-type-all`}
              checked={typeGroup === ''}
              onChange={() => {
                setTypeGroup('');
                setPage(1);
              }}
            />
            <label className="form-check-label" htmlFor={`${uid}-${idPrefix}-type-all`}>
              Сите типови
            </label>
          </div>
          {typeGroups.map((group) => (
            <div className="form-check" key={group.slug}>
              <input
                className="form-check-input"
                type="radio"
                name={`${uid}-${idPrefix}-type`}
                id={`${uid}-${idPrefix}-type-${group.slug}`}
                checked={typeGroup === group.slug}
                onChange={() => {
                  setTypeGroup(group.slug);
                  setPage(1);
                }}
              />
              <label className="form-check-label" htmlFor={`${uid}-${idPrefix}-type-${group.slug}`}>
                {group.label} <span className="text-secondary">({group.count})</span>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="filter-group mb-4">
        <h3 className="h6 mb-2">Населено место</h3>
        <label htmlFor={`${uid}-${idPrefix}-place`} className="visually-hidden">
          Изберете населено место
        </label>
        <select
          id={`${uid}-${idPrefix}-place`}
          className="form-select"
          value={place}
          onChange={(e) => {
            setPlace(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Сите населени места</option>
          {places.map((p) => (
            <option key={p.slug} value={p.name}>
              {p.name} ({p.count})
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group mb-4">
        <h3 className="h6 mb-2">Податоци</h3>
        {[
          { key: 'verified', checked: verifiedOnly, set: setVerifiedOnly, label: 'Само потврдени' },
          { key: 'website', checked: hasWebsite, set: setHasWebsite, label: 'Има мрежно место' },
          { key: 'phone', checked: hasPhone, set: setHasPhone, label: 'Има телефон' },
          { key: 'coords', checked: hasCoords, set: setHasCoords, label: 'Има координати' },
        ].map((f) => (
          <div className="form-check" key={f.key}>
            <input
              className="form-check-input"
              type="checkbox"
              id={`${uid}-${idPrefix}-${f.key}`}
              checked={f.checked}
              onChange={(e) => {
                f.set(e.target.checked);
                setPage(1);
              }}
            />
            <label className="form-check-label" htmlFor={`${uid}-${idPrefix}-${f.key}`}>
              {f.label}
            </label>
          </div>
        ))}
      </div>

      {activeFilterCount > 0 && (
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={reset}>
          Исчисти ги филтерите ({activeFilterCount})
        </button>
      )}
    </fieldset>
  );

  return (
    <div className="row g-4">
      {/* Десктоп колона со филтри */}
      <aside className="col-lg-3 d-none d-lg-block">
        <div className="card">
          <div className="card-body">
            <h2 className="card-title h6">
              <Icon name="funnel" className="me-2" />
              Филтри
            </h2>
            {filterPanel('side')}
          </div>
        </div>
      </aside>

      <div className="col-lg-9">
        {/* Барање + сортирање */}
        <div className="d-flex flex-column flex-md-row gap-2 mb-3">
          <div className="flex-grow-1">
            <label htmlFor="directory-search" className="visually-hidden">
              Пребарај во адресарот
            </label>
            <input
              id="directory-search"
              type="search"
              className="form-control"
              placeholder="Пребарај по име, алијас, сигла или адреса…"
              value={query}
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="d-flex gap-2">
            <label htmlFor="sort" className="visually-hidden">
              Сортирај
            </label>
            <select
              id="sort"
              className="form-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="name">По назив</option>
              <option value="place">По населено место</option>
              <option value="fund">По големина на фонд</option>
            </select>
            <button
              type="button"
              className="btn btn-outline-secondary d-lg-none"
              onClick={filters.open}
              aria-haspopup="dialog"
            >
              <Icon name="funnel" className="me-2" />
              Филтри{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </button>
          </div>
        </div>

        <p className="text-secondary small mb-3" aria-live="polite" id="results">
          {filtered.length === 0
            ? 'Нема резултати.'
            : `Прикажани ${visible.length} од ${filtered.length} библиотеки.`}
        </p>

        {visible.length === 0 ? (
          // Истиот облик како предупредувањето на почетната страница: текст +
          // копче во еден ред, наместо залепено копче-текст во реченицата.
          <div className="alert alert-secondary d-flex flex-wrap align-items-center gap-3" role="note">
            <span className="flex-grow-1">
              <Icon name="info-circle" size={18} className="me-2" />
              Нема библиотеки што ги задоволуваат избраните филтри.
            </span>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={reset}>
              Исчисти ги филтерите
            </button>
          </div>
        ) : (
          <div className="row g-3">
            {visible.map((library) => (
              <div className="col-md-6 col-xl-4" key={library.slug}>
                <LibraryCard library={library} />
              </div>
            ))}
          </div>
        )}

        {/* Пагинација */}
        {totalPages > 1 && (
          <nav className="mt-4" aria-label="Пагинација на резултатите">
            {/* На телефони „Претходна“/„Следна“ (~105px + ~78px) го турале редот
                надвор од контејнерот. Ги криеме под sm и покажуваме само стрелка,
                за целиот ред да собира во еден ред на 320px. row-gap-2 е безбедносна
                мрежа ако сепак се прекине (зумирање на текст од пристапност). */}
            <ul className="pagination flex-wrap row-gap-2 justify-content-center mb-0">
              <li className={`page-item${currentPage === 1 ? ' disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  // Bootstrap го решава disabled само со pointer-events: none —
                  // го блокира глувчето, не тастатурата. Без disabled атрибут
                  // Tab ја наоѓа „Претходна“ и Enter ја празни страницата.
                  disabled={currentPage === 1}
                  aria-label="Претходна страница"
                  onClick={() => goToPage(currentPage - 1)}
                >
                  <span aria-hidden="true">‹</span>
                  <span className="d-none d-sm-inline ms-1">Претходна</span>
                </button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
                .map((n, i, arr) => (
                  <Fragment key={n}>
                    {/* Пропустувањето сместо во свој <li> — споделен <li> со
                        копчето би дал два .page-link детиња и би ги расипал
                        првиот/последниот радиус на Bootstrap. */}
                    {i > 0 && arr[i - 1] !== n - 1 && (
                      <li className="page-item disabled" aria-hidden="true">
                        <span className="page-link">…</span>
                      </li>
                    )}
                    <li className="page-item">
                      <button
                        type="button"
                        className={`page-link${n === currentPage ? ' active' : ''}`}
                        aria-current={n === currentPage ? 'page' : undefined}
                        onClick={() => goToPage(n)}
                      >
                        {n}
                      </button>
                    </li>
                  </Fragment>
                ))}
              <li className={`page-item${currentPage === totalPages ? ' disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  disabled={currentPage === totalPages}
                  aria-label="Следна страница"
                  onClick={() => goToPage(currentPage + 1)}
                >
                  <span className="d-none d-sm-inline me-1">Следна</span>
                  <span aria-hidden="true">›</span>
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>

      <Offcanvas open={filters.isOpen} onClose={filters.close} side="start" label="Филтри" title="Филтри">
        {filterPanel('panel')}
      </Offcanvas>
    </div>
  );
}

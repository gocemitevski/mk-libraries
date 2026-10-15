'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SearchRecord } from '@/src/lib/search-index';
import { Icon } from '@/components/icon';

/** Стабилна празна листа — го држи useMemo-то на SearchBox без непотребни градења. */
const EMPTY: SearchRecord[] = [];

/**
 * Полето за пребарување на почетната страница и во 404.
 *
 * `records` е опционален: ако не се предаде, индексот се вчитува еднаш по
 * прв фокус од /data/search-index.json. Така 404-страницата (која Next ја
 * вградува во RSC payload-от на **секоја** страница) не носи 58 kB податоци
 * со себе.
 *
 * Маркап, според документацијата на Bootstrap:
 *  - иконата седи во `.input-group-text`, не позиционирана над полето;
 *  - предлозите се `.list-group` + `.list-group-item-action`;
 *  - секој предлог е `role="option"` **без фокусирачки потомок** — фокусот
 *    останува во полето, а `aria-activedescendant` ја означува активната
 *    опција. Затоа редот е кликликав `<li>`, а не внатрешен `<button>`.
 */
export function SearchBox({
  records,
  autoFocus = false,
}: {
  records?: SearchRecord[];
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [remote, setRemote] = useState<SearchRecord[] | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requested = useRef(false);

  const loading = records === undefined && remote === null;
  const all = records ?? remote ?? EMPTY;

  /** Го вчитува индексот само кога корисникот навистина ќе го употреби полето. */
  const ensureIndex = () => {
    if (records || requested.current) return;
    requested.current = true;
    fetch('/data/search-index.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: SearchRecord[]) => setRemote(Array.isArray(data) ? data : EMPTY))
      .catch(() => setRemote(EMPTY));
  };

  // Индексот се гради еднаш: име, кратко име, алијаси (107 записи ги имаат) и сигла.
  const fuse = useMemo(
    () =>
      new Fuse(all, {
        keys: [
          { name: 'name', weight: 0.5 },
          { name: 'shortName', weight: 0.2 },
          { name: 'aliases', weight: 0.15 },
          { name: 'sigla', weight: 0.05 },
          { name: 'acronym', weight: 0.05 },
          { name: 'place', weight: 0.1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [all],
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    return fuse.search(q, { limit: 8 }).map((r) => r.item);
  }, [query, fuse]);

  const panelOpen = open && query.trim().length >= 2;
  // Опциите се: секој запис + последниов ред „види ги сите“.
  const optionCount = results.length + (results.length > 0 ? 1 : 0);

  // Затвори при клик надвор
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const go = (slug: string) => {
    setOpen(false);
    router.push(`/biblioteki/${slug}/`);
  };

  const goAll = () => {
    setOpen(false);
    router.push(`/biblioteki/?q=${encodeURIComponent(query.trim())}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!optionCount) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % optionCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? optionCount - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // active може да ја надминува листата ако резултатите се стесниле
      const idx = active >= 0 ? Math.min(active, results.length) : 0;
      if (idx < results.length) go(results[idx].slug);
      else goAll();
    }
  };

  /** Боја на потписот под името — на активниот ред (темна подлога) светол. */
  const subline = (isSelected: boolean) => (isSelected ? 'text-white-50' : 'text-secondary');

  return (
    <div className="search-box position-relative" ref={boxRef}>
      <label htmlFor="site-search" className="visually-hidden">
        Пребарај библиотека по име, краток назив, алијас или населено место
      </label>

      {/* Иконата во input-group-text — документираниот начин за знаме во поле */}
      <div className="input-group rounded shadow">
        <span className="input-group-text border-0 text-secondary" aria-hidden="true">
          <Icon name="search" size={18} />
        </span>
        <input
          ref={inputRef}
          id="site-search"
          type="search"
          className="form-control border-0"
          placeholder="Пребарај: „Климент Охридски“, НУБ, Битола…"
          value={query}
          autoComplete="off"
          role="combobox"
          aria-expanded={panelOpen}
          aria-controls={panelOpen ? 'search-results' : undefined}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && active < optionCount ? `search-result-${active}` : undefined}
          autoFocus={autoFocus}
          onFocus={() => {
            setOpen(true);
            ensureIndex();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
            ensureIndex();
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {panelOpen && (
        <div className="search-results list-group" id="search-results">
          {loading && (
            <span className="list-group-item small text-secondary" role="status">
              Се вчитува индексот…
            </span>
          )}
          {!loading && results.length === 0 && (
            <span className="list-group-item small text-secondary" role="status">
              Нема резултати за „{query}“
            </span>
          )}

          {results.length > 0 && (
            <ul className="list-group" role="listbox" aria-label="Предлози од пребарувањето">
              {results.map((r, i) => (
                <li
                  key={r.slug}
                  id={`search-result-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={`list-group-item list-group-item-action${i === active ? ' active' : ''}`}
                  onClick={() => go(r.slug)}
                >
                  <span className="fw-semibold d-block">{r.name}</span>
                  <span className={`small ${subline(i === active)}`}>
                    {r.place} · {r.typeLabel}
                  </span>
                </li>
              ))}
              <li
                id={`search-result-${results.length}`}
                role="option"
                aria-selected={active === results.length}
                className={`list-group-item list-group-item-action${
                  active === results.length ? ' active' : ''
                }`}
                onClick={goAll}
              >
                Ги гледам сите резултати за „{query.trim()}“ →
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

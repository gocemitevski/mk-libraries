import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Icon } from '@/components/icon';
import { LibraryCard, TypeBadge, VerificationBadge } from '@/components/library-card';
import { JsonLd, libraryJsonLd, libraryMetaDescription } from '@/lib/seo';
import { formatDayNames, formatMkTime, parseHours } from '@/lib/hours';
import { commonsImageUrl } from '@/lib/commons';
import { websiteHref } from '@/lib/links';
import {
  getBranches,
  getLibrary,
  getProvenance,
  getParent,
  getRelated,
  libraries,
  placeSlug,
  typeBySlug,
} from '@/lib/data';
import {
  directionsHref,
  displayUrl,
  formatDate,
  formatDateShort,
  formatNumber,
  telHref,
  NOUNS,
  plural,
} from '@/lib/format';
import { SITE_URL } from '@/lib/seo';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return libraries.map((l) => ({ slug: l.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const library = getLibrary(slug);
  if (!library) return {};

  const title = `${library.name}, ${library.location.place}`;
  const description = libraryMetaDescription(library);

  return {
    title,
    description,
    alternates: { canonical: `/biblioteki/${library.slug}/` },
    // 8-те „не е библиотека“ записи остануваат во податоците и во URL-от
    // (сликовите ги има), но не смеат да влегуваат во индексот — се исклучени
    // и од sitemap.xml.
    ...(library.public ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      title,
      description,
      url: `/biblioteki/${library.slug}/`,
      type: 'article',
    },
  };
}

export default async function LibraryPage({ params }: Props) {
  const { slug } = await params;
  const library = getLibrary(slug);
  if (!library) notFound();

  const url = `${SITE_URL}/biblioteki/${library.slug}/`;
  const branches = getBranches(library);
  const parent = getParent(library);
  const related = getRelated(library);
  const provenance = getProvenance(library.id);
  const typeMeta = typeBySlug[library.type];
  const directions = directionsHref({
    lat: library.location.lat,
    lon: library.location.lon,
    address: library.location.address,
    place: library.location.place,
  });
  const website = websiteHref(library.contacts.website);

  // „•“ во `notes` е набројување, не интерпункција: првиот дел е воведен
  // текст, останатите се ставки. Делиме при приказот — податокот во
  // workbook-от останува како што е.
  const noteParts = (library.notes ?? '').split('•').map((part) => part.trim());
  const notesIntro = noteParts[0];
  const notesItems = noteParts.slice(1).filter(Boolean);

  // Commons колоната содржи страници, не слики — претвораме само File: во
  // директен линк; Category: нема еквивалент и останува како линк.
  const commonsImageSrc = commonsImageUrl(library.links.commonsImage);

  const externalLinks = [
    { href: websiteHref(library.contacts.website), label: 'Мрежно место', rel: 'noopener external' },
    { href: library.cobiss.profileUrl, label: 'Профил во COBISS', rel: 'noopener external' },
    { href: library.cobiss.aspiUrl, label: 'Профил во ASPI', rel: 'noopener external' },
    { href: library.links.wikipedia, label: 'Википедија', rel: 'noopener external' },
    { href: library.links.wikidata, label: 'Wikidata', rel: 'noopener external' },
    { href: library.links.commonsCategory, label: 'Категорија на Commons', rel: 'noopener external' },
    // Кога нема пренослива слика (Category:-страница), линкот останува во
    // листата со надворешни линкови; кога има, веќе е покрај самата слика.
    {
      href: commonsImageSrc ? null : library.links.commonsImage,
      label: 'Слика на Commons',
      rel: 'noopener external',
    },
    { href: library.links.zk, label: 'Златна книга (zk.mk)', rel: 'nofollow noopener external' },
    { href: library.links.loc, label: 'loc.mk', rel: 'nofollow noopener external' },
    { href: library.links.abv, label: 'abv.mk', rel: 'nofollow noopener external' },
  ].filter((l): l is { href: string; label: string; rel: string } => Boolean(l.href));

  const legalRows = [
    { label: 'ЕМБС', value: library.legal.embs },
    { label: 'ЕДБ', value: library.legal.edb },
    { label: 'Назив во Централен регистар', value: library.legal.registerName },
    { label: 'Однос со правното лице', value: library.legal.relation },
    { label: 'Статус (CompanyWall)', value: library.legal.crStatus },
  ].filter((r) => r.value);

  return (
    <div className="container py-4">
      {/* JSON-LD само за записите во индексот — noindex-страниците не смеат да излегуваат во структурирани податоци. */}
      {library.public && <JsonLd data={libraryJsonLd(library, url)} />}

      <Breadcrumbs
        jsonLd={library.public}
        items={[
          { label: 'Библиотеки', href: '/biblioteki/' },
          { label: library.location.place, href: `/naseleni-mesta/${placeSlug(library.location.place)}/` },
          { label: library.name },
        ]}
      />

      <div className="row g-4 mt-1">
        <div className="col-lg-8">
          {/* ── Наслов ─────────────────────────────────────────────────── */}
          <header className="mb-4">
            <h1 className="mb-3">{library.name}</h1>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <TypeBadge library={library} />
              <VerificationBadge library={library} />
              {library.needsCheck && (
                <span className="badge text-truncate flex-shrink-0 badge-unverified">Податокот е во проверка</span>
              )}
            </div>
            {library.shortName && library.shortName !== library.name && (
              <p className="text-secondary mb-1">Познат и како: {library.shortName}</p>
            )}
            <p className="mb-0">
              <a href={directions} target="_blank" rel="noopener external" className="text-decoration-none">
                {library.location.address ? `${library.location.address}, ` : ''}
                {library.location.place}
                {library.location.postalCode ? ` ${library.location.postalCode}` : ''}
              </a>
              {library.location.lat !== null && (
                <span className="text-secondary small ms-2">
                  ({library.location.lat.toFixed(4)}, {library.location.lon?.toFixed(4)})
                  {library.location.coordsSource === 'settlement' && ' - приближно, по населено место'}
                </span>
              )}
            </p>
            {library.lastVerified && (
              <p className="small text-secondary mt-2 mb-0">
                Податокот е проверен на{' '}
                <time dateTime={library.lastVerified}>{formatDateShort(library.lastVerified)}</time>.
              </p>
            )}
          </header>

          {/* ── Дејства ──────────────────────────────────────────────────
              Едно исполнето копче за она што најчесто се бара (мрежно место),
              сè останато со контурниот втор степен на хиерархијата. */}
          <div className="d-flex flex-wrap gap-2 mb-3">
            {website && (
              <a className="btn btn-primary hstack gap-2" href={website} target="_blank" rel="noopener external">
                <Icon name="globe2" />
                <span>Мрежно место</span>
              </a>
            )}
            {library.contacts.phones[0] && (
              <a className="btn btn-outline-secondary hstack gap-2" href={telHref(library.contacts.phones[0])}>
                <Icon name="telephone" />
                <span>{library.contacts.phones[0]}</span>
              </a>
            )}
            {library.contacts.emails[0] && (
              <a className="btn btn-outline-secondary hstack gap-2" href={`mailto:${library.contacts.emails[0]}`}>
                <Icon name="envelope" />
                <span>Е-пошта</span>
              </a>
            )}
            <a className="btn btn-outline-secondary hstack gap-2" href={directions} target="_blank" rel="noopener external">
              <Icon name="signpost-2" />
              <span>Насоки</span>
            </a>
          </div>

          {/* ── За библиотеката ────────────────────────────────────────── */}
          {(library.history.note || parent || branches.length > 0 || library.history.founded) && (
            <section className="detail-section py-4">
              <h2 className="h4 mb-3">За библиотеката</h2>
              {library.history.founded && <p className="mb-2">Основана: {library.history.founded}</p>}
              {library.history.note && <p className="mb-2">{library.history.note}</p>}
              {parent && (
                <p className="mb-1">
                  Во состав на: <Link href={`/biblioteki/${parent.slug}/`}>{parent.name}</Link>
                </p>
              )}
              {branches.length > 0 && (
                <div className="mt-3">
                  <h3 className="h6 mb-2">Ограноци и подрачни единици</h3>
                  <ul className="mb-0">
                    {branches.map((b) => (
                      <li key={b.slug}>
                        <Link href={`/biblioteki/${b.slug}/`}>{b.name}</Link> - {b.location.place}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* ── Работно време ──────────────────────────────────────────── */}
          {library.contacts.hours.length > 0 && (
            <section className="detail-section py-4">
              <h2 className="h4 hstack gap-2 mb-3 mx-2">
                <Icon name="clock" />
                <span>Работно време</span>
              </h2>
              {/* Секој запис е верзија на еден извор, па секој извор добива свој
                  list-group, а секоја деновска група внатре — свој list-group-item,
                  за да се скенира ред по ред. Цитатот за изворот е последен ред во
                  групата, тивок и со икона: внатре, за да не се натпреварува со
                  насловот над групата, и еднаш по извор, бидејќи 43 од 69 реда би
                  го повториле. Кај 4 библиотеки два извора се разликуваат, па
                  секоја група носи свој цитат и не може да се замени кој што тврди.
                  Изворот пишува „Пон–Пет 08:00–19:00“, а прикажуваме целосни имиња
                  и правописен македонски часовник „понеделник–петок 8.00–19:00“ —
                  двоеточието и скратените зборови остануваат во JSON-LD, каде ги
                  бара schema.org. Непознат формат се прикажува суров, за да не се
                  изгуби податок. */}
              {library.contacts.hours.map((h, i) => (
                <div key={`${h.source}-${i}`} className={i > 0 ? 'mt-3' : undefined}>
                  <ul className="list-group">
                    {parseHours(h.value).map((seg, j) =>
                      seg.days === null ? (
                        <li key={j} className="list-group-item">
                          {seg.raw}
                        </li>
                      ) : (
                        <li key={j} className="list-group-item d-flex gap-3">
                          <span className="flex-grow-1 text-secondary">{formatDayNames(seg.days)}</span>
                          <span>
                            {seg.open ? `${formatMkTime(seg.open.from)}–${formatMkTime(seg.open.to)}` : 'затворено'}
                          </span>
                        </li>
                      ),
                    )}
                    {/* Цитат: еднаш по извор, внатре во групата како тивок ред — не
                        над неа, за да не се натпреварува со насловот, и не по секој
                        ред, бидејќи 43 од 69 реда би го повториле (loc.mk има 6 реда
                        на една страница). Иконата го означува како фуснота, а не како
                        уште еден податок. */}
                    <li className="list-group-item text-bg-light py-2 small text-secondary hstack gap-2">
                      <span>според {h.source}</span>
                    </li>
                  </ul>
                </div>
              ))}
              <p className="small text-secondary mt-3 mx-3 mb-0">
                Работното време е преземено од адресари и може да не е актуелно - проверете на мрежното место.
              </p>
            </section>
          )}

          {/* ── Фонд и статистика ──────────────────────────────────────── */}
          {(library.cobiss.stats2024.fund !== null || library.cobiss.stats2024.records !== null) && (
            <section className="detail-section py-4">
              <h2 className="h4 mb-3">Фонд и статистика</h2>
              <div className="row g-3">
                {[
                  { label: 'Вкупен фонд (2024)', value: library.cobiss.stats2024.fund },
                  { label: 'Прираст во 2024', value: library.cobiss.stats2024.increment },
                  { label: 'Записи во локалната база', value: library.cobiss.stats2024.records },
                  { label: 'Вработени (CompanyWall)', value: library.legal.employees },
                ]
                  .filter((s) => s.value !== null)
                  .map((s) => (
                    <div className="col-6 col-md-3" key={s.label}>
                      <div className="card h-100">
                        <div className="card-body">
                          <div className="stat-number h4 mb-0">{formatNumber(s.value as number)}</div>
                          <div className="small text-secondary">{s.label}</div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              {library.cobiss.stats2024.kind && (
                <p className="small text-secondary mt-3 mb-0">
                  Вид според COBISS статистика 2025: {library.cobiss.stats2024.kind}
                  {library.cobiss.membership && ` · ${library.cobiss.membership}`}
                  {library.cobiss.memberSince && ` од ${library.cobiss.memberSince}`}.
                </p>
              )}
            </section>
          )}

          {/* ── Правни податоци ────────────────────────────────────────── */}
          {legalRows.length > 0 && (
            <section className="detail-section py-4">
              <h2 className="h4 mb-3">Правни податоци</h2>
              <dl className="row mb-0">
                {legalRows.map((r) => (
                  <div className="col-md-6 mb-2" key={r.label}>
                    <dt className="small text-secondary">{r.label}</dt>
                    <dd className="mb-0">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* ── Контакти ───────────────────────────────────────────────── */}
          {(library.contacts.phones.length > 1 || library.contacts.emails.length > 0) && (
            <section className="detail-section py-4">
              <h2 className="h4 mb-3">Контакти</h2>
              {library.contacts.phones.length > 0 && (
                <div className="mb-2">
                  <span className="text-secondary small d-block">Телефони</span>
                  {library.contacts.phones.map((p) => (
                    <a key={p} href={telHref(p)} className="d-inline-block me-3">
                      {p}
                    </a>
                  ))}
                </div>
              )}
              {library.contacts.emails.length > 0 && (
                <div className="mb-2">
                  <span className="text-secondary small d-block">Е-пошта</span>
                  {library.contacts.emails.map((e) => (
                    <a key={e} href={`mailto:${e}`} className="d-inline-block me-3">
                      {e}
                    </a>
                  ))}
                </div>
              )}
              {(library.contacts.director || library.contacts.contactPerson) && (
                <div className="small text-secondary">
                  {library.contacts.director && <div>Раководител: {library.contacts.director}</div>}
                  {library.contacts.contactPerson && <div>Контакт: {library.contacts.contactPerson}</div>}
                </div>
              )}
            </section>
          )}

          {/* ── Извори и сигурност ─────────────────────────────────────── */}
          <section className="detail-section py-4">
            <h2 className="h4 mb-3">Извори и сигурност на податоците</h2>
            <p className="mb-3">
              Записот е споен од <strong>{library.sources.count}</strong>{' '}
                {plural(library.sources.count, NOUNS.извор)}. Најниска сигурност на спојување:{' '}
              <strong>
                {library.confidence === 'high' ? 'висока' : library.confidence === 'medium' ? 'средна' : 'еден извор'}
              </strong>
              .
            </p>

            <ul className="list-unstyled d-flex flex-wrap gap-2 mb-3">
              {library.sources.list.map((s) => (
                <li key={s}>
                  <span className="badge text-truncate flex-shrink-0 bg-light text-dark border">{s}</span>
                </li>
              ))}
            </ul>

            {library.sources.addressVariants.length > 1 && (
              <details className="mb-3">
                <summary className="fw-semibold">Адреси по извор ({library.sources.addressVariants.length})</summary>
                <ul className="list-unstyled mt-2 mb-0">
                  {library.sources.addressVariants.map((v, i) => (
                    <li key={`${v.source}-${i}`} className="source-variant rounded-2 p-2 mb-1 small">
                      <strong>{v.source}:</strong> {v.value}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {library.aliases.length > 0 && (
              <details className="mb-3">
                <summary className="fw-semibold">Називи во други извори ({library.aliases.length})</summary>
                <ul className="mt-2 mb-0 small">
                  {library.aliases.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </details>
            )}

            {provenance.length > 0 && (
              <details>
                <summary className="fw-semibold">Детали за поврзување на изворите ({provenance.length})</summary>
                <ul className="mt-2 mb-0 small">
                  {provenance.map((p, i) => (
                    <li key={`${p.source}-${i}`} className="mb-1">
                      <strong>{p.source}</strong>
                      {p.basis && <> - {p.basis}</>}
                      {p.note && <em className="text-secondary"> ({p.note})</em>}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {library.notes && (
              <div className="alert alert-secondary mt-3 mb-0">
                <Icon name="info-circle" className="me-2" />
                <strong>Забелешки и дилеми при собирањето:</strong>
                {notesIntro && <p className="mb-0 mt-1">{notesIntro}</p>}
                {notesItems.length > 0 && (
                  <ul className="mt-1 mb-0">
                    {notesItems.map((item, i) => (
                      <li key={`${i}-${item}`} className="mb-1">{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* ── Врски ─────────────────────────────────────────────────── */}
          {externalLinks.length > 0 && (
            <section className="detail-section py-4">
              <h2 className="h4 mb-3">Врски</h2>
              <ul className="list-unstyled mb-0">
                {externalLinks.map((link) => (
                  <li className="mb-1" key={link.href}>
                    <a href={link.href} target="_blank" rel={link.rel}>
                      <Icon name="box-arrow-up-right" className="me-2" />
                      {link.label}
                      <span className="visually-hidden"> ({displayUrl(link.href)})</span>
                    </a>
                    <span className="text-secondary small"> - {displayUrl(link.href)}</span>
                  </li>
                ))}
              </ul>
              {library.contacts.otherWebsites.length > 0 && (
                <p className="small text-secondary mt-2 mb-0">
                  Други веб-адреси: {library.contacts.otherWebsites.join(', ')}
                </p>
              )}
            </section>
          )}

        </div>

        {/* ── Странична колона ──────────────────────────────────────────── */}
        <aside className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <h2 className="card-title h6">Податоци за записот</h2>
              <dl className="small mb-0">
                <dt className="text-secondary">ID</dt>
                <dd>{library.id}</dd>
                <dt className="text-secondary">Тип</dt>
                <dd>
                  {typeMeta && <Link href={`/tipovi/${library.typeGroup}/`}>{library.typeLabel}</Link>}
                </dd>
                <dt className="text-secondary">Категорија според ДЗС</dt>
                <dd>{library.dzsLabel}</dd>
                <dt className="text-secondary">Статус на работа</dt>
                <dd>{library.status}</dd>
                {library.cobiss.sigla && (
                  <>
                    <dt className="text-secondary">Сигла во COBISS</dt>
                    <dd>{library.cobiss.sigla}</dd>
                  </>
                )}
                {library.location.municipality && (
                  <>
                    <dt className="text-secondary">Општина / дел од град</dt>
                    <dd>{library.location.municipality}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>

        {/* Сликата постои само ако изворот е File:-страница; Category-страниците
            немаат директна слика и остануваат само како линк подолу. */}
        {commonsImageSrc && library.links.commonsImage && (
          <figure className="card mb-3">
            <img
              src={commonsImageSrc}
              alt={library.name}
              className="card-img-top"
              loading="lazy"
              width={600}
              height={400}
              style={{ objectFit: 'cover', height: 'auto' }}
            />
            <figcaption className="card-body small text-secondary">
              Слика од{' '}
              <a href={library.links.commonsImage} rel="noopener external nofollow">
                Wikimedia Commons
              </a>
              .
            </figcaption>
          </figure>
        )}

          {library.history.protectedObj && (
            <div className="alert alert-warning mb-3 hstack gap-3">
              <Icon name="bank2" className="flex-shrink-0 fs-5" />
              <p className="mb-0 lh-sm">
                <strong>Заштитено наследство:</strong> {library.history.protectedObj}
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* ── Поврзани библиотеки ─────────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="mt-5">
          <h2 className="h4 mb-3">Поврзани библиотеки</h2>
          <div className="row g-3">
            {related.slice(0, 3).map((r) => (
              <div className="col-md-4" key={r.slug}>
                <LibraryCard library={r} />
              </div>
            ))}
          </div>
        </section>
      )}

      {library.lastVerified && (
        <p className="small text-secondary mt-4 mb-0">
          Датум на последна веб-проверка:{' '}
          <time dateTime={library.lastVerified}>{formatDate(library.lastVerified)}</time>
        </p>
      )}
    </div>
  );
}

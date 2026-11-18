import Link from 'next/link';
import { Icon } from '@/components/icon';
import { displayUrl, directionsHref, telHref } from '@/lib/format';
import { websiteHref } from '@/lib/links';

/**
 * Минималниот облик што го бараат картичката и значките.
 *
 * И двата типа што реално ги пренесуваме - целиот `Library` (детална
 * страница) и намалениот `DirectoryRecord` (адресар) - го задоволуваат
 * ова, па не мораме да ги влечеме комплетните податоци на клиентот.
 */
export interface LibraryCardData {
  slug: string;
  name: string;
  typeLabel: string;
  // slug на групата - го користиме за бојата на картичката (.type-<slug>)
  typeGroup: string;
  verification: { level: string; label: string; detail?: string | null };
  location: { place: string; address: string | null; lat: number | null; lon: number | null };
  parent: { name: string };
  contacts: { website: string | null; phones: string[] };
  cobiss: { stats2024: { fund: number | null } };
}

const VERIFICATION_CLASS: Record<string, string> = {
  confirmed: 'badge-verified',
  partial: 'badge-partial',
  unconfirmed: 'badge-unverified',
};

export function VerificationBadge({
  library,
  compact = false,
}: {
  library: Pick<LibraryCardData, 'verification'>;
  compact?: boolean;
}) {
  const { level, label, detail } = library.verification;
  return (
    <span className={`badge text-truncate flex-shrink-0 ${VERIFICATION_CLASS[level]}`}>
      {compact || !detail ? label : `${label} – ${detail}`}
    </span>
  );
}

export function TypeBadge({
  library,
}: {
  library: Pick<LibraryCardData, 'typeLabel' | 'typeGroup'>;
}) {
  // Бојата доаѓа од .type-<slug> (дефинирана во globals.scss од $type-hues),
  // така што значката ја наследува нијансата на својата група.
  return (
    <span className={`badge text-truncate type-badge type-${library.typeGroup}`}>{library.typeLabel}</span>
  );
}

/**
 * Картичка за лист - ја користат адресарот, населените места и типовите.
 * Брзите дејства (веб, телефон, насоки) се врзани заради пристапност:
 * секој линк е вистински <a>, не клик-делегација врз картичката.
 *
 * Нивото на насловот ја продолжува линијата на страницата: `h3` кога над
 * картичките веќе има `h2` (секција), `h2` кога се првата содржина под `h1`.
 * Големината ја дава `card-title h6`, па изборот не ја менува визуелно.
 */
export function LibraryCard({
  library,
  headingLevel = 'h3',
}: {
  library: LibraryCardData;
  headingLevel?: 'h2' | 'h3';
}) {
  const href = `/biblioteki/${library.slug}/`;
  const Heading = headingLevel;
  const website = websiteHref(library.contacts.website);
  const directions = directionsHref({
    lat: library.location.lat,
    lon: library.location.lon,
    address: library.location.address,
    place: library.location.place,
  });

  return (
    <article className={`card lib-card h-100 type-${library.typeGroup}`}>
      <div className="card-body d-flex flex-column">
        {/* Насловот е прв - значките се мета-податок за него, па следуваат веднаш под него. */}
        <Heading className="card-title h6">
          <Link className="stretched-link text-decoration-none" href={href}>
            {library.name}
          </Link>
        </Heading>

        <div className="d-flex flex-wrap gap-2 mb-2">
          <TypeBadge library={library} />
          <VerificationBadge library={library} compact />
        </div>

        <p className="card-text text-secondary small mb-2">
          {library.location.address ? `${library.location.address}, ` : ''}
          {library.location.place}
          {library.parent.name ? (
            <>
              {' · '}
              <span className="text-secondary">гранка на {library.parent.name}</span>
            </>
          ) : null}
        </p>

        {library.cobiss.stats2024.fund !== null && (
          <p className="card-text small mb-2 text-secondary">
            Фонд (COBISS 2024): <strong className="stat-number">{library.cobiss.stats2024.fund.toLocaleString('mk-MK')}</strong> примероци
          </p>
        )}

        {/* Брзи дејства - се појавуваат само кога податокот постои.
            Сите со истиот варијант: во листа нема „главно“ дејство,
            главното е самиот ред на картичката (stretched-link). */}
        <div className="mt-auto d-flex flex-wrap gap-2 pt-3 position-relative">
          {website && (
            <a
              className="btn btn-sm btn-outline-secondary hstack gap-1"
              href={website}
              target="_blank"
              rel="noopener external"
            >
              <Icon name="globe2" />
              <span>Мрежно место</span>
              <span className="visually-hidden"> ({displayUrl(website)})</span>
            </a>
          )}
          {library.contacts.phones[0] && (
            <a className="btn btn-sm btn-outline-secondary hstack gap-1" href={telHref(library.contacts.phones[0])}>
              <Icon name="telephone" />
              <span>Телефон</span>
            </a>
          )}
          <a className="btn btn-sm btn-outline-secondary hstack gap-1" href={directions} target="_blank" rel="noopener external">
            <Icon name="signpost-2" />
            <span>Насоки</span>
          </a>
        </div>
      </div>
    </article>
  );
}

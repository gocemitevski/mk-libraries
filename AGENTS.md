# AGENTS.md

Guidance for coding agents working on **Библиотеки.мк**, a statically exported directory of
libraries in North Macedonia. See `README.md` for the human-facing overview, scripts and
deployment notes.

## Non-negotiables

- **Macedonian in the product.** Every user-facing string — pages, metadata, alt text, error
  messages, empty states — is in Macedonian. Use **„адресар“**, never „директориум“. Developer
  docs (`README.md`, this file) are English; code comments are Macedonian, so match the file
  you are editing.
- **The workbook is read-only.** `master_biblioteki_mk.xlsx` is the single source of truth.
  Never edit it manually or with a script. Data changes start in the workbook and go through
  the pipeline.
- **Generated data is never hand-edited.** `src/data/` and `public/data/` are build outputs.
  Change the workbook or the pipeline, then run `npm run data:build`.
- **Static export only.** The site is `output: 'export'`; there is no server at runtime. Do not
  add API routes, server actions, middleware, ISR or anything that needs a request-time server.
- **No cookies or consent banner.** Analytics is cookieless by configuration. Do not add
  tracking cookies, consent code or a cookie banner.
- **License is CC BY 4.0.** Keep `LICENSE.md` and the attribution in the README intact.
- **Do not push.** Leave remote operations to the maintainer. Do not rewrite history unless
  explicitly asked.

## Commands

Requires Node.js >= 20.9 (CI uses Node 24).

```bash
npm install
npm run dev          # http://localhost:3000
npm run check        # data:check + tests + typecheck — run before every commit
npm run build        # data:build + static export to out/
```

`npm run check` is the gate: it verifies the committed derived data is fresh, runs the
`node:test` suite and `tsc --noEmit`. Run `npm run build` when a change affects routing,
rendering, metadata, styles or generated output.

## Data pipeline

`master_biblioteki_mk.xlsx` → `scripts/build-data.ts` (using `scripts/lib/build.ts`,
`scripts/lib/sheet.ts`, `scripts/lib/translit.ts`) → committed JSON/CSV.

Outputs:

- `src/data/` — `libraries.json`, `coverage.json`, `candidates.json`, `provenance.json`,
  `stats.json`, `methodology.md`, `place-centroids.json`
- `public/data/` — the same downloads plus `search-index.json`, `biblioteki.csv`,
  `municipalities.geojson`

Rules:

- `npm run data:build` rewrites tracked files. Inspect the diff and commit regenerated data in
  its own commit, separate from code changes.
- `npm run data:check` and `tests/data.test.ts` both compare committed data against a fresh run.
  If they fail, regenerate — do not patch the JSON.
- The suite currently pins 152 master records (144 public, 8 excluded), 69 candidates, 81
  municipalities and 42 settlements. Intentional data changes must update the data and the
  tests together.
- Records with `public: false` stay in the data and keep their URL, but are `noindex` and must
  stay out of `sitemap.xml`.
- `src/data/place-centroids.json` and `public/data/municipalities.geojson` come from one-off
  geo scripts (`geocode-places.ts`, `build-geo.ts`). Do not rerun them casually: one needs
  network access and the other needs a source GeoJSON.
- `scripts/fix-terminology.mjs` is a historical migration that rewrites the workbook. Do not
  run it.

## Content and formatting

- Data dates are ISO (`YYYY-MM-DD`); render them with `lib/format.ts` (`formatDate`,
  `formatDateShort`), not ad-hoc `toLocaleDateString`.
- Use `formatNumber`, `plural` and `NOUNS` for counts and Macedonian plural forms.
- Use `telHref`, `directionsHref` and `displayUrl` from `lib/format.ts` for contact details.
- Never link raw website fields. Use `websiteHref()` from `lib/links.ts`: it hides domains in
  `DEAD_HOSTS`. The pipeline also keeps `gbsk.mk` on `http://` (`HTTP_ONLY_HOSTS` in
  `scripts/lib/translit.ts`).
- Contact people may be published by name and role, but private phone numbers must be
  stripped (`stripPhoneNumbers`). Do not add them to the data or UI.
- Keep typography consistent with the existing copy: Macedonian quotation marks („…“), en/em
  dashes and the existing terminology. The pipeline normalises quotes in aliases — fix the
  pipeline, not the generated file.

## Architecture

- Next.js 16 App Router, React 19, TypeScript strict mode. All routes are statically exported.
- `next.config.ts`: `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true`.
  Internal links therefore end with `/`.
- Dynamic routes use `generateStaticParams` and, where the set is closed,
  `export const dynamicParams = false`.
- Client interactivity is opt-in with `'use client'`. Prefer server components for pages and
  metadata.
- **Directory page:** `components/directory.tsx` deliberately does not use `useSearchParams`
  (it would force a Suspense boundary and empty the static HTML). It reads the URL on mount and
  writes filters back with `history.replaceState`. Preserve that pattern.
- **Maps:** Leaflet needs `window`. Load it through `components/lazy-coverage-map.tsx`
  (`next/dynamic` with `ssr: false`); do not import Leaflet in a server component.
- **Bootstrap:** Bootstrap 5 is imported as individual SCSS modules in `app/globals.scss`.
  Theme tokens must sit before `variables`/`maps`. There is no Bootstrap JS and no
  `react-bootstrap`; interactive behaviour lives in `components/ui/` (`Offcanvas`, disclosure,
  focus trap, scroll lock).
- **Icons:** use the `Icon` component, not ad-hoc SVGs or icon fonts.
- **Fonts and images:** Geologica is self-hosted under `public/fonts/`; use plain `<img>`
  because the static export has no image optimiser. The only decorative image is
  `public/hero/shelves.webp`.

## SEO

- Every page declares `title`, `description` and `alternates.canonical`. The title template and
  `metadataBase` live in `app/layout.tsx`.
- Use the helpers in `lib/seo.tsx`: `libraryDescription`, `libraryMetaDescription`,
  `JsonLd`, `libraryJsonLd`, `itemListJsonLd`, `datasetJsonLd`, `SITE_URL`.
- Descriptions must fit the ~155-character snippet limit. `libraryMetaDescription` already
  drops template parts and trims separators before the ellipsis — reuse it instead of writing
  a raw description for a library page.
- Social images: the shared card is the static `app/opengraph-image.png` (1200×630), with
  `app/opengraph-image.alt.txt` next to it. Routes that return their own `openGraph` from
  `generateMetadata` must attach it as `images: [OG_IMAGE]` (`lib/seo.tsx`) — Next replaces a
  parent's `openGraph` instead of merging it, so the file-convention image is not inherited.
  `assets/social/facebook-post-2400x1260.png` is the source artwork; keep the 1200×630 copy
  in sync when it changes.
- Add every new indexable route to `app/sitemap.ts`; keep `noindex` routes out. `app/robots.ts`
  disallows `/data/`.
- `public/_headers` sets the Open Graph image MIME type; `public/_redirects` keeps the legacy
  `/gradovi/*` and `/o-proektu/*` 301s. Preserve both when changing hosts.

## Analytics

`components/analytics.tsx` loads Matomo Tag Manager with `next/script`
(`strategy="afterInteractive"`). Cookieless behaviour is configured in the Matomo container,
not in this repo. Do not add cookie logic here, and keep `/za-proektot` copy non-technical.

## Adding or changing a route

1. Follow the existing route shape under `app/` (page, metadata, and `images: [OG_IMAGE]` in
   `openGraph` when the page returns one). A per-route `opengraph-image.tsx` is only for a page
   that genuinely needs its own preview.
2. Add metadata with a canonical path and a Macedonian description.
3. Add JSON-LD when the page represents an entity or a list.
4. Add the route to `app/sitemap.ts` if it should be indexed.
5. Add it to the header/footer navigation only if it belongs there.
6. Run `npm run check` and `npm run build`; confirm `out/` contains the expected `.html` files.

## Verification

- `npm run check` must pass before committing.
- For data work, confirm `npm run data:build` produces no unexpected diff beyond your intended
  change.
- For route, metadata, style or component work, run `npm run build` and spot-check the relevant
  files in `out/`.
- Leave the working tree clean apart from files you intentionally created or modified. Do not
  commit unrelated untracked files.

## Git conventions

- Subject in English, imperative mood, no body: `Add the data pipeline, schema and tests`.
- One concern per commit. Keep regenerated data in a separate commit from code changes.
- Do not mix unrelated fixes, formatting and generated output in one commit.
- Never push.

## Known traps

- `.github/deploy.yml` is **not** under `.github/workflows/`, so GitHub does not run it as-is.
  Do not describe CI as active unless the file is moved.
- `next/image` is effectively unusable here (`images.unoptimized`) — use `<img>`.
- `useSearchParams` in the directory breaks the static HTML; keep the URL-state pattern.
- `out/`, `.next/`, `node_modules/`, `*.tsbuildinfo` and logs are ignored build artifacts.
- The 8 non-library records still have pages; they need `noindex` and must not appear in the
  sitemap or directory listings.

## License and credits

Code and data are licensed under CC BY 4.0 (`LICENSE.md`). Reuse requires attribution to the
project. The creators are Goce Mitevski and Boris Ristovski; the canonical credit list lives in
`README.md` under „За изработката“.

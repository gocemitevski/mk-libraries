# Библиотеки.мк

A public, machine-readable directory of libraries in North Macedonia: addresses, contacts,
opening hours, COBISS holdings and statistical coverage, compiled from public sources with
per-record provenance.

- **Website:** <https://biblioteki.mk>
- **Data (JSON + CSV):** <https://biblioteki.mk/statistika/>
- **Methodology and sources:** <https://biblioteki.mk/metodologija/>
- **License:** CC BY 4.0 (see [LICENSE.md](LICENSE.md))

## What the project contains

- 152 master records, 144 of them published in the directory; 8 are flagged as "not a
  library" and kept out of the index.
- 81 municipalities and 42 settlements, with a coverage map for the municipalities.
- 69 candidate institutions kept separately until their library status is confirmed.
- Every record carries its sources, verification level and confidence, so each number can be
  traced back to where it came from.
- The interface is Macedonian-only (this README is for people working on the code).

Data is compiled from the Ministry of Culture (МКТ), COBISS, the Central Registry, the State
Statistical Office (ДЗС), Wikipedia, zk.mk, loc.mk, CompanyWall and other public registers,
in a fixed order of precedence.

## Tech stack

- Next.js 16 (App Router, fully static export), React 19, TypeScript
- Bootstrap 5 with SCSS, self-hosted Geologica fonts
- Fuse.js for client-side search, Leaflet/React Leaflet for maps
- Data pipeline in TypeScript (`tsx`) with ExcelJS and Zod
- Tests with the built-in `node:test` runner

## Requirements

Node.js >= 20.9 (CI uses Node 24) and npm.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Regenerate the data, then export the static site to `out/`. |
| `npm run data:build` | Validate the workbook and regenerate `src/data/` and `public/data/`. |
| `npm run data:check` | Fail if the committed derived data is out of date. |
| `npm run data:test` | Run the data tests (`node:test`). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run check` | `data:check` + tests + typecheck — the suite CI runs. |

## Data pipeline

`master_biblioteki_mk.xlsx` at the repository root is the single source of truth and is never
edited by the scripts. Everything else is derived from it:

1. `scripts/build-data.ts` validates every row (Zod), normalises text (Cyrillic
   transliteration for slugs, dashes, quotation marks), computes aggregates and writes the
   JSON/CSV files plus the client search index.
2. Derived files live in `src/data/` (used by the app at build time) and `public/data/`
   (published for download). They are committed so the site builds without touching the
   workbook.
3. Tests in `tests/data.test.ts` assert counts, taxonomy, verification levels, URL schemes,
   coordinates, provenance and that the committed files match a fresh run.

Do not hand-edit `src/data/` or `public/data/` — change the workbook or the pipeline and run
`npm run data:build`.

## Project structure

```
app/            App Router routes (all statically exported)
components/     shared UI (header, footer, cards, directory, maps, analytics)
lib/            data access, SEO/JSON-LD, formatting, opening hours, link helpers
scripts/        workbook → JSON/CSV pipeline
src/data/       generated data, committed
src/lib/        schemas and taxonomy
public/data/    published JSON/CSV exports
tests/          data and pipeline tests
```

## Deployment

`npm run build` produces a fully static site in `out/` (`output: 'export'`, trailing slashes,
unoptimised images). Any static host can serve it.

- `.github/deploy.yml` contains the GitHub Actions build-and-publish workflow for GitHub
  Pages; GitHub only discovers workflows under `.github/workflows/`, so the file has to be
  moved there to run automatically.
- `public/_redirects` keeps 301s for the legacy `/gradovi/*` and `/o-proektu/*` paths, and
  `public/_headers` sets the correct `Content-Type` for the generated Open Graph images.
  These files are used by hosts that support that format (Cloudflare Pages, Netlify).

## Analytics and privacy

Visit statistics are collected with Matomo Tag Manager in cookieless mode: no cookies are
set, nothing is stored on the visitor's device and no personal profiles are kept. The loader
lives in `components/analytics.tsx` and starts after hydration.

## License

The code and the published dataset are licensed under
[Creative Commons Attribution 4.0 International (CC BY 4.0)](LICENSE.md). Reuse is allowed
with attribution to the project.

## Credits

The registry was built by [Goce Mitevski](https://www.gocemitevski.com/) and
[Boris Ristovski](https://www.facebook.com/twibi/).

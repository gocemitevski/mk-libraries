import type { Metadata } from 'next';
import Link from 'next/link';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Icon } from '@/components/icon';
import { JsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Методологија и извори',
  description:
    'Редослед на спојување на изворите, критериуми за верификација и сигурност, пресликување со ДЗС и белешки за квалитетот — како е направена базата.',
  alternates: { canonical: '/metodologija/' },
};

/**
 * Минимален markdown-рендерер за генерираниот methodology.md.
 * Поддржува само она што пайплинот го произведува: наслови, реченици,
 * листи со „-“ и „1)“ и моќен текст во облик `код`.
 */
function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // `код` и **силно** — доволно за генерираниот текст
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('`')) out.push(<code className="bg-light border rounded px-1" key={i}>{token.slice(1, -1)}</code>);
    else out.push(<strong key={i}>{token.slice(2, -2)}</strong>);
    last = m.index + token.length;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

interface Block {
  type: 'heading' | 'para' | 'list';
  depth?: number;
  items?: string[];
  text?: string;
}

function parse(md: string): Block[] {
  const blocks: Block[] = [];
  const all = md.split('\n');
  const firstHeading = all.findIndex((line) => /^##\s/.test(line));
  const secondHeading = all.findIndex((line, i) => i > firstHeading && /^##\s/.test(line));
  // Го отфрламе заглавјето на записникот (H1 + поднасловот) — страницата веќе го
  // има сопствениот наслов и вовед, па поднасловот би останал осиротена реченица.
  // Првата секција („Редослед и приоритет на изворите") е прикажана структурирано
  // како картичка погоре — и таа не се повторува веднаш до неа.
  const lines =
    firstHeading === -1 ? all.slice(1) : all.slice(secondHeading === -1 ? all.length : secondHeading);
  let list: string[] | null = null;

  const flush = () => {
    if (list) {
      blocks.push({ type: 'list', items: list });
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = /^(#{2,6})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', depth: heading[1].length, text: heading[2] });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      list = list ?? [];
      list.push(line.replace(/^[-*]\s+/, ''));
      continue;
    }
    // Нумерираните редови во изворот се „1)“ наместо „1.“
    if (/^\d+\)\s+/.test(line)) {
      list = list ?? [];
      list.push(line.replace(/^\d+\)\s+/, ''));
      continue;
    }
    flush();
    blocks.push({ type: 'para', text: line });
  }
  flush();
  return blocks;
}

const SOURCE_ORDER = [
  'МКТ – одговор од Министерството за култура и туризам',
  'COBISS – профили на библиотеките во COBISS.MK',
  'COBISS-членки – листа на членки и акроними',
  'ASPI',
  'Википедија',
  'Златна книга (zk.mk)',
  'Жолти страници',
  'loc.mk',
  'abv.mk',
  'Веб-проверка (12.10.2026)',
];

export default function MethodologyPage() {
  const md = readFileSync(path.join(process.cwd(), 'src', 'data', 'methodology.md'), 'utf8');
  const blocks = parse(md);

  return (
    <div className="container py-4">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'Методологија и извори',
          inLanguage: 'mk',
          dateModified: '2026-10-12',
          about: 'Собирање и спојување на податоци за библиотеките во Северна Македонија',
        }}
      />
      <Breadcrumbs items={[{ label: 'Методологија' }]} />

      <div className="row g-4 mt-1">
        <div className="col-lg-8">
          <header className="mb-4">
            <h1 className="mb-2">Методологија и извори</h1>
            <p className="text-secondary mb-0">
              Целосниот записник што ја гради оваа страница, во луѓе-читлива форма. Секоја бројка на
              страницата за статистика потекнува од овој процес.
            </p>
          </header>

          {/* Првата секција — редоследот на спојување — ја прикажуваме структурирано */}
          <section className="card mb-4">
            <div className="card-body">
              <h2 className="card-title h5">Редослед на приоритет на изворите</h2>
              <p className="card-text small text-secondary mb-3">
                За поле со една вредност (назив, адреса, телефон, веб) се зема вредноста од првиот
                извор што ја има. Сите останати варијанти остануваат зачувани.
              </p>
              <ol className="mb-0">
                {SOURCE_ORDER.map((s) => (
                  <li key={s} className="mb-1">{s}</li>
                ))}
              </ol>
            </div>
          </section>

          {/* Остатокот од записникот */}
          <article>
            {blocks.map((block, i) => {
              if (block.type === 'heading') {
                const id = (block.text ?? '')
                  .toLowerCase()
                  .replace(/[^\p{L}\p{N}]+/gu, '-')
                  .replace(/^-+|-+$/g, '');
                return (
                  <section key={i} className="detail-section pt-4 pb-3" id={id}>
                    <h2 className="h4">{block.text}</h2>
                  </section>
                );
              }
              if (block.type === 'list') {
                return (
                  <ul className="mb-4" key={i}>
                    {block.items?.map((item, j) => (
                      <li className="mb-2" key={j}>{renderInline(item)}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p className="mb-4" key={i}>{renderInline(block.text ?? '')}</p>
              );
            })}
          </article>
        </div>

        {/* ── Странична колона ─────────────────────────────────────────── */}
        <aside className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <h2 className="card-title h6">Брзи врски</h2>
              <ul className="list-unstyled small mb-0">
                <li className="mb-2"><Link href="/statistika/">Статистика и преземање</Link></li>
                <li className="mb-2"><Link href="/opstini/">Мапа на покриеноста</Link></li>
                <li className="mb-2"><Link href="/za-proektot/">За проектот</Link></li>
                <li className="mb-2">
                  <a href="/data/methodology.md" download>
                    <Icon name="download" className="me-2" />
                    methodology.md (изворно)
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h2 className="card-title h6">Што објавуваме, што не</h2>
              <p className="card-text small mb-2">
                <strong>Објавуваме:</strong> име, улога и функција на контакт-лицата, институциски
                телефони и е-пошти, јавни профили (COBISS, Википедија, Wikidata).
              </p>
              <p className="card-text small mb-0">
                <strong>Не објавуваме:</strong> лични телефонски броеви на директори и вработени —
                се отстрануваат при градењето на базата.
              </p>
            </div>
          </div>

          <div className="alert alert-secondary small mb-0">
            <Icon name="info-circle" size={18} className="me-2" />
            <strong>Дајте забелешка.</strong> Ако наидете на неточен податок, проверете го прво во{' '}
            <Link href="/biblioteki/">адресарот</Link> — записите се означени со степенот на
            сигурност и со целосната листа на извори.
          </div>
        </aside>
      </div>
    </div>
  );
}

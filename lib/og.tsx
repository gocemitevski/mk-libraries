import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

/**
 * Фонтот за сликите — Geist, вклучен со next/og (Vercel, OFL 1.1).
 * Се вчитува еднаш по модул и има покриеност за кирилица.
 */
let fontPromise: Promise<ArrayBuffer> | null = null;

function loadFont(): Promise<ArrayBuffer> {
  fontPromise ??= readFile(path.join(process.cwd(), 'assets', 'og-font.ttf')).then((b) =>
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  );
  return fontPromise;
}

const INK = '#12263f';
const AMBER = '#c9822b';
const PARCHMENT = '#faf7f2';

interface OgOptions {
  title: string;
  subtitle?: string;
  /** Долната лента — нпр. „144 библиотеки · 42 места“ */
  meta?: string;
}

/**
 * Го споделува распоредот на сите Open Graph слики:
 * темна глава, килибарна линија и пергаментна основа — истиот јазик што го
 * користи страницата. Сликите се пререндираат при build (output: 'export').
 */
export async function ogImage({ title, subtitle, meta }: OgOptions): Promise<ImageResponse> {
  const font = await loadFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: PARCHMENT,
          fontFamily: 'Geist',
          color: INK,
        }}
      >
        {/* Глава */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: INK,
            padding: '36px 56px',
            borderBottom: `8px solid ${AMBER}`,
          }}
        >
          <div style={{ display: 'flex', fontSize: 34, color: '#ffffff', fontWeight: 700 }}>
            Библиотеки<span style={{ color: AMBER }}>.мк</span>
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,0.75)' }}>
            Северна Македонија
          </div>
        </div>

        {/* Содржина */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            padding: '48px 56px',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 52 ? 54 : 66,
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: '-1.5px',
              maxWidth: 1040,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                display: 'flex',
                fontSize: 30,
                color: '#4a5b70',
                marginTop: 24,
                lineHeight: 1.35,
                maxWidth: 1000,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        {/* Долната лента */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '28px 56px',
            borderTop: '2px solid rgba(18,38,63,0.12)',
            fontSize: 26,
            color: '#4a5b70',
          }}
        >
          <div style={{ display: 'flex' }}>{meta ?? 'biblioteki.mk'}</div>
          <div style={{ display: 'flex', color: AMBER, fontWeight: 700 }}>biblioteki.mk</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Geist', data: font, style: 'normal', weight: 400 }],
    },
  );
}

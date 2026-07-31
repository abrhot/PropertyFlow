import { ImageResponse } from 'next/og';

/** Deep evergreen brand color (matches `--primary`). */
const BRAND = '#2b5f48';

// lucide `Building2`, drawn in white on the brand tile.
const BUILDING_PATHS = [
  'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z',
  'M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2',
  'M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2',
  'M10 6h4',
  'M10 10h4',
  'M10 14h4',
  'M10 18h4',
];

function buildingDataUri(px: number): string {
  const paths = BUILDING_PATHS.map((d) => `<path d="${d}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * Renders the app icon at a given size as a PNG. `maskable` fills the whole
 * tile (no rounded corners) and keeps the glyph inside the safe zone, as
 * required for Android/Play Store adaptive icons.
 */
export function renderAppIcon({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const pad = maskable ? Math.round(size * 0.14) : 0;
  const inner = size - pad * 2;
  const glyph = Math.round(inner * 0.6);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND,
          borderRadius: maskable ? 0 : Math.round(size * 0.22),
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={glyph} height={glyph} src={buildingDataUri(glyph)} alt="" />
      </div>
    ),
    { width: size, height: size },
  );
}

/**
 * Generates original placeholder artwork as SVG (covers and chapter pages) so the sample catalogue
 * ships without third-party images. Every output is created by this codebase.
 */
export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    const last = kept[maxLines - 1];
    kept[maxLines - 1] = `${last.slice(0, maxChars - 1)}…`;
    return kept;
  }
  return lines;
}

function coverSvg(title: string, hue: number): string {
  const lines = wrapText(title, 16, 4);
  const hue2 = (hue + 45) % 360;
  const titleLines = lines
    .map(
      (line, index) =>
        `<text x="300" y="${480 + index * 78}" text-anchor="middle" font-size="64" font-weight="800" fill="#ffffff" font-family="Arial, Helvetica, sans-serif">${escapeXml(line)}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 70% 24%)"/>
      <stop offset="1" stop-color="hsl(${hue2} 60% 7%)"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.7" cy="0.25" r="0.6">
      <stop offset="0" stop-color="hsl(${hue} 90% 62%)" stop-opacity="0.9"/>
      <stop offset="1" stop-color="hsl(${hue} 90% 62%)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="600" height="900" fill="url(#bg)"/>
  <circle cx="430" cy="240" r="250" fill="url(#glow)"/>
  <circle cx="170" cy="210" r="110" fill="none" stroke="hsl(${hue2} 90% 75%)" stroke-opacity="0.4" stroke-width="3"/>
  <circle cx="170" cy="210" r="70" fill="none" stroke="hsl(${hue} 90% 80%)" stroke-opacity="0.3" stroke-width="2"/>
  <path d="M0 640 Q150 560 300 630 T600 620 V900 H0Z" fill="hsl(${hue} 60% 5%)" opacity="0.85"/>
  <path d="M-20 760 L620 700" stroke="hsl(${hue2} 90% 70%)" stroke-opacity="0.25" stroke-width="6"/>
  ${titleLines}
  <text x="300" y="862" text-anchor="middle" font-size="20" letter-spacing="6" fill="hsl(${hue} 80% 88%)" font-family="Arial, Helvetica, sans-serif">INKVERSE · PLACEHOLDER COVER</text>
</svg>`;
}

function pageSvg(title: string, label: string, hue: number): string {
  const safeTitle = escapeXml(wrapText(title, 46, 1)[0] ?? "InkVerse");
  const safeLabel = escapeXml(label);
  const panel = (x: number, y: number, w: number, h: number, shift: number) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="hsl(${hue} 30% 18%)" stroke="hsl(${hue} 60% 70%)" stroke-opacity="0.5" stroke-width="4"/>
    <circle cx="${x + w * 0.7 + shift}" cy="${y + h * 0.4}" r="${Math.min(w, h) * 0.22}" fill="hsl(${(hue + shift) % 360} 80% 60%)" fill-opacity="0.35"/>
    <path d="M${x + 20} ${y + h - 30} Q${x + w / 2} ${y + h - 110} ${x + w - 20} ${y + h - 30}" fill="none" stroke="hsl(${hue} 80% 80%)" stroke-opacity="0.35" stroke-width="5"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" width="800" height="1200">
  <rect width="800" height="1200" fill="hsl(${hue} 25% 9%)"/>
  <text x="400" y="72" text-anchor="middle" font-size="26" font-weight="700" fill="hsl(${hue} 80% 85%)" font-family="Arial, Helvetica, sans-serif">${safeTitle}</text>
  <text x="400" y="104" text-anchor="middle" font-size="20" fill="#c9c9d6" font-family="Arial, Helvetica, sans-serif">${safeLabel}</text>
  ${panel(40, 130, 720, 360, 10)}
  ${panel(40, 510, 340, 320, 30)}
  ${panel(420, 510, 340, 320, 50)}
  ${panel(40, 850, 720, 310, 70)}
  <rect x="120" y="190" width="320" height="90" rx="40" fill="#ffffff" fill-opacity="0.92"/>
  <text x="280" y="246" text-anchor="middle" font-size="26" fill="#14121c" font-family="Arial, Helvetica, sans-serif">Placeholder art</text>
  <rect x="470" y="600" width="230" height="70" rx="32" fill="#ffffff" fill-opacity="0.92"/>
  <text x="585" y="643" text-anchor="middle" font-size="22" fill="#14121c" font-family="Arial, Helvetica, sans-serif">Sample panel</text>
</svg>`;
}

function clampHue(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? ((Math.round(parsed) % 360) + 360) % 360 : 260;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") ?? "InkVerse").slice(0, 80);
  const label = (searchParams.get("label") ?? "").slice(0, 60);
  const hue = clampHue(searchParams.get("hue"));
  const svg = searchParams.get("kind") === "page" ? pageSvg(title, label, hue) : coverSvg(title, hue);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}

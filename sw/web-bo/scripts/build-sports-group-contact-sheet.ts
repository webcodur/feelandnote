import path from "node:path";

import sharp from "sharp";

const candidateDir = path.resolve(
  process.cwd(),
  "../remotion/public/factions/_staging/group-candidates",
);

const candidates = [
  ["world-best-2026-goalkeeper.png", "01 FOOTBALL / GK", "STRONG"],
  ["world-best-2026-defenders.png", "02 FOOTBALL / DEF", "STRONG"],
  ["world-best-2026-midfielders.png", "03 FOOTBALL / MID", "STRONG"],
  ["world-best-2026-forwards.png", "04 FOOTBALL / FWD", "POSTER / REVIEW"],
  ["nba-21c-club-best-lakers.png", "05 NBA / LAKERS", "POSTER / REVIEW"],
  ["nba-21c-club-best-spurs.png", "06 NBA / SPURS", "POSTER / REVIEW"],
  ["nba-21c-club-best-warriors.png", "07 NBA / WARRIORS", "REWORK"],
] as const;

const tileSize = 310;
const labelHeight = 52;
const gap = 12;
const columns = 4;
const rows = 2;
const width = columns * tileSize + (columns + 1) * gap;
const height = rows * (tileSize + labelHeight) + (rows + 1) * gap;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function main() {
  const overlays: sharp.OverlayOptions[] = [];

  for (const [index, [file, label, status]] of candidates.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = gap + column * (tileSize + gap);
    const top = gap + row * (tileSize + labelHeight + gap);
    const thumbnail = await sharp(path.join(candidateDir, file))
      .resize(tileSize, tileSize, { fit: "cover" })
      .jpeg({ quality: 90 })
      .toBuffer();
    const statusColor = status === "STRONG" ? "#7ee787" : status === "REWORK" ? "#ff7b72" : "#f2cc60";
    const labelSvg = Buffer.from(`
      <svg width="${tileSize}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#111827"/>
        <text x="12" y="21" fill="#f9fafb" font-family="Arial, sans-serif" font-size="15" font-weight="700">${escapeXml(label)}</text>
        <text x="12" y="42" fill="${statusColor}" font-family="Arial, sans-serif" font-size="12" font-weight="700">${escapeXml(status)}</text>
      </svg>
    `);

    overlays.push({ input: thumbnail, left, top });
    overlays.push({ input: labelSvg, left, top: top + tileSize });
  }

  const output = path.join(candidateDir, "sports-group-candidates-contact.jpg");
  await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#030712",
    },
  })
    .composite(overlays)
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toFile(output);

  console.log(output);
}

void main();

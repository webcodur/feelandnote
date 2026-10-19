// Only hashed artwork from our asset host may use the resizing endpoint.
const MYTH_FILE = /^[a-z0-9][a-z0-9-]*-[a-f0-9]{12}\.png$/;
const FACTION_COVER = /^faction-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})-([a-f0-9]{12,64})\.webp$/;

export function titleArtworkKey(file: string): string | null {
  if (MYTH_FILE.test(file)) return `myth/title-art/${file}`;
  const cover = FACTION_COVER.exec(file);
  return cover ? `faction/${cover[1]}/cover/${cover[2]}.webp` : null;
}

export function titleArtworkFile(src: string): string | null {
  if (!URL.canParse(src)) return null;
  const url = new URL(src);
  if (url.origin !== "https://assets.feelandnote.com") return null;
  const myth = /^\/myth\/title-art\/([^/]+)$/.exec(url.pathname)?.[1];
  if (myth && MYTH_FILE.test(myth)) return myth;
  const cover = /^\/faction\/([^/]+)\/cover\/([^/]+)\.webp$/.exec(url.pathname);
  if (!cover) return null;
  const file = `faction-${cover[1]}-${cover[2]}.webp`;
  return titleArtworkKey(file) ? file : null;
}

/** Verified, immutable R2 assets. Update keys when image bytes change. */
const CONTENT_BANNER_ASSETS = {
  "acoustic": {
    "mb": "content/banners/acoustic-mb-3e48c3664210e6b3.webp",
    "pc": "content/banners/acoustic-pc-47450b7711b799c7.webp"
  },
  "ancient-archive": {
    "mb": "content/banners/ancient-archive-mb-a28115548ee8ddab.webp",
    "pc": "content/banners/ancient-archive-pc-d88760ab44ebbbd2.webp"
  },
  "animation": {
    "mb": "content/banners/animation-mb-b2530534ac1cb076.webp",
    "pc": "content/banners/animation-pc-8b7e8b7814da046f.webp"
  },
  "chinese-classics": {
    "mb": "content/banners/chinese-classics-mb-b2700aaea8a6bf54.webp",
    "pc": "content/banners/chinese-classics-pc-e2a30c297baccdab.webp"
  },
  "cinema": {
    "mb": "content/banners/cinema-mb-352b6b86dbb41784.webp",
    "pc": "content/banners/cinema-pc-9724fa0a784c1799.webp"
  },
  "classical": {
    "mb": "content/banners/classical-mb-d24be841a9aa7297.webp",
    "pc": "content/banners/classical-pc-c3f1a01d65b08956.webp"
  },
  "contemporary": {
    "mb": "content/banners/contemporary-mb-3977e759f0586ce8.webp",
    "pc": "content/banners/contemporary-pc-f4115e9efeccc2ad.webp"
  },
  "documentary": {
    "mb": "content/banners/documentary-mb-edf48f42df1ed3a6.webp",
    "pc": "content/banners/documentary-pc-8de9404ca9ad75b2.webp"
  },
  "early-modern": {
    "mb": "content/banners/early-modern-mb-b7a140f3d351dcd7.webp",
    "pc": "content/banners/early-modern-pc-7101281963fe6ff9.webp"
  },
  "electronic": {
    "mb": "content/banners/electronic-mb-50f4111712eefc0e.webp",
    "pc": "content/banners/electronic-pc-d8518314749e4ae7.webp"
  },
  "fantasy": {
    "mb": "content/banners/fantasy-mb-c484f59442c00f25.webp",
    "pc": "content/banners/fantasy-pc-2df659a551b82961.webp"
  },
  "game": {
    "mb": "content/banners/game-mb-64988b0be1e89c7f.webp",
    "pc": "content/banners/game-pc-d4e5138334e441ed.webp"
  },
  "historical": {
    "mb": "content/banners/historical-mb-f64511ec34fa4cdd.webp",
    "pc": "content/banners/historical-pc-ac81b17e9cc99786.webp"
  },
  "horror": {
    "mb": "content/banners/horror-mb-194dee97c19798c0.webp",
    "pc": "content/banners/horror-pc-c8bdeb058b74e7b7.webp"
  },
  "jazz": {
    "mb": "content/banners/jazz-mb-cab8a578a660c380.webp",
    "pc": "content/banners/jazz-pc-01d90786dfe7ffbc.webp"
  },
  "library": {
    "mb": "content/banners/library-mb-a8cf9d57db078fb2.webp",
    "pc": "content/banners/library-pc-f3b8505a25f83004.webp"
  },
  "live": {
    "mb": "content/banners/live-mb-fb9cd785f65f2193.webp",
    "pc": "content/banners/live-pc-6a46ecc6cc7de560.webp"
  },
  "music": {
    "mb": "content/banners/music-mb-a70d02912b56020c.webp",
    "pc": "content/banners/music-pc-524383a6522a5ad8.webp"
  },
  "racing": {
    "mb": "content/banners/racing-mb-21103aff1482f106.webp",
    "pc": "content/banners/racing-pc-62e32e48b248dadd.webp"
  },
  "romance": {
    "mb": "content/banners/romance-mb-81e1c12f5bfbf02a.webp",
    "pc": "content/banners/romance-pc-492b20f62bad38dd.webp"
  },
  "science-fiction": {
    "mb": "content/banners/science-fiction-mb-c5ec6c76972274d7.webp",
    "pc": "content/banners/science-fiction-pc-8ffe36650730316e.webp"
  },
  "sports": {
    "mb": "content/banners/sports-mb-d35ba9df6882ccf8.webp",
    "pc": "content/banners/sports-pc-c4c59ab565e5a92c.webp"
  },
  "strategy": {
    "mb": "content/banners/strategy-mb-b7eefd07b03f4a71.webp",
    "pc": "content/banners/strategy-pc-03ec9764957d68b3.webp"
  },
  "suspense": {
    "mb": "content/banners/suspense-mb-49bcb8488ef0b911.webp",
    "pc": "content/banners/suspense-pc-8d6ed1a7e1788d6f.webp"
  },
  "western-classics": {
    "mb": "content/banners/western-classics-mb-c9f14b972f4a2e9b.webp",
    "pc": "content/banners/western-classics-pc-8ffadb06cadf1180.webp"
  }
} as const;

export type ContentBannerAssetTheme = keyof typeof CONTENT_BANNER_ASSETS;

export function getHostedContentBannerImages(theme: ContentBannerAssetTheme) {
  const assets = CONTENT_BANNER_ASSETS[theme];
  return { pc: `https://assets.feelandnote.com/${assets.pc}`, mb: `https://assets.feelandnote.com/${assets.mb}` };
}

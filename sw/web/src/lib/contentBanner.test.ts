import assert from "node:assert/strict";
import test from "node:test";
import { getContentBannerArtwork, getContentBannerImages, resolveMediaBannerTheme } from "./contentBanner";

test("books retain their historical theme while other media use their own images", () => {
  assert.equal(getContentBannerImages("BOOK", "chinese-classics").theme, "chinese-classics");
  for (const [type, theme] of [["VIDEO", "cinema"], ["GAME", "game"], ["MUSIC", "music"]] as const) {
    const images = getContentBannerImages(type, "chinese-classics");
    assert.equal(images.theme, theme);
    assert.match(images.pc, new RegExp(`^https://assets\\.feelandnote\\.com/content/banners/${theme}-pc-[a-f0-9]{16}\\.webp$`));
    assert.match(images.mb, new RegExp(`^https://assets\\.feelandnote\\.com/content/banners/${theme}-mb-[a-f0-9]{16}\\.webp$`));
  }
});

test("only film backdrops and game screenshots become banner artwork", () => {
  const metadata = { backdropUrl: " https://example.com/backdrop.jpg ", screenshots: ["", " https://example.com/game.jpg "] };
  assert.equal(getContentBannerArtwork("VIDEO", metadata), "https://example.com/backdrop.jpg");
  assert.equal(getContentBannerArtwork("GAME", metadata), "https://example.com/game.jpg");
  assert.equal(getContentBannerArtwork("BOOK", metadata), null);
  assert.equal(getContentBannerArtwork("MUSIC", metadata), null);
});

test("missing or blank media artwork falls back to a type-specific banner", () => {
  for (const type of ["VIDEO", "GAME", "MUSIC"] as const) assert.equal(getContentBannerArtwork(type), null);
  assert.equal(getContentBannerArtwork("VIDEO", { backdropUrl: " " }), null);
  assert.equal(getContentBannerArtwork("GAME", { screenshots: ["", " "] }), null);
});

test("localized genres select the same theme and specific genres outrank drama", () => {
  for (const [genres, expected] of [
    [["드라마", "SF"], "science-fiction"], [["Drama", "Science Fiction"], "science-fiction"],
    [["공포", "미스터리"], "horror"], [["Horror", "Mystery"], "horror"],
    [["SF & 판타지"], "science-fiction"], [["Sci-Fi & Fantasy"], "science-fiction"],
    [["Animation", "Fantasy"], "animation"], [["역사", "드라마"], "historical"],
  ] as const) assert.equal(resolveMediaBannerTheme("VIDEO", { genres: [...genres] }), expected);
});

test("game genres use game-appropriate scenes before the generic adventure label", () => {
  for (const [genres, expected] of [
    [["Adventure", "Racing"], "racing"], [["Adventure", "Role-playing (RPG)", "Strategy"], "strategy"],
    [["Shooter"], "suspense"], [["Puzzle", "Indie"], "animation"], [["Sport"], "sports"],
  ] as const) assert.equal(resolveMediaBannerTheme("GAME", { genres: [...genres] }), expected);
});

test("music accepts the iTunes single-genre field and more specific subgenres", () => {
  for (const [genre, expected] of [
    ["Classical", "classical"], ["클래식", "classical"], ["Vocal Jazz", "jazz"],
    ["K-Pop", "live"], ["Folk-Rock", "acoustic"], ["Hip-Hop/Rap", "electronic"],
    ["R&B/소울", "live"], ["어린이 음악", "music"],
  ] as const) assert.equal(resolveMediaBannerTheme("MUSIC", { genre }), expected);
});

test("unknown genres keep the media fallback and cannot affect book classification", () => {
  assert.equal(resolveMediaBannerTheme("VIDEO", { genres: ["Unmapped"] }), "cinema");
  assert.equal(resolveMediaBannerTheme("GAME"), "game");
  assert.equal(resolveMediaBannerTheme("BOOK", { genre: "Fantasy" }), undefined);
  assert.equal(getContentBannerImages("BOOK", "ancient-archive", "fantasy").theme, "ancient-archive");
});

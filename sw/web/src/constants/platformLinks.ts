import type { ContentType } from "@/types/database";

export interface PlatformLink {
  key: string;
  name: string;
  buildUrl: (params: { id: string; externalId: string; title: string }) => string;
}

/** 콘텐츠 타입별 외부 플랫폼 링크 정의 */
export const PLATFORM_LINKS: Record<ContentType, PlatformLink[]> = {
  BOOK: [
    {
      key: "aladin",
      name: "알라딘",
      buildUrl: ({ externalId }) =>
        `https://www.aladin.co.kr/search/wsearchresult.aspx?SearchWord=${externalId}`,
    },
    {
      key: "yes24",
      name: "YES24",
      buildUrl: ({ externalId }) =>
        `https://www.yes24.com/Product/Search?domain=BOOK&query=${externalId}`,
    },
    {
      key: "kyobobook",
      name: "교보문고",
      buildUrl: ({ externalId }) =>
        `https://search.kyobobook.co.kr/search?keyword=${externalId}`,
    },
    {
      key: "millie",
      name: "밀리의 서재",
      buildUrl: ({ title }) =>
        `https://www.millie.co.kr/v3/search?q=${encodeURIComponent(title)}`,
    },
  ],
  VIDEO: [
    {
      key: "tmdb",
      name: "TMDB",
      buildUrl: ({ externalId }) => {
        const movieMatch = externalId.match(/^tmdb-movie-(\d+)$/);
        const tvMatch = externalId.match(/^tmdb-tv-(\d+)$/);
        if (movieMatch) return `https://www.themoviedb.org/movie/${movieMatch[1]}`;
        if (tvMatch) return `https://www.themoviedb.org/tv/${tvMatch[1]}`;
        return "";
      },
    },
    {
      key: "watcha",
      name: "왓챠피디아",
      buildUrl: ({ title }) =>
        `https://pedia.watcha.com/ko-KR/search?query=${encodeURIComponent(title)}`,
    },
  ],
  GAME: [
    {
      key: "steam",
      name: "Steam",
      buildUrl: ({ title }) =>
        `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`,
    },
    {
      key: "metacritic",
      name: "Metacritic",
      buildUrl: ({ title }) =>
        `https://www.metacritic.com/search/${encodeURIComponent(title)}`,
    },
  ],
  MUSIC: [
    {
      key: "spotify",
      name: "Spotify",
      buildUrl: ({ externalId }) => {
        const spotifyId = externalId.replace(/^spotify-/, "");
        return `https://open.spotify.com/album/${spotifyId}`;
      },
    },
    {
      key: "apple-music",
      name: "Apple Music",
      buildUrl: ({ title }) =>
        `https://music.apple.com/search?term=${encodeURIComponent(title)}`,
    },
    {
      key: "youtube-music",
      name: "YouTube Music",
      buildUrl: ({ title }) =>
        `https://music.youtube.com/search?q=${encodeURIComponent(title)}`,
    },
  ],
};

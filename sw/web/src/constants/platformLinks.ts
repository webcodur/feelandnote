import type { ContentType } from "@/types/database";

export interface PlatformLink {
  key: string;
  name: string;
  buildUrl: (params: { id: string; title: string }) => string;
}

/** 콘텐츠 타입별 외부 플랫폼 링크 정의 */
export const PLATFORM_LINKS: Record<ContentType, PlatformLink[]> = {
  BOOK: [
    {
      key: "aladin",
      name: "알라딘",
      buildUrl: ({ id }) =>
        `https://www.aladin.co.kr/search/wsearchresult.aspx?SearchWord=${id}`,
    },
    {
      key: "yes24",
      name: "YES24",
      buildUrl: ({ id }) =>
        `https://www.yes24.com/Product/Search?domain=BOOK&query=${id}`,
    },
    {
      key: "kyobobook",
      name: "교보문고",
      buildUrl: ({ id }) =>
        `https://search.kyobobook.co.kr/search?keyword=${id}`,
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
      buildUrl: ({ id }) => {
        const movieMatch = id.match(/^tmdb-movie-(\d+)$/);
        const tvMatch = id.match(/^tmdb-tv-(\d+)$/);
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
      buildUrl: ({ id }) => {
        const spotifyId = id.replace(/^spotify-/, "");
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
  CERTIFICATE: [],
};

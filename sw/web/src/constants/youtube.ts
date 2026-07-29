/*
  파일명: /constants/youtube.ts
  기능: 필앤노트 유튜브 채널 정보 단일원천
  책임: 채널 URL·핸들을 locale별로 제공한다.
*/

export const YOUTUBE_CHANNELS = {
  ko: {
    handle: "@필앤노트",
    url: "https://www.youtube.com/channel/UCHl1w4u4br-Wt3WjiPBXn2Q",
  },
  en: {
    handle: "@feelandnote-en",
    url: "https://www.youtube.com/channel/UC9gpAfGsqcPG_XD7fSKDM7g",
  },
} as const;

export const YOUTUBE_SERIES_PLAYLISTS = {
  ko: {
    libraryTour: {
      full: "https://www.youtube.com/playlist?list=PLKKb_QO8G7GNLiUSYnuRxRQAnp_ybF9qW",
      shorts: "https://www.youtube.com/playlist?list=PLKKb_QO8G7GM_ZAjy47nVVDYlR_Zv0XwU",
      locale: "ko",
    },
    faction: {
      full: "https://www.youtube.com/playlist?list=PLKKb_QO8G7GPKaTD9ty0d4L11E1XGEqDm",
      shorts: "https://www.youtube.com/playlist?list=PLEHuJH4JFWmI",
      locale: "ko",
    },
  },
  en: {
    libraryTour: {
      full: "https://www.youtube.com/playlist?list=PLvGVJZRhWpNq36MM3Ze4QKfX4zWbF8_VU",
      shorts: "https://www.youtube.com/playlist?list=PLvGVJZRhWpNpTs4_sJfxqn26iko8m5Q4j",
      locale: "en",
    },
    // 영문 채널에는 아직 세력도감 재생목록이 없어 실제 영상이 있는 한국어 목록으로 연결한다.
    faction: {
      full: "https://www.youtube.com/playlist?list=PLKKb_QO8G7GPKaTD9ty0d4L11E1XGEqDm",
      shorts: "https://www.youtube.com/playlist?list=PLEHuJH4JFWmI",
      locale: "ko",
    },
  },
} as const;

export function getYoutubeChannel(locale: string) {
  return locale === "en" ? YOUTUBE_CHANNELS.en : YOUTUBE_CHANNELS.ko;
}

export function getYoutubeSeriesPlaylists(locale: string) {
  return locale === "en"
    ? YOUTUBE_SERIES_PLAYLISTS.en
    : YOUTUBE_SERIES_PLAYLISTS.ko;
}

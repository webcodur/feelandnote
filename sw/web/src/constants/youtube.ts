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

export function getYoutubeChannel(locale: string) {
  return locale === "en" ? YOUTUBE_CHANNELS.en : YOUTUBE_CHANNELS.ko;
}

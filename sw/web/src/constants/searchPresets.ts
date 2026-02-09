// 컨텐츠 타입별 검색 프리셋 (단순화)

export interface SearchPreset {
  label: string;
  query: (title: string) => string;
}

// 제목 정제: 괄호 안 내용 제거 (출판사, 시리즈 정보 등)
const cleanTitle = (title: string): string => {
  return title.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
};

export const SEARCH_PRESETS: Record<string, SearchPreset[]> = {
  BOOK: [
    {
      label: "줄거리",
      query: (title) => `${cleanTitle(title)} 줄거리`,
    },
    {
      label: "서평",
      query: (title) => `${cleanTitle(title)} 서평`,
    },
    {
      label: "등장인물",
      query: (title) => `${cleanTitle(title)} 등장인물`,
    },
    {
      label: "명언",
      query: (title) => `${cleanTitle(title)} 명언`,
    },
    {
      label: "주제",
      query: (title) => `${cleanTitle(title)} 주제`,
    },
    {
      label: "해석",
      query: (title) => `${cleanTitle(title)} 해석`,
    },
  ],
  
  VIDEO: [
    {
      label: "줄거리",
      query: (title) => `${cleanTitle(title)} 줄거리`,
    },
    {
      label: "등장인물",
      query: (title) => `${cleanTitle(title)} 등장인물`,
    },
    {
      label: "명장면",
      query: (title) => `${cleanTitle(title)} 명장면`,
    },
    {
      label: "리뷰",
      query: (title) => `${cleanTitle(title)} 리뷰`,
    },
    {
      label: "해석",
      query: (title) => `${cleanTitle(title)} 해석`,
    },
    {
      label: "OST",
      query: (title) => `${cleanTitle(title)} OST`,
    },
  ],

  GAME: [
    {
      label: "스토리",
      query: (title) => `${cleanTitle(title)} 스토리`,
    },
    {
      label: "캐릭터",
      query: (title) => `${cleanTitle(title)} 캐릭터`,
    },
    {
      label: "공략",
      query: (title) => `${cleanTitle(title)} 공략`,
    },
    {
      label: "리뷰",
      query: (title) => `${cleanTitle(title)} 리뷰`,
    },
    {
      label: "세계관",
      query: (title) => `${cleanTitle(title)} 세계관`,
    },
    {
      label: "음악",
      query: (title) => `${cleanTitle(title)} OST`,
    },
  ],

  MUSIC: [
    {
      label: "가사",
      query: (title) => `${cleanTitle(title)} 가사`,
    },
    {
      label: "뮤비",
      query: (title) => `${cleanTitle(title)} 뮤직비디오`,
    },
    {
      label: "해석",
      query: (title) => `${cleanTitle(title)} 해석`,
    },
    {
      label: "앨범",
      query: (title) => `${cleanTitle(title)} 앨범 정보`,
    },
    {
      label: "차트",
      query: (title) => `${cleanTitle(title)} 차트`,
    },
    {
      label: "리뷰",
      query: (title) => `${cleanTitle(title)} 리뷰`,
    },
  ],

  CERTIFICATE: [
    {
      label: "시험 정보",
      query: (title) => `${cleanTitle(title)} 시험`,
    },
    {
      label: "공부법",
      query: (title) => `${cleanTitle(title)} 공부법`,
    },
    {
      label: "교재",
      query: (title) => `${cleanTitle(title)} 교재`,
    },
    {
      label: "후기",
      query: (title) => `${cleanTitle(title)} 합격 후기`,
    },
    {
      label: "난이도",
      query: (title) => `${cleanTitle(title)} 난이도`,
    },
    {
      label: "기출",
      query: (title) => `${cleanTitle(title)} 기출`,
    },
  ],
};

// 구글 검색 URL 생성
export function generateGoogleSearchUrl(query: string): string {
  const encodedQuery = encodeURIComponent(query);
  return `https://www.google.com/search?q=${encodedQuery}`;
}

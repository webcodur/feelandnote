import { ContentType } from "@/types/database";

export type SearchCategory = 'NEWS' | 'IMAGE';

export interface SearchPreset {
  label: string;
  queryTemplate: (title: string, creator?: string) => string;
  engine: 'google' | 'naver' | 'youtube';
  category: SearchCategory;
}

// 저자 | 출판사 등에서 출판사 정보 제거 및 검색어 최적화
const cleanCreator = (c?: string) => {
  if (!c) return "";
  // 첫 번째 저자명만 추출 (쉼표, 대시, 파이프 기준)
  return c.split(/[|,]/)[0].split('-')[0].trim();
};

// 검색어 길이 제한 및 단순화 유틸리티
const simplifyTitle = (t: string) => {
  // 괄호 내용 제거 및 15자 내외로 자르기 (검색 성공률 향상)
  const cleaned = t.replace(/\([^)]+\)/g, '').trim();
  return cleaned.length > 20 ? cleaned.slice(0, 20) : cleaned;
};

export const SEARCH_PRESETS: Partial<Record<ContentType, SearchPreset[]>> = {
  BOOK: [
    {
      label: "핵심 요약",
      queryTemplate: (t, c) => `${simplifyTitle(t)} 요약`,
      engine: 'naver',
      category: 'NEWS'
    },
    {
      label: "줄거리",
      queryTemplate: (t) => `${simplifyTitle(t)} 줄거리`,
      engine: 'naver',
      category: 'NEWS'
    },
    {
      label: "인물관계도",
      queryTemplate: (t) => `${simplifyTitle(t)} 인물관계도`,
      engine: 'naver',
      category: 'IMAGE'
    },
    {
      label: "작가 인터뷰",
      queryTemplate: (t, c) => `${cleanCreator(c) || simplifyTitle(t)} 인터뷰`,
      engine: 'naver',
      category: 'NEWS'
    },
    {
      label: "서평/비평",
      queryTemplate: (t) => `${simplifyTitle(t)} 서평`,
      engine: 'naver',
      category: 'NEWS'
    }
  ],
  VIDEO: [
    {
        label: "결말/해석",
        queryTemplate: (t) => `${simplifyTitle(t)} 해석`,
        engine: 'youtube',
        category: 'IMAGE'
    },
    {
        label: "명대사",
        queryTemplate: (t) => `${simplifyTitle(t)} 명대사`,
        engine: 'naver',
        category: 'NEWS'
    },
    {
        label: "박스오피스/정보",
        queryTemplate: (t) => `${simplifyTitle(t)} 정보`,
        engine: 'naver',
        category: 'NEWS'
    }
  ],
  GAME: [
    {
        label: "스토리 요약",
        queryTemplate: (t) => `${simplifyTitle(t)} 스토리`,
        engine: 'naver',
        category: 'NEWS'
    },
    {
        label: "공략/팁",
        queryTemplate: (t) => `${simplifyTitle(t)} 공략`,
        engine: 'naver',
        category: 'NEWS'
    },
    {
        label: "공식 이미지",
        queryTemplate: (t) => `${simplifyTitle(t)} wallpaper`,
        engine: 'youtube',
        category: 'IMAGE'
    }
  ],
  MUSIC: [
    {
        label: "가사",
        queryTemplate: (t, c) => `${simplifyTitle(t)} 가사`,
        engine: 'naver',
        category: 'NEWS'
    },
    {
        label: "라이브",
        queryTemplate: (t, c) => `${cleanCreator(c)} ${simplifyTitle(t)} 라이브`,
        engine: 'youtube',
        category: 'IMAGE'
    },
    {
        label: "곡 정보",
        queryTemplate: (t, c) => `${simplifyTitle(t)} 정보`,
        engine: 'naver',
        category: 'NEWS'
    }
  ],
  CERTIFICATE: [
    {
        label: "합격수기",
        queryTemplate: (t) => `${simplifyTitle(t)} 합격수기`,
        engine: 'naver',
        category: 'NEWS'
    },
    {
        label: "시험일정",
        queryTemplate: (t) => `${simplifyTitle(t)} 일정`,
        engine: 'naver',
        category: 'NEWS'
    }
  ]
};

export const getSearchUrl = (engine: 'google' | 'naver' | 'youtube', query: string) => {
  const encodedQuery = encodeURIComponent(query);
  switch (engine) {
    case 'google':
      return `https://www.google.com/search?q=${encodedQuery}`;
    case 'naver':
      return `https://search.naver.com/search.naver?query=${encodedQuery}`;
    case 'youtube':
      return `https://www.youtube.com/results?search_query=${encodedQuery}`;
    default:
      return `https://www.google.com/search?q=${encodedQuery}`;
  }
};

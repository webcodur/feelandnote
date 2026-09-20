import { CELEB_PROFESSIONS } from '@/constants/celebCategories'
import { CELEB_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { CELEB_CONTENT_COUNT } from '@feelandnote/shared/constants/celeb-content-research'
import { CELEB_REALITY_DISPLAY } from '@/constants/celebReality'

type FilterOption = { value: string; label: string }
export type Column = {
  field: string
  /** 화면에 보이는 이름. field는 정렬 키라 코드 이름이고, 사람에게는 이 이름만 보인다. */
  label: string
  width?: string
  filter?:
    | { type: 'select'; param: string; options: readonly FilterOption[] }
    | { type: 'nationality' }
    | { type: 'range'; from: string; to: string; minimum?: number; date?: boolean }
}

/** 헤더와 본문 셀에 같은 세로선을 긋는다. 마지막 칸은 표 테두리가 있어 긋지 않는다. */
export const CELL_BORDER_CLASS = 'border-r border-border last:border-r-0'

const PRESENCE_OPTIONS =[{ value: 'present', label: '있음' }, { value: 'missing', label: '없음' }]

/** 표의 열 순서·이름·필터를 한곳에서 쥔다. 헤더·본문 셀·열 선택·적용 대기 칩이 모두 이 순서를 따른다. */
export const COLUMNS: Column[] = [
  { field: 'avatar_url', label: '아바타', filter: { type: 'select', param: 'avatar', options: PRESENCE_OPTIONS } },
  { field: 'portrait_url', label: '대표', filter: { type: 'select', param: 'portrait', options: PRESENCE_OPTIONS } },
  { field: 'awakened_image_url', label: '각성', filter: { type: 'select', param: 'awakened', options: PRESENCE_OPTIONS } },
  { field: 'title', label: '수식어', width: 'min-w-36' },
  { field: 'nickname', label: '이름', width: 'min-w-36' },
  { field: 'celeb_reality', label: '실존', filter: { type: 'select', param: 'reality', options: CELEB_REALITIES.map((value) => ({ value, label: CELEB_REALITY_DISPLAY[value].label })) } },
  { field: 'profession', label: '직군', filter: { type: 'select', param: 'profession', options: CELEB_PROFESSIONS } },
  { field: 'nationality', label: '국적', width: 'min-w-24', filter: { type: 'nationality' } },
  { field: 'gender', label: '성별', filter: { type: 'select', param: 'gender', options: [{ value: 'male', label: '남성' }, { value: 'female', label: '여성' }, { value: 'unknown', label: '미상' }] } },
  { field: 'status', label: '공개', filter: { type: 'select', param: 'status', options: [{ value: 'active', label: '활성' }, { value: 'inactive', label: '비공개' }] } },
  { field: 'influence_total', label: '영향력', filter: { type: 'range', from: 'influenceMin', to: 'influenceMax' } },
  { field: 'celeb_tier', label: '등급', filter: { type: 'select', param: 'tier', options: [{ value: 'full', label: 'full' }, { value: 'light', label: 'light' }] } },
  { field: 'content_count', label: '콘텐츠', filter: { type: 'range', from: 'contentMin', to: 'contentMax', minimum: CELEB_CONTENT_COUNT.RESEARCHED_EMPTY } },
  { field: 'follower_count', label: '팔로워', filter: { type: 'range', from: 'followerMin', to: 'followerMax' } },
  { field: 'created_at', label: '등록일', filter: { type: 'range', from: 'createdFrom', to: 'createdTo', date: true } },
]

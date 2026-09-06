/**
 * 인물 도서 영역의 용어. 서비스 화면·백오피스·문서가 같은 말을 쓰도록 값을 한곳에 둔다.
 *
 * 위계와 뜻은 docs/project/celeb/celeb-02-05-figure-books.md 「용어」가 쥔다. 말을 바꾸려면 그 표부터 고치고 여기를 맞춘다.
 * 서비스 i18n(sw/web/messages/{ko,en}/celeb.json)은 이 값과 같아야 하며 sw/web의 테스트가 그것을 검사한다.
 *
 * 규칙
 *   - 한 개념에 이름 하나. 모든 이름은 부모가 있다(인물 도서 → 작품·관계 → …).
 *   - 관계 유형은 등장·연관·창작 셋이다(DB relation_type = appearance | related | authored).
 *   - 화면 구획 이름은 「관계명 + 작품」으로만 만든다. 등장 작품 · 연관 작품 · 창작 작품.
 *   - 은유·수단 이름을 쓰지 않는다. 데이터에 무슨 일이 일어나는지로 이름을 짓는다.
 */

export type FigureBookTermLocale = 'ko' | 'en'
export type FigureBookTerm = Readonly<Record<FigureBookTermLocale, string>>
export type FigureBookRelationType = 'appearance' | 'related' | 'authored'

export const FIGURE_BOOK_TERMS = {
  /** 영역 전체 — 인물에 묶인 작품·판본·상품 */
  domain: { ko: '인물 도서', en: 'Figure Books' },
  figure: { ko: '인물', en: 'Figure' },
  /** 저작 하나. 『오디세이아』 그 자체 */
  work: { ko: '작품', en: 'Work' },
  /** 이 작품 행이 세상의 어떤 저작인지 나타내는 키 */
  workIdentity: { ko: '작품 정체성', en: 'Work identity' },
  /** ko·en 언어별 표시 정보(제목·저자·표지·소개). 두 카드는 같은 저작이어야 한다 */
  localeCard: { ko: '언어 카드', en: 'Locale card' },
  /** 언어·역자·출판사·ISBN이 다른 실제 책 한 종 */
  edition: { ko: '판본', en: 'Edition' },
  /** 판본의 판매 링크 */
  product: { ko: '상품', en: 'Product' },
  activeProduct: { ko: '활성 상품', en: 'Active product' },
  /** 인물 ↔ 작품을 잇는 줄 */
  relation: { ko: '관계', en: 'Relation' },
  relationType: {
    appearance: { ko: '등장', en: 'Appearance' },
    related: { ko: '연관', en: 'Related' },
    /** 인물이 쓴 작품. DB 값 authored로 확정한다 — 저자 이름 비교는 표기 변형마다 어긋났다 */
    authored: { ko: '창작', en: 'Creation' },
  },
  /** 등장 관계에만 쓰는, 작품 안에서의 인물 역할·사건·결말 */
  appearanceNote: { ko: '등장 설명', en: 'Appearance note' },
  /** 화면 구획 이름. 관계명 + 작품 */
  section: {
    appearance: { ko: '등장 작품', en: 'Appearing Works' },
    related: { ko: '연관 작품', en: 'Related Works' },
    authored: { ko: '창작 작품', en: 'Created Works' },
    /** 인물 화면 아래 구매 구획. 연관 작품의 상품에 추천 도서(읽은 책·직군·인기)를 이어 붙이므로 둘을 함께 부른다 */
    relatedAndRecommended: { ko: '연관 작품과 추천 도서', en: 'Related works and recommended books' },
  },
} as const

export const FIGURE_BOOK_RELATION_TYPES: readonly FigureBookRelationType[] = ['appearance', 'authored', 'related']

export function figureBookRelationLabel(type: FigureBookRelationType, locale: FigureBookTermLocale = 'ko'): string {
  return FIGURE_BOOK_TERMS.relationType[type][locale]
}

export function figureBookSectionLabel(type: FigureBookRelationType, locale: FigureBookTermLocale = 'ko'): string {
  return FIGURE_BOOK_TERMS.section[type][locale]
}

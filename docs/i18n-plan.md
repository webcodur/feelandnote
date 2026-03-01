# 다국어화(i18n) 구현 계획

---

## 1. 현황 요약

| 항목 | 상태 |
|------|------|
| Next.js | 16.1.1 (App Router) |
| i18n 라이브러리 | 미설치 |
| UI 텍스트 언어 | 한국어 100% (하드코딩) |
| DB 번역 데이터 | **~33,000 단위 완료** (Phase 6) |
| DB 구조 변경 | contents.id UUID 전환 완료, external_id/isbn_ko 컬럼 추가 |
| 남은 작업 | 데이터 정비(Phase 9), 프론트 인프라(Phase 0~4), user_contents 번역, 게임 UI(Phase 7) |

---

## 2. 기술 선택

- **라이브러리**: `next-intl` (App Router 네이티브, RSC/SSR 완전 호환)
- **라우팅**: 경로 기반 (`/ko/explore`, `/en/explore`)
- **기본 언어**: `ko` (`localePrefix: 'as-needed'`)
- **DB 다국어 방안**: 방안 A (컬럼 추가, `*_en` nullable)

---

## 3. 완료된 작업 요약

### DB 스키마 (Phase 5) ✅

| 테이블 | 추가 컬럼 |
|--------|----------|
| `profiles` | `title_en`, `bio_en`, `quotes_en`, `consumption_philosophy_en` |
| `celeb_influence` | `*_exp_en` × 7 |
| `celeb_dialogues` | `lines_en` (JSONB) |
| `celeb_tags` | `name_en`, `description_en` |
| `celeb_tag_assignments` | `short_desc_en`, `long_desc_en` |
| `contents` | `title_ko`, `title_en`, `creator_en`, `isbn_en`, `isbn_ko`, `external_id` |

### DB 번역 데이터 (Phase 6) ✅

| 항목 | 규모 | 완료 |
|------|------|------|
| profiles (title, bio, quotes) | 867명 × 3 | ✅ |
| profiles (nickname_en 보충) | 37명 | ✅ |
| profiles (consumption_philosophy_en) | 867명 | ✅ |
| celeb_influence (*_exp_en) | 867명 × 7 | ✅ |
| celeb_dialogues (lines_en) | 867명 × 21대사 | ✅ |
| celeb_tags / assignments | 12 + ~45건 | ✅ |
| contents title_ko/title_en 분배 + API 보충 | 6,304건 | ✅ |
| scriptures JSON 영문 번역 | 4파일 (2,177줄) | ✅ |

### contents.id UUID 전환 (Phase 9.1) ✅

| 작업 | 상태 |
|------|------|
| external_id 컬럼 추가 + 기존 id 복사 | ✅ |
| FK 해제 → UUID 변환 → FK 재생성 | ✅ |
| id 기본값 gen_random_uuid() 설정 | ✅ |
| 코드 14개 파일 수정 (addContent, getContentDetail 등) | ✅ |
| isbn_ko 컬럼 추가 + 한국 ISBN 복사 | ✅ |

### web-bo 어드민 ✅

모든 _en 필드에 대해 조회·편집 UI 추가 완료:
- CelebForm: nickname_en, title_en, bio_en, quotes_en, consumption_philosophy_en
- DialogueEditor: lines_en (KO/EN 토글)
- TagFormModal / TagAccordionItem: name_en, description_en, short_desc_en, long_desc_en
- InfluenceDashboard: *_exp_en 표시
- celebs/[id] 상세: consumption_philosophy_en, DialogueSection (KO/EN 토글)

---

## 4. 데이터 정비 (Phase 9) — 진행 중

### 9.2 isbn_ko 매칭 ✅

영어 ISBN이 external_id인 BOOK 중 한국어 판본 ISBN 확보.

| 방법 | 건수 | 상태 |
|------|------|------|
| 마이그레이션: 한국 ISBN(978-8/979-11) → isbn_ko 복사 | 1,674 | ✅ |
| Naver API 매칭 (title_ko → 한국 ISBN 검색) | 238 | ✅ |
| 매칭 불가 (미출판/절판/제목 불일치) | 314 | 정상 빈값 |
| title_ko 영어 오염 → null 정리 | 17 | ✅ |
| 제목 오염 정리 (양장본 Hardcover 등) | 4 | ✅ |
| **합계 isbn_ko 보유** | **1,912 / 2,708** (71%) | |

### 9.3 contents 제목 현황 ✅

| 타입 | 전체 | title_ko | title_en |
|------|------|----------|----------|
| BOOK | 2,708 | 2,250 (83%) | 2,505 (93%) |
| VIDEO | 1,340 | 1,276 (95%) | 1,340 (100%) |
| MUSIC | 1,473 | 117 (8%) | 1,471 (100%) |
| GAME | 101 | 12 (12%) | 101 (100%) |

미보유 잔여: BOOK title_en ~203건(한국 고유 저작), BOOK title_ko ~458건(한국어 번역본 없음), MUSIC/GAME title_ko 대부분(영어권 콘텐츠) — 모두 **정상 빈값**.

### 9.4 isbn_en 매칭 🔄 진행 중

| 방법 | 건수 | 상태 |
|------|------|------|
| external_id 자체가 영어 ISBN → isbn_en 복사 | 804 | ✅ |
| Google Books API 매칭 (기존) | 760 | ⚠️ 오염 의심 → 역검증 중 |
| **역검증**: isbn_en → Google Books 역조회 → 제목/저자 불일치 시 삭제 | — | 🔄 진행 중 |
| **재매칭**: 역검증 후 빈 자리 + 미매칭 → 엄격 5조건 매칭 | ~942 | 대기 |
| **합계 isbn_en 보유 (검증 전)** | **1,564 / 2,708** (58%) | |

역검증 5조건:
1. 제목: 정규화 후 완전 일치 또는 포함
2. 저자: 성+이름 매칭
3. ISBN 접두사: 978-0/1, 979-8만
4. 언어: Google Books language = "en"
5. 자기참조 방지

API 키 6개 로테이션 (일일 6,000건 쿼터).

### 9.5 creator_en 보충 (대기)

| 현황 | 건수 |
|------|------|
| creator_en 보유 | 1,009 / 2,708 (37%) |
| isbn_en 확보 후 Google Books에서 역조회 예정 | ~1,700 |

---

## 5. 남은 작업

### Phase 0: 프론트 인프라 구축

- [ ] `next-intl` 설치
- [ ] `i18n/config.ts`, `i18n/request.ts` 작성
- [ ] `middleware.ts` (locale 감지, 리다이렉트)
- [ ] `app/[locale]/layout.tsx` 생성
- [ ] 기존 라우트를 `app/[locale]/` 하위로 이동
- [ ] 빈 번역 파일 생성 (`messages/ko/*.json`, `messages/en/*.json`)

### Phase 1: 상수 파일 마이그레이션

| 파일 | 텍스트 수 | 내용 |
|------|----------|------|
| `constants/navigation.tsx` | ~15 | 섹션 라벨 (기존 `englishTitle` 활용) |
| `constants/categories.ts` | ~5 | 콘텐츠 카테고리 |
| `constants/statuses.ts` | ~6 | 상태 라벨 |
| `constants/titles.ts` | ~25 | 칭호 |
| `constants/filterStyles.ts` | ~10 | 필터 라벨 |
| `constants/materials.ts` | ~100+ | 대량 UI 텍스트 |
| `constants/review-presets.ts` | ~50+ | 리뷰 템플릿 |

### Phase 2: 핵심 페이지 변환

- [ ] 인증 페이지 (login, signup, reset-password)
- [ ] 레이아웃 (Header, Sidebar, Footer)
- [ ] 탐색 페이지 (explore)
- [ ] 프로필/기록관 페이지
- [ ] 페이지 메타데이터 (`generateMetadata` 전환)

### Phase 3: 서고 코드 연동

- [x] scriptures JSON 영문 번역 (`constants/scriptures/en/`) ✅
- [ ] `constants/scriptures/` → `ko/`, `en/` 하위 구조 재편 (코드 변경)
- [ ] `scripturesHistory.ts` locale 기반 동적 import
- [ ] `HISTORY_CATEGORIES` 메타데이터 다국어 처리

### Phase 4: 나머지 페이지 변환

- [ ] 커뮤니티 (agora)
- [ ] 서고 (scriptures) UI 텍스트
- [ ] 쉼터 (rest)
- [ ] 콘텐츠 상세, 알림, 정책, about

### Phase 5~6: DB — ✅ 완료 (위 "완료된 작업" 참조)

### Phase 7: 게임 & 특수 영역

- [ ] 천도 게임 UI 텍스트 (`game.json`)
- [ ] `defaultLines` (톤별 범용 대사) 번역
- [ ] Server Actions 에러 메시지

### Phase 8: QA & 마무리

- [ ] 언어 전환 UI (설정 또는 헤더)
- [ ] 누락 번역 키 검출
- [ ] 번들 크기 확인
- [ ] SEO (hreflang, sitemap)
- [ ] 브라우저 언어 자동 감지

---

## 6. user_contents 번역 (대기)

### 규모

- 8,825건 (셀럽 감상평, 10자 이상 유의미 리뷰)
- `review` → `review_en` 컬럼 추가 필요

### 선행 조건

- [x] contents 타이틀 양방향 매칭 완료
- [ ] review_en 컬럼 마이그레이션
- [ ] 번역 방법 결정 (Claude API / 기타)

### 남은 단계

```
1. review_en 컬럼 마이그레이션
2. review 8,825건 영문 번역 (AI 에이전트 배치 처리)
3. 빈값 정책: 번역 불가 시 null 유지
```

---

## 7. 콘텐츠 표시 설계

### ContentCard 두 벌 표시

- locale에 따라 해당 언어 제목 우선 표시
- 양쪽 보유 시 언어 전환 토글 제공
- 한쪽만 보유 시 해당 언어 고정

### 어필리에이트 링크 (검토 중)

| locale | 플랫폼 | 대상 | 상태 |
|--------|--------|------|------|
| `ko` | 쿠팡 | 한국 ISBN 도서 | 미검토 |
| `en` | Amazon Associates | isbn_en 보유 도서 | 가입 가능 확인 (Payoneer 필요) |

- Amazon Associates: 한국 거주자 가입 가능. TIN으로 주민등록번호 사용, 수익은 Payoneer로 수령.
- isbn_en 확보 완료 후 어필리에이트 링크 생성 가능.
- `affiliate_url` JSONB에 `locale` 필드 추가 예정.

---

## 8. 기술 참조

### 서버/클라이언트 번역

| 유형 | 방법 |
|------|------|
| Server Component | `const t = await getTranslations('ns')` |
| Client Component | `const t = useTranslations('ns')` |
| Server Action | `const t = await getTranslations('ns')` |
| Metadata | `generateMetadata` 내 `getTranslations` |

### 번역 키 컨벤션

```
{네임스페이스}.{섹션}.{키}
예: nav.section.explore, content.category.book, auth.login.submitButton
```

### DB 데이터 분류

| 분류 | 전략 |
|------|------|
| UGC (방명록, 댓글) | 번역 안 함 |
| 관리형 (셀럽 bio, 대사) | `*_en` 컬럼 (방안 A) |
| 외부 API (contents) | `title_ko` + `title_en` 분리 |
| 시스템 메시지 (알림) | 생성 시 locale 반영 |
| UI 텍스트 | `next-intl` 번역 파일 |

---

## 9. 위험 요소

| 위험 | 대응 |
|------|------|
| `[locale]` 라우트 이동 → 기존 URL 깨짐 | middleware 리다이렉트, 301 |
| 번역 파일 비대화 | 네임스페이스 분할, 동적 로딩 |
| SEO 기존 인덱싱 유실 | hreflang 태그, sitemap |
| user_contents 8,825건 번역 비용 | 우선순위 분류, 단계적 처리 |

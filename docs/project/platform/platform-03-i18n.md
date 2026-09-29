# 다국어(i18n)

사용자 웹의 한국어·영어 구조와 표시 규칙이다. 번역 키 수·DB 번역 건수 같은 진행 수치는 싣지 않는다. 현재 누락은 아래 「감사와 백필」의 명령으로 다시 계산한다.

## 1. 구조

| 항목 | 현재 |
|------|------|
| 라이브러리 | `next-intl` (App Router, RSC/SSR) |
| 라우팅 | `app/[locale]/`, `localePrefix: 'as-needed'`(기본 `ko`) |
| UI 문구 | `sw/web/messages/{ko,en}/*.json`, 네임스페이스 등록은 `src/i18n/request.ts` |
| 콘텐츠 번역 | `content_locales` (PK: `content_id` + `locale`) |
| 인물·감상 번역 | `celebs`·`celeb_contents` 등의 `*_en` 열 |

## 2. 기술 선택

- **라이브러리**: `next-intl` (App Router 네이티브, RSC/SSR 완전 호환)
- **라우팅**: 경로 기반 (`/ko/explore`, `/en/explore`)
- **기본 언어**: `ko` (`localePrefix: 'as-needed'`)
- **DB 다국어 방안**: `content_locales` 테이블 (PK: content_id + locale). 기존 방안 A(컬럼 추가)에서 테이블 분리로 전환 완료.

---

## 3. 감사와 백필

누락 번역 키·상세 데이터·실화면 검출은 `audit-web-i18n` 스킬이 맡는다.

```bash
pnpm audit:i18n                                        # KO/EN 번들·ICU·사용 키·하드코딩 정적 검사
pnpm audit:i18n:data -- --all --active --strict        # 셀럽 상세 DB 번역 쌍 검사(--slugs=<slug>로 좁힘)
pnpm audit:i18n:routes -- --slugs=<slug> --screenshots=.artifacts/i18n-audit   # KO/EN × PC/모바일 메타·앵커·overflow
```

번역 누락을 채우는 스크립트는 감사기와 분리한다. 셀럽 데이터의 영문 필드 책임·fiction 예외·공용 누락 백필은 [`../celeb/celeb-09-01-i18n.md`](../celeb/celeb-09-01-i18n.md)가 쥔다. 읽어보기 번역은 `sw/web-bo/scripts/celeb/readings-translate.ts`(해시 가드·재개 가능), 대사 JSON 키 구조 교정은 `dialogue-repair.mjs`다.

게시판(자유게시판·피드백·공용 댓글)은 `locale` 필드와 `ko|en` 제약으로 언어를 가른다. 영문 게시판에 한국어 UGC를 노출하지 않는다. 공지는 `title_en`·`content_en`이 필수이고 관리자 공지 폼이 한영 동시 입력을 요구한다.

개발 중인 게임 UI는 번역 대상에서 뺐다(공용 메시지 키가 있어도 게임 코드 완료로 보지 않는다). 남은 다국어 작업은 [`docs/todo/web.md`](../../todo/web.md) 「다국어」가 쥔다.

## 4. 셀럽 감상경위 번역

`celeb_contents.review_en`은 작품 locale이 아니라 인물과 작품 사이의 감상경위다. 작성 규칙은 [`../celeb/celeb-02-03-content-review.md`](../celeb/celeb-02-03-content-review.md), 누락 판정과 백필 경계는 [`../celeb/celeb-09-01-i18n.md`](../celeb/celeb-09-01-i18n.md)를 따른다. 대량 적재 뒤에는 `.agents/skills/audit-web-i18n/scripts/audit-celeb-data.mjs`로 현재 결손을 다시 계산하며 누적 완료 건수를 문서에 적지 않는다.

---

## 5. 콘텐츠 표시 설계

### ContentCard 두 벌 표시

- locale에 따라 해당 언어 제목 우선 표시
- 양쪽 보유 시 언어 전환 토글 제공
- 한쪽만 보유 시 해당 언어 고정

### 제휴 구매의 언어 처리

판매처와 판본의 언어가 실제 구매 대상과 맞아야 한다. 현재 선택 규칙과 화면별 지원,
쿠팡·아마존 계정·지급 준비는 [제휴 판매 운영](../operations/ops-03-affiliate-commerce.md)이 쥔다.
일반 콘텐츠의 언어와 링크 구조는 [콘텐츠 데이터](../data/data-02-content.md),
인물 도서의 언어별 판본은 [인물 도서](../celeb/celeb-02-05-figure-books.md)를 따른다.

---

## 6. 기술 참조

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
| UGC (게시글, 방명록, 댓글) | 번역하지 않고 작성 `locale`을 저장·분리. 부모가 locale을 고정하는 자유게시판 댓글은 부모 locale을 따른다. |
| 관리형 (셀럽 bio, 대사) | `*_en` 컬럼 (방안 A) |
| 외부 API (contents) | `title_ko` + `title_en` 분리 |
| 시스템 메시지 (알림) | 생성 시 locale 반영 |
| UI 텍스트 | `next-intl` 번역 파일 |

---

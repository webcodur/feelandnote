# 인물(Celebrity) 정보 명세서

> famebook 프로젝트 기준 인물 정보 수집/활용 구조 정리

## 1. 수집 필드 목록

### celebrities 테이블

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `id` | INTEGER | O | 주키 (자동증분) |
| `name` | TEXT | O | 인물명 |
| `prename` | TEXT | X | 앞 이름 (호칭, 칭호 등) |
| `postname` | TEXT | X | 뒷 이름 (작위, 별명 등) |
| `profession_id` | INTEGER | O | 직업 ID (FK → profession) |
| `gender` | TEXT | X | 성별 ('남성' / '여성') |
| `nationality` | TEXT | X | 국적 |
| `birth_date` | TEXT | X | 출생일 (YYYY-MM-DD 또는 -YYYY) |
| `death_date` | TEXT | X | 사망일 (YYYY-MM-DD 또는 -YYYY) |
| `biography` | TEXT | X | 인물 설명 |
| `img_link` | TEXT | X | 이미지 URL |
| `vid_link` | TEXT | X | 비디오 URL |
| `book_story` | TEXT | X | 책 스토리 |
| `quotes` | TEXT | X | 명언/인용구 |
| `is_real` | BOOLEAN | X | 실제 인물 여부 |
| `is_legend` | BOOLEAN | X | 전설 인물 여부 |

### profession 테이블

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| `id` | INTEGER | O | 주키 |
| `name` | TEXT | O | 직업명 (한글) |
| `eng_name` | TEXT | X | 직업명 (영문) |

---

## 2. 날짜 형식 특징

- 문자열로 저장 (TEXT)
- 일반 형식: `YYYY-MM-DD`
- 역사 인물: `-YYYY` (음수 연도 지원, 기원전)
- 표시 처리:
  - 출생일만 있는 경우: 현재 나이 계산
  - 둘 다 없는 경우: "??? ~ ???" 표시

---

## 3. 인물 분류 체계

### 도감 분류
| 플래그 | 값 | 설명 |
|--------|-----|------|
| `is_real` | true | 실제 인물도감 |
| `is_legend` | true | 전설도감 |

### 시대 분류 (era 필터링)
| 구분 | 조건 |
|------|------|
| 역사인물 | 음수 연도 또는 100년 이상 전 출생 |
| 현대인물 | 100년 이내 출생 또는 30년 이내 사망 |

---

## 4. 데이터 소스

### 관리자 수동 입력 (CelebForm)
```javascript
INITIAL_FORM_DATA = {
  name: '',
  prename: '',
  postname: '',
  profession_kor: '',
  gender: '',
  nationality: '',
  birth_date: '',
  death_date: '',
  biography: '',
  img_link: '',
  vid_link: '',
  book_story: '',
  quotes: '',
  is_real: false,
  is_legend: false,
}

GENDER_OPTIONS = ['남성', '여성']
```

### GPT 연동
- POST `/celebrities/gpt-info` 엔드포인트
- 인물 정보 자동 수집 지원

---

## 5. API 엔드포인트

### 조회
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/celebrities/name?name={name}` | 이름으로 조회 |
| GET | `/celebrities` | 필터링 조회 |
| GET | `/celebrities/detail/:id` | ID로 조회 |
| GET | `/celebrities/all` | 전체 조회 (Admin) |
| GET | `/celebrities/search?query={query}` | 검색 |

### 관리
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/celebrities` | 생성 (Admin) |
| PUT | `/celebrities/:id` | 수정 (Admin) |
| DELETE | `/celebrities/:id` | 삭제 (Admin) |

### 필터 파라미터 (CelebrityQueryDto)
- `profession`: 직업 필터
- `era`: 시대 필터 (역사/현대)
- `menuType`: 메뉴 타입
- `contentName`: 콘텐츠 이름

---

## 6. 주요 파일 경로

### 백엔드 (NestJS)

**DTO**
- `app_be/src/modules/celebrities/dto/create-celebrity.dto.ts`
- `app_be/src/modules/celebrities/dto/update-celebrity.dto.ts`
- `app_be/src/modules/celebrities/dto/celebrity-query.dto.ts`

**서비스/컨트롤러**
- `app_be/src/modules/celebrities/celebrities.service.ts`
- `app_be/src/modules/celebrities/celebrities.controller.ts`

**직업 모듈**
- `app_be/src/modules/profession/profession.service.ts`
- `app_be/src/modules/profession/dto/create-profession.dto.ts`

### 프론트엔드 (Next.js)

**페이지**
- `app_fe/app/people/page.js`

**컴포넌트**
- `app_fe/view/people/peopleGrid/personCard/PersonCard.jsx`
- `app_fe/view/people/peopleGrid/personCard/LifespanDisplay.jsx`

**관리자 폼**
- `app_fe/view/admin/manager/celeb/CelebForm.jsx`
- `app_fe/view/admin/manager/celeb/CelebForm.constants.js`
- `app_fe/view/admin/manager/celeb/components/FormFields.jsx`

**커스텀 훅**
- `app_fe/hooks/useCelebrity.js`
- `app_fe/hooks/useCelebrities.js`
- `app_fe/hooks/useProfession.js`

---

## 7. 기술 스택

| 영역 | 기술 |
|------|------|
| 백엔드 | NestJS |
| 프론트엔드 | Next.js |
| 데이터베이스 | SQLite |
| 통신 | REST API |

---

## 8. DB 관계도

```
celebrities
    │
    └── profession_id ──→ profession (id)
                              ├── name (한글)
                              └── eng_name (영문)
```

---

## 9. UI 표시 항목

### PersonCard 컴포넌트
- `name`, `prename`, `postname` (이름 조합)
- `birth_date`, `death_date` (LifespanDisplay)
- `biography` (설명)
- `profession` (직업)
- `img_link` (이미지)
- `vid_link` (비디오)
- `is_real`, `is_legend` (분류 뱃지)
- `recommended_content_names` (추천 콘텐츠)

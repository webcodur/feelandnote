# 셀럽 프로필 생성 룰북

Feelandnote 플랫폼의 셀럽 프로필 전체 생성 가이드. Claude Code agent와 web-bo에서 공통 참조.

---

## 작업 순서

| # | 단계 | 룰북 | 비고 |
|---|------|------|------|
| 1 | 기본 정보 | `.claude/rules/celeb-1-basic-profile.md` | 필수 |
| 2 | 콘텐츠 수집 | `.claude/rules/celeb-2-content-collector.md` | 요청 시 |
| 3 | 감상 철학 | `.claude/rules/celeb-3-philosophy.md` | 필수 |
| 4 | 영향력 평가 | `.claude/rules/celeb-4-influence.md` | 필수 |
| 5 | 페르소나 | `.claude/rules/celeb-5-persona.md` | 필수 |

**각 단계의 상세 규칙은 해당 룰북을 참조한다. 이 문서에서 중복 기술하지 않는다.**

---

## 판단 기준

- **이름만 제공**: 1 → 3 → 4 → 5 (콘텐츠 수집 건너뜀)
- **"컨텐츠 수집까지" 또는 "전체" 언급**: 1 → 2 → 3 → 4 → 5 (전체 실행)
- **모호한 요청**: 범위 명확화 요청

---

## 기술 요구사항

- **Supabase 프로젝트 ID**: `wouqtpvfctednlffross`
- **파일 경로**: 상대 경로만 사용
- **`is_verified`**: 셀럽 계정 생성 시 **항상 false**

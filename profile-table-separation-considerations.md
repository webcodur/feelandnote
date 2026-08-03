# 사용자·셀럽 프로필 테이블 분리 고민

> 상태: 설계 메모만 보존. 현재 우선순위는 가상독백이며, 이 문서를 근거로 DB나 코드를 변경하지 않는다.
>
> 작성 기준일: 2026-08-04

## 결론

사용자와 셀럽의 전용 데이터 및 생명주기는 분리하는 편이 맞다. 다만 현재 `profiles`를 없애고 `users`와 `celebs` 두 테이블로 완전히 갈라서는 안 된다. 팔로우, 감상 기록, 방명록처럼 두 종류를 모두 가리키는 기능이 이미 공통 `profile_id`를 사용하기 때문이다.

권장 구조는 공통 공개 정체성과 두 하위 유형을 나누는 방식이다.

```text
profiles                 공통 공개 정체성
├─ user_accounts         로그인·권한·계정 상태
└─ celebs                인물 정보·게시 상태·독백·말투
```

## 현재 구조에서 확인한 문제

- `profiles`는 생성된 DB 타입 기준 47개 필드를 가진다. 닉네임·아바타처럼 공통인 필드와 계정 제재·생몰일·가상독백처럼 한쪽에만 필요한 필드가 한 행에 섞여 있다.
- `status='suspended'`가 사용자에게는 계정 제재, 셀럽에게는 미검증·비공개·작성 중에 가까운 뜻으로 재사용됐다. 같은 값이 서로 다른 생명주기를 표현한다.
- 셀럽 생성 코드가 Supabase Auth에 더미 사용자를 만든 뒤 자동 생성된 `profiles` 행을 셀럽으로 바꾼다. 이어서 셀럽에게도 `user_social`, `user_scores`를 만든다.
- 생성 코드 주석에는 Auth FK 때문에 더미 계정이 필요하다고 적혀 있지만, 현재 생성 타입의 `profiles.Relationships`는 비어 있고 회원 탈퇴 코드도 `profiles.id`와 `auth.users.id`가 FK로 연결되지 않았다고 설명한다. 실제 운영 DB 제약을 다시 조회하기 전에는 어느 설명도 확정하지 않는다. 다만 현재 구현이 Auth 생성 트리거에 결합되어 있다는 사실은 분명하다.
- 생성된 DB 타입에는 `profiles`를 직접 참조하는 FK 관계 선언이 50개 있고, 저장소 코드 검색에서는 `profiles` 접근 파일이 107개다. 전면 분리는 변경 반경이 크다.
- 일부 사용자 관리 수정 경로는 대상 ID만 조건으로 삼고 `profile_type='USER'`를 서버에서 다시 강제하지 않는다. UI 필터가 잘못된 유형의 수정을 막는 유일한 방어가 되어서는 안 된다.

## 권장 필드 경계

### profiles

- `id`
- `profile_type`
- `nickname`, `nickname_en`
- `avatar_url`
- 공통 공개 소개 필드
- `created_at`

### user_accounts

- `profile_id`
- `auth_user_id`
- `email`
- `role`
- `account_status`
- `suspended_at`, `suspended_reason`
- `last_seen_at`
- 사용자 전용 칭호·설정

### celebs

- `profile_id`
- `slug`, `slug_suffix`
- `profession`, `title`, `nationality`, `gender`
- `birth_date`, `death_date`
- `celeb_tier`
- `publication_status`
- 검증·소유권 정보
- `virtual_monologue`, `virtual_monologue_en`
- 콘텐츠 조사, 말투, 음성, 위키데이터, 조회 관련 필드

## 상태 분리

사용자 계정 상태와 셀럽 공개 상태는 서로 다른 열과 값으로 관리한다.

```text
user_accounts.account_status
active | inactive | suspended | deleted

celebs.publication_status
draft | published | hidden | archived
```

현재 셀럽의 `active`는 대체로 `published`에 대응시킬 수 있다. 그러나 `inactive`와 `suspended`는 뜻이 뒤섞였으므로 일괄 변환하지 않는다. 기존 값, 검증 여부, 자료 충족도, 실제 서비스 노출 목적을 함께 보고 `draft`, `hidden`, `archived` 중 하나로 판정해야 한다.

검증 여부와 공개 여부도 별개 축이다. `is_verified` 또는 향후 `verification_status`를 `publication_status`와 합치지 않는다.

## FK의 장기 방향

- 셀럽 전용: `celeb_influence`, `celeb_persona`, `celeb_dialogues`, 연표, 콘텐츠 조사, 팩션, 담화는 `celebs(profile_id)`를 참조한다.
- 사용자 전용: 점수, 학습 진행, 사용자 제재 등은 `user_accounts(profile_id)`를 참조한다.
- 공통 대상: 팔로우 대상, 공개 프로필, 방명록 대상, 사용자와 셀럽이 함께 가질 수 있는 감상 기록은 `profiles(id)`를 유지한다.
- 사용자 본인만 가능한 행위와 셀럽도 가능한 행위를 구분해 DB 제약 또는 트리거로 유형을 강제한다.

## 안전한 이행 순서

1. 운영 DB의 실제 FK·트리거·RLS를 읽기 전용으로 다시 실측한다.
2. `user_accounts`, `celebs`를 추가하고 기존 데이터의 백필 결과만 검증한다.
3. 새 상태 열을 도입하되 기존 `status`를 즉시 제거하지 않는다.
4. 신규 셀럽 생성에서 더미 Auth 계정이 정말 불필요한지 제약과 트리거로 검증한 뒤 생성 경로를 바꾼다.
5. 셀럽 전용·사용자 전용 조회와 FK를 작은 묶음으로 옮긴다.
6. 모든 소비자가 새 테이블을 읽고 쓰는 것이 확인된 뒤에만 `profiles`의 전용 필드를 제거한다.
7. 각 단계에서 타입 재생성, RLS 점검, 참조 무결성 검증, 롤백 가능성을 확인한다.

## 지금 하지 않는 것

- `profiles` 전면 삭제 또는 즉시 이름 변경
- `suspended` 셀럽의 기계적인 일괄 상태 변환
- 50개 FK의 한 번에 교체
- 더미 Auth 계정의 선삭제
- 라이브 DB 마이그레이션

가상독백 작업을 우선하는 동안 이 문서는 보류된 설계 메모로만 유지한다.

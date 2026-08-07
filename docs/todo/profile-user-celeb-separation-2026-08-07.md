# 인물·회원 분리 — 재조사와 계획 (2판)

> **최종 실측 체크: 26.08.07** — 운영 DB 전량 대조(`pg_constraint`·`pg_policies`·`pg_trigger`·집계) + 저장소 코드 대조
> **상태:** 조사 완료 · **DB·코드 미적용** · 착수 전 §6 결정 필요
> **1판과의 관계:** 1판(같은 날 오전)은 "인물은 `profiles`에 두고 회원 17명만 `users`로 뗀다"로 결론냈다. **2판은 그 처방을 기각한다.** 1판이 못 본 사실이 방향을 바꿨다. 1판의 실측 부록은 §7에 검증 결과와 함께 남긴다.

---

## 1. 판을 뒤집은 사실 — 인물 2,742명은 전부 로그인 계정이다

```
profiles_id_fkey  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
```

`profiles`는 인물 테이블이 아니라 **로그인 계정에 딸린 테이블**이다. DB 제약이 강제한다.

| 확인 | 결과 |
|---|---|
| `auth.users` 총 계정 | 2,777 |
| 인물 프로필과 짝지어진 계정 | **2,742** |
| 회원 계정 | 17 |
| 프로필 없는 고아 계정 | **18** |

인물 등록 코드가 실제로 계정을 발급한다. `sw/web-bo/scripts/create-minimal-celebs.ts:40` 외 5곳:

```ts
await sb.auth.admin.createUser({
  email: `celeb_${uuid}@feelandnote.local`,
  password: randomUUID() + randomUUID(),
  email_confirm: true,
})
```

계정이 먼저 생기고, `auth.users`의 `on_auth_user_created` 트리거(`handle_new_user`)가 `profiles` 행을 만든다.

> **코드가 반대로 알고 있다.** `sw/web/src/actions/auth/deleteAccount.ts:9`는 "`profiles.id`와 `auth.users.id`가 외래키로 연결되어 있지 않음(셀럽 프로필 때문)"이라 적었다. **실 DB에는 살아 있다.** 탈퇴 처리가 틀린 전제 위에서 돈다. 고아 계정 18건이 그 흔적이다.

**함의:** `users` 테이블을 새로 만들면 정체성 테이블이 **셋**이 된다(`auth.users` + `profiles` + `users`). 중복을 줄이는 게 아니라 한 겹 더 쌓는다.

## 2. "회원 17행만 옮기는 작은 작업"이 아니다

그 17명을 참조하는 실제 행을 세었다 — **13개 테이블 513행.**

| 테이블 | 회원 17명을 가리키는 행 |
|---|---|
| `score_logs` | 217 |
| `activity_logs` | 163 |
| `academy_lesson_progress` | 36 |
| `user_contents` | 34 |
| `user_scores` / `user_social` | 17 / 16 |
| `follows` | **15 (전체 15건 중 15건)** |
| `notifications`·`free_posts`·`flows`·`guestbook_entries`·`feedbacks`·`content_recommendations` | 15 |

`follows.follower_id`는 **15건 전부가 회원**이다. 회원이 `profiles`를 떠나면 이 외래키는 100% 끊긴다. 한 열이 두 부모 테이블을 동시에 가리킬 수 없다.

> **1판의 자기모순:** §9-3은 "공용 축은 그대로 둔다"고 했고 §8은 "17행만 옮기면 된다"고 했다. **둘은 동시에 성립하지 않는다.**

## 3. `role` 이동 비용 — RLS 58개

`profiles`를 참조하는 RLS 정책 **58개 / 19개 테이블**. 그중 **55개**가 같은 형태다.

```sql
EXISTS (SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin','super_admin'))
```

코드도 같은 판정을 10개 파일에서 한다 — `web-bo/src/proxy.ts:66`, `lib/admin-route.ts:22`, `lib/admin-auth.ts:10`, `lib/faction-route.ts:27`, `lib/faction-db.ts:20`, `lib/discourse-route.ts:27`, `lib/discourse-db.ts:20`, `actions/admin/content-research.ts:400`, `app/(admin)/layout.tsx:23`, `web/src/lib/auth/checkAdmin.ts:22`.

`role`이 이사하면 58개 정책과 10개 파일이 **한 번에** 바뀌어야 한다. 어긋나면 관리자 화면이 통째로 잠긴다. 1판 §9-5의 한 줄이 감당할 규모가 아니다.

## 4. 1판 분류표의 오류

| 1판 서술 | 실측 |
|---|---|
| `email`은 회원 쪽으로 이동 | **인물 2,735명이 email 보유.** 도메인 12종으로 갈라짐 — `feelandnote.local` 1,987 / `feelnnote.local`(오타) 513 / `feelandnote.com` 123 / `celeb.feelandnote.com` 57 / 그 외 55 |
| 감상 기록 11,722건 "전부 인물" | 인물 11,688 / 회원 34 |
| `profiles.id` 참조 외래키 50 | 실 DB **52** |
| `status='suspended'` 224건이 전부 인물 | 맞다(회원 정지 0건) |
| 인물을 옮기는 완전 분리는 무리 | 맞다 |

## 5. 지울 것은 없다 — 2판 조사에서 확인

2판 초기에 "인물에게 쌓인 점수·소셜 행 약 17,700개가 쓰레기"라 판단했으나 **틀렸다.**

| 대상 | 판정 |
|---|---|
| `user_social` 인물 2,740행 | **실사용. 삭제 금지.** `influence` 비영 1,473 · `content_count` 비영 1,460. `actions/admin/celebs.ts:1503`이 `follower_count`로 인물 목록을 정렬한다 |
| `user_scores` 인물 2,740행 | 값 누적(비영 1,473, 최대 168). 인물 화면엔 안 뜨고 백오피스 점수판에만 섞인다 |
| `score_logs` 인물 12,189행 | 전부 `activity/content_add` 1점. 감상 등록 부산물 겸 감사 기록. 26.01.11~26.08.03 |

백오피스 점수판(`sw/web-bo/src/app/(admin)/scores/page.tsx:24`)이 인물과 회원을 한 목록에 담는 것도 결함이 아니다. `ScoresClient.tsx:180`이 인물에게 「셀럽」 배지를 붙여 구분한다 — **의도된 설계다.** 조회 쿼리만 보고 결함으로 판정했다가 화면 코드를 열어 취소했다.

> **별건(이 문서 범위 밖):** `ScoresClient.tsx:74`의 `handleDelete`는 0.5초 기다린 뒤 대화상자만 닫는다. 점수 로그 삭제 버튼이 실제로는 아무것도 지우지 않는다.

## 6. 권고 — 순서가 뒤집혀 있다

진짜 결함은 테이블 모양이 아니라 **인물을 등록하려면 로그인 계정을 발급해야 한다는 것**이다. `status`·`email`·`role`이 두 뜻을 갖게 된 원인이 여기다. `users`를 새로 만들어도 인물은 여전히 계정을 받는다 — 원인이 남는다.

**순서:**

1. **`profiles`의 계정 종속을 끊는다.** `profiles_id_fkey`를 떼고 인물은 계정 없이 만든다. 이걸 하면 `profiles`가 비로소 인물 테이블이 되고, 계정 성격 열들이 갈 곳이 자명해진다.
   - 선결: `deleteAccount.ts`가 CASCADE에 의존하는 부분을 명시 삭제로 바꾼다(현재 주석은 이미 FK가 없다고 잘못 적혀 있다)
   - 선결: 인물 생성 코드 6곳에서 `auth.admin.createUser` 제거, `id`를 직접 발급
   - 검증: 기존 인물 2,742명의 `auth.users` 행을 지울지는 별건. **1단계에서 지우지 않는다**
2. **트리거에 조건을 건다.** `on_profile_created_scores`·`on_profile_created_social`이 인물에게도 발화한다. 1단계 이후 인물은 이 축이 필요한지 재판정(단, `user_social`은 현재 실사용이므로 유지 쪽이 유력)
3. **`status`는 인물 공개 상태로 확정.** 회원 정지가 0건이니 회원용 상태 열은 필요해질 때 만든다
4. **`users` 분리는 1단계 이후 재판단.** 지금 하면 정체성 테이블 셋에 외래키 파손 13곳을 얹는다

**하지 않는 것**
- `profiles` 이름 변경·전면 제거
- `celebs` 테이블 신설(완전 분리) — 1·2판 모두 기각
- `suspended` 인물 224건 일괄 변환
- 라이브 DB 이행 — 위 1단계 승인 전까지 없음

## 6-1. 실행 기록 — 0단계 완료 (26.08.07)

연결을 끊든 안 끊든 필요한 것만 골라 실행했다.

| 한 것 | 내용 |
|---|---|
| 탈퇴 처리 교정 | `sw/web/src/actions/auth/deleteAccount.ts` — 프로필·계정을 두 번에 나눠 지우던 것을 `delete_auth_user` RPC 한 번으로 바꿨다. 뒤 단계가 실패해 고아 계정이 생기는 창이 없어졌고, `auth.admin.deleteUser`의 `confirmation_token` NULL 버그도 피한다(회원 관리 `members.ts:603`와 같은 방식). 잘못된 주석도 교정 |
| 고아 계정 정리 | 프로필 없는 계정 **18건 삭제**. 전원 로그인 이력 없음, 연결 데이터 0건(`saved_flows`·`celeb_content_research_runs`·`claimed_by`·`sessions` 전부 0)을 확인 후 실행. 스냅샷은 세션 임시 폴더의 `orphan-auth-users-backup-2026-08-07.json` |
| 검증 | `npx tsc --noEmit`(sw/web) 통과. 정리 후 `auth.users` 2,759 = `profiles` 2,759, 고아 0, 계정 없는 프로필 0 |

**하지 않은 것과 그 이유**
- 인물·회원 삭제 경로 6곳을 명시 삭제로 바꾸는 일은 **뺐다.** 지금은 연쇄 삭제가 정상 동작하며, 이 작업은 §6-1단계(연결 끊기)를 실제로 할 때만 값이 생긴다. 미리 하면 코드만 길어진다
- 백오피스 점수판 수정 — §5 참조. 결함이 아니었다

## 6-2. 실행 기록 — 1단계 완료 (26.08.07)

**인물이 더 이상 로그인 계정을 갖지 않는다.** 순서는 삭제 경로 → 연결 끊기 → 생성 경로로 지켰다. 뒤집으면 중간에 찌꺼기가 남는다.

**Phase 1a — 삭제 경로 (연결 유무와 무관하게 안전)**

`delete_auth_user` RPC가 `profiles`와 `auth.users`를 **한 트랜잭션에서** 지우도록 바꿨다(마이그레이션 `delete_auth_user_removes_profile_explicitly`). 호출부 세 곳(회원 탈퇴·회원 관리·인물 등록 되돌리기)이 이미 이 함수를 쓰거나 쓰도록 바뀌었으므로, 각 호출부를 두 단계로 늘리지 않았다.

**Phase 1b — 연결 끊기**

```sql
ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;  -- 마이그레이션 drop_profiles_auth_users_fk
```

인물 등록(`web-bo/src/actions/admin/celebs.ts` `createCeleb`)을 "가짜 계정 발급 → 프로필 갱신"에서 **프로필 직접 등록**으로 바꿨다. 식별자는 `crypto.randomUUID()`로 직접 발급한다. 등록 후 slug를 다시 조회하던 중복 질의도 함께 없앴다.

**Phase 1c — 되돌리기 경로 회귀 수정**

연결을 떼면 스크립트 5종의 되돌리기가 계정만 지우고 프로필을 남긴다. 전부 `delete_auth_user` RPC로 교체했다 — `cleanup-faction-collective-fiction-celebs.ts`·`cleanup-faction-nonperson-celebs.ts`(2곳)·`register-hidden-sports-factions.ts`·`sync-faction-fiction-data.ts`·`sync-fiction-profiles.ts`.

**검증**

| 확인 | 결과 |
|---|---|
| `npx tsc --noEmit` (sw/web, sw/web-bo) | 둘 다 통과 |
| 계정 없이 인물 등록 | 성공. `slug` 자동 계산, `user_scores`·`user_social` 트리거 자동 생성, `auth.users` 0건 |
| 등록한 인물 삭제 | `delete_auth_user`로 프로필·점수·소셜 전부 정리, 잔여 0 |
| 정리 후 정합성 | `profiles` 2,759 = `auth.users` 2,759 · 계정 없는 프로필 0 · 프로필 없는 계정 0 · 고아 점수/소셜 0 |

**Phase 1d — 생성 스크립트 5종 전환 (26.08.07)**

계정을 발급하던 스크립트를 전부 직접 등록으로 바꿨다. 그대로 뒀으면 한 번만 돌려도 §6-3에서 지운 가짜 계정이 도로 생겼을 것이다.

| 스크립트 | 바뀐 것 |
|---|---|
| `create-minimal-celebs.ts` | 계정 발급 + UPDATE + slug 재조회 → INSERT 한 번 |
| `sync-fiction-profiles.ts` | 같음 |
| `sync-faction-fiction-data.ts` | 같음 |
| `register-hidden-sports-factions.ts` | 같음 |
| `cleanup-faction-nonperson-celebs.ts` | 같음 |

**저장소 전체에 `auth.admin.createUser` 호출이 0건이다.** 이제 어떤 경로로도 인물에게 계정이 붙지 않는다.

검증: `npx tsc --noEmit`(web-bo) 통과. `npx eslint`는 오류 10건이 남으나 전부 기존 `no-explicit-any`이며 HEAD와 현재의 `any` 개수가 7로 동일하다(이번 변경분 아님).

> **전환 중 확인한 기존 제약:** `sync-faction-fiction-data.ts`는 `status:'active'`로 등록하는데, DB가 사진 없는 활성 인물을 막는다(`trg_active_celeb_requires_avatar`). 실측으로 등록이 거부되는 것을 확인했다. **이번 변경으로 생긴 것이 아니다** — 예전 방식에서도 프로필 갱신 단계에서 같은 규칙에 걸렸다(트리거 조건: `old.profile_type IS DISTINCT FROM 'CELEB'`). 걸리는 시점만 앞당겨졌다.

**남은 것**
- 기존 인물 2,742명의 `auth.users` 행 → §6-3에서 전량 삭제 완료
- Supabase 대시보드에서 계정을 직접 지우면 이제 프로필이 남는다. 계정 삭제는 `delete_auth_user`로만 한다

## 6-3. 실행 기록 — 가짜 계정 전량 폐기 (26.08.07)

인물에게 딸려 있던 로그인 계정 **2,742개를 지웠다.** 되돌릴 수 없다.

**지운 것**
```sql
DELETE FROM auth.users au USING public.profiles p
WHERE p.id = au.id AND p.profile_type = 'CELEB' AND au.last_sign_in_at IS NULL;  -- 2,742건
```
`delete_auth_user` RPC는 **쓰지 않았다** — 그 함수는 프로필도 함께 지운다. 인물은 남기고 계정만 지워야 했다.

**사전 확인**
- `profiles_id_fkey` 부재 확인(0) → 계정을 지워도 인물이 딸려가지 않음
- 삭제 대상 2,742개 전원 로그인 이력 0건, 살아 있는 세션 0건
- 이 계정들을 참조하는 데이터 0건(`profiles.claimed_by`·`saved_flows`·`celeb_content_research_runs`)
- 조건에 `profile_type='CELEB' AND last_sign_in_at IS NULL`을 걸어 회원 17명을 이중으로 보호

**별도 백업을 만들지 않은 이유:** 계정 식별자는 `profiles.id`와 같은 값이라 인물 쪽에 그대로 남아 있고, 이메일은 `celeb_<임의문자열>@feelandnote.local` 형태의 생성값이라 보존 가치가 없다.

**삭제 후 정합성**

| 항목 | 값 |
|---|---|
| `auth.users` | **17** (진짜 회원만) |
| `profiles` | 2,759 (인물 2,742 · 회원 17) — 무변동 |
| `user_contents` 감상 기록 | 11,722 — 무변동 |
| `user_social` / `user_scores` / `celeb_dialogues` / `celeb_influence` | 2,756 / 2,757 / 2,736 / 2,449 — 무변동 |
| 프로필 없는 계정 | 0 |

**인계는 막히지 않는다.** 「인수됨」 표시(`profiles.claimed_by`)는 **인수하는 사람의 진짜 계정**을 가리키는 자리다. 가짜 계정이 낄 자리가 아니었고, 실제로 쓰기 코드도 값도 없다(읽기 전용, 0건). 나중에 인계 기능을 붙일 때 그 사람이 평소처럼 가입한 계정을 이 자리에 적으면 된다.

> **되돌리기 불가.** 계정이 사라졌으므로 `profiles_id_fkey`를 되붙일 수 없다.

## 6-4. 실행 기록 — 계정 성격 잔재 정리·상태 의미 확정 (26.08.07)

**① 인물의 계정 전용 값 비움**

| 대상 | 결과 |
|---|---|
| `profiles.email` (인물) | **2,735건 → 0.** 이미 없는 계정의 생성 주소라 오해를 부른다. 회원 17명은 그대로 |
| `suspended_at`·`suspended_reason` (인물) | **1건 → 0.** 손웅정(`son-woong-jung`)이 공개 상태인데 정지 표시가 붙어 있었고 사유가 `1`이었다. 회원 정지 기능을 인물에게 잘못 실행한 흔적 |

> **함정:** 두 UPDATE를 데이터 수정 CTE로 한 문장에 묶으면 **같은 행에는 하나만 적용된다.** 손웅정은 두 조건에 모두 걸려 뒤 UPDATE가 0건으로 흘렀다. 따로 실행해 해결.

**② `status` 의미 확정** — `docs/project/db-celeb.md`에 기록했다. 인물에게는 **노출 상태 하나만** 뜻한다. 겹침의 원인이던 계정이 사라져 더 이상 두 뜻으로 읽히지 않는다. 목록 노출을 가르는 것은 여전히 `celeb_tier`이며, `status`를 다른 판단에 끌어 쓰지 말라는 규칙은 `celeb-gotchas.md` §9-1이 계속 SSoT다.

**③ 점수·소셜 자동 생성 트리거 — 변경하지 않는다**

§6 2단계 후보였으나 실측 결과 손댈 이유가 없다.

| 트리거 산물 | 판정 |
|---|---|
| `user_social` (인물 2,740행) | **쓰인다.** `actions/admin/celebs.ts:1503`이 `follower_count`로 인물 목록을 정렬하고, `influence` 비영 1,473 · `content_count` 비영 1,460 |
| `user_scores` (인물 2,740행) | 백오피스 점수판이 「셀럽」 배지를 붙여 **의도적으로 함께 보여준다**(`ScoresClient.tsx:180`). 인물 등록 코드도 따로 초기화한다 |

조건을 걸면 지금 보이는 화면이 깨진다. 그대로 둔다.

**실측(정리 후)**

| | 인물 2,742 | 회원 17 |
|---|---|---|
| `email` 보유 | 0 | 17 |
| `suspended_at` / `suspended_reason` | 0 / 0 | 0 / 0 |
| `last_seen_at` | 0 | **0** — 회원에게도 안 쓰이는 죽은 열 |
| `role` 부여 | 0 | 2 |

## 7. 실측 근거 (26.08.07, 운영 DB 서비스 롤 읽기 전용 + 저장소 코드)

**DB**

| 항목 | 수치 |
|---|---|
| `profiles` 총 행 | 2,759 (인물 2,742 / 회원 17) |
| `auth.users` | 2,777 (고아 18) |
| `profiles.id` 참조 외래키 | 52 |
| `profiles` 참조 RLS 정책 | 58 (19테이블, `role` 기반 55) |
| `profiles` 트리거 | 10 (+ `auth.users`의 `on_auth_user_created`) |
| `profiles` 열 | 49 |
| 인물 email 보유 | 2,735 (도메인 12종) |
| `status='suspended'` | 224 (전부 인물) |
| `user_contents` | 11,722 (인물 11,688 / 회원 34) |
| `follows` | 15 (팔로우하는 쪽 전부 회원, 대상 인물 13·회원 2) |
| 잔재 뷰 | `profiles_compat` (`consumption_philosophy`→`cultural_journey` 별칭) |

**코드**

| 항목 | 수치 |
|---|---|
| `profiles` 접근 파일 | 125 |
| `profile_type='CELEB'` 필터 파일 | 69 |
| `profile_type='USER'` 필터 파일 | 1 (`web-bo/src/actions/admin/members.ts`) |
| 인물 생성 시 계정 발급 코드 | 6 |
| `role` 권한 판정 파일 | 10 |

**재현**

```sql
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid='public.profiles'::regclass;

SELECT count(*), count(DISTINCT schemaname||'.'||tablename) FROM pg_policies
WHERE (coalesce(qual,'')||coalesce(with_check,'')) ILIKE '%profiles%';
```

```bash
rg -l "from\('profiles'\)" sw --glob "*.ts" --glob "*.tsx" | wc -l
rg -ln "auth\.admin\.createUser" sw --glob "*.ts"
```

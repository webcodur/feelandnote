---
name: fiction-profile-monologue
description: 신화·전설·허구 인물을 `fiction` 셀럽으로 등록하거나, 대표 원전을 근거로 `profiles.virtual_monologue`과 영문본을 작성·검증·반영할 때 사용한다. "fiction 셀럽", "신화 인물 등록", "허구 인물 가상 독백", "원전 인물 독백" 요청에 적용한다.
---

# fiction 인물과 가상 독백

작업 전에 `docs/project/celeb/virtual-monologue.md`를 전부 읽고 따른다. 독백 규칙은 그 문서 하나만 두며, 이 스킬은 fiction 전용 실행 절차만 정한다.

## 절차

1. 사용자가 지정한 에피소드만 범위에 넣고 보류 에피소드는 제외한다.
2. 명단과 DB를 대조한다.

```bash
node .agents/skills/fiction-profile-monologue/scripts/audit-fiction-episode.mjs <episode>
```

3. SSoT의 네 단계(재료 조사 → 말투·표현 설계 → 작성 → 검토하며 수정)로 독백을 완성한다.
   빈 인물을 에피소드 단위로 생성할 때는 `sw/web-bo`에서 아래 생성기를 실행한다. 게시 방식은 SSoT의 빈 값 조건부 규칙을 따른다.

```bash
node --env-file=.env --import tsx scripts/fill-virtual-monologue-gpt.ts --fiction-episode <episode> --mode new
```

4. `assets/manifest-template.json`에 기본 정보, 출처, 최종 국문·영문 독백과 검토 완료 여부를 기록한다.
5. dry-run 뒤 사용자가 요청한 범위만 적용한다.

```bash
node .agents/skills/fiction-profile-monologue/scripts/apply-fiction-manifest.mjs <manifest.json>
node .agents/skills/fiction-profile-monologue/scripts/apply-fiction-manifest.mjs <manifest.json> --apply
```

6. DB를 다시 조회해 `slug`, `celeb_tier='fiction'`, 독백 전문, 기존 얼굴 보존을 확인한다. 같은 명령을 다시 실행했을 때 전원 `SKIP`이어야 한다. 검증 뒤 작업용 manifest를 삭제한다.

## 프로필 가드

- 신규는 `profile_type='CELEB'`, `celeb_tier='fiction'`, `status='inactive'`, `is_verified=false`로 만든다. 기존 활성 프로필은 비활성으로 되돌리지 않는다.
- `nickname_en`과 팩션 인물과 같은 `slug`가 필수다.
- 소개는 국문 100자, 영문 180자 이내다. 얼굴은 없어도 되며 기존 얼굴은 지우지 않는다.
- 감상 여정·영향력·페르소나·콘텐츠·고유 대사는 이 작업에서 만들지 않는다.

팩션 대사가 필요하면 독백에서 갈등 하나만 골라 `faction-dialogue-review`로 작성한다. 새 사실이나 철학을 팩션에서 추가하지 않는다.

# Supabase 잔재 제거 (Oracle 전환 후속)

DB는 이미 Oracle VM으로 이전했지만 스택·명칭·클라이언트에 Supabase 잔재가 남아 있다. Oracle 자체 스택으로 갈아타면서 아래를 전부 없앤다. 완료 시 이 문서를 지운다.

## 잔재 목록

### Vault (2026-09-27 정보나루 자격 확인 중 발견)

- `vault.secrets`는 Supabase Vault다 — `tistory_kakao_id`·`tistory_kakao_password`·`web_revalidate_secret`를 여기 두고 있다(`env-vars.md` 151~152행). 자격 조회 경로가 Supabase 스키마에 묶여 있으므로 비밀 저장소를 재설계할 때 함께 옮긴다.

### 서버 배포 경로·컨테이너 명명

- DB VM 배포 루트 `/opt/feelandnote/supabase/` — 실제 경로라 코드 명칭과 별개로 남아 있다(`external-services.md` 10행, `oauth-setup.md` 22행).
- 컨테이너명 `supabase-db`·`supabase-rest`, DB 역할 `supabase_auth_admin` — SQL 실행·장애 진단·컷오버 스크립트(`scripts/oracle-db/db-cutover`)가 이 이름을 쓴다.

### 클라이언트 의존

- `@supabase/supabase-js` — `sw/web`·`sw/web-bo`·`sw/remotion` 전역이 `createClient(NEXT_PUBLIC_DB_API_URL, DB_SECRET_KEY)`로 PostgREST를 부른다. 실제로는 REST 호출이므로 대체 가능하지만 사용 파일이 수백 개다.
- Auth(GoTrue) — OAuth callback `db.feelandnote.com/auth/v1/callback`, 설정은 VM `/opt/feelandnote/supabase/.env`.

### 문서 참조

- `docs/project/platform/external-services.md`, `env-vars.md`, `oauth-setup.md`, `docs/project/data/README.md`(`docker exec -i supabase-db psql`), `operations/seo.md`, `celeb-08-01-avatar.md`.

## 주의

`external-services.md`는 「upstream 기술 이름이 남아 있으므로 실제 이름은 바꾸어 적지 않는다」고 못 박았다 — 문서만 먼저 고치면 실제 컨테이너명과 어긋난다. 명명 변경은 인프라 작업과 동시에 진행한다.

---
name: oracle-web-deploy
description: Feel&Note 사용자 웹의 Oracle standalone 배포 계획, 패키징, canary, release 전환, 운영 롤백을 수행할 때 적용한다. "오라클 배포", "web 운영 배포", "release 전환", "운영 롤백" 요청에 사용한다.
---

# Oracle web deploy

사용자 웹 배포의 실행점은 `pnpm deploy:web:oracle` 하나다. 서버 주소·release 구조·systemd 계약은
`docs/project/platform/external-services.md`의 「Oracle 사용자 웹 운영」을 따른다. 스킬에 그 값을
복제하지 않는다.

## 모드

- 계획·상태 확인: 인자 없이 실행한다. 빌드·업로드·서비스 변경을 하지 않는다.
- 패키징 검증: `--package-only`를 사용한다. 격리 worktree에서 커밋을 빌드하지만 Oracle을 바꾸지 않는다.
- 실제 배포: 사용자가 이번 요청에서 운영 배포를 명시한 경우에만 `--execute`를 사용한다.

```powershell
pnpm deploy:web:oracle
pnpm deploy:web:oracle -- --package-only --ref HEAD
pnpm deploy:web:oracle -- --execute --confirm DEPLOY-FEELANDNOTE-WEB
```

확인문은 오입력 방지 장치일 뿐 사용자 권한을 대신하지 않는다.

## 실행 판단

1. 먼저 plan을 실행해 현재 release, 대상 커밋, 서비스 상태, canary 포트, Cloudflare 퍼지 계획을 읽는다.
2. 대상 커밋이 원격 브랜치에 없으면 push 여부를 사용자에게 확인한다. `--allow-unpushed`는 사용자가
   로컬 커밋 배포를 명시했을 때만 사용한다.
3. 퍼지 계획이 `manual-required`이면 미분류 파일을 조사하거나 사용자와 범위를 정한 뒤
   `--purge-scopes <scope[,scope]>`를 명시한다. `emergency-zone`을 배포 편의로 선택하지 않는다.
4. 실제 배포 권한이 있으면 execute를 한 번 실행한다. 스크립트가 build·비밀 파일 차단·junction
   복원·업로드·canary·원자적 전환·검증·실패 롤백을 소유하므로 같은 절차를 임시 명령으로 다시 쓰지 않는다.
5. 성공 출력의 `cloudflarePurgeRequired` 각 범위를 `.github/workflows/cloudflare-purge.yml`로
   비운다. `none`이면 실행하지 않는다.

## 완료 판정

다음이 모두 확인되어야 배포 완료다.

- 격리된 커밋 빌드와 Oracle Linux sharp·libvips 검사가 통과했다.
- 아카이브에 `.env*`가 없고 pnpm junction manifest가 Oracle 상대 링크로 복원됐다.
- canary의 대표 상세 HTML, 실제 셀럽 이미지, fallback이 성공했다. 두 이미지는 800×800 JPEG이며
  해시가 서로 달라야 한다.
- `current`가 새 release를 가리키고 `feelandnote-web.service`가 active다.
- Cloudflare를 통과한 공개 SEO 이미지 검증이 성공했다.
- 필요한 퍼지 범위가 처리됐다.

실패 출력에 롤백 시도가 있으면 `current`와 서비스 상태를 plan으로 다시 확인하고, 스크립트가 보존한
실패 근거를 조사한다. 성공으로 바꿔 보고하거나 새 release를 수동으로 덮어쓰지 않는다.

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

1. 먼저 plan을 실행해 현재 release, 대상 커밋, 웹·Caddy 상태, Caddy upstream, canary 포트, Cloudflare 퍼지 계획을 읽는다. 정상 시작점은 Caddy가 기본 웹 포트를 가리키는 상태다.
2. 대상 커밋이 원격 브랜치에 없으면 push 여부를 사용자에게 확인한다. `--allow-unpushed`는 사용자가
   로컬 커밋 배포를 명시했을 때만 사용한다.
3. 퍼지 계획이 `manual-required`이면 미분류 파일을 조사하거나 사용자와 범위를 정한 뒤
   `--purge-scopes <scope[,scope]>`를 명시한다. `emergency-zone`을 배포 편의로 선택하지 않는다.
4. 실제 배포 권한이 있으면 execute를 한 번 실행한다. 스크립트가 build·비밀 파일 차단·junction
   복원·비활성 Blue/Green 슬롯 교체·canary·Caddy traffic bridge·검증·실패 롤백을 소유하므로 같은 절차를 임시 명령으로 다시 쓰지 않는다. 검증된 canary는 전환 동안 운영 트래픽을 받고, 기본 웹 프로세스가 준비된 뒤 Caddy가 원래 upstream으로 돌아간다.
   Claude Code에서는 execute를 도구의 백그라운드 작업으로 돌리지 않는다. 메모리가 빠듯하면 도구가 백그라운드 작업을
   강제 종료하는데, 배포 node는 살아남아도 콘솔이 사라져 그 뒤 뜨는 Next 빌드 작업자(TypeScript 검사 단계)가
   `0xC0000142`로 죽는다. 26.09.15에 두 번 연속 이렇게 실패했고 코드·타입검사·메모리 총량은 정상이었다.
   자체 콘솔을 가진 독립 프로세스로 띄우고 로그 파일을 감시한다.

   ```powershell
   Start-Process cmd.exe -ArgumentList '/c', 'set "PATH=C:\Program Files\Git\usr\bin;%PATH%" && pnpm deploy:web:oracle -- --execute --confirm DEPLOY-FEELANDNOTE-WEB > <로그 경로> 2>&1' -WorkingDirectory <저장소 루트> -WindowStyle Hidden -PassThru
   ```

   `PATH` 앞에 Git `usr\bin`을 얹는 이유: 아카이브 단계의 `tar --force-local`은 GNU tar 옵션이라
   Windows 기본 bsdtar(`System32\tar.exe`)가 먼저 잡히면 「Option --force-local is not supported」로
   빌드 뒤에 죽는다(26.09.17 실패 이력). 같은 이유로 execute 전 ssh 키
   `~/.ssh/feelandnote_oracle`의 ACL이 사용자 본인만 읽게 좁혀져 있어야 한다 — 샌드박스 그룹
   권한이 붙어 있으면 ssh가 키를 거부한다(`icacls <키> /inheritance:r /grant:r "%USERNAME%:F"`로 복구).
5. 성공 출력의 `cloudflarePurgeRequired` 각 범위를 `pnpm purge:web:cloudflare -- --scope <범위> --execute`로
   비운다. `none`이면 실행하지 않는다. GitHub에서 돌릴 때는 `.github/workflows/cloudflare-purge.yml`을
   같은 범위로 수동 실행한다. 전체 존 퍼지는 워크플로에만 있다.

## 완료 판정

다음이 모두 확인되어야 배포 완료다.

- 격리된 커밋 빌드와 Oracle Linux sharp·libvips 검사가 통과했다.
- 아카이브에 `.env*`가 없고 pnpm junction manifest가 Oracle 상대 링크로 복원됐다.
- 비활성 Blue/Green 슬롯이 staging에서 완성됐고 활성 슬롯을 덮어쓰지 않았다.
- canary의 대표 상세 HTML, 실제 셀럽 이미지, fallback이 성공했다. 두 이미지는 800×800 JPEG이며
  해시가 서로 달라야 한다.
- canary가 `/explore`를 두 번 읽어 프로필 목록 캐시를 채웠고 두 번째 응답이 5초 안에 끝났다.
- `current`가 새 슬롯을 가리키고 `feelandnote-web.service`가 active다. Caddy는 기본 웹 포트로 돌아왔고 traffic bridge canary가 정지했다. 반대 슬롯에는 직전 정상본이 남아 있다.
- Cloudflare를 통과한 공개 SEO 이미지 검증이 성공했다.
- 필요한 퍼지 범위가 처리됐다.

실패 출력에 롤백 시도가 있으면 `current`·웹 서비스·Caddy upstream을 plan으로 다시 확인하고, 스크립트가 보존한 실패 근거를 조사한다. Caddy가 canary를 계속 가리키는 비상 상태에서는 정리 단계가 canary 종료를 거부한다. 이 프로세스를 먼저 살린 채 기본 웹 포트를 복구한다.

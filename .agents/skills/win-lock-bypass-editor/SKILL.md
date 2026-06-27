---
name: win-lock-bypass-editor
description: Windows 환경에서 Next.js 개발 서버, Linter 등의 프로세스로 인해 파일 락(Lock)이 생겨 replace_file_content나 write_to_file 같은 기본 IDE 편집 API가 무한 대기(Working...)에 빠져 뻗을 때, PowerShell Here-String 구문과 Set-Content을 이용해 파일 락을 0.1초 만에 강제로 우회하여 안전하게 수정 및 생성하는 전문 안티그래비티 스킬입니다.
---

# Windows 파일 락 우회 에디터 스킬 (Windows File Lock Bypass Editor)

이 스킬은 Windows OS 환경에서 Next.js 개발 서버가 켜져 있어 파일이 잠겼을 때, 일반적인 파일 편집 API가 락 경합으로 인해 무한 대기(Working...)에 빠지는 고질적 현상을 OS 레벨에서 완전히 우회하여 초고속으로 파일을 수정/생성하도록 가이드합니다.

---

## 🛑 파일 락 경합 문제 정의

Windows 환경에서 파일 감시자(File Watcher, Linter, tsc, Next.js Hot Reload)가 활성화되어 있을 때, IDE API 기반의 파일 쓰기 도구(replace_file_content, write_to_file)를 사용하면 다음과 같은 오류 및 무한 대기 루프가 나타납니다:
1. 사용자 화면에 Working... 표시가 뜨며 응답이 영구적으로 멈춤.
2. Windows 파일 핸들 점유 충돌로 인한 에러 반환.

이 현상이 감지되거나 Next.js 앱이 로컬에서 실행 중일 때는, 절대 기본 API 툴을 사용하지 말고 본 스킬의 **2단계 원자적 락 우회 프로토콜**을 적용해야 합니다.

---

## ⚡ 2단계 원자적 락 우회 프로토콜 (2-Step Atomic Lock Bypass Protocol)

Windows 파일 락을 우회하여 100% 안전하고 즉각적으로 파일을 쓰거나 덮어쓰기 위해, 임시 파일 작성 후 헬퍼 스크립트를 통한 교체 방식을 사용합니다.

### 1단계: 빌드 프로세스가 감시하지 않는 안전한 경로에 임시 파일 생성
Next.js가 감시(watch)하지 않는 빌드 외 구역인 `.agents/` 디렉토리 아래에 수정된 파일 전체 내용을 가진 임시 파일을 생성합니다.
* **임시 파일 생성 경로**: `c:\project\feelandnote\.agents\skills\win-lock-bypass-editor\scripts\temp_swap.tmp`
* **도구**: `run_command`를 통해 파워쉘 명령어로 직접 쓰거나 혹은 `write_to_file` 사용 (임시 파일이므로 락 충돌이 없음).
* **파워쉘을 통한 쓰기 템플릿**:
  ```powershell
  $code = @'
  [파일 전체 소스코드 내용]
  '@
  $code | Set-Content -Path "c:\project\feelandnote\.agents\skills\win-lock-bypass-editor\scripts\temp_swap.tmp" -Encoding utf8
  ```

### 2단계: 헬퍼 스크립트를 통한 원자적 대체 실행
작성된 임시 파일을 본래 대상 파일 경로로 덮어씌웁니다. 헬퍼 스크립트는 파일 락 발생 시 최대 5회 지수 백오프 재시도를 내장하고 있어 공유 위반을 완벽하게 극복합니다.
* **도구**: `run_command`
* **호출 명령어**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File c:\project\feelandnote\.agents\skills\win-lock-bypass-editor\scripts\bypass-writer.ps1 -FilePath "[원본 파일 절대 경로]" -TempPath "c:\project\feelandnote\.agents\skills\win-lock-bypass-editor\scripts\temp_swap.tmp"
  ```

### ⚠️ 작성 시 핵심 주의사항 (Critical Rules)
1. **Here-String 기호 독립성**:
   시작 기호인 `@' 와 종료 기호인 '@ 는 반드시 해당 라인의 맨 첫 칸(공백이나 들여쓰기 없음)에 단독으로 위치해야 합니다. 종료 기호 앞에 공백이나 탭이 있으면 PowerShell 파서가 구문 오류를 뱉습니다.
2. **한글 인코딩 보장**:
   반드시 `Set-Content` 뒤에 `-Encoding utf8` 파라미터를 명시하여 한글이나 유니코드 특수문자가 깨지지 않고 정밀하게 저장되도록 하십시오.
3. **비동기 대기 방지 (WaitMsBeforeAsync)**:
   `run_command` 도구 호출 시 `WaitMsBeforeAsync`를 적절히 설정하여, 백그라운드 전환 없이 즉시 처리가 완료되도록 통제하십시오.

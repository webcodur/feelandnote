# 사운드 이펙트 시스템

게임처럼 UI 인터랙션에 사운드 이펙트를 제공하는 시스템.

## 사운드 파일 목록

`public/sounds/` 폴더에 아래 mp3 파일들을 추가해야 한다:

| 파일명 | 용도 | 권장 길이 | 톤 |
|--------|------|-----------|-----|
| `click.mp3` | 버튼, 탭, 칩 클릭 | 50~100ms | 짧고 가벼운 틱 |
| `success.mp3` | 저장 완료, 삭제 완료 | 300~500ms | 밝고 상승하는 음 |
| `error.mp3` | 오류 발생, 실패 | 200~400ms | 낮고 둔탁한 음 |
| `toggle.mp3` | 체크박스, 토글 스위치 | 100~150ms | 스위치 느낌 |
| `modal-open.mp3` | 모달/드롭다운 열기 | 150~250ms | 팝업 느낌 |
| `modal-close.mp3` | 모달/드롭다운 닫기 | 100~200ms | 닫히는 느낌 |
| `unlock.mp3` | 칭호 해금 (일반~희귀) | 500~800ms | 팡파르/축하 |
| `unlock-epic.mp3` | 칭호 해금 (에픽~전설) | 1~1.5s | 웅장한 축하 |
| `star.mp3` | 별점 클릭 | 100~150ms | 반짝이는 느낌 |
| `drag.mp3` | 드래그 시작 | 100~200ms | 물체 집는 소리 |
| `drop.mp3` | 드롭 완료 | 100~200ms | 물체 놓는 소리 |
| `game-start.mp3` | 게임 시작 | 500~800ms | 게임 시작 효과음 |
| `game-correct.mp3` | 게임 정답 | 300~500ms | 정답 효과음 |
| `game-wrong.mp3` | 게임 오답 | 300~500ms | 오답 효과음 |
| `game-end.mp3` | 게임 종료 | 500~800ms | 게임 종료 효과음 |
| `volume-check.mp3` | 볼륨 확인 (사운드 켤 때) | 1~2s | 확인용 멜로디 |

### 무료 사운드 다운로드 사이트

- [Mixkit](https://mixkit.co/free-sound-effects/click/)
- [Pixabay](https://pixabay.com/sound-effects/search/ui%20click/)
- [Freesound](https://freesound.org/)
- [Zapsplat](https://www.zapsplat.com/)

---

## 사용법

### 1. 기본 사용 (useSound 훅)

```tsx
import { useSound } from "@/contexts/SoundContext";

function MyComponent() {
  const { playSound } = useSound();

  const handleSave = async () => {
    try {
      await saveData();
      playSound("success");
    } catch {
      playSound("error");
    }
  };

  return <button onClick={handleSave}>저장</button>;
}
```

### 2. Button 컴포넌트 (자동 클릭 사운드)

Button 컴포넌트는 기본적으로 클릭 시 `click` 사운드를 재생한다.

```tsx
// 자동 클릭 사운드
<Button variant="primary">저장</Button>

// 클릭 사운드 비활성화
<Button variant="primary" noSound>무음 버튼</Button>
```

### 3. 사운드 토글 (헤더)

헤더에 Volume 아이콘이 있다. 클릭하면 사운드 온/오프 전환.
설정은 localStorage에 저장되어 새로고침 후에도 유지된다.

---

## 아키텍처

### 핵심 파일

```
src/contexts/SoundContext.tsx   # 전역 사운드 상태 관리
src/components/ui/Button.tsx    # 자동 클릭 사운드 적용
src/app/layout.tsx              # SoundProvider 래핑
```

### 사운드 타입

```typescript
type SoundType =
  | "click"        // 버튼, 탭, 칩 클릭
  | "success"      // 저장 완료, 삭제 완료
  | "error"        // 오류 발생, 실패
  | "toggle"       // 체크박스, 토글 스위치
  | "modalOpen"    // 모달/드롭다운 열기
  | "modalClose"   // 모달/드롭다운 닫기
  | "unlock"       // 칭호 해금 (일반~희귀)
  | "unlockEpic"   // 칭호 해금 (에픽~전설)
  | "star"         // 별점 클릭
  | "drag"         // 드래그 시작
  | "drop"         // 드롭 완료
  | "gameStart"    // 게임 시작
  | "gameCorrect"  // 게임 정답
  | "gameWrong"    // 게임 오답
  | "gameEnd"      // 게임 종료
  | "volumeCheck"; // 볼륨 확인 (사운드 켤 때)
```

### Context API

```typescript
interface SoundContextValue {
  isSoundEnabled: boolean;    // 사운드 활성화 상태
  toggleSound: () => void;    // 온/오프 토글
  playSound: (type: SoundType) => void; // 사운드 재생
}
```

---

## 적용된 컴포넌트 목록

### 성공/실패 피드백

| 컴포넌트 | 파일 | 사운드 |
|----------|------|--------|
| 콘텐츠 추가 | `AddContentModal.tsx` | success / error |
| 티어 저장 | `TierEditView.tsx` | success / error |
| 방명록 작성 | `WriteForm.tsx` | success / error |

### 모달/드롭다운

| 컴포넌트 | 파일 | 사운드 |
|----------|------|--------|
| 모달 | `Modal.tsx` | modalOpen / modalClose |
| 드롭다운 메뉴 | `DropdownMenu.tsx` | modalOpen / modalClose |

### 토글/스위치

| 컴포넌트 | 파일 | 사운드 |
|----------|------|--------|
| 스포일러 토글 | `MyReviewSection.tsx` | toggle |
| 비밀글 토글 | `WriteForm.tsx` | toggle |

### 별점/드래그

| 컴포넌트 | 파일 | 사운드 |
|----------|------|--------|
| 별점 | `MyReviewSection.tsx` | star |
| 티어 드래그 | `TierEditView.tsx` | drag / drop |

### 칭호 시스템

| 컴포넌트 | 파일 | 사운드 |
|----------|------|--------|
| 칭호 해금 | `AchievementUnlockModal.tsx` | unlock / unlockEpic |

### 블라인드 게임

| 컴포넌트 | 파일 | 사운드 |
|----------|------|--------|
| 정답 | `GameStates.tsx` | gameCorrect |
| 오답 | `GameStates.tsx` | gameWrong |
| 게임 종료 | `GameStates.tsx` | gameEnd |

---

## 주의사항

1. **기본값은 사운드 꺼짐** - 사용자가 직접 켜야 함
2. **브라우저 자동재생 정책** - 사용자 인터랙션 후에만 사운드 재생 가능
3. **볼륨** - 기본 0.3 (30%)으로 설정되어 있음
4. **캐싱** - Audio 객체를 미리 로드하여 지연 없이 재생

/* body 스크롤 잠금 — 중첩 모달이 어떤 순서로 닫혀도 마지막 잠금이 풀릴 때까지 유지한다.
   각자 previousOverflow를 저장·복원하면 아래가 먼저 풀리고 위가 "hidden"을 다시 써
   페이지가 영구 잠기는 사고가 난다(장면 뷰어+확대 창 동시 언마운트에서 확인). */
let lockCount = 0;
let savedOverflow: string | null = null;
let rootLockCount = 0;
let savedRootOverflow: string | null = null;

export function lockBodyScroll() {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount++;
}

export function unlockBodyScroll() {
  if (lockCount === 0) return;
  lockCount--;
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow ?? "";
    savedOverflow = null;
  }
}

// 전체화면 지구본처럼 html까지 잠그는 화면도 body의 공용 잠금에 참여한다.
// html은 별도로 세어 일반 모달이 남아 있어도 지구본의 마지막 잠금이 풀리면 복원한다.
export function lockDocumentScroll() {
  lockBodyScroll();
  if (rootLockCount === 0) {
    savedRootOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
  }
  rootLockCount++;
}

export function unlockDocumentScroll() {
  if (rootLockCount === 0) return;
  rootLockCount--;
  if (rootLockCount === 0) {
    document.documentElement.style.overflow = savedRootOverflow ?? "";
    savedRootOverflow = null;
  }
  unlockBodyScroll();
}

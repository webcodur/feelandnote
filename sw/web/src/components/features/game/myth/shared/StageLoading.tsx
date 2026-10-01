/*
  파일명: components/features/game/myth/shared/StageLoading.tsx
  기능: 신화 게임 판 준비 표시
  책임: 얼굴을 받는 동안 금빛 고리가 도는 표시와 한 줄 안내를 가운데 둔다. 움직임을 줄인 사람에게는 고리를 멈춘다.
*/ // ------------------------------

export default function StageLoading({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-1 flex-col items-center justify-center gap-5 py-10">
      <span aria-hidden className="relative h-16 w-16">
        <span className="absolute inset-0 rounded-full border-2 border-accent-dim/60" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent motion-reduce:animate-none" />
        <span className="absolute inset-5 rotate-45 border border-accent bg-bg-main" />
      </span>
      <p className="text-base font-semibold text-text-primary">{label}</p>
    </div>
  );
}

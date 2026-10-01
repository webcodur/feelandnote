/*
  파일명: components/features/game/myth/shared/PortraitFrame.tsx
  기능: 신화 게임 인물 사진 액자
  책임: 장면의 주인공 사진을 금테·안쪽 선·위쪽 꺾쇠를 두른 액자에 넣고 아래 어둠 위에 이름과 호칭을 적는다.
        band는 휴대폰에서 가로 띠(얼굴이 잘리지 않게 위쪽을 맞춘다)로 눌렀다가 넓은 PC에서 세로 초상으로 선다.
        portrait는 어디서나 세로 초상이다.
*/ // ------------------------------
"use client";

interface Props {
  src: string | null;
  name: string;
  title?: string | null;
  shape?: "band" | "portrait";
  className?: string;
}

const SHAPE = {
  band: "aspect-[2/1] sm:aspect-[5/2] lg:aspect-[4/5]",
  portrait: "aspect-[4/5]",
} as const;

const CORNER = "pointer-events-none absolute h-4 w-4 border-accent";

export default function PortraitFrame({ src, name, title, shape = "band", className = "" }: Props) {
  return (
    <figure className={`relative isolate mx-auto w-full overflow-hidden rounded-2xl border border-accent-dim bg-bg-card shadow-[0_28px_70px_-28px_rgba(var(--color-accent-rgb),0.45)] ${SHAPE[shape]} ${className}`}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_22%]" />
      )}
      <span aria-hidden className="pointer-events-none absolute inset-2 rounded-xl border border-accent/30" />
      <span aria-hidden className={`${CORNER} start-3 top-3 border-s-2 border-t-2`} />
      <span aria-hidden className={`${CORNER} end-3 top-3 border-e-2 border-t-2`} />
      <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-bg-main via-bg-main/80 to-transparent px-4 pb-3.5 pt-12">
        <p className="text-lg font-black tracking-tight text-text-primary sm:text-xl">{name}</p>
        {title && <p className="line-clamp-1 text-sm text-text-secondary">{title}</p>}
      </figcaption>
    </figure>
  );
}

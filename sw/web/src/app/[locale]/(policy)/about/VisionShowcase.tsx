/*
  파일명: /app/(policy)/about/VisionShowcase.tsx
  기능: 서비스 소개 지향점 구획의 실물 예시 그림
  책임: 네 항목이 각각 "무엇을 만든다"고 말한 것을 실제 데이터 한 컷으로 보여 준다.
        조회는 getAboutShowcase가 맡고 여기서는 배치만 한다.

  여기의 그림은 설명을 돕는 예시일 뿐 누를 것이 아니다. 읽는 중에 다른 화면으로
  튕겨 나가지 않도록 어디로도 이어 두지 않는다.
*/ // ------------------------------

import Image from "next/image";
import type { AboutInfo, AboutShowcase } from "@/actions/policy/getAboutShowcase";
import InfoPeek from "./InfoPeek";

interface Props {
  index: 1 | 2 | 3 | 4;
  data: AboutShowcase;
  labels: { facesNote: string; yourSlot: string };
}

function Face({
  name,
  avatarUrl,
  caption,
  info,
  size = "md",
}: {
  name: string;
  avatarUrl: string;
  caption?: string;
  info: AboutInfo;
  size?: "md" | "lg";
}) {
  const box = size === "lg" ? "w-20 h-20 md:w-24 md:h-24" : "w-14 h-14 md:w-16 md:h-16";
  return (
    <InfoPeek info={info} className="shrink-0">
      <span className="flex flex-col items-center gap-1.5">
        <span
          className={`relative block ${box} rounded-full overflow-hidden border border-border hover:border-accent-primary`}
        >
          <Image src={avatarUrl} alt={name} fill sizes="96px" className="object-cover" />
        </span>
        <span className="text-[11px] text-text-secondary text-center leading-tight w-16 truncate">
          {name}
        </span>
        {caption && <span className="text-[10px] text-text-secondary/60">{caption}</span>}
      </span>
    </InfoPeek>
  );
}

export default function VisionShowcase({ index, data, labels }: Props) {
  if (index === 1) {
    if (!data.faces.length) return null;
    return (
      <div className="pt-2 space-y-2">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {data.faces.map((f) => (
            <Face
              key={f.slug ?? f.name}
              name={f.name}
              avatarUrl={f.avatarUrl}
              caption={f.deathLabel}
              info={f.info}
            />
          ))}
        </div>
        <p className="text-[11px] text-text-secondary/70 leading-relaxed">{labels.facesNote}</p>
      </div>
    );
  }

  if (index === 2) {
    if (!data.teamShots.length) return null;
    return (
      <div className="pt-2 grid gap-3 sm:grid-cols-2">
        {data.teamShots.map((shot) => (
          <InfoPeek key={shot.url} info={shot.info} className="block">
            <span className="flex flex-col gap-1.5">
              <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-md border border-border hover:border-accent-primary">
                <Image
                  src={shot.url}
                  alt={shot.label ?? shot.tagName}
                  fill
                  sizes="(max-width: 640px) 100vw, 320px"
                  className="object-cover"
                />
              </span>
              <span className="text-[11px] text-text-secondary">
                {shot.tagName}
                {shot.label ? ` · ${shot.label}` : ""}
              </span>
            </span>
          </InfoPeek>
        ))}
      </div>
    );
  }

  // 03 — 한 사람이 작품마다 무슨 말을 남겼는지, 작품과 말을 한 줄에 붙여 보여 준다
  if (index === 3) {
    const j = data.journey;
    if (!j) return null;
    return (
      <div className="pt-3 flex gap-3 sm:gap-4">
        <div className="shrink-0">
          <Face name={j.name} avatarUrl={j.avatarUrl} info={j.face} size="lg" />
        </div>

        <ul className="flex-1 min-w-0 space-y-2.5">
          {j.items.map((it) => (
            <li key={it.thumbnailUrl} className="flex items-center gap-2.5">
              <span aria-hidden className="text-accent-primary/50 text-sm leading-none shrink-0">
                →
              </span>
              <InfoPeek info={it.info} className="flex-1 min-w-0">
                <span className="flex items-center gap-2.5">
                  <span className="relative block w-9 aspect-[2/3] shrink-0 overflow-hidden rounded-sm border border-border hover:border-accent-primary">
                    <Image
                      src={it.thumbnailUrl}
                      alt={it.title}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  </span>
                  <span className="min-w-0 rounded-lg border border-border bg-bg-main/60 px-2.5 py-1.5">
                    <span className="block text-[11px] text-text-primary/90 font-medium truncate">
                      {it.title}
                    </span>
                    <span className="block text-[11px] leading-relaxed text-text-secondary line-clamp-2">
                      {it.quote}
                    </span>
                  </span>
                </span>
              </InfoPeek>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // 04 — 인물들 옆에 비어 있는 한 자리를 둔다. 첫 항목에 쓴 얼굴과 겹치지 않게 뒤쪽을 쓴다
  const some = data.faces.slice(4, 8);
  if (!some.length) return null;
  return (
    <div className="pt-2 flex items-start gap-3">
      {some.map((f) => (
        <Face key={f.slug ?? f.name} name={f.name} avatarUrl={f.avatarUrl} info={f.info} />
      ))}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-dashed border-accent-primary/50 flex items-center justify-center text-accent-primary/70 text-xl">
          +
        </div>
        <span className="text-[11px] text-accent-primary/80 text-center w-16">{labels.yourSlot}</span>
      </div>
    </div>
  );
}

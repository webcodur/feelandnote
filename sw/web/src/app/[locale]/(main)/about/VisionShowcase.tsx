/*
  파일명: /app/(policy)/about/VisionShowcase.tsx
  기능: 서비스 소개 지향점 구획의 실물 예시 그림
  책임: 네 항목이 각각 "무엇을 만든다"고 말한 것을 실제 데이터 한 컷으로 보여 준다.
        조회는 getAboutShowcase가 맡고 여기서는 배치만 한다.

  여기의 그림은 설명을 돕는 예시일 뿐 다른 화면으로 넘기지 않는다. 누르면 그 자리에서
  짧은 안내만 뜬다. 글자는 code-rules.md 기준(14px 이상·또렷한 색)을 지킨다.
*/ // ------------------------------

import Image from "next/image";
import ContentImage from "@/components/ui/ContentImage";
import type { AboutInfo, AboutShowcase } from "@/actions/policy/getAboutShowcase";
import InfoPeek from "./InfoPeek";
import FactionCarousel from "./FactionCarousel";

interface Props {
  index: 1 | 2 | 3 | 4;
  data: AboutShowcase;
  labels: { facesNote: string; yourSlot: string; prev: string; next: string };
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
  const box = size === "lg" ? "w-24 h-24 md:w-28 md:h-28" : "w-16 h-16 md:w-20 md:h-20";
  const width = size === "lg" ? "w-28" : "w-20";
  return (
    <InfoPeek info={info} className="shrink-0">
      <span className="flex flex-col items-center gap-2">
        <span
          className={`relative block ${box} rounded-full overflow-hidden border border-accent-dim hover:border-accent`}
        >
          <Image src={avatarUrl} alt={name} fill sizes="112px" className="object-cover" />
        </span>
        <span className={`text-sm text-text-primary text-center leading-tight ${width} truncate`}>
          {name}
        </span>
        {caption && <span className="text-sm text-text-secondary">{caption}</span>}
      </span>
    </InfoPeek>
  );
}

export default function VisionShowcase({ index, data, labels }: Props) {
  if (index === 1) {
    const faces = data.faces.filter(
      (face) => face.slug !== "elon-musk" && face.slug !== "mark-zuckerberg",
    );
    if (!faces.length) return null;
    return (
      <div className="pt-3 space-y-3">
        <div className="flex gap-4 overflow-x-auto pb-2">
          {faces.map((f) => (
            <Face
              key={f.slug ?? f.name}
              name={f.name}
              avatarUrl={f.avatarUrl}
              caption={f.deathLabel}
              info={f.info}
            />
          ))}
        </div>
        <p className="text-sm leading-relaxed text-text-secondary">{labels.facesNote}</p>
      </div>
    );
  }

  // 02 — 대표 세력을 한 장씩 크게 넘겨 본다. 여러 장을 줄여 늘어놓으면 누가 누구인지 안 읽힌다
  if (index === 2) {
    if (!data.teamShots.length) return null;
    return <FactionCarousel shots={data.teamShots} labels={{ prev: labels.prev, next: labels.next }} />;
  }

  // 03 — 한 사람이 작품마다 무슨 말을 남겼는지, 작품과 말을 한 줄에 붙여 보여 준다
  if (index === 3) {
    const j = data.journey;
    if (!j) return null;
    return (
      <div className="pt-3 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
        <div className="shrink-0">
          <Face name={j.name} avatarUrl={j.avatarUrl} info={j.face} size="lg" />
        </div>

        <ul className="flex-1 min-w-0 space-y-3">
          {j.items.map((it) => (
            <li key={it.thumbnailUrl} className="flex items-center gap-3">
              <span aria-hidden className="text-accent text-lg leading-none shrink-0">
                →
              </span>
              <InfoPeek info={it.info} className="flex-1 min-w-0">
                <span className="flex items-center gap-3">
                  <span className="relative block w-12 aspect-[2/3] shrink-0 overflow-hidden rounded-sm border border-accent-dim hover:border-accent">
                    <ContentImage
                      src={it.thumbnailUrl}
                      alt={it.title}
                      sizes="48px"
                    />
                  </span>
                  <span className="min-w-0 engraved-plate rounded-lg px-3 py-2">
                    <span className="block text-sm text-text-primary font-medium truncate">
                      {it.title}
                    </span>
                    <span className="block text-sm leading-relaxed text-text-secondary line-clamp-2">
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
    <div className="pt-3 flex items-start gap-4 overflow-x-auto pb-2">
      {some.map((f) => (
        <Face key={f.slug ?? f.name} name={f.name} avatarUrl={f.avatarUrl} info={f.info} />
      ))}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-dashed border-accent flex items-center justify-center text-accent text-2xl">
          +
        </div>
        <span className="text-sm text-accent text-center w-20">{labels.yourSlot}</span>
      </div>
    </div>
  );
}

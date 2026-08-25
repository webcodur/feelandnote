/*
  파일명: /components/lab/CelebWorldsPreview.tsx
  기능: 세계 배너·액자·직군 물건 시안과 배정 점검
  책임: 인물마다 화면이 실제로 얼마나 갈리는지 한자리에서 확인시킨다.
*/

import CelebProfessionMark, { PROFESSION_MARKS } from "@/components/features/celeb/CelebProfessionMark";
import CelebWorldBanner from "@/components/features/celeb/CelebWorldBanner";
import CelebWorldFrame from "@/components/features/celeb/CelebWorldFrame";
import { CELEB_WORLDS, getCelebWorld, resolveCelebWorld } from "@/lib/celeb/world";
import { getWorldBannerImages } from "@/lib/celeb/worldImages";
import { formatSectionNumber, getWorldStyle, type WorldFrame } from "@/lib/celeb/worldStyle";

/* 실제 DB 값을 그대로 옮겼다. 규칙을 고칠 때 이 표부터 확인한다 */
const SAMPLES = [
  { name: "공자", nationality: "CN", birthDate: "-551", profession: "humanities_scholar" },
  { name: "소크라테스", nationality: "GR", birthDate: "-470", profession: "humanities_scholar" },
  { name: "율리우스 카이사르", nationality: "IT", birthDate: "-100", profession: "politician" },
  { name: "광개토대왕", nationality: "KR", birthDate: "374", profession: "commander" },
  { name: "살라딘", nationality: "EG", birthDate: "1137", profession: "commander" },
  { name: "칭기즈 칸", nationality: "MN", birthDate: "1162", profession: "commander" },
  { name: "세종대왕", nationality: "KR", birthDate: "1397", profession: "politician" },
  { name: "오다 노부나가", nationality: "JP", birthDate: "1534", profession: "commander" },
  { name: "이순신", nationality: "KR", birthDate: "1545", profession: "commander" },
  { name: "아이작 뉴턴", nationality: "GB", birthDate: "1643", profession: "scientist" },
  { name: "정조", nationality: "KR", birthDate: "1752", profession: "politician" },
  { name: "나폴레옹 보나파르트", nationality: "FR", birthDate: "1769", profession: "commander" },
  { name: "에이브러햄 링컨", nationality: "US", birthDate: "1809", profession: "politician" },
  { name: "마하트마 간디", nationality: "IN", birthDate: "1869", profession: "leader" },
  { name: "넬슨 만델라", nationality: "ZA", birthDate: "1918", profession: "politician" },
  { name: "스티브 잡스", nationality: "US", birthDate: "1955", profession: "entrepreneur" },
  { name: "리오넬 메시", nationality: "AR", birthDate: "1987", profession: "athlete" },
  { name: "감녕", nationality: "CN", birthDate: null, deathDate: "215", profession: "commander" },
  { name: "관평(연도 없음)", nationality: "CN", birthDate: null, profession: "commander" },
];

/* 화면 전체가 얼마나 갈리는지 보려고 고른 세 명 */
const SHOWCASE = [SAMPLES[8], SAMPLES[2], SAMPLES[15]];

const SECTION_TITLES = ["인물 소개", "기록물", "행적", "인연", "수치 분석", "이야기", "방명록"];

const FRAME_LABELS: { frame: WorldFrame; label: string; world: string }[] = [
  { frame: "wood", label: "목판 — 동아시아 전근대", world: "joseon" },
  { frame: "stone", label: "석재 — 고대 지중해·근동", world: "rome" },
  { frame: "gilt", label: "금선 — 르네상스~제정", world: "renaissance" },
  { frame: "plain", label: "민무늬 — 근현대", world: "modern-america" },
];

function PhotoStand({ name }: { name: string }) {
  return (
    <div className="flex h-28 w-28 items-center justify-center bg-bg-secondary font-serif text-2xl text-accent/40">
      {name.charAt(0)}
    </div>
  );
}

export default function CelebWorldsPreview() {
  const drawnCount = CELEB_WORLDS.filter((world) => getWorldBannerImages(world.id)).length;
  const missingCount = CELEB_WORLDS.length - drawnCount;

  return (
    <div className="space-y-12">
      <p className="text-center text-sm text-text-secondary">
        세계 {CELEB_WORLDS.length}개 · 운영 배너 {drawnCount}개
        {missingCount > 0 ? ` · 파일 없는 ${missingCount}개만 임시 무늬` : " · 전 세계 준비 완료"}
      </p>

      {/* 한 인물의 화면이 통째로 얼마나 갈리나 */}
      <section className="space-y-4">
        <h3 className="font-cinzel text-lg tracking-[0.2em] text-accent">인물별 화면 대조</h3>
        <div className="grid gap-6 lg:grid-cols-3">
          {SHOWCASE.map((person) => {
            const worldId = resolveCelebWorld(person);
            const world = getCelebWorld(worldId);
            const style = getWorldStyle(worldId);

            return (
              <div key={person.name} className="overflow-hidden rounded-sm border border-white/10">
                <CelebWorldBanner worldId={worldId} compact />
                <div className="space-y-4 p-4">
                  <div className="flex items-start gap-4">
                    <CelebWorldFrame frame={style.frame}>
                      <PhotoStand name={person.name} />
                    </CelebWorldFrame>
                    <div className="min-w-0 space-y-1">
                      <p className="font-serif text-lg text-text-primary">{person.name}</p>
                      <p className="text-xs text-text-secondary">{world.label}</p>
                    </div>
                  </div>

                  {/* 구획 제목 줄 — 번호 표기와 직군 물건이 스크롤 내내 반복된다 */}
                  <div className="space-y-2 border-t border-white/10 pt-3">
                    {SECTION_TITLES.slice(0, 4).map((title, index) => (
                      <div key={title} className="flex items-center gap-2.5">
                        <span className="w-7 shrink-0 font-mono text-sm text-accent/70">
                          {formatSectionNumber(index + 1, style.numerals)}
                        </span>
                        <CelebProfessionMark profession={person.profession} size={18} />
                        <span className="text-sm text-text-primary">{title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 직군 물건 */}
      <section className="space-y-3">
        <h3 className="font-cinzel text-lg tracking-[0.2em] text-accent">직군 물건 {Object.keys(PROFESSION_MARKS).length}종</h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {Object.keys(PROFESSION_MARKS).map((profession) => (
            <div
              key={profession}
              className="flex flex-col items-center gap-2 rounded-sm border border-white/10 py-3"
            >
              <CelebProfessionMark profession={profession} size={26} />
              <span className="font-mono text-[11px] text-text-secondary">{profession}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 액자 */}
      <section className="space-y-3">
        <h3 className="font-cinzel text-lg tracking-[0.2em] text-accent">사진 틀 4종</h3>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          {FRAME_LABELS.map(({ frame, label, world }) => (
            <div key={frame} className="flex flex-col items-center gap-2">
              <CelebWorldFrame frame={frame}>
                <PhotoStand name={getCelebWorld(world).label} />
              </CelebWorldFrame>
              <span className="text-center text-[11px] text-text-secondary">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 배정 점검 */}
      <section className="space-y-3">
        <h3 className="font-cinzel text-lg tracking-[0.2em] text-accent">배정 점검</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-text-secondary">
                <th className="py-2 pr-4 font-medium">인물</th>
                <th className="py-2 pr-4 font-medium">국적·연도</th>
                <th className="py-2 pr-4 font-medium">배정된 세계</th>
                <th className="py-2 font-medium">틀 · 번호</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLES.map((sample) => {
                const worldId = resolveCelebWorld(sample);
                const style = getWorldStyle(worldId);
                const neutral = worldId === "neutral";
                return (
                  <tr key={sample.name} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-text-primary">{sample.name}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-text-secondary">
                      {sample.nationality} · {sample.birthDate ?? sample.deathDate ?? "미상"}
                    </td>
                    <td className={`py-2 pr-4 ${neutral ? "text-amber-300/80" : "text-accent"}`}>
                      {getCelebWorld(worldId).label}
                    </td>
                    <td className="py-2 font-mono text-xs text-text-secondary">
                      {style.frame} · {formatSectionNumber(3, style.numerals)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 세계별 배너 */}
      <section className="space-y-4">
        <h3 className="font-cinzel text-lg tracking-[0.2em] text-accent">세계별 배너</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {CELEB_WORLDS.map((world) => (
            <div key={world.id} className="overflow-hidden rounded-sm border border-white/10">
              <CelebWorldBanner worldId={world.id} compact />
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="text-text-primary">{world.label}</span>
                <span className="font-mono text-text-secondary">
                  {getWorldBannerImages(world.id) ? "그림 있음" : "임시 무늬"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

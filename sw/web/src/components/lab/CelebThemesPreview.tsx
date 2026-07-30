import ClassicalBox from "@/components/ui/ClassicalBox";
import { CelebThemeHero, CelebThemeScope } from "@/components/features/celeb/CelebTheme";
import {
  getContrastRatio,
  resolveCelebTheme,
  type CelebThemeInput,
} from "@/lib/celeb/theme";

interface ThemeSample extends CelebThemeInput {
  name: string;
  professionLabel: string;
}

const THEME_SAMPLES: readonly ThemeSample[] = [
  { name: "알렉산드로스", slug: "alexander-the-great", profession: "commander", professionLabel: "지휘관", birthDate: "-356" },
  { name: "버지니아 울프", slug: "virginia-woolf", profession: "author", professionLabel: "작가", birthDate: "1882" },
  { name: "마리 퀴리", slug: "marie-curie", profession: "scientist", professionLabel: "과학자", birthDate: "1867" },
  { name: "구로사와 아키라", slug: "akira-kurosawa", profession: "director", professionLabel: "감독", birthDate: "1910" },
  { name: "프린스", slug: "prince", profession: "musician", professionLabel: "음악인", birthDate: "1958" },
  { name: "스티브 잡스", slug: "steve-jobs", profession: "entrepreneur", professionLabel: "기업가", birthDate: "1955" },
  { name: "세리나 윌리엄스", slug: "serena-williams", profession: "athlete", professionLabel: "스포츠인", birthDate: "1981" },
  { name: "아테나", slug: "athena", profession: "leader", professionLabel: "신화 인물", tier: "fiction" },
];

function AssignmentGuide() {
  const rows = [
    ["왕관의 전당", "지도자 · 정치인 · 지휘관"],
    ["잉크의 서고", "작가 · 인문학자"],
    ["탐구의 궤도", "과학자 · 사회과학자"],
    ["장면의 극장", "감독 · 배우 · 인플루언서"],
    ["공명의 방", "음악인 · 미술인"],
    ["개척의 공방", "기업가 · 투자자"],
    ["승부의 경기장", "스포츠인"],
    ["신화의 밤", "fiction 인물 전체"],
  ] as const;
  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map(([theme, professions]) => (
        <div key={theme} className="bg-[#090909] p-4">
          <p className="text-sm font-bold text-text-primary">{theme}</p>
          <p className="mt-1 text-sm text-text-secondary">{professions}</p>
        </div>
      ))}
    </div>
  );
}

export default function CelebThemesPreview() {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
        <h3 className="text-lg font-bold text-text-primary">자동 배정 원칙</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          fiction 여부를 먼저 보고 직군으로 큰 계열을 정합니다. 같은 계열 안에서는 인물 주소값으로 세 가지 색과 배경 초점을 안정적으로 바꾸며, 시대에 따라 바탕 결을 달리합니다.
        </p>
        <div className="mt-4"><AssignmentGuide /></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {THEME_SAMPLES.map((sample) => {
          const theme = resolveCelebTheme(sample);
          const ratios = theme.accents.map((accent) => getContrastRatio(accent.hex, theme.background));
          const minimumRatio = Math.min(...ratios);
          return (
            <article key={theme.id} className="overflow-hidden rounded-xl border border-white/15 bg-black">
              <CelebThemeScope theme={theme}>
                <CelebThemeHero
                  compact
                  title={`${sample.name}의 기록관`}
                  subtitle="Legacy Archive"
                  theme={theme}
                />
                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-cinzel text-sm font-bold uppercase tracking-[0.16em] text-accent">{theme.labelEn}</p>
                      <h3 className="mt-1 text-xl font-black text-text-primary">{theme.labelKo}</h3>
                      <p className="mt-1 text-sm text-text-secondary">{theme.description}</p>
                    </div>
                    <div className="rounded-md border border-accent-dim/40 bg-bg-secondary px-3 py-2 text-right">
                      <p className="text-sm font-bold text-accent">AA {minimumRatio.toFixed(1)}:1</p>
                      <p className="text-sm text-text-secondary">최저 강조색 대비</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" aria-label="이 계열의 인물별 색상 변형">
                    {theme.accents.map((accent, index) => (
                      <span
                        key={accent.hex}
                        className="flex h-8 flex-1 items-center justify-center rounded border border-white/15 text-sm font-bold text-black"
                        style={{ backgroundColor: accent.hex }}
                      >
                        {index + 1}
                      </span>
                    ))}
                  </div>

                  <ClassicalBox hover={false} className="p-4">
                    <p className="text-sm font-bold text-accent">01 · 인물 소개</p>
                    <p className="mt-2 text-lg font-black text-text-primary">{sample.professionLabel} {sample.name}</p>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      실제 상세 화면과 같은 색상 토큰과 장식 상자를 사용한 축소 비교입니다. 아래 구획과 조작부도 이 강조색을 함께 이어받습니다.
                    </p>
                    <div className="mt-4 flex gap-2 border-t border-accent-dim/30 pt-4">
                      <span className="rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-bg-main">선택됨</span>
                      <span className="rounded-full border border-accent-dim/50 px-3 py-1.5 text-sm text-text-secondary">다른 구획</span>
                    </div>
                  </ClassicalBox>

                  <p className="text-sm text-text-secondary">
                    배정값: <span className="font-mono text-accent">{sample.profession ?? "fiction"} · {theme.era} · 변형 {theme.variation + 1}</span>
                  </p>
                </div>
              </CelebThemeScope>
            </article>
          );
        })}
      </div>
    </div>
  );
}

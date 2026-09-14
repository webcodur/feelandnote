"use client";

import type { JourneyId } from "./catalog";
import { PRINT_SIZES, type JourneySelection } from "./choices";

const control = "min-h-11 rounded-lg border px-3 py-2 text-left text-sm outline-none hover:border-accent hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-accent";
function Choices<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string; detail?: string }[]; onChange: (value: T) => void;
}) {
  return <fieldset className="min-w-0 space-y-2">
    <legend className="mb-2 text-xs font-semibold text-text-secondary">{label}</legend>
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => <button key={option.value} type="button" aria-pressed={value === option.value}
        onClick={() => onChange(option.value)}
        className={`${control} ${value === option.value ? "border-accent/70 bg-accent/10 text-accent" : "border-white/15 text-text-secondary"}`}>
        <span className="block break-keep font-medium">{option.label}</span>
        {option.detail && <span className="mt-1 block break-keep text-xs leading-relaxed text-text-secondary">{option.detail}</span>}
      </button>)}
    </div>
  </fieldset>;
}

export default function JourneyChoices({ id, selection, onChange }: {
  id: JourneyId; selection: JourneySelection; onChange: (next: JourneySelection) => void;
}) {
  const update = (patch: Partial<JourneySelection>) => onChange({ ...selection, ...patch });
  if (id === "low-end-theory") return <Choices label="어떤 형태로 소장할까요?" value={selection.format}
    options={[{ value: "lp", label: "LP", detail: "레코드 2장 · 턴테이블 필요" }, { value: "cd", label: "CD", detail: "확인한 판매처는 절판" }]}
    onChange={(format) => update({ format })} />;
  if (id === "breath-of-the-wild") return <div className="space-y-5">
    <Choices label="가지고 있는 게임기" value={selection.device}
      options={[{ value: "switch", label: "Nintendo Switch", detail: "OLED · Lite 포함" }, { value: "switch2", label: "Nintendo Switch 2" }]}
      onChange={(device) => update({ device })} />
    <Choices label="Switch용 본편이 있나요?" value={selection.owned ? "yes" : "no"}
      options={[{ value: "no", label: "처음 구입해요" }, { value: "yes", label: "이미 가지고 있어요" }]}
      onChange={(value) => update({ owned: value === "yes" })} />
    {selection.device === "switch2" && selection.owned && <Choices label="Nintendo Switch Online + 추가 팩 가입 여부" value={selection.subscription ? "yes" : "no"}
      options={[{ value: "no", label: "미가입 / 모르겠어요" }, { value: "yes", label: "가입 중이에요" }]}
      onChange={(value) => update({ subscription: value === "yes" })} />}
  </div>;
  return <div className="space-y-5">
    <Choices label="프린트 소재" value={selection.material}
      options={[{ value: "paper", label: "페이퍼", detail: "종이에 인쇄한 복제 작품" }, { value: "canvas", label: "캔버스", detail: "캔버스에 인쇄한 복제 작품" }]}
      onChange={(material) => update({ material })} />
    <Choices label="그림 부분의 크기 · 액자 외경과 다릅니다" value={selection.size}
      options={PRINT_SIZES.map((size) => ({ value: size.id, label: size.label, detail: size.cm }))}
      onChange={(size) => update({ size })} />
  </div>;
}

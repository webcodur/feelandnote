import FormattedText from "@/components/ui/FormattedText";

interface Props {
  text: string | null;
}

/** 원문의 문단과 줄바꿈을 유지하고, 화면 폭에 맞춰 전문을 표시한다. */
export default function FigureReadingWaySection({ text }: Props) {
  if (!text?.trim()) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-5 text-[15px] leading-loose text-text-secondary [overflow-wrap:anywhere] md:py-6 md:text-base">
      {text.trim().split(/\r?\n\s*\r?\n/).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line"><FormattedText text={paragraph} /></p>
      ))}
    </div>
  );
}

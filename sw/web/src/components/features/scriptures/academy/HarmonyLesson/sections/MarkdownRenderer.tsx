function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-semibold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={index}
              className="rounded bg-[#d4af37]/10 px-1 py-0.5 font-mono text-[13px] text-[#d4af37]/80"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

/** 문장이 현재 하이라이트 대상인지 판별 (순수 텍스트 매칭) */
function isSentenceHighlighted(
  text: string,
  activeSentence: string | null,
): boolean {
  if (!activeSentence) return false;
  // 마크다운 제거 후 비교
  const plain = text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^- /gm, "");
  // 활성 문장이 이 텍스트 블록에 포함되어 있으면 하이라이트
  return plain.includes(activeSentence) || activeSentence.includes(plain.slice(0, 20));
}

export function renderMarkdown(markdown: string, activeSentence?: string | null) {
  const paragraphs = markdown.split("\n\n");
  return paragraphs.map((paragraph, paragraphIndex) => {
    if (paragraph.startsWith("- ")) {
      const items = paragraph.split("\n").filter((line) => line.startsWith("- "));
      return (
        <ul key={paragraphIndex} className="space-y-1 pl-1">
          {items.map((item, itemIndex) => (
            <li
              key={itemIndex}
              className={`flex items-start gap-2 text-[15px] leading-[1.8] sm:text-base transition-colors duration-300 ${
                isSentenceHighlighted(item.replace("- ", ""), activeSentence ?? null)
                  ? "text-[#d4af37]"
                  : "text-white/85"
              }`}
            >
              <span className="mt-[6px] flex-shrink-0 text-[#d4af37]/40">*</span>
              <InlineMarkdown text={item.replace("- ", "")} />
            </li>
          ))}
        </ul>
      );
    }

    if (paragraph.includes("|") && paragraph.split("\n").every((line) => line.trim().startsWith("|"))) {
      const rows = paragraph.split("\n").filter((line) => line.trim());
      const parseRow = (row: string) => row.split("|").slice(1, -1).map((cell) => cell.trim());
      const header = parseRow(rows[0]);
      const body = rows.slice(2).map(parseRow);

      return (
        <div key={paragraphIndex} className="overflow-x-auto rounded-xl border border-white/[0.08] my-4">
          <table className="w-full text-[14px] sm:text-[15px]">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                {header.map((cell, cellIndex) => (
                  <th key={cellIndex} className="px-3 py-2 text-left font-semibold text-white/80 whitespace-nowrap">
                    <InlineMarkdown text={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-white/[0.04] last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-2 text-white/75">
                      <InlineMarkdown text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    const highlighted = isSentenceHighlighted(paragraph, activeSentence ?? null);

    return (
      <p
        key={paragraphIndex}
        className={`text-[16px] leading-[1.85] sm:text-[17px] mb-4 last:mb-0 transition-colors duration-300 ${
          highlighted ? "text-[#d4af37]" : "text-white/90"
        }`}
      >
        <InlineMarkdown text={paragraph} />
      </p>
    );
  });
}

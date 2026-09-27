import { Fragment } from "react";
import FormattedText from "@/components/ui/FormattedText";

// 이름을 생략한 연속 대사도 같은 서식으로 표시한다. 서술 속 인용이나 대사 안의 작은따옴표는 보존한다.
const DIALOGUE_LINE = /^(?:([^:]+):[ \t]*)?(?:“([^”]+)”|"([^"]+)")[ \t]*$/u;

export default function FactionSceneText({ text }: { text: string }) {
  return (
    <span>
      {text.split(/\r?\n/).map((line, index) => {
        const dialogue = line.match(DIALOGUE_LINE);
        return (
          <Fragment key={index}>
            {index > 0 && <br />}
            {dialogue ? (
              <>
                {dialogue[1] && <><span data-scene-speaker className="font-semibold text-accent">{dialogue[1]}:</span>{" "}</>}
                <span data-scene-dialogue className="font-medium text-reading-active">{dialogue[2] ?? dialogue[3]}</span>
              </>
            ) : <FormattedText text={line} />}
          </Fragment>
        );
      })}
    </span>
  );
}

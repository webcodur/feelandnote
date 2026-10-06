import { SCENE_DIALOGUE_LINE } from "./FactionSceneText";

/** 문장 쪽은 원문에서 만든다. 브라우저 번역 뒤에는 이 쪽의 DOM을 그대로 표시한다. */
export function sceneCaptionPages(caption: string) {
  const pages: { text: string; separator: string }[] = [];
  let previousEnd = 0;
  let lineStart = 0;
  for (const line of caption.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) {
      const sentences = SCENE_DIALOGUE_LINE.test(trimmed) ? [trimmed]
        : trimmed.match(/[^.!?。…]+(?:[.!?。…]+[”’"'」』》]*|$)/g)?.map(sentence => sentence.trim()).filter(Boolean) || [trimmed];
      let searchStart = lineStart;
      for (const text of sentences) {
        const start = caption.indexOf(text, searchStart);
        pages.push({ text, separator: caption.slice(previousEnd, start) });
        previousEnd = start + text.length;
        searchStart = previousEnd;
      }
    }
    lineStart += line.length + (caption.slice(lineStart + line.length).startsWith("\r\n") ? 2 : 1);
  }
  return pages;
}

export function splitSceneCaptionPages(caption: string): string[] {
  return sceneCaptionPages(caption).map(page => page.text);
}

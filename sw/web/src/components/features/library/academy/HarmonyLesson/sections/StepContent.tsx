"use client";

import { renderMarkdown } from "./MarkdownRenderer";

export default function StepContent({ contentMarkdown }: { contentMarkdown: string }) {
  return <div>{renderMarkdown(contentMarkdown)}</div>;
}

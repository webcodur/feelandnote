import assert from "node:assert/strict";
import test from "node:test";
import { extractYes24LayoutReferences, restoreIntroductionLayout } from "./bookIntroductionLayout";

const ISBN = "9791139721973";
const page = (body: string, isbn = ISBN) => `<table><tr><th>ISBN13</th><td>${isbn}</td></tr></table>
  <div id="infoset_introduce"><textarea class="txtContentText">${body}</textarea></div>
  <div id="infoset_toc">목차는 소개 본문이 아니다.</div>`;

test("source textarea line breaks restore synopsis paragraph boundaries", () => {
  const source = "⁋시놉시스\n10년의 귀향 이야기입니다.\n한편 고향에서는 왕권을 노립니다.\n⁋불확실한 세계를 건너는 기록\n신과 인간의 이야기를 보여줍니다.";
  const references = extractYes24LayoutReferences(page("<b>⁋시놉시스</b>\n10년의 귀향 이야기입니다.\n\n한편 고향에서는 왕권을 노립니다.\n\n<b>⁋불확실한 세계를 건너는 기록</b>\n신과 인간의 이야기를 보여줍니다."), ISBN);
  const actual = restoreIntroductionLayout(source, references);
  assert.ok(actual?.includes("\n\n한편 고향"));
  assert.ok(actual?.includes("\n\n⁋불확실한"));
  assert.equal(actual?.replace(/\s/g, ""), source.replace(/\s/g, ""));
  assert.ok(!actual?.includes("목차"));
});

test("HTML paragraph boundaries and br lines retain distinct structures", () => {
  const [actual] = extractYes24LayoutReferences(page("<p>첫 시구<br>둘째 시구</p><p>다음 문단</p>"), ISBN);
  assert.equal(actual, "첫 시구\n둘째 시구\n\n다음 문단");
});

test("escaped English title brackets are text rather than HTML tags", () => {
  const refs = extractYes24LayoutReferences(page("<b>소개</b><br/><br/>영화 &lt;Dune&gt;와 &lt;Hamlet&gt;를 다룹니다.<br/><br/>둘째 문단입니다."), ISBN);
  assert.equal(refs[0], "소개\n\n영화 <Dune>와 <Hamlet>를 다룹니다.\n\n둘째 문단입니다.");
  assert.equal(restoreIntroductionLayout("영화 〈Dune〉와 〈Hamlet〉를 다룹니다.\n둘째 문단입니다.", refs),
    "영화 〈Dune〉와 〈Hamlet〉를 다룹니다.\n\n둘째 문단입니다.");
});

test("a unique complete source range can omit a newly added publisher preface", () => {
  assert.equal(restoreIntroductionLayout("원래 본문.\n다음 문단.", ["추가된 홍보문.\n\n원래 본문.\n\n다음 문단."]), "원래 본문.\n\n다음 문단.");
});

test("different punctuation or a partially matching source never transfers boundaries", () => {
  assert.equal(restoreIntroductionLayout("본문-설명.", ["본문?설명."]), null);
  assert.equal(restoreIntroductionLayout("첫 문단.\n새로운 문장.", ["첫 문단.\n\n다른 문장."]), null);
});

test("a word-spacing collision is not equivalent prose", () => {
  assert.equal(restoreIntroductionLayout("nowhere", ["now here"]), null);
  assert.equal(restoreIntroductionLayout("now here", ["nowhere"]), null);
  assert.equal(restoreIntroductionLayout("구성되\n며", ["구성되며"]), "구성되며");
});

test("paired angle notation may transfer layout while preserving every source character", () => {
  const source = "첫 문단입니다.\n영화 〈마다가스카의 펭귄〉을 다룹니다.\n마지막 문단입니다.";
  const reference = "첫 문단입니다.\n\n영화 <마다가스카의 펭귄>을 다룹니다.\n\n마지막 문단입니다.";
  const actual = restoreIntroductionLayout(source, [reference]);
  assert.equal(actual, source.replace(/\n/g, "\n\n"));
  assert.equal(actual?.replace(/\s/g, ""), source.replace(/\s/g, ""));
  assert.equal(restoreIntroductionLayout(reference.replace(/\n\n/g, "\n"), [source.replace(/\n/g, "\n\n")]), reference);
});

test("unpaired angles and other punctuation differences still reject boundary transfer", () => {
  assert.equal(restoreIntroductionLayout("앞 문단.\n열린 〈표기입니다.", ["앞 문단.\n\n열린 <표기입니다."]), null);
  assert.equal(restoreIntroductionLayout("첫 문단.\n영화 〈작품〉-소개.", ["첫 문단.\n\n영화 <다른 작품>?소개."]), null);
});

test("large title and publication brackets transfer only reference paragraph boundaries", () => {
  const source = "그는 존경받는 인물이다.\n첫 책 《내 아버지로부터의 꿈》에 주목해 보라.\n이 책은 〈뉴욕타임스〉 베스트셀러다.\n케냐에서 정체성을 찾는다.\n〈뉴스위크〉의 평가도 높다.";
  const reference = "추가된 홍보문.\n\n그는 존경받는 인물이다.\n첫 책 『내 아버지로부터의 꿈』에 주목해 보라.\n\n이 책은 [뉴욕타임스] 베스트셀러다.\n\n케냐에서 정체성을 찾는다.\n\n[뉴스위크]의 평가도 높다.";
  const actual = restoreIntroductionLayout(source, [reference]);
  assert.equal(actual, "그는 존경받는 인물이다.\n첫 책 《내 아버지로부터의 꿈》에 주목해 보라.\n\n이 책은 〈뉴욕타임스〉 베스트셀러다.\n\n케냐에서 정체성을 찾는다.\n\n〈뉴스위크〉의 평가도 높다.");
  assert.equal(actual?.replace(/\s/g, ""), source.replace(/\s/g, ""));
});

test("title bracket equivalence never changes content or forgives mismatched delimiters", () => {
  assert.equal(restoreIntroductionLayout("《첫 책》이다.", ["『다른 책』이다."]), null);
  assert.equal(restoreIntroductionLayout("〈매체〉의 기사.", ["[매체)의 기사."]), null);
  assert.equal(restoreIntroductionLayout("〈매체〉의 기사.", ["[매체]의 기사?"]), null);
});

test("repeated or contradictory full matches remain unmodified", () => {
  assert.equal(restoreIntroductionLayout("반복 본문.", ["반복 본문. 반복 본문."]), null);
  assert.equal(restoreIntroductionLayout("첫 문단.\n다음 문단.", ["첫 문단.\n다음 문단.", "첫 문단.\n\n다음 문단."]), null);
});

test("the product ISBN must match, including when a recommendation mentions the expected ISBN", () => {
  assert.deepEqual(extractYes24LayoutReferences(page("본문입니다.", "9788932908007") + `<div>${ISBN}</div>`, ISBN), []);
});

test("offset transfer preserves emoji and explicit heading markers", () => {
  assert.equal(restoreIntroductionLayout("⁋제목\n😀 첫 문단.\n둘째 문단.", ["⁋제목\n😀 첫 문단.\n\n둘째 문단."]), "⁋제목\n😀 첫 문단.\n\n둘째 문단.");
});

test("consecutive complete paragraphs restore boundaries despite an unrelated source preface and suffix", () => {
  const source = "다음이 작성한 요약입니다.\n첫 번째 본문입니다.\n두 번째 본문입니다.\n#독서 #책";
  assert.equal(restoreIntroductionLayout(source, ["출판사 머리말.\n\n첫 번째 본문입니다.\n\n두 번째 본문입니다."]),
    "다음이 작성한 요약입니다.\n첫 번째 본문입니다.\n\n두 번째 본문입니다.\n#독서 #책");
});

test("a source assembled from two introduction fields restores each proven paragraph pair", () => {
  const source = "소개 첫 문단.\n소개 둘째 문단.\n\n출판사 첫 문단.\n출판사 둘째 문단.";
  assert.equal(restoreIntroductionLayout(source, ["소개 첫 문단.\n\n소개 둘째 문단.", "출판사 첫 문단.\n\n출판사 둘째 문단."]), source.replace(/(?<!\n)\n(?!\n)/g, "\n\n"));
});

test("partial matching requires two whole adjacent reference paragraphs, not shared phrases", () => {
  assert.equal(restoreIntroductionLayout("요약.\n공유 문장.\n다른 설명.", ["공유 문장.\n\n참조에만 있는 설명."]), null);
  assert.equal(restoreIntroductionLayout("요약.\n첫 문단.\n빠진 중간 문단.\n둘째 문단.", ["첫 문단.\n\n둘째 문단."]), null);
});

test("conflicting reference gaps veto partial boundary transfer", () => {
  const source = "새 요약.\n첫 문단.\n둘째 문단.\n후기.";
  assert.equal(restoreIntroductionLayout(source, ["첫 문단.\n\n둘째 문단.", "머리말.\n\n첫 문단.\n둘째 문단."]), null);
});

test("a reference pair cannot split the middle of an unrelated source word", () => {
  assert.equal(restoreIntroductionLayout("수퍼첫째둘째소설", ["첫째\n\n둘째"]), null);
});

test("complete word identity transfers paragraph gaps without replacing damaged reference punctuation", () => {
  const source = "작가의 대표작 『소설』을 소개합니다.\n누아르적 전개가 돋보입니다.\n다음 문단입니다.";
  const reference = "작가의 대표작?『소설』을 소개합니다.\n\n누아르적?전개가 돋보입니다.\n\n다음 문단입니다.";
  const actual = restoreIntroductionLayout(source, [reference]);
  assert.equal(actual, source.replace(/\n/g, "\n\n"));
  assert.equal(actual?.replace(/\s/g, ""), source.replace(/\s/g, ""));
});

test("punctuation-tolerant alignment still rejects different words and word boundaries", () => {
  assert.equal(restoreIntroductionLayout("원문 첫 문단.\n단어가 다릅니다.", ["원문 첫 문단!\n\n내용이 다릅니다."]), null);
  assert.equal(restoreIntroductionLayout("소개.\nnowhere에 있습니다.", ["소개!\n\nnow here에 있습니다."]), null);
});

test("a reference paragraph cannot divide an intact source word, even when another gap matches", () => {
  assert.equal(restoreIntroductionLayout("소개.\nnowhere에 있습니다.", ["소개.\n\nnow\n\nhere에 있습니다."]), null);
  assert.equal(restoreIntroductionLayout("소개.\nnowhere에 있습니다.", ["소개!\n\nnow\n\nhere에 있습니다."]), null);
});

test("word alignment only adds proven gaps and retains poems or lists within a paragraph", () => {
  const source = "첫 문단입니다.\n- 하나\n- 둘\n다음 문단입니다.";
  const reference = "첫 문단입니다!\n- 하나\n- 둘\n\n다음 문단입니다.";
  assert.equal(restoreIntroductionLayout(source, [reference]), "첫 문단입니다.\n- 하나\n- 둘\n\n다음 문단입니다.");
});

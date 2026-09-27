import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import FactionSceneText from "./FactionSceneText";

const renderText = (text: string) => load(renderToStaticMarkup(React.createElement(FactionSceneText, { text })));

test("scene dialogue hides outer quotes but preserves the speaker and quoted names", () => {
  const $ = renderText("포도주를 마신 거인이 이름을 묻는다.\n오디세우스: “내 이름은 ‘아무도 아닌 자’다.”");
  assert.equal($("[data-scene-speaker]").text(), "오디세우스:");
  assert.ok($("[data-scene-speaker]").hasClass("text-accent"));
  assert.equal($("[data-scene-dialogue]").text(), "내 이름은 ‘아무도 아닌 자’다.");
  assert.ok($("[data-scene-dialogue]").hasClass("text-reading-active"));
  assert.equal($("br").length, 1);
  assert.ok($("body").text().startsWith("포도주를 마신 거인이 이름을 묻는다."));
  assert.doesNotMatch($("body").text(), /[“”]/);
});

test("straight quotes in English dialogue keep contractions and surrounding narration", () => {
  const $ = renderText('Eurylochus: "Let\'s take some cheese and get out of here."\nHis companions wait.');
  assert.equal($("[data-scene-speaker]").text(), "Eurylochus:");
  assert.equal($("[data-scene-dialogue]").text(), "Let's take some cheese and get out of here.");
  assert.ok($("body").text().endsWith("His companions wait."));
  assert.doesNotMatch($("body").text(), /"/);
});

test("narration keeps shared emphasis without becoming dialogue", () => {
  const $ = renderText('《오디세이아》의 ‘아무도 아닌 자’라는 이름. “돌아가라”는 말이 남는다.\n오디세우스: “아직 닫지 않은 대사');
  assert.equal($("[data-scene-dialogue]").length, 0);
  assert.equal($(".font-bold").text(), "《오디세이아》");
  assert.ok($(".text-accent").text().includes("‘아무도 아닌 자’"));
  assert.ok($("body").text().includes("“돌아가라”"));
  assert.ok($("body").text().endsWith("오디세우스: “아직 닫지 않은 대사"));
});

test("multiple speakers retain authored line breaks and their own dialogue", () => {
  const $ = renderText('Circe: “Come in.”\r\n\r\nOdysseus: "First, swear an oath."');
  assert.deepEqual($("[data-scene-speaker]").map((_, el) => $(el).text()).get(), ["Circe:", "Odysseus:"]);
  assert.deepEqual($("[data-scene-dialogue]").map((_, el) => $(el).text()).get(), ["Come in.", "First, swear an oath."]);
  assert.equal($("br").length, 2);
});

test("short dialogue sentences do not force a separate line for every full stop", () => {
  const text = "지략의 오디세우스: “진정하게. 제우스의 법이 있잖나. 주인이면 손님 대접을 해야지.”";
  const $ = renderText(text);
  assert.equal($("[data-scene-dialogue]").text(), "진정하게. 제우스의 법이 있잖나. 주인이면 손님 대접을 해야지.");
  assert.equal($("br").length, 0);
});

test("continued dialogue without a repeated speaker keeps the same emphasis", () => {
  const $ = renderText('오디세우스: “진정하게.”\n“제우스의 법이 있잖나.”');
  assert.equal($("[data-scene-speaker]").length, 1);
  assert.deepEqual($("[data-scene-dialogue]").map((_, el) => $(el).text()).get(), ["진정하게.", "제우스의 법이 있잖나."]);
  assert.equal($("br").length, 1);
  assert.doesNotMatch($("body").text(), /[“”]/);
});

test("quoted passages retain emphasis without inserting line breaks", () => {
  const text = "오디세우스는 “돌아간다. 기다려라.”라고 말했다. 배가 떠났다.";
  const $ = renderText(text);
  assert.equal($("body").text(), text);
  assert.equal($(".text-accent-hover").text(), "“돌아간다. 기다려라.”");
  assert.equal($("br").length, 0);
});

test("decimal points and English honorifics are not sentence breaks", () => {
  const text = "Dr. Smith paid 3.14 dollars. Then he left.";
  const $ = renderText(text);
  assert.equal($("body").text(), text);
  assert.equal($("br").length, 0);
});

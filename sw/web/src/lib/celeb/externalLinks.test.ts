import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCelebExternalLinks,
  type WikidataExternalLinkEntity,
} from "./externalLinks";

const claim = (value: string, rank: "preferred" | "normal" | "deprecated" = "normal") => ({
  rank,
  mainsnak: { datavalue: { value } },
});

test("현대 인물의 공식 채널과 자료를 정해진 순서로 만든다", () => {
  const entity: WikidataExternalLinkEntity = {
    claims: {
      P856: [claim("https://example.com")],
      P2003: [claim("example")],
      P2397: [claim("UC1234567890123456789012")],
      P2002: [claim("example_x")],
      P6634: [claim("example-person")],
      P1417: [claim("biography/Example-Person")],
    },
    sitelinks: {
      kowiki: { title: "예시 인물" },
      enwiki: { title: "Example Person" },
    },
  };

  const links = buildCelebExternalLinks(entity, "Q123", "ko");
  assert.deepEqual(
    links.map((link) => link.platform),
    [
      "website",
      "instagram",
      "youtube",
      "x",
      "linkedin",
      "britannica",
      "wikipedia",
      "wikidata",
    ],
  );
  assert.equal(links[1].handle, "@example");
  assert.equal(links[6].url, "https://ko.wikipedia.org/wiki/%EC%98%88%EC%8B%9C_%EC%9D%B8%EB%AC%BC");
});

test("선호값을 우선하고 폐기값과 위험한 URL은 제외한다", () => {
  const entity: WikidataExternalLinkEntity = {
    claims: {
      P856: [claim("javascript:alert(1)")],
      P2002: [claim("old", "deprecated"), claim("normal"), claim("preferred", "preferred")],
      P345: [claim("ch0000001")],
      P244: [claim("n123456")],
    },
    sitelinks: { enwiki: { title: "Safe Example" } },
  };

  const links = buildCelebExternalLinks(entity, "Q456", "ko");
  assert.equal(links.some((link) => link.platform === "website"), false);
  assert.equal(links.find((link) => link.platform === "x")?.url, "https://x.com/preferred");
  assert.equal(links.some((link) => link.platform === "imdb"), false);
  assert.equal(
    links.find((link) => link.platform === "loc")?.url,
    "https://id.loc.gov/authorities/names/n123456.html",
  );
  assert.equal(
    links.find((link) => link.platform === "wikipedia")?.url,
    "https://en.wikipedia.org/wiki/Safe_Example",
  );
});

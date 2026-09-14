import fs from 'node:fs';

const inputPath = 'D:/blog-assets/tistory-cinema/luna-cinema-batch-01-input.json';
const outputPath = 'D:/blog-assets/tistory-cinema/luna-cinema-batch-01-followup-review.json';

const input = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as {
  rows: Array<Record<string, unknown>>;
};

const patches: Record<string, {
  decision: 'revise' | 'keep' | 'unresolved';
  after?: string;
  review_en_after?: string;
  reason: string;
  verified_sources: Array<{ url: string; note: string }>;
}> = {
  '3380f5a9-bcd3-4244-8e0c-3d7a91e7590b': {
    decision: 'revise',
    after: '레오나르도 디카프리오는 2006년 《더 인디펜던트》에 전한 자신의 열 편의 영화 목록에서 《자전거 도둑》을 첫손에 꼽으며 이 작품을 “이탈리아 네오리얼리즘의 전형적인 영화”라고 했다.',
    review_en_after: 'Leonardo DiCaprio placed *Bicycle Thieves* first in the ten-film list of favorites he gave to *The Independent* in 2006, calling it “the prototypical movie of Italian neo-realism.”',
    reason: 'Rediff가 2006년 The Independent에 전한 열 편의 목록과 《자전거 도둑》이 첫 번째이며 이탈리아 네오리얼리즘의 전형이라는 설명을 확인한다. 현재의 “깊은 감명”과 인간의 절박함·사회적 부조리라는 해석은 확인된 인용보다 나아가므로, 목록과 직접 발언을 남기고 축약한다. 기존 source_url은 교체하지 않고 보조 확인 출처만 기록한다.',
    verified_sources: [
      { url: 'https://www.rediff.com/movies/report/leo/20060921.htm', note: '2006년 The Independent의 DiCaprio 열 편 목록, 《자전거 도둑》 1위, “the prototypical movie of Italian neo-realism” 발언을 확인했다.' },
    ],
  },
  '2077f594-efcf-42bd-8acc-827773b98b98': {
    decision: 'revise',
    after: '레오나르도 디카프리오는 2006년 《더 인디펜던트》에 전한 열 편의 영화 목록에 《제3의 사나이》를 포함했다. 캐럴 리드가 연출한 1949년 필름 누아르로, 오슨 웰스가 연기한 해리 라임의 등장이 유명한 작품이다.',
    review_en_after: 'Leonardo DiCaprio included *The Third Man* in the ten-film list of favorites he gave to *The Independent* in 2006. Carol Reed’s 1949 film noir is known for the entrance of Harry Lime, played by Orson Welles.',
    reason: 'Rediff가 현재 source_url에 적힌 Far Out의 다른 목록이 아니라 2006년 The Independent에 전한 열 편 목록에서 《제3의 사나이》를 확인한다. 작품의 배경·감독·배우 설명은 유지하되, 확인된 인터뷰와 맞지 않는 “올타임 베스트 10” 표현을 바로잡는다. 기존 source_url은 교체하지 않고 보조 확인 출처만 기록한다.',
    verified_sources: [
      { url: 'https://www.rediff.com/movies/report/leo/20060921.htm', note: '2006년 The Independent 목록에서 《제3의 사나이》가 8½ 다음 선택으로 포함되고, Carol Reed·Orson Welles 정보가 함께 제시된다.' },
    ],
  },
  '49195422-1f0b-43d4-ae37-088dd2d9b6f9': {
    decision: 'revise',
    after: '레오나르도 디카프리오는 2019년 MTV 인터뷰에서 어릴 때 자신을 영화에 빠져들게 한 작품으로 《에덴의 동쪽》을 꼽았다. 배우가 된 뒤에는 이 작품에서 본 “아주 연약한 제임스 딘”에게 크게 감탄했다고 덧붙였다.',
    review_en_after: 'In a 2019 MTV interview, Leonardo DiCaprio named *East of Eden* as the film he grew up with that made him obsessed with movies. He added that, once he became an actor, the very vulnerable James Dean he saw in the film “blew me away.”',
    reason: 'MTV News 원문 영상의 자동 자막에서 《에덴의 동쪽》이 영화를 좋아하게 만든 작품이라는 답변과, 배우가 된 뒤 본 “very vulnerable James Dean ... blew me away”라는 대목을 확인했다. 현재의 “정체성과 역사에 대한 혼란”, “사랑받고 싶은 절박함”, “완전히 무너졌다”는 표현은 해당 영상 대목에 없어 삭제하고 확인된 감상만 남긴다. 기존 source_url은 교체하지 않고 영상 URL을 보조 확인 출처로 기록한다.',
    verified_sources: [
      { url: 'https://www.youtube.com/watch?v=m7zrrj-nD8s', note: 'MTV News 2019 인터뷰 영상 자막에서 East of Eden을 영화에 빠져들게 한 작품으로 꼽고, James Dean의 취약한 연기에 감탄했다는 대목을 확인했다.' },
      { url: 'https://en.wikipedia.org/wiki/East_of_Eden_(film)', note: 'MTV 인터뷰의 “obsessed with movies” 발언과 해당 영상 링크가 인용되어 있다.' },
    ],
  },
};

const rows = input.rows.slice(30, 33).map((row, offset) => {
  const rid = String(row.rid);
  const patch = patches[rid];
  if (!patch) throw new Error(`Missing follow-up decision for row ${offset + 31}: ${rid}`);
  const before = String(row.current_review ?? '');
  const reviewEnBefore = String(row.review_en ?? '');
  return {
    index: offset + 31,
    ...row,
    decision: patch.decision,
    before,
    after: patch.after ?? before,
    review_en_before: reviewEnBefore,
    review_en_after: patch.review_en_after ?? reviewEnBefore,
    reason: patch.reason,
    verified_sources: patch.verified_sources,
    db_guard: {
      id: rid,
      celeb_id: row.celeb_id,
      content_id: row.content_id,
      expected_review: before,
      expected_review_en: reviewEnBefore,
    },
    db_action: 'pending_apply',
  };
});

const output = {
  generatedAt: new Date().toISOString(),
  status: 'ready_for_db_apply',
  dbWrites: 0,
  basis: '현재 DB 관계 ID로 중복 제거한 초기 배치의 deferred 31~33번. 원문 current_review와 review_en을 before로 보존했다.',
  sourceInput: inputPath,
  summary: { targetCount: rows.length, revise: rows.filter((r) => r.decision === 'revise').length, keep: rows.filter((r) => r.decision === 'keep').length, unresolved: rows.filter((r) => r.decision === 'unresolved').length },
  rows,
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ outputPath, ...output.summary }, null, 2));

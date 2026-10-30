import test from 'node:test';
import assert from 'node:assert/strict';
import {blogReviewEligibility,hasEligibleBlogReview,compareBlogReviewPriority} from './blog-review-eligibility.mjs';

test('짧은 한 문장도 유효한 후보로 남긴다',()=>{
  const actual='조지 패튼은 생전에 귀스타브 르 봉의 『군중심리』를 좋아했으며, 사후 아내가 정리한 가장 좋아한 책 목록의 시사 부문에 이 책이 포함되어 있다.';
  assert.equal(hasEligibleBlogReview(actual),true);
  assert.equal(hasEligibleBlogReview('가'.repeat(250)+'.'),true);
  assert.equal(hasEligibleBlogReview(''),false);
});
test('URL·출처 라벨·서식은 우선순위 분량에서 제외한다',()=>{
  const text='**재미있었어요. 다시 읽었어요.**\n\n-----\n출처: '+ '가'.repeat(300)+'\nhttps://example.com/'+ 'x'.repeat(400);
  const result=blogReviewEligibility(text);
  assert.equal(result.eligible,true);assert.equal(result.sentences,2);assert.equal(result.characters,'재미있었어요. 다시 읽었어요.'.length);
});
test('풍부한 감상을 앞세우되 짧은 후보와 1인칭·문단을 그대로 보존한다',()=>{
  const review='베를린에서 산 소설을 여행 중 기차에서 잃어버렸어요. 집으로 돌아와서야 끝까지 읽을 수 있었어요.\n\n'+'이 책을 읽으면서 제가 어떤 삶을 살고 싶은지 돌아보게 됐고, 이야기 속 선택을 제 경험과 나란히 놓고 생각해 봤어요. '.repeat(3);
  const before=review;assert.equal(hasEligibleBlogReview(review),true);assert.equal(review,before);assert.ok(review.includes('\n\n'));
  const short={review:'이 책이 좋았어요.'},long={review};
  const ranked=[short,long].sort(compareBlogReviewPriority);
  assert.deepEqual(ranked,[long,short]);assert.equal(ranked[0].review,before);assert.equal(ranked[1].review,short.review);
});

# 검색·RAG·자료 수집·자동화

## 자료 정규화

```text
문서·웹 자료 수집
  ↓
중복 제거·출처 기록
  ↓
Markdown·구조화 데이터로 정규화
  ↓
검색·RAG·그래프에 적재
  ↓
문장별 근거 연결
  ↓
생성·검증·발행
```

검색량을 늘리는 것보다 출처가 유지되고 다시 찾을 수 있는 형태로 저장하는 것이 중요하다. 네이버 블로그·X·Reddit 등은 크롤링 가능 여부와 이용 조건을 별도로 확인한다.

## 참고 링크

- [public-data-lens](https://github.com/hike-lab/public-data-lens): 목적에 맞는 공공데이터와 선택 근거를 찾는 도구라는 설명
- [claude-seo](https://github.com/AgriciDaniel/claude-seo): SEO 감사·진단·개선 자동화라는 설명. 명령 범위 확인 필요
- [ai-knowledge-graph](https://github.com/robert-mcdermott/ai-knowledge-graph): 지식 그래프 관련 링크
- [Firecrawl](https://www.firecrawl.dev/): 크롤링·문서 추출 서비스. 요금·이용 조건 확인 필요
- [WebMCP 소개](https://blog.cloudflare.com/webmcp/): 웹사이트와 에이전트가 도구 기반으로 통신한다는 구상. 실제 지원 범위 확인 필요

## 자동화 결론

- 반복적인 파일명 변경, PDF 분할, BOM 추출, 광고 단가 변경, 보고서 생성은 자동화 효과가 크다.
- 단일 “딸깍”보다 입력·변환·검증·출력 로그를 갖춘 작은 파이프라인이 유지보수에 유리하다.
- 개인 경험에서 나온 “사무직의 70% 자동화” 같은 비율은 일반 법칙으로 쓰지 않는다.

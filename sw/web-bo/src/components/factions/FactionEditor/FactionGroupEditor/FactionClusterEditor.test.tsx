import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FactionClusterEditor } from './FactionClusterEditor'

globalThis.React = React

test('장면은 모든 대사를 같은 내부 항목 목록으로 연다', () => {
  const markup = renderToStaticMarkup(
    <FactionClusterEditor
      cluster={{
        label: '이타카 궁전',
        labelPosition: 'bottom',
        people: [
          { name: '오디세우스', celebId: 'odysseus', quote: '활을 가져오너라.' },
          { name: '페넬로페', celebId: 'penelope', quote: '기다림은 끝났어요.' },
        ],
        beats: [
          { speakerCelebId: 'odysseus', speaker: '오디세우스', text: '활을 가져오너라.' },
          { speakerCelebId: 'penelope', speaker: '페넬로페', text: '기다림은 끝났어요.' },
        ],
      }}
      inheritedLabelPosition="center"
      clusterIndex={0}
      groupIndex={0}
      sequenceIndex={0}
      sequenceLength={1}
      numberLabel="1-1"
      split={false}
      solo
      expanded
      onExpandedChange={() => {}}
      onChange={() => {}}
      onInsertBefore={() => {}}
      onInsertAfter={() => {}}
      onSplitBeat={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      onAddCeleb={() => {}}
      series="faction"
      episodeName="Homer-Odyssey"
      editLang="ko"
      speakerPeople={[
        { name: '오디세우스', celebId: 'odysseus' },
        { name: '페넬로페', celebId: 'penelope' },
      ]}
      onSetPrimaryQuote={() => {}}
      celebExisting={new Set()}
      celebLoaded
    />,
  )

  assert.equal(markup.match(/data-faction-sequence-card/g)?.length, 1)
  assert.equal(markup.match(/data-faction-scene-beat="true"/g)?.length, 2)
  assert.match(markup, /title="이타카 궁전"/)
  assert.doesNotMatch(markup, /장면 · 이타카 궁전/)
  assert.match(markup, /장면 내 컷 2개/)
  assert.match(markup, /화자 할당/)
  assert.match(markup, /장면명 위치/)
  assert.match(markup, /앞에 컷/)
  assert.match(markup, /1-1 맨 앞에 화면 컷 추가/)
  assert.match(markup, /앞에 장면/)
  assert.match(markup, /1-1 앞에 독립 장면 추가/)
  assert.match(markup, /<option value="center">중하단<\/option>/)
  assert.equal(markup.match(/data-faction-insert-boundary="true"/g)?.length, 3)
  assert.equal(markup.match(/role="group" aria-label="이 경계에 추가"/g)?.length, 3)
  assert.match(markup, /value="bottom" selected=""/)
  assert.doesNotMatch(markup, /발화 본문 · 화자|할당 인물 정보|data-faction-dialogue-item/)
})

test('장면명 위치 기본값은 에피소드 대사·장면 자막 위치를 상속한다', () => {
  const markup = renderToStaticMarkup(
    <FactionClusterEditor
      cluster={{ label: '폴리페무스 동굴', people: [], beats: [] }}
      inheritedLabelPosition="bottom"
      clusterIndex={0}
      groupIndex={0}
      sequenceIndex={0}
      sequenceLength={1}
      numberLabel="1-1"
      split={false}
      solo
      expanded
      onExpandedChange={() => {}}
      onChange={() => {}}
      onInsertBefore={() => {}}
      onInsertAfter={() => {}}
      onSplitBeat={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      onAddCeleb={() => {}}
      series="faction"
      episodeName="Homer-Odyssey"
      editLang="ko"
      speakerPeople={[]}
      onSetPrimaryQuote={() => {}}
      celebExisting={new Set()}
      celebLoaded
    />,
  )

  assert.match(markup, /상속 \(하단\)/)
  assert.match(markup, /<option value="" selected="">상속/)
})

test('빈 장면명은 출연 인물 이름 대신 제목 없음으로 표시한다', () => {
  const markup = renderToStaticMarkup(
    <FactionClusterEditor
      cluster={{
        label: '',
        people: [{ name: '엘페노르', celebId: 'elpenor', quote: '묻어 주십시오.' }],
        beats: [{ speakerCelebId: 'elpenor', speaker: '엘페노르', text: '묻어 주십시오.' }],
      }}
      inheritedLabelPosition="bottom"
      clusterIndex={4}
      groupIndex={1}
      sequenceIndex={4}
      sequenceLength={5}
      numberLabel="2-5"
      split
      solo
      expanded={false}
      onExpandedChange={() => {}}
      onChange={() => {}}
      onInsertBefore={() => {}}
      onInsertAfter={() => {}}
      onSplitBeat={() => {}}
      onMove={() => {}}
      onDelete={() => {}}
      onAddCeleb={() => {}}
      series="faction"
      episodeName="Homer-Odyssey"
      editLang="ko"
      speakerPeople={[{ name: '엘페노르', celebId: 'elpenor' }]}
      onSetPrimaryQuote={() => {}}
      celebExisting={new Set()}
      celebLoaded
    />,
  )

  assert.match(markup, /title="제목 없음"/)
  assert.doesNotMatch(markup, /title="엘페노르"/)
})

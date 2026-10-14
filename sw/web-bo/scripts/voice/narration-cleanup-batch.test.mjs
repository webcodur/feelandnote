import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { trustedBoundaries, verifiedNarrationFromRun, mergeObservedSentences } from './narration-cleanup-batch.mjs'
import { readingSentences } from '../celeb/reading-voice-timing.mjs'
const sha = value => createHash('sha256').update(value).digest('hex')

test('sentence and paragraph classification uses the bound source text, not gap duration', () => {
  const text = '첫 문장입니다. 둘째 문장입니다.\n\n셋째 문장입니다.'
  const timing = { sourceHash:sha(text), segments:readingSentences(text,'ko').map((s,i)=>({...s,start:i*5,end:i*5+1})) }
  assert.deepEqual(trustedBoundaries(text,'ko',timing).map(x=>x.kind), ['sentence','paragraph'])
})
test('partial timings, modified text, and overlapping times never authorize an edit', () => {
  const text = 'The first sentence. The second sentence. The third sentence.'
  const timing = { sourceHash:sha(text), segments:readingSentences(text,'en').map((s,i)=>({...s,start:i*5,end:i*5+1})) }
  assert.throws(()=>trustedBoundaries(text+' Changed.','en',timing), /STALE_SOURCE/)
  assert.throws(()=>trustedBoundaries(text,'en',{...timing,segments:timing.segments.slice(1)}), /INCOMPLETE_SENTENCE_TIMING/)
  const overlapping = structuredClone(timing); overlapping.segments[1].start = .5
  assert.throws(()=>trustedBoundaries(text,'en',overlapping), /OVERLAPPING_SENTENCE_TIMING/)
})

test('initial fragments merge using observed outer word times; absent and split words stay unresolved', () => {
  const text = 'John D. Rockefeller spoke. He left.'
  const timing = {sourceHash:sha(text),segments:[
    {textStart:0,textEnd:7,start:.2,end:1}, {textStart:8,textEnd:26,start:1.3,end:3},
    {textStart:27,textEnd:35,start:4,end:5}]}
  const merged = mergeObservedSentences(text,'en',timing)
  assert.deepEqual(merged.segments,[{textStart:0,textEnd:26,start:.2,end:3},{textStart:27,textEnd:35,start:4,end:5}])
  assert.deepEqual(trustedBoundaries(text,'en',merged),[{start:3,end:4,kind:'sentence'}])
  assert.equal(mergeObservedSentences(text,'en',{...timing,segments:timing.segments.slice(1)}).segments.length,2)
  const one = {...timing,segments:[{textStart:0,textEnd:text.length,start:.2,end:5}]}
  assert.equal(mergeObservedSentences(text,'en',one),one)
})

test('verified narration reuse requires the original bytes, source and final audio to remain bound', async () => {
  const run = await mkdtemp(join(tmpdir(),'verified-narration-'))
  try {
    const row = {type:'description',key:'factions/person/voice/ko/description.mp3'}
    const original = Buffer.from('original audio'), normalized = Buffer.from('normalized audio'), text = 'Verified source.'
    const backup = join(run,'_backup',row.key), output = join(run,'processed',dirname(row.key),'normalized.mp3')
    await mkdir(dirname(backup),{recursive:true}); await mkdir(dirname(output),{recursive:true})
    await writeFile(backup,original); await writeFile(join(dirname(backup),'description-source.txt'),text)
    await writeFile(output,normalized)
    const report = {ok:true,status:'repaired',sourceHash:sha(text),audioHash:sha(normalized),audio:output,
      metrics:{duration:1,match:.99},words:[{word:'Verified',start:0,end:1}]}
    const reportPath = output+'.qc.json'
    await writeFile(reportPath,JSON.stringify(report))
    const previous = {backup,originalHash:sha(original),requiresExactSourceTranscription:true}
    const load = (inputHash=sha(original),sourceHash=sha(text),exact=false) => verifiedNarrationFromRun(run,previous,row,inputHash,sourceHash,exact)
    assert.equal((await load()).audio,output)
    assert.equal(await load(sha(Buffer.from('different input'))),null)
    assert.equal(await load(sha(original),sha('Changed source.')),null)
    assert.equal(await load(sha(original),sha(text),true),null)
    report.metrics.match=1; await writeFile(reportPath,JSON.stringify(report))
    assert.ok(await load(sha(original),sha(text),true))
    await writeFile(output,'tampered final audio')
    await assert.rejects(load(),/VERIFIED_AUDIO_CACHE_HASH_MISMATCH/)
    await writeFile(output,normalized); await writeFile(backup,'tampered original')
    assert.equal(await load(),null)
  } finally { await rm(run,{recursive:true,force:true}) }
})

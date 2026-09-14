import fs from 'node:fs'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'
import { current, sql } from './bill-gates-book-complete.mjs'

const root = 'data/celeb/viewing-research/'
const raw = JSON.parse(fs.readFileSync(root+'2026-09-11-bill-gates-all-book-reviews.json','utf8')).rows
const file = root+'bill-gates-korean-review-corrections.json'
const results = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file,'utf8')).results : []
const save = () => fs.writeFileSync(file,JSON.stringify({results},null,2)+'\n','utf8')
const literal = s => "'"+String(s).replaceAll("'","''")+"'"
const textSql = s => `convert_from(decode(${literal(Buffer.from(s).toString('base64'))},'base64'),'UTF8')`
const mode = process.argv[2]
if (raw.length!==177) throw Error('Expected 177 source bodies')
if (mode==='review') {
  const db = await current()
  const pending = raw.filter(t => !results.some(r=>r.id===t.relationId && r.status!=='failed'))
  for (let start=0; start<pending.length; start+=10) {
    const batch=pending.slice(start,start+10)
    console.log('Review batch: '+batch.map(t=>t.titleEn).join(' | '))
    const settled=await Promise.allSettled(batch.map(async t=>{
      const row=db.find(r=>r.id===t.relationId)
      if (!row?.review || row.review_en!==t.reviewEn) throw Error('Source mismatch '+t.titleEn)
      const response=await agyCall([
        'Project rulebook: C:/project/feelandnote/docs/project/celeb/celeb-02-03-content-review.md. Its Gates Notes exception applies: retain the original first-person complete body, not the general third-person summary convention. The user-specific instructions below take precedence.',
        'You are independently reviewing ONE Korean translation of a complete Gates Notes review. Read ALL of both texts. The user reported missing translations, mixed English prose, awkward translationese, and Bill Gates being wrongly turned from a first-person speaker into a third-person subject. Carefully check meaning and omissions against the English, and read the Korean as a native Korean editor. Preserve Gates as the speaker; preserve quotation speakers and factual uncertainty. Improve actual awkward sentences and mistranslations, not arbitrary stylistic preferences. Preserve the existing speech level. Proper names may remain English. Do not modernize historical facts or silently repair factual/source typos. Do not summarize or add new claims.',
        'Return only JSON: {"edits":[{"before":"exact unique Korean passage to replace","after":"faithful idiomatic Korean replacement","reason":"specific error being corrected"}]}. Return an empty edits array when no correction is needed. Each before must occur exactly once in the Korean input, must not overlap other edits, and must be copied exactly including punctuation and line breaks. For an omission use an adjacent existing sentence as before and include the missing translated content in after. Review the whole text, not just the opening. Only return text; do not edit files or access external services.',
        'TITLE: '+t.titleEn,'ENGLISH ORIGINAL:\n'+t.reviewEn,'KOREAN TO REVIEW:\n'+row.review,
      ].join('\n\n'),{model:'gemini-3.8-flash-high',timeoutMs:300000})
      const parsed=JSON.parse(response.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''))
      if (!Array.isArray(parsed.edits)) throw Error('Invalid edits')
      let corrected=row.review
      const ranges=[]
      for (const edit of parsed.edits) {
        if (typeof edit.before!=='string' || !edit.before || typeof edit.after!=='string' || !edit.after || !edit.reason) throw Error('Invalid edit')
        if (row.review.split(edit.before).length!==2) throw Error('Passage not unique in original')
        const start=row.review.indexOf(edit.before), end=start+edit.before.length
        if(ranges.some(r=>start<r.end && end>r.start))throw Error('Overlapping edits')
        ranges.push({start,end})
        if (corrected.split(edit.before).length!==2) throw Error('Nonunique or missing passage: '+edit.before.slice(0,60))
        corrected=corrected.replace(edit.before,()=>edit.after)
      }
      if (corrected.includes('\uFFFD')) throw Error('Replacement character')
      const entry={id:row.id,contentId:row.content_id,titleEn:t.titleEn,sourceUrl:t.sourceUrl,original:row.review,corrected,edits:parsed.edits,status:'reviewed'}
      const index=results.findIndex(r=>r.id===row.id)
      if(index>=0)results[index]=entry;else results.push(entry)
      save()
      console.log(JSON.stringify({reviewed:results.filter(r=>r.status!=='failed').length,title:t.titleEn,edits:parsed.edits.length}))
    }))
    const failed=settled.filter(s=>s.status==='rejected')
    for(const failure of failed)console.error(failure.reason.message)
    if(failed.length){process.exitCode=1;break}
  }
} else if(mode==='apply') {
  if(results.length!==177 || results.some(r=>!['reviewed','applied'].includes(r.status))) throw Error('177 reviews must finish before apply')
  const db=await current()
  for(const r of results){
    const target=raw.find(t=>t.relationId===r.id)
    const row=db.find(t=>t.id===r.id)
    if(row.review_en!==target.reviewEn || row.source_url!==r.sourceUrl)throw Error('Source changed')
    if(row.review===r.corrected){r.status='applied';save();continue}
    if(row.review!==r.original)throw Error('Concurrent Korean change: '+r.titleEn)
    const count=await sql(`WITH changed AS (UPDATE celeb_contents SET review=${textSql(r.corrected)} WHERE id=${literal(r.id)} AND celeb_id='1ab7e089-040f-4aa1-b0a1-81dc1dd510d7' AND content_id=${literal(r.contentId)} AND source_url=${literal(r.sourceUrl)} AND review=${textSql(r.original)} AND review_en=${textSql(target.reviewEn)} RETURNING id) SELECT count(*) FROM changed;`)
    if(count!=='1')throw Error('Update guard: '+r.titleEn)
    r.status='applied';save()
  }
  console.log('All 177 independent review results applied')
} else {throw Error('Mode: review | apply')}

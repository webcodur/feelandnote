import crypto from 'node:crypto';

// Fingerprint of the editor paragraph list verified after a save. verify-body compares
// later editor states against it when no current unified article can be recompiled.
export const textsDigest = texts => ({
  textsSha256: crypto.createHash('sha256').update(texts.join('\n')).digest('hex'),
  paragraphs: texts.length,
});

// 지문은 일반 문단·사진 설명만 본다(restyle-body EDITOR_SELECTOR). 목차 인용구 문단은 unifiedFlow 대조가 맡는다.
export const articleTexts = article => article.operations.filter(op => ['text', 'link'].includes(op.kind) && !op.quote).map(op => op.text);

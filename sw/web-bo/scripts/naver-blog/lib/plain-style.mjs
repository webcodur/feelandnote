// 책 소개 간결체 규칙. 생성기(prepare-book-summaries)·전환기(convert-blurbs-plain)·반영기(restyle-body)가 함께 쓴다.
export const POLITE_ENDING=/(니다|[가-힣]요)[.!?」』”"')\]]*$/;
// 첫 문장은 명사형(「…철학서.」)이나 「이다」형(「…철학서이다.」)으로 맺고, 받침 없는 명사에 「다」만 붙인 꼴(「…철학서다.」)은 쓰지 않는다.
// 받침 없는 글자 + 다 가운데 이다·아니다·하다와 흔한 형용사 기본형(다르다·크다·빠르다 등)은 정상 종결이다.
const NORMAL_BEFORE_DA=new Set([...'이니하르쁘프크싸짜리세차']);
const noFinal=ch=>{const n=ch.charCodeAt(0)-0xac00;return n>=0&&n<11172&&n%28===0;};
export const firstSentence=text=>String(text).trim().split(/(?<=[.!?])\s+/)[0]??'';
export function contractedCopula(sentence){
 const m=String(sentence).trim().match(/([가-힣])다[.!?」』”"')\]]*$/);
 return Boolean(m&&noFinal(m[1])&&!NORMAL_BEFORE_DA.has(m[1]));
}
// 「…X다.」의 마지막 「다」를 「이다」로 바꾼다. 검사에 걸린 문장에만 쓴다.
export const expandCopula=sentence=>String(sentence).replace(/([가-힣])다([.!?」』”"')\]]*)$/,'$1이다$2');

export function libraryFunnel(material){
 if(material.kind!=='celeb'||material.libraryFunnel!==true)return null;
 const total=material.selection?.totalServiceBooks,shown=material.books?.length,name=material.subject?.name;
 if(!Number.isInteger(total)||!Number.isInteger(shown)||total<shown||shown<1||!name)throw Error('Public library count and displayed books differ');
 const rest=total-shown;
 return{
  // 첫 머리 줄은 이름만 쓴다. 전체·소개 권수는 끝 안내 문단(footer)이 전한다(26.11.12 사용자 지시).
  heading:name,
  footer:rest?'이 글에서 소개한 '+shown+'권 외에 '+rest+'권의 도서 기록은 필앤노트에서 확인할 수 있습니다.':'소개한 책의 감상 기록과 작품별 정보를 필앤노트에서 함께 살펴볼 수 있습니다.',
  link:'필앤노트에서 '+name+'의 전체 감상 기록 보기',
 };
}

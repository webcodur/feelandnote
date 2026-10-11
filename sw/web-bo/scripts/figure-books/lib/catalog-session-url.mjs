/** 외부 주소나 자격증명으로 작업 자료를 보내지 않는 RAM 서버 주소 계약. */
export function coordinatorUrl(value) {
 let url;try{url=new URL(value)}catch{throw Error('Loopback coordinator URL required')}
 if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Loopback coordinator URL required')
 return url.origin
}

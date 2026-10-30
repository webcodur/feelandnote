// Other posts can publish while an existing post is being edited. The target
// title/date/time row must stay exact; the global reservation-list size can vary.
export function sameReservation(actual,expected){
 if(actual===null||expected===null)return actual===expected;
 if(!actual||!expected||![actual.count,expected.count].every(n=>Number.isInteger(n)&&n>0))return false;
 const {count:actualCount,...a}=actual,{count:expectedCount,...b}=expected;
 // The publish panel spaces dates differently from reservation-list rows.
 // Only normalize the final date line; the title and other fields stay exact.
 const row=value=>typeof value==='string'?value.replace(/\n(\d{4})\.\s*(\d{2})\.\s*(\d{2})\s+(\d{2}:\d{2})$/, '\n$1.$2.$3 $4'):value;
 a.row=row(a.row);b.row=row(b.row);
 return JSON.stringify(a)===JSON.stringify(b);
}

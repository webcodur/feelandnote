// A saved transaction must always stop the queue for verification recovery.
export function isDeferrableBeforeSave(failure){
 return failure?.saved===false&&failure.step==='typography'&&/^Error: (?:Complete institution selection table differs|Unified image identity, geometry, alignment or representative differs|Unified image count differs|Cover purchase caption differs)$/.test(failure.error??'');
}

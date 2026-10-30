export function unchangedEditorBody(snapshot){
 const copy=structuredClone(snapshot);delete copy.title;
 for(const image of copy.images??[])for(const key of ['displayWidth','displayHeight','naturalWidth','naturalHeight'])delete image[key];
 return copy;
}

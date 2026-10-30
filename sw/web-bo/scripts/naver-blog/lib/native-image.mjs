import sharp from 'sharp';
export const NATIVE_IMAGE_FORMATS=Object.freeze(['png','jpeg','webp','gif']);
export function supportedStaticImage(meta){return NATIVE_IMAGE_FORMATS.includes(meta.format)&&meta.width>1&&meta.height>1&&!(meta.pages>1);}
export async function prepareNativeImage(original){
 const metadata=await sharp(original).metadata();if(!supportedStaticImage(metadata))throw Error('Unsupported or missing static image');
 const bytes=['webp','gif'].includes(metadata.format)?await sharp(original).flatten({background:'#ffffff'}).jpeg({quality:95}).toBuffer():original;
 return{metadata,bytes};
}

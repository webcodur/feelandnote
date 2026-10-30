import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';import {prepareNativeImage,supportedStaticImage} from './native-image.mjs';
test('실제 GIF 표지는 크기를 보존해 네이버용 JPEG로 바꾸고 자리표·움직이는 GIF는 거부한다',async()=>{
 const gif=await sharp({create:{width:80,height:120,channels:3,background:'#a07050'}}).gif().toBuffer(),prepared=await prepareNativeImage(gif),result=await sharp(prepared.bytes).metadata();
 assert.equal(prepared.metadata.format,'gif');assert.equal(result.format,'jpeg');assert.equal(result.width,80);assert.equal(result.height,120);
 for(const metadata of [{format:'gif',width:80,height:120,pages:2},{format:'png',width:1,height:1},{format:'svg',width:80,height:120}])assert.equal(supportedStaticImage(metadata),false);
 const png=await sharp(gif).png().toBuffer();assert.deepEqual((await prepareNativeImage(png)).bytes,png);
});

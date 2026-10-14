import * as THREE from './three/three.module.js';

const DURATION=20;
const RECEIVES=[[.6,2.5,4.4,6.3],[9.3,11.2,13.1,15]];
const X=[-9,-3,3,9];
const Y=[6,20];
const canvas=document.querySelector('#gallery-canvas');
const labels=[...document.querySelectorAll('.gallery-name')];
const relations=[...document.querySelectorAll('.relation')];
const clamp=(n)=>Math.max(0,Math.min(1,n));
const smooth=(n)=>{const v=clamp(n);return v*v*(3-2*v);};
const lerp=(a,b,t)=>a+(b-a)*t;
const envelope=(t,a,b)=>smooth((t-a)/(b-a));
let seed=728091;
const rand=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};

window.__hf=window.__hf||{};
window.__hf.buildReady=window.__hf.buildReady||{};
window.__hf.buildReady['cinema-gallery']=build();

async function build(){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,preserveDrawingBuffer:true});
 renderer.setSize(1920,1080,false);renderer.setPixelRatio(1);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#121110');
 scene.fog=new THREE.Fog('#121110',30,85);
 const camera=new THREE.PerspectiveCamera(35,1920/1080,.1,150);
 const loader=new THREE.TextureLoader();
 const urls=JSON.parse(canvas.dataset.portraits);
 const textures=await Promise.all(urls.map(url=>loader.loadAsync(url)));
 textures.forEach(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;});

 // A seeded stone surface is a material, not a full-frame grain overlay.
 const surface=document.createElement('canvas');surface.width=surface.height=256;
 const ctx=surface.getContext('2d'),pixels=ctx.createImageData(256,256);
 for(let i=0;i<pixels.data.length;i+=4){
  const value=150+Math.floor(rand()*42);pixels.data[i]=value+3;pixels.data[i+1]=value;pixels.data[i+2]=value-7;pixels.data[i+3]=255;
 }
 ctx.putImageData(pixels,0,0);
 ctx.strokeStyle='rgba(39,36,29,.2)';ctx.lineWidth=.7;
 for(let i=0;i<18;i++){
  ctx.beginPath();let x=rand()*256,y=rand()*256;ctx.moveTo(x,y);
  for(let j=0;j<8;j++){x+=rand()*30-8;y+=rand()*38-10;ctx.lineTo(x,y);}ctx.stroke();
 }
 const stoneMap=new THREE.CanvasTexture(surface);stoneMap.wrapS=stoneMap.wrapT=THREE.RepeatWrapping;stoneMap.repeat.set(2,3);
 stoneMap.colorSpace=THREE.SRGBColorSpace;stoneMap.anisotropy=8;
 const stone=new THREE.MeshStandardMaterial({color:'#8f8c80',map:stoneMap,bumpMap:stoneMap,bumpScale:.035,roughness:.83,metalness:.02});
 const floorMat=stone.clone();floorMat.roughness=.34;floorMat.color.set('#57544b');
 const bronze=new THREE.MeshStandardMaterial({color:'#947745',metalness:.75,roughness:.36});
 const recess=new THREE.MeshStandardMaterial({color:'#25231f',roughness:.92});
 function box(w,h,d,x,y,z,mat=stone){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
 }
 function column(x,z,height=26){
  const geometry=new THREE.CylinderGeometry(.48,.63,height,64,1);
  const positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   const vx=positions.getX(i),vz=positions.getZ(i),theta=Math.atan2(vz,vx),indent=1-.043*(.5+.5*Math.cos(theta*20));
   positions.setX(i,vx*indent);positions.setZ(i,vz*indent);
  }
  geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,stone);mesh.position.set(x,height/2,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
  for(const [y,r,h] of [[.22,.87,.44],[.55,.74,.2],[height-.25,.92,.5]]){
   const ring=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,64),stone);ring.position.set(x,y,z);ring.castShadow=true;ring.receiveShadow=true;scene.add(ring);
  }
 }
 // Colonnades run into real depth. Front columns parallax against the back wall.
 box(34,.6,34,0,-.3,4,floorMat);
 box(34,26,1,0,13,-4.8,stone);
 for(const x of [-12,-6,0,6,12])column(x,-3.5);
 for(const z of [2,8,14]){column(-15,z);column(15,z);}
 box(34,.65,10,0,13.1,-.2,stone);
 box(34,.8,11,0,26,-.3,stone);
 for(const y of [12.55,13.5,25.5])box(33,.12,.16,0,y,5.1,bronze);
 for(const x of [-9,-3,3,9])for(const y of Y){
  box(5.45,8,.18,x,y-1,-4.15,recess);
  box(5.8,.16,.24,x,y+3.15,-4,bronze);
 }
 for(let z=-4;z<=18;z+=3.6)box(34,.015,.018,0,.025,z,bronze);
 for(let x=-15;x<=15;x+=3.75)box(.018,.015,30,x,.027,3,bronze);

 scene.add(new THREE.HemisphereLight('#eadfc8','#21242a',.85));
 const key=new THREE.DirectionalLight('#f4e6c9',2.2);key.position.set(-12,24,-8);key.castShadow=true;
 key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-22,right:22,top:28,bottom:-4,near:1,far:70});key.shadow.bias=-.0004;key.shadow.normalBias=.03;
 scene.add(key);
 for(const x of [-13,13])for(const y of [8,22]){
  const bounce=new THREE.PointLight('#d7c7a5',55,20,2);bounce.position.set(x,y,-1.8);scene.add(bounce);
 }
 const monuments=[],spots=[];
 for(let r=0;r<2;r++)for(let i=0;i<4;i++){
  const x=X[i],y=Y[r],base=y-5.7;
  box(5.8,.28,3.1,x,base-.15,.2,stone);
  box(4.6,2.4,2.5,x,base+1.15,.2,stone);
  box(5.0,.22,2.9,x,base+2.46,.2,stone);
  box(4.7,.04,2.6,x,base+2.59,.2,bronze);
  // Registered bust images stay fixed in the world; the camera does the moving.
  const mat=new THREE.MeshStandardMaterial({map:textures[r*4+i],emissiveMap:textures[r*4+i],emissive:'#ffffff',emissiveIntensity:.07,roughness:1,metalness:0,transparent:true,alphaTest:.018,depthWrite:true,fog:false});
  const portrait=new THREE.Mesh(new THREE.PlaneGeometry(6.1,6.1),mat);portrait.position.set(x,y,.42);portrait.renderOrder=3;scene.add(portrait);monuments.push(portrait);
  const spot=new THREE.SpotLight('#ead6a9',500,30,.39,.85,2);spot.position.set(x-1,y+7,7);spot.target.position.set(x,y-2,0);scene.add(spot,spot.target);spots.push(spot);
 }
 const paths=[],beads=[];
 for(let r=0;r<2;r++)for(let i=0;i<3;i++){
  const y=Y[r]-3.6;
  const curve=new THREE.CubicBezierCurve3(new THREE.Vector3(X[i],y,2),new THREE.Vector3(X[i]+2,y+.45,2.3),new THREE.Vector3(X[i]+4,y+.45,2.3),new THREE.Vector3(X[i+1],y,2));
  const mat=bronze.clone();mat.emissive.set('#a98238');mat.emissiveIntensity=.035;
  const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,48,.013,6,false),mat);scene.add(tube);paths.push({curve,tube});
 }
 for(let i=0;i<7;i++){
  const bead=new THREE.Mesh(new THREE.SphereGeometry(.065*(1-i*.1),12,8),new THREE.MeshBasicMaterial({color:'#f1d697',transparent:true,opacity:1-i*.13,toneMapped:false}));scene.add(bead);beads.push(bead);
 }
 const travellingLight=new THREE.PointLight('#e2bc72',12,4,2);scene.add(travellingLight);
 const projected=new THREE.Vector3(),target=new THREE.Vector3();
 let currentTime=0;
 function emphasis(t,row,index){
  const at=RECEIVES[row][index],arrival=envelope(t,at-.23,at+.28);
  const depart=index<3?envelope(t,RECEIVES[row][index+1]-.35,RECEIVES[row][index+1]+.28):envelope(t,row===0?7.7:16.5,row===0?8.3:17.1);
  return arrival*(1-depart);
 }
 function renderAt(t){
  currentTime=t;
  const crane=envelope(t,7.8,9.15),close=envelope(t,16.3,17.9);
  const row=t<8.6?0:1;
  // Lateral tracking is gentle and lens-led, never independent face scaling.
  let travel=0;
  for(let i=1;i<4;i++)travel+=envelope(t,RECEIVES[row][i]-.75,RECEIVES[row][i]+.12);
  const truck=lerp(-2.1,2.1,travel/3)*(1-close);
  const gaze=lerp(5.7,19.7,crane);
  const cameraY=lerp(gaze+1.8,13.8,close);
  const cameraZ=lerp(25.8-t*.035+Math.sin(crane*Math.PI)*14,46,close);
  camera.position.set(truck,cameraY,cameraZ);
  target.set(truck*.23,lerp(gaze,12.9,close),-.5);camera.lookAt(target);camera.updateMatrixWorld();
  for(let r=0;r<2;r++)for(let i=0;i<4;i++){
   const k=r*4+i,e=emphasis(t,r,i);
   monuments[k].material.opacity=1;
   spots[k].intensity=lerp(35+e*620,160,close);
   projected.set(X[i],Y[r]-3.55,1).project(camera);
   const px=(projected.x*.5+.5)*1920,py=(-projected.y*.5+.5)*1080;
   const visible=px>90&&px<1830&&py>170&&py<875;
   labels[k].style.display=visible?'block':'none';
   labels[k].style.left=px+'px';labels[k].style.top=py+'px';
   labels[k].style.opacity=lerp(.74+e*.26,1,close);
   labels[k].style.fontSize=lerp(35,26,close)+'px';
  }
  let moving=null;
  for(let r=0;r<2;r++)for(let i=0;i<3;i++){
   const at=RECEIVES[r][i+1],p=clamp((t-(at-.75))/.75),link=paths[r*3+i];
   link.tube.material.emissiveIntensity=lerp(.035,.6,envelope(t,at-.75,at));
   if(t>=at-.75&&t<=at+.06)moving={link,p};
   relations[r*3+i].style.opacity=(t>=at-.85&&t<at+1&&t<16.3)?'1':'0';
  }
  beads.forEach((bead,i)=>{bead.visible=!!moving;if(moving)bead.position.copy(moving.link.curve.getPoint(clamp(moving.p-i*.022)));});
  travellingLight.intensity=moving?12:0;if(moving)travellingLight.position.copy(moving.link.curve.getPoint(moving.p));
  document.querySelector('.opening-copy').style.opacity=1-envelope(t,7.6,8.1);
  document.querySelector('.closing').style.opacity=envelope(t,17.95,18.45);
  document.querySelector('.corner-brand').style.opacity=1-envelope(t,16.5,17);
  renderer.render(scene,camera);
 }
 const clock={time:0};
 const tl=gsap.timeline({paused:true,onUpdate:()=>renderAt(clock.time)});
 tl.to(clock,{time:DURATION,duration:DURATION,ease:'none'},0);
 // Seek-back is exact: every pose, material and label is derived from this time.
 window.__timelines['cinema-gallery']=tl;
 window.addEventListener('hf-seek',event=>renderAt(event.detail.time));
 renderAt(window.__hfThreeTime||0);
 await renderer.compileAsync(scene,camera);
 renderAt(currentTime);
}

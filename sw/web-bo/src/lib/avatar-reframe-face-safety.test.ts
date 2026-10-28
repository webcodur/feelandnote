import assert from 'node:assert/strict'
import test from 'node:test'
import { computeReframeCrop, reframeAnchorsOf } from './avatar-reframe'
import { AVATAR_SILHOUETTE_SPEC, AVATAR_SPEC } from './avatar-geometry'

// 하늘 대표 사진의 누끼 준비본(800×800)에서 검출한 실제 좌표. 이미지·네트워크 없이 같은 잘림을 재현한다.
const measured = {
  getLeftEye: [[312.166,462.9977],[321.0617,443.9201],[341.0299,428.8182],[363.6641,421.2725],[356.3768,443.3101],[334.7102,459.0009]],
  getRightEye: [[442.7923,345.9345],[453.8606,320.1237],[471.6395,304.1142],[487.1325,299.0034],[479.522,320.4896],[461.6957,335.4817]],
  getNose: [[413.2064,386.0022],[439.2012,412.7502],[464.4768,435.1182],[481.4874,455.7621],[462.121,488.9636],[475.4005,483.3745],[490.1285,473.4791],[500.9653,456.5988],[505.8319,444.111]],
  getJawOutline: [[245.8018,512.0512],[282.3299,540.4213],[319.5089,569.488],[353.5625,589.8691],[392.3384,606.0535],[437.3779,611.4705],[476.3807,613.7705],[524.6757,608.3174],[574.7907,581.7354],[601.1684,530.4936],[608.027,484.1176],[611.1619,446.7352],[607.2757,401.5806],[594.0124,361.7982],[580.2396,328.5707],[558.5222,297.3829],[528.2477,263.2175]],
  getMouth: [[456.8612,553.5297],[474.9349,531.1713],[495.779,501.8939],[507.4222,494.2426],[516.125,479.9077],[541.6843,469.5544],[559.5593,455.6635],[557.8412,488.3939],[549.8017,512.2505],[537.1543,532.8997],[521.0967,546.8552],[492.9349,555.5893],[459.3659,552.1029],[498.2245,514.796],[515.4082,503.6999],[528.0115,488.5644],[554.0188,458.6339],[535.6574,498.7298],[524.3987,517.3949],[508.1216,530.1815]],
  getLeftEyeBrow: [[253.5588,456.9761],[264.2377,426.6317],[285.2931,403.2701],[311.2456,385.3435],[337.3489,375.5746]],
  getRightEyeBrow: [[412.6951,310.3248],[420.1739,286.8144],[435.7088,262.398],[462.155,242.0284],[486.4805,236.9792]],
}
const landmarks = Object.fromEntries(Object.entries(measured).map(([key,points]) => [key, () => points.map(([x,y]) => ({ x, y }))])) as unknown as Parameters<typeof reframeAnchorsOf>[0]

test('기울어진 실제 얼굴은 최종 원형 안에 눈·코·입·턱선·눈썹을 모두 남긴다', () => {
  const anchors = reframeAnchorsOf(landmarks)!
  const crop = computeReframeCrop(anchors, { headTop: 48, touchesTop: false }, 800, 800)
  const outside = Object.entries(measured).flatMap(([part, points]) => points.flatMap(([x,y], index) => {
    const dx = (x-crop.left)/crop.size-0.5, dy=(y-crop.top)/crop.size-0.5
    return Math.hypot(dx,dy)>0.5 ? [part+':'+index] : []
  }))
  assert.deepEqual(outside, [], '정사각 기하 합격이어도 원형 밖의 실제 얼굴은 잘림이다')
})

function transformed(scale: number, mirrored: boolean, shift: number) {
  const groups = Object.fromEntries(Object.entries(measured).map(([key,points]) => [key,
    points.map(([x,y]) => ({ x: ((mirrored ? 800-x : x)+shift)*scale, y: y*scale })),
  ]))
  if (mirrored) {
    ;[groups.getLeftEye, groups.getRightEye] = [groups.getRightEye, groups.getLeftEye]
    ;[groups.getLeftEyeBrow, groups.getRightEyeBrow] = [groups.getRightEyeBrow, groups.getLeftEyeBrow]
    groups.getJawOutline.reverse()
  }
  const lm = Object.fromEntries(Object.entries(groups).map(([key,points])=>[key,()=>points])) as unknown as Parameters<typeof reframeAnchorsOf>[0]
  return { anchors: reframeAnchorsOf(lm)!, points: Object.values(groups).flat() }
}

test('기울기 방향·배율·이동과 무관하게 얼굴 전체를 원형 여유 안에 보존하고 추가 확대를 제한한다', () => {
  for (const scale of [0.5,1,2]) for (const mirrored of [false,true]) for (const shift of [0,100]) {
    const {anchors,points}=transformed(scale,mirrored,shift)
    const crop=computeReframeCrop(anchors,{headTop:48*scale,touchesTop:false},(800+shift*2)*scale,800*scale)
    assert.equal(crop.decidedBy,'face-safety')
    assert.ok(Math.abs(anchors.rollDegrees!)>40)
    const radius=0.5-AVATAR_SILHOUETTE_SPEC.faceSafety.circleInset
    for (const {x,y} of points) assert.ok(Math.hypot((x-crop.left)/crop.size-0.5,(y-crop.top)/crop.size-0.5)<=radius)
    assert.ok(crop.size >= (anchors.chinY-anchors.eyeY)/AVATAR_SPEC.eyeChinSpan)
    assert.ok(crop.top>=0 && crop.top+crop.size<=800*scale)
  }
})

test('얼굴 보존으로 완성된 구도는 다시 정규화해도 재확대·재압축 대상으로 돌리지 않는다', () => {
  const {anchors}=transformed(1,false,0)
  const first=computeReframeCrop(anchors,{headTop:48,touchesTop:false},800,800)
  const factor=800/first.size
  const shifted={...anchors,eyeX:(anchors.eyeX-first.left)*factor,eyeY:(anchors.eyeY-first.top)*factor,
    chinY:(anchors.chinY-first.top)*factor,centerX:(anchors.centerX!-first.left)*factor,
    faceCenterX:(anchors.faceCenterX!-first.left)*factor,noseX:(anchors.noseX!-first.left)*factor,
    facePoints:anchors.facePoints!.map(p=>({x:(p.x-first.left)*factor,y:(p.y-first.top)*factor}))}
  const again=computeReframeCrop(shifted,{headTop:0,touchesTop:true},800,800)
  assert.deepEqual({left:again.left,top:again.top,size:again.size,decidedBy:again.decidedBy},
    {left:0,top:0,size:800,decidedBy:'already-normalized'})
})

test('충분한 원본이 없거나 얼굴 주요점이 유효하지 않으면 잘린 결과를 성공 처리하지 않는다', () => {
  const shape={headTop:0,touchesTop:true}
  const base={eyeX:400,eyeY:400,chinY:600}
  assert.throws(()=>computeReframeCrop({...base,facePoints:[{x:0,y:0},{x:799,y:799}]},shape,800,800),/원형 프레임/)
  for (const point of [{x:NaN,y:400},{x:400,y:Infinity}]) {
    assert.throws(()=>computeReframeCrop({...base,facePoints:[point]},shape,800,800),/유효하지 않은 얼굴 주요점/)
  }
  for (const point of [{x:-1,y:400},{x:800,y:400},{x:400,y:800}]) {
    assert.throws(()=>computeReframeCrop({...base,facePoints:[point]},shape,800,800),/원본 바깥/)
  }
})

test('입·눈썹을 포함한 실제 주요점을 수집하고 이미 원형에 안전한 얼굴은 기존 좌표를 유지한다', () => {
  assert.equal(reframeAnchorsOf(landmarks)!.facePoints!.length,68)
  const base={eyeX:500,eyeY:400,chinY:600}
  const shape={headTop:140,touchesTop:false}
  const before=computeReframeCrop(base,shape,1000,1000)
  const after=computeReframeCrop({...base,facePoints:[{x:450,y:400},{x:550,y:400},{x:500,y:600}]},shape,1000,1000)
  assert.deepEqual(after,before)
})

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import './style.css';

const $ = (id) => document.getElementById(id);
const canvas = $('twin-canvas');
const viewport = $('viewport');
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.65;
} catch (error) {
  console.error('[CAPARAZÓN MODEL] WebGL unavailable', error);
  $('loading').hidden = true;
  $('model-error').hidden = false;
  $('model-error').textContent = 'Este navegador no pudo iniciar WebGL. Activa la aceleración gráfica o prueba otro navegador.';
}
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-.62,.62,.62,-.62,.1,100);
camera.position.set(0,1.8,0);
camera.up.set(0,0,1);
camera.lookAt(0,0,0);
camera.updateMatrixWorld();
const twinRoot = new THREE.Group();
scene.add(twinRoot);
scene.add(new THREE.HemisphereLight(0xd7e7ec, 0x24343c, 2.15));
const sun = new THREE.DirectionalLight(0xffffff, 2.35);
sun.position.set(-.4, 1.7, .65);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x91c5d2, .9);
fill.position.set(.8, .8, -.5);
scene.add(fill);

const state = { powerOn: false, volumeLevel: 50, micMuted: false, current: 'OFF', event: 'startup', detail: 'Initial OFF snapshot', source: 'system', timestamp: new Date().toISOString() };
const offMaterial = new THREE.MeshStandardMaterial({color:0x3f4d52,emissive:0x101719,roughness:.34,metalness:.35});
const onMaterial = new THREE.MeshStandardMaterial({color:0x56e9a9,emissive:0x36d694,emissiveIntensity:1.25,roughness:.25,metalness:.18});
function indicator(x,z){
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(.019,16,12),offMaterial);
  mesh.position.set(x,.563,z);
  mesh.scale.y=.42;
  twinRoot.add(mesh);
  return mesh;
}
const powerLed = indicator(.125,.16);
const micLed = indicator(-.19,.1);

const controls = [
  // Centres of the printed symbols on the converted FBX surface (UV -> 3D).
  {name:'power',position:[.021,.714,.124],radius:.055},
  {name:'volume_up',position:[.109,.748,-.018],radius:.064},
  {name:'volume_down',position:[-.060,.755,-.046],radius:.064},
  {name:'mic',position:[-.116,.715,.079],radius:.064},
];
const controlMeshes = controls.map(({name,position,radius})=>{
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius,12,8), new THREE.MeshBasicMaterial({visible:false}));
  mesh.position.set(...position);
  mesh.userData.action=name;
  twinRoot.add(mesh);
  return mesh;
});
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function hitControl(event){
  const rect=canvas.getBoundingClientRect();
  pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
  raycaster.setFromCamera(pointer,camera);
  for(const mesh of controlMeshes) mesh.updateWorldMatrix(true,false);
  return raycaster.intersectObjects(controlMeshes,false)[0]?.object.userData.action || null;
}
let tilt=0, viewZoom=1, gesture=null, pinchDistance=0;
const pointers=new Map();
function setView(){
  camera.position.set(0,1.8*Math.cos(tilt),-1.8*Math.sin(tilt));
  camera.lookAt(0,0,0);
  camera.zoom=viewZoom;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
function resetView(){twinRoot.rotation.y=0;tilt=0;viewZoom=1;setView();}
function pointerDistance(){
  const [a,b]=[...pointers.values()];
  return Math.hypot(a.x-b.x,a.y-b.y);
}
canvas.addEventListener('pointerdown',event=>{
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.size===1){
    gesture={id:event.pointerId,startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastY:event.clientY,moved:false,action:hitControl(event)};
  }else{gesture=null;pinchDistance=pointers.size===2?pointerDistance():0;}
});
canvas.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId)){
    if(event.pointerType==='mouse') canvas.style.cursor=hitControl(event)?'pointer':'grab';
    return;
  }
  event.preventDefault();
  pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.size===2){
    const distance=pointerDistance();
    if(pinchDistance>0){viewZoom=THREE.MathUtils.clamp(viewZoom*distance/pinchDistance,.8,2.4);setView();}
    pinchDistance=distance;
  }else if(pointers.size===1&&gesture?.id===event.pointerId){
    const dx=event.clientX-gesture.lastX,dy=event.clientY-gesture.lastY;
    if(Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)>6) gesture.moved=true;
    if(gesture.moved){
      twinRoot.rotation.y+=dx*.009;
      tilt=THREE.MathUtils.clamp(tilt+dy*.006,0,1.05);
      setView();
      canvas.style.cursor='grabbing';
    }
    gesture.lastX=event.clientX;gesture.lastY=event.clientY;
  }
});
function finishPointer(event,cancelled){
  if(!pointers.has(event.pointerId)) return;
  if(!cancelled&&pointers.size===1&&gesture?.id===event.pointerId&&!gesture.moved&&gesture.action&&gesture.action===hitControl(event)){
    activate(gesture.action,'physical_button_3d');
  }
  pointers.delete(event.pointerId);
  gesture=null;
  pinchDistance=0;
  canvas.style.cursor='grab';
}
canvas.addEventListener('pointerup',event=>finishPointer(event,false));
canvas.addEventListener('pointercancel',event=>finishPointer(event,true));
canvas.addEventListener('pointerleave',()=>{if(!pointers.size)canvas.style.cursor='grab';});
canvas.addEventListener('wheel',event=>{
  event.preventDefault();
  viewZoom=THREE.MathUtils.clamp(viewZoom*Math.exp(-event.deltaY*.001),.8,2.4);
  setView();
},{passive:false});
$('reset-view').addEventListener('click',resetView);
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>activate(button.dataset.action,'dashboard_control')));
document.addEventListener('keydown',event=>{
  if(event.repeat || /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
  const key=event.key.toLowerCase();
  if(key==='r'){event.preventDefault();resetView();return;}
  const action=key==='p'?'power':key==='m'?'mic':key==='+'||key==='='?'volume_up':key==='-'?'volume_down':null;
  if(action){event.preventDefault();activate(action,'keyboard');}
});

let audioContext=null;
const audioBuffers=new Map();
const asset=(name)=>`${import.meta.env.BASE_URL}assets/${name}`;
async function prepareAudio(){
  try{
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await Promise.all([
      ['volume', 'VolumeLevelFeedback.wav'],['mic','MicrophoneMutedFeedback.wav']
    ].map(async ([name,file])=>{
      const response=await fetch(asset(file));
      if(!response.ok) throw new Error(`Audio HTTP ${response.status}`);
      audioBuffers.set(name,await audioContext.decodeAudioData(await response.arrayBuffer()));
    }));
  }catch(error){ console.warn('[TWIN AUDIO] audio unavailable',error); }
}
prepareAudio();
async function playSound(kind,gainValue){
  try{
    if(!audioContext || !audioBuffers.has(kind)) return;
    await audioContext.resume();
    const source=audioContext.createBufferSource();
    source.buffer=audioBuffers.get(kind);
    const gain=audioContext.createGain();
    gain.gain.value=gainValue;
    source.connect(gain).connect(audioContext.destination);
    source.start();
  }catch(error){console.warn('[TWIN AUDIO] playback failed',error);}
}

let db=null;
const records=[];
const header=['timestamp','source','event','powerOn','volumeLevel','micMuted','state','action','quality','validity'];
function csvCell(value){return `"${String(value ?? '').replaceAll('"','""')}"`;}
function csvFor(rows){return [header.join(','),...rows.map(row=>header.map(k=>csvCell(row[k])).join(','))].join('\n')+'\n';}
async function initStorage(){
  if(!('indexedDB' in window)){$('storage-state').textContent='Solo esta sesión';return;}
  try{
    db=await new Promise((resolve,reject)=>{
      const request=indexedDB.open('CaparazonTwin',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('events',{keyPath:'id',autoIncrement:true});
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    $('storage-state').textContent='Guardado en este navegador';
    for(const row of records) persist(row);
  }catch(error){console.warn('[TWIN LOGGER] IndexedDB unavailable',error);$('storage-state').textContent='Solo esta sesión';}
}
function persist(row){
  if(!db) return;
  try{
    const tx=db.transaction('events','readwrite');
    tx.objectStore('events').add(row);
    tx.onerror=()=>{$('storage-state').textContent='Solo esta sesión';console.warn('[TWIN LOGGER] write failed',tx.error);};
  }catch(error){ console.warn('[TWIN LOGGER] write failed',error);$('storage-state').textContent='Solo esta sesión'; }
}
function record(event,quality,accepted,action){
  const row={timestamp:state.timestamp,source:state.source,event,powerOn:state.powerOn,volumeLevel:state.volumeLevel,micMuted:state.micMuted,state:state.current,action,quality,validity:accepted?'accepted':'rejected'};
  records.push(row);
  persist(row);
  console.info('[CAPARAZÓN TWIN]',row);
}
$('export-csv').addEventListener('click',async()=>{
  let rows=records;
  if(db){
    try{ rows=await new Promise((resolve,reject)=>{const request=db.transaction('events','readonly').objectStore('events').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);}); }
    catch(error){console.warn('[TWIN LOGGER] export from session only',error);}
  }
  const url=URL.createObjectURL(new Blob([csvFor(rows)],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a'); link.href=url; link.download='twin_events.csv'; link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});

function activate(action,source){
  if(audioContext?.state==='suspended') audioContext.resume().catch(()=>{});
  let event='',detail='',accepted=true,quality='Valid',decision='';
  if(action==='power'){
    state.powerOn=!state.powerOn;
    if(!state.powerOn) state.micMuted=false;
    event=state.powerOn?'power_on':'power_off';
    detail=state.powerOn?'Master power enabled':'Master power disabled';
    decision=state.powerOn?'Enter ON_LISTENING; enable secondary controls':'Enter OFF; LEDs/audio off; lock secondary controls';
  }else if(action==='volume_up'||action==='volume_down'){
    const up=action==='volume_up';event=up?'volume_up':'volume_down';
    if(!state.powerOn){accepted=false;quality='Blocked';event+='_blocked_power_off';detail=`Volume${up?'+':'-'} locked while OFF`;}
    else {const old=state.volumeLevel;state.volumeLevel=Math.max(0,Math.min(100,old+(up?10:-10)));
      detail=old===state.volumeLevel?`Volume already at limit ${state.volumeLevel}`:`Volume ${old} -> ${state.volumeLevel}`;
      decision=up?'Increase volume and beep at resulting level':'Decrease volume and beep at resulting level';
      if(state.volumeLevel>0)playSound('volume',state.volumeLevel/100);
    }
  }else if(action==='mic'){
    if(!state.powerOn){accepted=false;quality='Blocked';event='mic_blocked_power_off';detail='Mic locked while OFF';}
    else {state.micMuted=!state.micMuted;event=state.micMuted?'mic_muted':'mic_listening';detail=state.micMuted?'Microphone muted':'Microphone listening';decision=state.micMuted?'Enter ON_MUTED':'Enter ON_LISTENING';if(state.micMuted)playSound('mic',.75);}
  }else return;
  state.current=!state.powerOn?'OFF':state.micMuted?'ON_MUTED':'ON_LISTENING';
  state.event=event;state.detail=detail;state.source=source;state.timestamp=new Date().toISOString();
  record(event,quality,accepted,accepted?decision:`IGNORED: ${detail}`);
  renderDashboard();
}
function renderDashboard(){
  const {current,powerOn,micMuted,volumeLevel}=state;
  $('state-display').textContent=current;
  $('status-badge').textContent=current==='OFF'?'OFF':current==='ON_MUTED'?'MUTED':'LISTENING';
  $('status-badge').className='status-badge '+(current==='OFF'?'':micMuted?'muted':'on');
  $('power-display').textContent=powerOn?'ON':'OFF';
  $('mic-display').textContent=micMuted?'MUTED':'LISTENING';
  $('power-led').classList.toggle('active',powerOn);
  $('mic-led').classList.toggle('active',micMuted);
  powerLed.material=powerOn?onMaterial:offMaterial;
  micLed.material=micMuted?onMaterial:offMaterial;
  $('volume-display').textContent=String(volumeLevel);
  $('volume-fill').style.width=`${volumeLevel}%`;
  $('event-display').textContent=state.event;
  $('detail-display').textContent=state.detail;
  $('timestamp-display').textContent=new Date(state.timestamp).toLocaleString('es-CL');
  for(let i=1;i<=3;i++)$('state-segment-'+i).classList.toggle('active',(current==='OFF'?1:current==='ON_LISTENING'?2:3)>=i);
  document.querySelectorAll('[data-action]').forEach(button=>button.setAttribute('aria-disabled',String(!powerOn&&button.dataset.action!=='power')));
}
record('startup','Simulated',true,'Initialize explicit OFF state');
renderDashboard();
initStorage();

const loader=new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
if (renderer) loader.load(asset('caparazon-web.glb'),gltf=>{
  gltf.scene.traverse(obj=>{if(obj.isMesh){obj.castShadow=false;obj.receiveShadow=false;obj.material.side=THREE.DoubleSide;}});
  twinRoot.add(gltf.scene);
  $('loading').hidden=true;
  window.dispatchEvent(new Event('twin:model-ready'));
},xhr=>{if(xhr.total)$('load-progress').textContent=`${Math.round(xhr.loaded/xhr.total*100)} %`;},error=>{
  console.error('[CAPARAZÓN MODEL] load failed',error);
  $('loading').hidden=true;$('model-error').hidden=false;
});
function resize(){
  const width=viewport.clientWidth,height=viewport.clientHeight;
  if(!width||!height) return;
  if (!renderer) return;
  renderer.setSize(width,height,false);
  const aspect=width/height;
  camera.left=-.62*aspect;camera.right=.62*aspect;camera.top=.62;camera.bottom=-.62;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);
resize();
if (renderer) renderer.setAnimationLoop(()=>renderer.render(scene,camera));

const qs=new URLSearchParams(location.search);
const project=ARGEngineStorage.getProject(qs.get("id"));
if(!project){alert("Projeto não encontrado.");location.href="index.html";throw new Error("Project not found");}

let currentMapId=qs.get("map")||project.maps[0].id;
let currentMap=project.maps.find(m=>m.id===currentMapId)||project.maps[0];

const canvas=document.getElementById("gameCanvas");
const ctx=canvas.getContext("2d");
const keys=new Set();
const images=new Map();
let last=performance.now();
let paused=false;
let dialogOpen=false;
let nearby=null;

const player={
  x:currentMap.spawn.x,y:currentMap.spawn.y,
  width:project.player.width,height:project.player.height,
  speed:project.player.speed,color:project.player.color,spriteAssetId:project.player.spriteAssetId
};

document.getElementById("gameProjectName").textContent=project.name;

function loadAssets(){
  for(const a of project.assets){
    const img=new Image();img.src=a.dataUrl;images.set(a.id,img);
  }
}
loadAssets();

function setMap(m,spawn=true){
  currentMap=m;currentMapId=m.id;
  canvas.width=m.width;canvas.height=m.height;
  if(spawn){player.x=m.spawn.x;player.y=m.spawn.y;}
  document.getElementById("gameMapName").textContent=m.name;
  resize();
}
setMap(currentMap,false);

function resize(){
  const scale=Math.min(innerWidth/canvas.width,innerHeight/canvas.height);
  canvas.style.width=Math.floor(canvas.width*scale)+"px";
  canvas.style.height=Math.floor(canvas.height*scale)+"px";
}
window.addEventListener("resize",resize);resize();

window.addEventListener("keydown",ev=>{
  const k=ev.key.toLowerCase();
  if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k))ev.preventDefault();
  if(k==="escape"){
    if(dialogOpen){closeDialog();return;}
    paused=!paused;document.getElementById("pauseOverlay").classList.toggle("hidden",!paused);return;
  }
  if((k==="e"||k==="enter")&&dialogOpen){closeDialog();return;}
  if(k==="e"&&!dialogOpen&&nearby){interact(nearby);return;}
  keys.add(k);
});
window.addEventListener("keyup",ev=>keys.delete(ev.key.toLowerCase()));

document.getElementById("resumeBtn").onclick=()=>{paused=false;document.getElementById("pauseOverlay").classList.add("hidden");};
document.getElementById("backEditorBtn").onclick=()=>location.href=`editor.html?id=${encodeURIComponent(project.id)}`;

function getRectAt(x,y){return{x:x-player.width/2,y:y-player.height/2,w:player.width,h:player.height};}
function entRect(e){return{x:e.x,y:e.y,w:e.width,h:e.height};}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function collidesAt(x,y){
  const r=getRectAt(x,y);
  return currentMap.entities.some(e=>e.visible!==false&&e.collision&&overlap(r,entRect(e)));
}
function distToEntity(e){
  const cx=e.x+e.width/2,cy=e.y+e.height/2;
  return Math.hypot(player.x-cx,player.y-cy);
}

function update(dt){
  if(paused||dialogOpen)return;
  let dx=0,dy=0;
  if(keys.has("w")||keys.has("arrowup"))dy--;
  if(keys.has("s")||keys.has("arrowdown"))dy++;
  if(keys.has("a")||keys.has("arrowleft"))dx--;
  if(keys.has("d")||keys.has("arrowright"))dx++;
  if(dx||dy){
    const l=Math.hypot(dx,dy);dx/=l;dy/=l;
    const nx=clamp(player.x+dx*player.speed*dt,player.width/2,currentMap.width-player.width/2);
    const ny=clamp(player.y+dy*player.speed*dt,player.height/2,currentMap.height-player.height/2);
    if(!collidesAt(nx,player.y))player.x=nx;
    if(!collidesAt(player.x,ny))player.y=ny;
  }

  nearby=null;
  let best=72;
  for(const e of currentMap.entities){
    if(e.visible===false)continue;
    if(!["npc","door","object"].includes(e.type))continue;
    const d=distToEntity(e);
    if(d<best){best=d;nearby=e;}
  }
  document.getElementById("interactionPrompt").classList.toggle("hidden",!nearby);
}

function interact(e){
  if(e.type==="door"&&e.targetMapId){
    const target=project.maps.find(m=>m.id===e.targetMapId);
    if(target){setMap(target,true);nearby=null;return;}
  }
  const text=e.interactionText||(e.type==="npc"?"...":"Não acontece nada.");
  showDialog(e.displayName||e.name,text);
}
function showDialog(speaker,text){
  dialogOpen=true;
  document.getElementById("dialogSpeaker").textContent=speaker;
  document.getElementById("dialogText").textContent=text;
  document.getElementById("dialogBox").classList.remove("hidden");
  document.getElementById("interactionPrompt").classList.add("hidden");
}
function closeDialog(){dialogOpen=false;document.getElementById("dialogBox").classList.add("hidden");}

function draw(){
  ctx.fillStyle=currentMap.backgroundColor;ctx.fillRect(0,0,canvas.width,canvas.height);

  const ents=[...currentMap.entities].filter(e=>e.visible!==false).sort((a,b)=>a.layer-b.layer);
  for(const e of ents)drawEntity(e);

  drawPlayer();
}

function drawEntity(e){
  if(e.type==="trigger")return;
  if(e.type==="light"){
    const g=ctx.createRadialGradient(e.x+e.width/2,e.y+e.height/2,0,e.x+e.width/2,e.y+e.height/2,e.radius||160);
    g.addColorStop(0,`rgba(255,238,150,${(e.intensity??.6)*.28})`);
    g.addColorStop(1,"rgba(255,238,150,0)");
    ctx.fillStyle=g;ctx.fillRect(e.x-(e.radius||160),e.y-(e.radius||160),(e.radius||160)*2+e.width,(e.radius||160)*2+e.height);
    return;
  }
  const img=images.get(e.spriteAssetId);
  if(img&&img.complete&&img.naturalWidth){
    ctx.imageSmoothingEnabled=false;ctx.drawImage(img,e.x,e.y,e.width,e.height);
  }else{
    ctx.fillStyle=e.color||"#777";ctx.fillRect(e.x,e.y,e.width,e.height);
    if(e.type==="wall"){
      ctx.strokeStyle="rgba(255,255,255,.12)";
      for(let x=e.x;x<e.x+e.width;x+=16){ctx.beginPath();ctx.moveTo(x,e.y);ctx.lineTo(x,e.y+e.height);ctx.stroke();}
    }
  }
}
function drawPlayer(){
  const x=player.x-player.width/2,y=player.y-player.height/2;
  const img=images.get(player.spriteAssetId);
  if(img&&img.complete&&img.naturalWidth){
    ctx.imageSmoothingEnabled=false;ctx.drawImage(img,x,y,player.width,player.height);
  }else{
    ctx.fillStyle="rgba(0,0,0,.35)";ctx.beginPath();ctx.ellipse(player.x,player.y+player.height*.46,player.width*.45,player.height*.14,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=player.color;ctx.fillRect(x,y,player.width,player.height);
  }
}

function loop(now){
  const dt=Math.min((now-last)/1000,.05);last=now;update(dt);draw();requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function clamp(v,min,max){return Math.max(min,Math.min(max,v));}

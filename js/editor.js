const qs = new URLSearchParams(location.search);
const projectId = qs.get("id");
let project = ARGEngineStorage.getProject(projectId);
if(!project){ alert("Projeto não encontrado."); location.href="index.html"; throw new Error("Project not found"); }

let currentMapId = project.maps[0].id;
let selectedEntityId = null;
let saveTimer = null;
let gridVisible = true;
let history = [];
let historyIndex = -1;
let suppressHistory = false;
let dragState = null;

const $ = id => document.getElementById(id);
const map = () => project.maps.find(m=>m.id===currentMapId);

const typeMeta = {
  wall:{icon:"🧱",name:"Parede",color:"#343846",collision:true,w:128,h:32},
  object:{icon:"📦",name:"Objeto",color:"#7f6852",collision:true,w:48,h:48},
  npc:{icon:"👤",name:"NPC",color:"#d98b5f",collision:true,w:32,h:42},
  door:{icon:"🚪",name:"Porta",color:"#74543e",collision:true,w:34,h:58},
  trigger:{icon:"◫",name:"Trigger",color:"#4ab7ff",collision:false,w:96,h:64},
  light:{icon:"💡",name:"Luz",color:"#ffe67a",collision:false,w:160,h:160}
};

function entityById(id){return map().entities.find(e=>e.id===id)||null;}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function snap(v){ return project.settings.snapToGrid ? Math.round(v/project.settings.gridSize)*project.settings.gridSize : Math.round(v); }
function selected(){return entityById(selectedEntityId);}

function snapshot(push=true){
  if(suppressHistory) return;
  const state=JSON.stringify(project);
  if(push){
    history=history.slice(0,historyIndex+1);
    if(history[history.length-1]!==state){
      history.push(state);
      if(history.length>80) history.shift();
      historyIndex=history.length-1;
    }
  }
  updateUndoButtons();
}

function restoreHistory(index){
  if(index<0||index>=history.length)return;
  suppressHistory=true;
  project=JSON.parse(history[index]);
  historyIndex=index;
  if(!project.maps.some(m=>m.id===currentMapId)) currentMapId=project.maps[0].id;
  if(selectedEntityId&&!entityById(selectedEntityId))selectedEntityId=null;
  suppressHistory=false;
  renderAll();
  scheduleSave(false);
  updateUndoButtons();
}

function undo(){ if(historyIndex>0) restoreHistory(historyIndex-1); }
function redo(){ if(historyIndex<history.length-1) restoreHistory(historyIndex+1); }
function updateUndoButtons(){
  $("undoBtn").disabled=historyIndex<=0;
  $("redoBtn").disabled=historyIndex>=history.length-1;
}

function scheduleSave(makeHistory=true){
  if(makeHistory) snapshot();
  $("saveStatus").textContent="A guardar...";
  $("saveStatus").classList.add("dirty");
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    ARGEngineStorage.saveProject(project);
    $("saveStatus").textContent="Guardado";
    $("saveStatus").classList.remove("dirty");
  },220);
}

function renderAll(){
  $("projectTitle").textContent=project.name;
  renderMapSurface();
  renderHierarchy();
  renderAssets();
  renderMaps();
  renderInspector();
  renderProjectPanel();
}

function renderMapSurface(){
  const m=map();
  $("workspaceMapName").textContent=m.name;
  $("mapCanvas").style.width=m.width+"px";
  $("mapCanvas").style.height=m.height+"px";
  $("mapCanvas").style.background=m.backgroundColor;
  $("gridLayer").classList.toggle("hidden-grid",!gridVisible);

  const layer=$("entityLayer");
  layer.innerHTML="";

  const entities=[...m.entities].sort((a,b)=>a.layer-b.layer);
  for(const e of entities){
    if(e.visible===false) continue;
    const node=document.createElement("div");
    node.className=`editor-entity ${e.type}${e.id===selectedEntityId?" selected":""}`;
    node.dataset.id=e.id;
    Object.assign(node.style,{
      left:e.x+"px",top:e.y+"px",width:e.width+"px",height:e.height+"px",zIndex:String(e.layer)
    });

    const asset=project.assets.find(a=>a.id===e.spriteAssetId);
    if(asset){
      node.style.background="transparent";
      const img=document.createElement("img");
      img.src=asset.dataUrl;
      img.alt="";
      node.appendChild(img);
    }else if(!["wall","trigger","light"].includes(e.type)){
      node.style.background=e.color||typeMeta[e.type]?.color||"#777";
      node.textContent=typeMeta[e.type]?.icon||"□";
    }

    const label=document.createElement("div");
    label.className="entity-label";
    label.textContent=e.name;
    node.appendChild(label);

    if(e.id===selectedEntityId){
      const handle=document.createElement("div");
      handle.className="resize-handle";
      handle.addEventListener("pointerdown",ev=>beginResize(ev,e));
      node.appendChild(handle);
    }

    node.addEventListener("pointerdown",ev=>beginMove(ev,e));
    layer.appendChild(node);
  }
}

function beginMove(ev,e){
  if(ev.target.classList.contains("resize-handle"))return;
  ev.stopPropagation();
  selectEntity(e.id);
  const rect=$("mapCanvas").getBoundingClientRect();
  dragState={kind:"move",id:e.id,startX:ev.clientX,startY:ev.clientY,origX:e.x,origY:e.y,canvasRect:rect};
  ev.currentTarget.setPointerCapture(ev.pointerId);
  snapshot();
}

function beginResize(ev,e){
  ev.stopPropagation();
  dragState={kind:"resize",id:e.id,startX:ev.clientX,startY:ev.clientY,origW:e.width,origH:e.height};
  ev.currentTarget.setPointerCapture(ev.pointerId);
  snapshot();
}

window.addEventListener("pointermove",ev=>{
  if(!dragState)return;
  const e=entityById(dragState.id); if(!e)return;
  const dx=ev.clientX-dragState.startX,dy=ev.clientY-dragState.startY;
  if(dragState.kind==="move"){
    e.x=clamp(snap(dragState.origX+dx),0,map().width-e.width);
    e.y=clamp(snap(dragState.origY+dy),0,map().height-e.height);
  }else{
    e.width=clamp(snap(dragState.origW+dx),8,map().width-e.x);
    e.height=clamp(snap(dragState.origH+dy),8,map().height-e.y);
  }
  renderMapSurface();renderInspector();renderHierarchy();
});

window.addEventListener("pointerup",()=>{
  if(!dragState)return;
  dragState=null;
  scheduleSave(true);
});

$("mapCanvas").addEventListener("pointerdown",ev=>{
  if(ev.target===$("mapCanvas")||ev.target===$("gridLayer")||ev.target===$("entityLayer")) selectEntity(null);
});

function renderHierarchy(){
  const list=$("hierarchyList"); list.innerHTML="";
  const player=document.createElement("div");
  player.className="hierarchy-item";
  player.innerHTML=`<span class="hierarchy-icon">🧍</span><span>${escapeHTML(project.player.name)}</span><span class="layer-tag">PLAYER</span>`;
  list.appendChild(player);

  [...map().entities].sort((a,b)=>b.layer-a.layer).forEach(e=>{
    const item=document.createElement("div");
    item.className="hierarchy-item"+(e.id===selectedEntityId?" selected":"");
    item.innerHTML=`<span class="hierarchy-icon">${typeMeta[e.type]?.icon||"□"}</span><span>${escapeHTML(e.name)}</span><span class="layer-tag">L${e.layer}</span>`;
    item.onclick=()=>selectEntity(e.id);
    list.appendChild(item);
  });
}

function renderAssets(){
  const grid=$("assetGrid");grid.innerHTML="";
  for(const a of project.assets){
    const card=document.createElement("div");card.className="asset-card";
    card.innerHTML=`<img src="${a.dataUrl}" alt=""><div title="${escapeHTML(a.name)}">${escapeHTML(a.name)}</div>`;
    card.onclick=()=>{
      const e=selected();
      if(e){e.spriteAssetId=a.id;scheduleSave();renderMapSurface();renderInspector();}
      else { project.player.spriteAssetId=a.id;scheduleSave();renderProjectPanel(); }
    };
    card.oncontextmenu=ev=>{
      ev.preventDefault();
      if(confirm(`Remover asset "${a.name}"?`)){
        project.assets=project.assets.filter(x=>x.id!==a.id);
        if(project.player.spriteAssetId===a.id)project.player.spriteAssetId=null;
        project.maps.forEach(m=>m.entities.forEach(ent=>{if(ent.spriteAssetId===a.id)ent.spriteAssetId=null;}));
        scheduleSave();renderAll();
      }
    };
    grid.appendChild(card);
  }
}

function renderMaps(){
  const list=$("mapList");list.innerHTML="";
  project.maps.forEach(m=>{
    const item=document.createElement("div");
    item.className="map-item"+(m.id===currentMapId?" selected":"");
    item.innerHTML=`<span>🗺️</span><span>${escapeHTML(m.name)}</span><span class="layer-tag">${m.entities.length}</span>`;
    item.onclick=()=>{currentMapId=m.id;selectedEntityId=null;renderAll();};
    list.appendChild(item);
  });
}

function renderInspector(){
  const e=selected();
  $("noSelection").classList.toggle("hidden",!!e);
  $("entityInspector").classList.toggle("hidden",!e);
  $("selectionStatus").textContent=e?`${e.name} · ${e.type}`:"Nada selecionado";
  if(!e)return;

  $("entityTypeLabel").textContent=e.type.toUpperCase();
  $("entityInspectorTitle").textContent=e.name;
  $("entityNameInput").value=e.name;
  $("entityXInput").value=e.x;$("entityYInput").value=e.y;
  $("entityWidthInput").value=e.width;$("entityHeightInput").value=e.height;
  $("entityLayerInput").value=e.layer;
  $("entityCollisionInput").checked=!!e.collision;
  $("entityVisibleInput").checked=e.visible!==false;
  $("entityColorInput").value=e.color||"#777777";

  fillAssetSelect($("entitySpriteSelect"),e.spriteAssetId,true);
  $("characterFields").classList.toggle("hidden",e.type!=="npc");
  $("doorFields").classList.toggle("hidden",e.type!=="door");
  $("lightFields").classList.toggle("hidden",e.type!=="light");

  if(e.type==="npc"){
    $("characterDisplayNameInput").value=e.displayName||e.name;
    $("interactionTextInput").value=e.interactionText||"";
  }
  if(e.type==="door"){
    fillMapSelect($("doorTargetMapSelect"),e.targetMapId);
  }
  if(e.type==="light"){
    $("lightRadiusInput").value=e.radius||160;
    $("lightIntensityInput").value=e.intensity??0.6;
  }
}

function renderProjectPanel(){
  const m=map();
  $("projectNameInput").value=project.name;
  $("protagonistNameInput").value=project.player.name;
  fillAssetSelect($("playerSpriteSelect"),project.player.spriteAssetId,true);
  $("playerWidthInput").value=project.player.width;
  $("playerHeightInput").value=project.player.height;
  $("playerSpeedInput").value=project.player.speed;
  $("playerColorInput").value=project.player.color;
  $("mapNameInput").value=m.name;
  $("mapWidthInput").value=m.width;$("mapHeightInput").value=m.height;
  $("mapBackgroundInput").value=m.backgroundColor;
  $("spawnXInput").value=m.spawn.x;$("spawnYInput").value=m.spawn.y;
}

function fillAssetSelect(select,value,allowNone=false){
  select.innerHTML="";
  if(allowNone){const o=document.createElement("option");o.value="";o.textContent="— Sem sprite —";select.appendChild(o);}
  project.assets.forEach(a=>{const o=document.createElement("option");o.value=a.id;o.textContent=a.name;select.appendChild(o);});
  select.value=value||"";
}
function fillMapSelect(select,value){
  select.innerHTML='<option value="">— Nenhum —</option>';
  project.maps.forEach(m=>{const o=document.createElement("option");o.value=m.id;o.textContent=m.name;select.appendChild(o);});
  select.value=value||"";
}
function selectEntity(id){selectedEntityId=id;renderMapSurface();renderHierarchy();renderInspector();}
function escapeHTML(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}

function addEntity(type){
  const meta=typeMeta[type];
  const maxLayer=Math.max(0,...map().entities.map(e=>e.layer||0));
  const e={
    id:ARGEngineStorage.uid(type),
    type,
    name:`${meta.name} ${map().entities.filter(x=>x.type===type).length+1}`,
    x:snap(map().width/2-meta.w/2),
    y:snap(map().height/2-meta.h/2),
    width:meta.w,height:meta.h,
    layer:maxLayer+1,
    collision:meta.collision,
    visible:true,
    color:meta.color,
    spriteAssetId:null
  };
  if(type==="npc"){e.displayName=e.name;e.interactionText="Olá.";}
  if(type==="door"){e.targetMapId="";e.interactionText="";}
  if(type==="light"){e.radius=160;e.intensity=.6;}
  map().entities.push(e);
  selectedEntityId=e.id;
  scheduleSave();renderAll();
}

document.querySelectorAll(".add-entity-btn").forEach(b=>b.onclick=()=>addEntity(b.dataset.type));
$("addEntityQuickBtn").onclick=()=>addEntity("object");

function deleteSelected(){
  if(!selectedEntityId)return;
  map().entities=map().entities.filter(e=>e.id!==selectedEntityId);
  selectedEntityId=null;scheduleSave();renderAll();
}
function duplicateSelected(){
  const e=selected();if(!e)return;
  const copy=ARGEngineStorage.deepClone(e);
  copy.id=ARGEngineStorage.uid(e.type);copy.name=e.name+" Copy";copy.x=clamp(e.x+20,0,map().width-e.width);copy.y=clamp(e.y+20,0,map().height-e.height);copy.layer=e.layer+1;
  map().entities.push(copy);selectedEntityId=copy.id;scheduleSave();renderAll();
}
function layerShift(delta){
  const e=selected();if(!e)return;e.layer+=delta;scheduleSave();renderAll();
}
$("deleteBtn").onclick=deleteSelected;$("duplicateBtn").onclick=duplicateSelected;
$("layerUpBtn").onclick=()=>layerShift(1);$("layerDownBtn").onclick=()=>layerShift(-1);
$("undoBtn").onclick=undo;$("redoBtn").onclick=redo;
$("gridBtn").onclick=()=>{gridVisible=!gridVisible;$("gridBtn").classList.toggle("active",gridVisible);renderMapSurface();};

$("assetUploadInput").addEventListener("change",async ev=>{
  const files=[...ev.target.files];
  for(const file of files){
    const dataUrl=await fileToDataURL(file);
    project.assets.push({id:ARGEngineStorage.uid("asset"),name:file.name,type:"image",dataUrl});
  }
  ev.target.value="";
  scheduleSave();renderAssets();renderInspector();renderProjectPanel();
});
function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}

function bindEntityInput(id,prop,convert=v=>v){
  $(id).addEventListener("input",()=>{const e=selected();if(!e)return;e[prop]=convert($(id).value);scheduleSave();renderMapSurface();renderHierarchy();renderInspector();});
}
bindEntityInput("entityNameInput","name");
bindEntityInput("entityXInput","x",v=>snap(+v||0));bindEntityInput("entityYInput","y",v=>snap(+v||0));
bindEntityInput("entityWidthInput","width",v=>Math.max(8,+v||8));bindEntityInput("entityHeightInput","height",v=>Math.max(8,+v||8));
bindEntityInput("entityLayerInput","layer",v=>+v||0);bindEntityInput("entityColorInput","color");
$("entityCollisionInput").onchange=()=>{const e=selected();if(e){e.collision=$("entityCollisionInput").checked;scheduleSave();}};
$("entityVisibleInput").onchange=()=>{const e=selected();if(e){e.visible=$("entityVisibleInput").checked;scheduleSave();renderMapSurface();}};
$("entitySpriteSelect").onchange=()=>{const e=selected();if(e){e.spriteAssetId=$("entitySpriteSelect").value||null;scheduleSave();renderMapSurface();}};
bindEntityInput("characterDisplayNameInput","displayName");
bindEntityInput("interactionTextInput","interactionText");
$("doorTargetMapSelect").onchange=()=>{const e=selected();if(e){e.targetMapId=$("doorTargetMapSelect").value||null;scheduleSave();}};
bindEntityInput("lightRadiusInput","radius",v=>Math.max(20,+v||160));
bindEntityInput("lightIntensityInput","intensity",v=>+v);

function bindProjectInput(id,setter,render=true){
  $(id).addEventListener("input",()=>{setter($(id).value);scheduleSave();if(render)renderAll();});
}
bindProjectInput("projectNameInput",v=>project.name=v||"Sem nome");
bindProjectInput("protagonistNameInput",v=>project.player.name=v||"Protagonista");
$("playerSpriteSelect").onchange=()=>{project.player.spriteAssetId=$("playerSpriteSelect").value||null;scheduleSave();};
bindProjectInput("playerWidthInput",v=>project.player.width=Math.max(8,+v||8),false);
bindProjectInput("playerHeightInput",v=>project.player.height=Math.max(8,+v||8),false);
bindProjectInput("playerSpeedInput",v=>project.player.speed=clamp(+v||190,20,1000),false);
bindProjectInput("playerColorInput",v=>project.player.color=v,false);
bindProjectInput("mapNameInput",v=>map().name=v||"Mapa");
bindProjectInput("mapWidthInput",v=>{map().width=Math.max(320,+v||320);},true);
bindProjectInput("mapHeightInput",v=>{map().height=Math.max(240,+v||240);},true);
bindProjectInput("mapBackgroundInput",v=>map().backgroundColor=v,true);
bindProjectInput("spawnXInput",v=>map().spawn.x=clamp(+v||0,0,map().width),false);
bindProjectInput("spawnYInput",v=>map().spawn.y=clamp(+v||0,0,map().height),false);
$("centerSpawnBtn").onclick=()=>{map().spawn={x:map().width/2,y:map().height/2};scheduleSave();renderProjectPanel();};

$("newMapBtn").onclick=()=>{$("newMapDialog").showModal();$("newMapNameInput").focus();};
$("cancelMapBtn").onclick=$("closeMapDialogBtn").onclick=()=>$("newMapDialog").close();
$("newMapForm").addEventListener("submit",ev=>{
  ev.preventDefault();
  const m=ARGEngineStorage.makeMap($("newMapNameInput").value.trim()||"Novo Mapa");
  project.maps.push(m);currentMapId=m.id;selectedEntityId=null;$("newMapDialog").close();scheduleSave();renderAll();
});

document.querySelectorAll("[data-tab]").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll("[data-tab]").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");$("tab-"+btn.dataset.tab).classList.add("active");
});
document.querySelectorAll("[data-inspector-tab]").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll("[data-inspector-tab]").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".inspector-content").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");$("inspector-"+btn.dataset.inspectorTab).classList.add("active");
});

window.addEventListener("keydown",ev=>{
  const tag=document.activeElement?.tagName;
  const typing=["INPUT","TEXTAREA","SELECT"].includes(tag);
  if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==="z"){ev.preventDefault();ev.shiftKey?redo():undo();return;}
  if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==="y"){ev.preventDefault();redo();return;}
  if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==="d"){ev.preventDefault();duplicateSelected();return;}
  if(!typing&&ev.key==="Delete"){deleteSelected();}
});

$("playBtn").onclick=()=>{
  ARGEngineStorage.saveProject(project);
  window.open(`play.html?id=${encodeURIComponent(project.id)}&map=${encodeURIComponent(currentMapId)}`,"_blank");
};

snapshot();
renderAll();

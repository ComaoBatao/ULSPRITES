const project=ARGStore.loadProject();

let state=ARGStore.getSession();
if(!state || new URLSearchParams(location.search).has("new")){
  state={
    environmentId:project.game.startEnvironmentId,
    viewId:project.game.startViewId,
    inventory:[],
    variables:Object.fromEntries(project.variables.map(v=>[v.key,v.defaultValue])),
    flags:{},
    dialogueState:null
  };
  ARGStore.setSession(state);
}

const el={
  gameName:document.getElementById("gameName"),
  locationName:document.getElementById("locationName"),
  sceneImage:document.getElementById("sceneImage"),
  sceneFrame:document.getElementById("sceneFrame"),
  hotspotLayer:document.getElementById("hotspotLayer"),
  sceneFallback:document.getElementById("sceneFallback"),
  hoverLabel:document.getElementById("hoverLabel"),
  buttonActions:document.getElementById("buttonActions"),
  inventoryGrid:document.getElementById("inventoryGrid"),
  selectedItemInfo:document.getElementById("selectedItemInfo"),
  clearSelectionBtn:document.getElementById("clearSelectionBtn"),
  dialogModal:document.getElementById("dialogModal"),
  dialogSpeaker:document.getElementById("dialogSpeaker"),
  dialogText:document.getElementById("dialogText"),
  dialogChoices:document.getElementById("dialogChoices"),
  dialogContinueBtn:document.getElementById("dialogContinueBtn"),
  messageModal:document.getElementById("messageModal"),
  messageText:document.getElementById("messageText"),
  imageModal:document.getElementById("imageModal"),
  imageModalImg:document.getElementById("imageModalImg"),
  saveDialog:document.getElementById("saveDialog"),
  generatedSaveCode:document.getElementById("generatedSaveCode")
};

let selectedItemId=null;
el.gameName.textContent=project.game.name;

function env(){return project.environments.find(e=>e.id===state.environmentId)||project.environments[0];}
function view(){return env()?.views.find(v=>v.id===state.viewId)||env()?.views[0];}
function itemById(id){return project.items.find(i=>i.id===id)||null;}
function dialogueById(id){return project.dialogues.find(d=>d.id===id)||null;}

function saveState(){
  ARGStore.setSession(state);
}

function render(){
  const e=env(),v=view();
  if(!e||!v)return;
  state.environmentId=e.id; state.viewId=v.id; saveState();

  el.locationName.textContent=`${e.name} · ${v.name}`;
  el.sceneImage.src=v.imageUrl||"";
  el.sceneImage.classList.toggle("hidden",!v.imageUrl);
  el.sceneFallback.classList.toggle("hidden",!!v.imageUrl);

  renderHotspots();
  renderInventory();
}

function sceneImageRect(){
  const frame=el.sceneFrame.getBoundingClientRect();
  const img=el.sceneImage;
  if(!img.src || !img.naturalWidth) return {left:0,top:0,width:frame.width,height:frame.height};
  const imgRatio=img.naturalWidth/img.naturalHeight;
  const frameRatio=frame.width/frame.height;
  let width,height,left,top;
  if(imgRatio>frameRatio){
    width=frame.width;height=width/imgRatio;left=0;top=(frame.height-height)/2;
  }else{
    height=frame.height;width=height*imgRatio;top=0;left=(frame.width-width)/2;
  }
  return {left,top,width,height};
}

function renderHotspots(){
  const v=view(); if(!v)return;
  el.hotspotLayer.innerHTML="";
  el.buttonActions.innerHTML="";
  const r=sceneImageRect();

  v.hotspots.forEach(h=>{
    if(!conditionPasses(h.visibilityCondition))return;

    if(h.displayMode!=="button"){
      const b=document.createElement("button");
      b.className="game-hotspot"+(project.game.showHotspotOutlines?" outline":"");
      b.style.left=(r.left+r.width*h.x/100)+"px";
      b.style.top=(r.top+r.height*h.y/100)+"px";
      b.style.width=(r.width*h.w/100)+"px";
      b.style.height=(r.height*h.h/100)+"px";
      b.title=h.label||"Interagir";
      b.onmouseenter=ev=>showHover(h.buttonLabel||h.label||"Interagir",ev);
      b.onmousemove=ev=>moveHover(ev);
      b.onmouseleave=hideHover;
      b.onclick=()=>activateHotspot(h);
      el.hotspotLayer.appendChild(b);
    }

    if(project.game.showButtonList && h.displayMode!=="hotspot"){
      const btn=document.createElement("button");
      btn.className="scene-action-btn";
      btn.textContent=h.buttonLabel||h.label||"Interagir";
      btn.onclick=()=>activateHotspot(h);
      el.buttonActions.appendChild(btn);
    }
  });
}

function showHover(text,ev){
  el.hoverLabel.textContent=text;
  el.hoverLabel.classList.remove("hidden");
  moveHover(ev);
}
function moveHover(ev){
  el.hoverLabel.style.left=(ev.clientX+12)+"px";
  el.hoverLabel.style.top=(ev.clientY+12)+"px";
}
function hideHover(){el.hoverLabel.classList.add("hidden");}

function conditionPasses(c){
  if(!c||!c.type||c.type==="none")return true;
  if(c.type==="hasItem")return state.inventory.includes(c.itemId);
  if(c.type==="missingItem")return !state.inventory.includes(c.itemId);
  if(c.type==="variableEquals")return String(state.variables[c.key])===String(c.value);
  return true;
}

async function activateHotspot(h){
  hideHover();
  const useRule=selectedItemId && (h.itemRules||[]).find(r=>r.itemId===selectedItemId);
  if(selectedItemId && useRule){
    await runActions(useRule.actions||[]);
    if(useRule.consumeItem){
      state.inventory=state.inventory.filter(id=>id!==selectedItemId);
      selectedItemId=null;
    }
    saveState();render();
    return;
  }

  if(selectedItemId && (h.itemRules||[]).length){
    showMessage(h.wrongItemMessage||"Esse item não parece servir aqui.");
    return;
  }

  if(h.requiredItemId && !state.inventory.includes(h.requiredItemId)){
    await runActions(h.failActions||[{type:"message",text:h.failMessage||"Falta alguma coisa."}]);
    return;
  }

  if(h.requiredItemId && h.consumeRequiredItem){
    state.inventory=state.inventory.filter(id=>id!==h.requiredItemId);
  }

  await runActions(h.actions||[]);
  saveState();render();
}

async function runActions(actions){
  for(const a of actions){
    if(!a||!a.type)continue;
    if(a.type==="changeView"){
      const targetEnv=project.environments.find(e=>e.id===state.environmentId);
      const targetView=targetEnv?.views.find(v=>v.id===a.viewId);
      if(targetView) state.viewId=targetView.id;
    }
    else if(a.type==="changeEnvironment"){
      const targetEnv=project.environments.find(e=>e.id===a.environmentId);
      if(targetEnv){
        state.environmentId=targetEnv.id;
        state.viewId=a.viewId && targetEnv.views.some(v=>v.id===a.viewId) ? a.viewId : targetEnv.views[0]?.id;
      }
    }
    else if(a.type==="message") await showMessage(a.text||"");
    else if(a.type==="dialogue") await playDialogue(a.dialogueId);
    else if(a.type==="giveItem"){
      if(a.itemId && !state.inventory.includes(a.itemId)) state.inventory.push(a.itemId);
      if(a.message) await showMessage(a.message);
    }
    else if(a.type==="removeItem"){
      state.inventory=state.inventory.filter(id=>id!==a.itemId);
    }
    else if(a.type==="setVariable"){
      state.variables[a.key]=parseValue(a.value);
    }
    else if(a.type==="openImage"){
      if(a.url) await openImage(a.url);
    }
    else if(a.type==="playAudio"){
      if(a.url){try{const audio=new Audio(a.url);audio.play();}catch{}}
    }
  }
}

function parseValue(v){
  if(v==="true")return true;if(v==="false")return false;
  if(v!==""&&!Number.isNaN(Number(v)))return Number(v);
  return v;
}

function showMessage(text){
  return new Promise(resolve=>{
    el.messageText.textContent=text||"";
    if(!el.messageModal.open)el.messageModal.showModal();
    document.getElementById("messageCloseBtn").onclick=()=>{
      el.messageModal.close();
      resolve();
    };
  });
}

function openImage(url){
  return new Promise(resolve=>{
    el.imageModalImg.src=url;
    if(!el.imageModal.open)el.imageModal.showModal();
    document.getElementById("imageModalClose").onclick=()=>{
      el.imageModal.close();
      resolve();
    };
  });
}

function playDialogue(id){
  return new Promise(resolve=>{
    const d=dialogueById(id);
    if(!d){resolve();return;}
    let nodeId=d.startNodeId||d.nodes[0]?.id;

    function showNode(){
      const node=d.nodes.find(n=>n.id===nodeId);
      if(!node){el.dialogModal.close();resolve();return;}
      el.dialogSpeaker.textContent=node.speaker||d.defaultSpeaker||"";
      el.dialogText.textContent=node.text||"";
      el.dialogChoices.innerHTML="";
      const choices=node.choices||[];
      el.dialogContinueBtn.classList.toggle("hidden",choices.length>0);
      if(choices.length){
        choices.forEach(c=>{
          const b=document.createElement("button");
          b.className="dialog-choice";
          b.textContent=c.text||"Continuar";
          b.onclick=()=>{
            if(c.setVariableKey)state.variables[c.setVariableKey]=parseValue(c.setVariableValue);
            if(c.nextNodeId){nodeId=c.nextNodeId;showNode();}
            else{el.dialogModal.close();saveState();resolve();}
          };
          el.dialogChoices.appendChild(b);
        });
      }else{
        el.dialogContinueBtn.onclick=()=>{
          if(node.nextNodeId){nodeId=node.nextNodeId;showNode();}
          else{el.dialogModal.close();saveState();resolve();}
        };
      }
    }

    el.dialogModal.showModal();
    showNode();
  });
}

function renderInventory(){
  el.inventoryGrid.innerHTML="";
  el.clearSelectionBtn.classList.toggle("hidden",!selectedItemId);
  el.selectedItemInfo.classList.toggle("hidden",!selectedItemId);
  if(selectedItemId){
    const it=itemById(selectedItemId);
    el.selectedItemInfo.textContent=`Selecionado: ${it?.name||"Item"}`;
  }

  state.inventory.forEach(id=>{
    const it=itemById(id);if(!it)return;
    const card=document.createElement("div");
    card.className="inventory-item"+(id===selectedItemId?" selected":"");
    if(it.iconUrl){
      const img=document.createElement("img");img.src=it.iconUrl;card.appendChild(img);
    }else{
      const ph=document.createElement("div");ph.className="placeholder";ph.textContent="📦";card.appendChild(ph);
    }
    const name=document.createElement("strong");name.textContent=it.name;card.appendChild(name);
    card.title=it.description||it.name;
    card.onclick=()=>inventoryClick(id);
    el.inventoryGrid.appendChild(card);
  });
}

function inventoryClick(id){
  if(!selectedItemId){selectedItemId=id;renderInventory();return;}
  if(selectedItemId===id){selectedItemId=null;renderInventory();return;}

  const combo=project.combinations.find(c=>
    (c.itemAId===selectedItemId&&c.itemBId===id)||(c.itemAId===id&&c.itemBId===selectedItemId)
  );
  if(combo){
    if(combo.consumeA)state.inventory=state.inventory.filter(x=>x!==combo.itemAId);
    if(combo.consumeB)state.inventory=state.inventory.filter(x=>x!==combo.itemBId);
    if(combo.resultItemId&&!state.inventory.includes(combo.resultItemId))state.inventory.push(combo.resultItemId);
    selectedItemId=null;
    saveState();renderInventory();
    showMessage(combo.message||"Combinaste os itens.");
  }else{
    selectedItemId=id;
    renderInventory();
  }
}

el.clearSelectionBtn.onclick=()=>{selectedItemId=null;renderInventory();};

window.addEventListener("resize",renderHotspots);
el.sceneImage.addEventListener("load",()=>{el.sceneFallback.classList.add("hidden");renderHotspots();});
el.sceneImage.addEventListener("error",()=>{el.sceneFallback.classList.remove("hidden");});

document.getElementById("saveBtn").onclick=()=>{
  saveState();
  el.generatedSaveCode.value=ARGStore.encodeSave(state);
  el.saveDialog.showModal();
};
document.getElementById("copySaveBtn").onclick=async()=>{
  try{await navigator.clipboard.writeText(el.generatedSaveCode.value);document.getElementById("copySaveBtn").textContent="Copiado!";}catch{}
};
document.getElementById("closeSaveBtn").onclick=()=>el.saveDialog.close();

render();

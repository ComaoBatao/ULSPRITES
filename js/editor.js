if(!ARGStore.isAdmin()){
  location.href="admin.html";
  throw new Error("Admin required");
}

let project=ARGStore.loadProject();
let selected={type:"view",id:project.game.startViewId};
let currentEnvironmentId=project.game.startEnvironmentId;
let currentViewId=project.game.startViewId;
let history=[],historyIndex=-1,saveTimer=null,drag=null;

const $=id=>document.getElementById(id);
const clone=ARGStore.clone;

function env(id=currentEnvironmentId){return project.environments.find(e=>e.id===id)||project.environments[0];}
function view(id=currentViewId,environmentId=currentEnvironmentId){
  const e=env(environmentId);return e?.views.find(v=>v.id===id)||e?.views[0];
}
function currentHotspot(){return selected.type==="hotspot"?view()?.hotspots.find(h=>h.id===selected.id):null;}
function item(id){return project.items.find(i=>i.id===id);}
function dialogue(id){return project.dialogues.find(d=>d.id===id);}
function variable(id){return project.variables.find(v=>v.id===id);}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}

function snapshot(){
  const s=JSON.stringify(project);
  history=history.slice(0,historyIndex+1);
  if(history[history.length-1]!==s){
    history.push(s);if(history.length>80)history.shift();historyIndex=history.length-1;
  }
  updateHistoryButtons();
}
function restore(i){
  if(i<0||i>=history.length)return;
  project=JSON.parse(history[i]);historyIndex=i;
  if(!project.environments.some(e=>e.id===currentEnvironmentId))currentEnvironmentId=project.game.startEnvironmentId||project.environments[0]?.id;
  if(!env()?.views.some(v=>v.id===currentViewId))currentViewId=env()?.views[0]?.id;
  selected={type:"view",id:currentViewId};
  renderAll();scheduleSave(false);updateHistoryButtons();
}
function undo(){if(historyIndex>0)restore(historyIndex-1);}
function redo(){if(historyIndex<history.length-1)restore(historyIndex+1);}
function updateHistoryButtons(){$("undoBtn").disabled=historyIndex<=0;$("redoBtn").disabled=historyIndex>=history.length-1;}

function scheduleSave(withHistory=true){
  if(withHistory)snapshot();
  $("saveStatus").textContent="A guardar...";$("saveStatus").classList.add("dirty");
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    ARGStore.saveProject(project);$("saveStatus").textContent="Guardado";$("saveStatus").classList.remove("dirty");
  },220);
}

function renderAll(){
  $("editorGameName").textContent=project.game.name;
  renderLists();renderScene();renderInspector();renderGameSettings();renderHotspotTable();
}

function renderLists(){
  $("environmentList").innerHTML="";
  project.environments.forEach(e=>{
    const n=document.createElement("div");n.className="tree-item"+(currentEnvironmentId===e.id?" selected":"");
    n.innerHTML=`<span>🏠</span><span>${esc(e.name)}</span><span class="tree-meta">${e.views.length}</span>`;
    n.onclick=()=>{currentEnvironmentId=e.id;currentViewId=e.views[0]?.id;selected={type:"environment",id:e.id};renderAll();};
    $("environmentList").appendChild(n);
  });

  $("viewList").innerHTML="";
  (env()?.views||[]).forEach(v=>{
    const n=document.createElement("div");n.className="tree-item"+(currentViewId===v.id?" selected":"");
    n.innerHTML=`<span>🖼️</span><span>${esc(v.name)}</span><span class="tree-meta">${v.hotspots.length}</span>`;
    n.onclick=()=>{currentViewId=v.id;selected={type:"view",id:v.id};renderAll();};
    $("viewList").appendChild(n);
  });

  renderSimpleList("itemList",project.items,"📦","item",x=>x.name);
  renderSimpleList("combinationList",project.combinations,"🧩","combination",x=>{
    const a=item(x.itemAId)?.name||"?";const b=item(x.itemBId)?.name||"?";return `${a} + ${b}`;
  });
  renderSimpleList("dialogueList",project.dialogues,"💬","dialogue",x=>x.name);
  renderSimpleList("variableList",project.variables,"⚙️","variable",x=>x.key);
}
function renderSimpleList(id,arr,icon,type,labelFn){
  const root=$(id);root.innerHTML="";
  arr.forEach(x=>{
    const n=document.createElement("div");n.className="tree-item"+(selected.type===type&&selected.id===x.id?" selected":"");
    n.innerHTML=`<span>${icon}</span><span>${esc(labelFn(x))}</span>`;
    n.onclick=()=>{selected={type,id:x.id};renderAll();};
    root.appendChild(n);
  });
}

$("editorSceneImage").addEventListener("load",()=>{
  if($("editorSceneImage").naturalWidth && $("editorSceneImage").naturalHeight){
    $("sceneEditorFrame").style.aspectRatio=`${$("editorSceneImage").naturalWidth}/${$("editorSceneImage").naturalHeight}`;
  }
});
$("editorSceneImage").addEventListener("error",()=>{
  $("sceneEditorFrame").style.aspectRatio="16/9";
});

function renderScene(){
  const e=env(),v=view();
  $("workspaceEnvironment").textContent=e?.name||"—";
  $("workspaceView").textContent=v?.name||"—";
  const img=$("editorSceneImage");
  img.src=v?.imageUrl||"";
  img.classList.toggle("hidden",!v?.imageUrl);
  $("editorSceneFallback").classList.toggle("hidden",!!v?.imageUrl);
  const layer=$("editorHotspotLayer");layer.innerHTML="";
  (v?.hotspots||[]).forEach(h=>{
    const n=document.createElement("div");
    n.className="editor-hotspot"+(selected.type==="hotspot"&&selected.id===h.id?" selected":"");
    Object.assign(n.style,{left:h.x+"%",top:h.y+"%",width:h.w+"%",height:h.h+"%"});
    n.dataset.id=h.id;
    n.innerHTML=`<div class="hs-label">${esc(h.label||"Hotspot")}</div>`;
    if(selected.type==="hotspot"&&selected.id===h.id){
      const handle=document.createElement("div");handle.className="resize-handle";
      handle.onpointerdown=ev=>beginResize(ev,h);n.appendChild(handle);
    }
    n.onpointerdown=ev=>beginMove(ev,h);
    n.onclick=ev=>{ev.stopPropagation();selected={type:"hotspot",id:h.id};renderAll();};
    layer.appendChild(n);
  });
}
$("sceneEditorFrame").onclick=()=>{selected={type:"view",id:currentViewId};renderAll();};

function beginMove(ev,h){
  if(ev.target.classList.contains("resize-handle"))return;
  ev.stopPropagation();selected={type:"hotspot",id:h.id};renderInspector();
  const rect=$("sceneEditorFrame").getBoundingClientRect();
  drag={kind:"move",id:h.id,startX:ev.clientX,startY:ev.clientY,x:h.x,y:h.y,rect};
  ev.currentTarget.setPointerCapture?.(ev.pointerId);
}
function beginResize(ev,h){
  ev.stopPropagation();
  const rect=$("sceneEditorFrame").getBoundingClientRect();
  drag={kind:"resize",id:h.id,startX:ev.clientX,startY:ev.clientY,w:h.w,h:h.h,rect};
}
window.addEventListener("pointermove",ev=>{
  if(!drag)return;
  const h=view()?.hotspots.find(x=>x.id===drag.id);if(!h)return;
  const dx=(ev.clientX-drag.startX)/drag.rect.width*100;
  const dy=(ev.clientY-drag.startY)/drag.rect.height*100;
  if(drag.kind==="move"){
    h.x=Math.max(0,Math.min(100-h.w,drag.x+dx));h.y=Math.max(0,Math.min(100-h.h,drag.y+dy));
  }else{
    h.w=Math.max(1,Math.min(100-h.x,drag.w+dx));h.h=Math.max(1,Math.min(100-h.y,drag.h+dy));
  }
  renderScene();renderInspector();
});
window.addEventListener("pointerup",()=>{if(drag){drag=null;scheduleSave();}});

function addEnvironment(){
  const e={id:ARGStore.uid("env"),name:"Novo Ambiente",views:[]};
  const v={id:ARGStore.uid("view"),name:"Centro",imageUrl:"",hotspots:[]};e.views.push(v);
  project.environments.push(e);currentEnvironmentId=e.id;currentViewId=v.id;selected={type:"environment",id:e.id};scheduleSave();renderAll();
}
function addView(){
  if(!env())return;
  const v={id:ARGStore.uid("view"),name:"Nova Vista",imageUrl:"",hotspots:[]};
  env().views.push(v);currentViewId=v.id;selected={type:"view",id:v.id};scheduleSave();renderAll();
}
function addHotspot(){
  if(!view())return;
  const h={
    id:ARGStore.uid("hotspot"),label:"Nova interação",buttonLabel:"Interagir",
    x:40,y:40,w:20,h:20,displayMode:"both",
    visibilityCondition:{type:"none"},
    requiredItemId:null,consumeRequiredItem:false,failMessage:"Falta alguma coisa.",
    actions:[{type:"message",text:"Interação criada."}],itemRules:[]
  };
  view().hotspots.push(h);selected={type:"hotspot",id:h.id};scheduleSave();renderAll();
}
function addItem(){
  const x={id:ARGStore.uid("item"),name:"Novo Item",iconUrl:"",description:""};
  project.items.push(x);selected={type:"item",id:x.id};scheduleSave();renderAll();
}
function addCombination(){
  const x={id:ARGStore.uid("combo"),itemAId:project.items[0]?.id||"",itemBId:project.items[1]?.id||project.items[0]?.id||"",resultItemId:"",consumeA:true,consumeB:true,message:"Combinaste os itens."};
  project.combinations.push(x);selected={type:"combination",id:x.id};scheduleSave();renderAll();
}
function addDialogue(){
  const node={id:ARGStore.uid("node"),speaker:"",text:"Nova fala.",nextNodeId:"",choices:[]};
  const d={id:ARGStore.uid("dialogue"),name:"Novo Diálogo",defaultSpeaker:"",startNodeId:node.id,nodes:[node]};
  project.dialogues.push(d);selected={type:"dialogue",id:d.id};scheduleSave();renderAll();
}
function addVariable(){
  const v={id:ARGStore.uid("var"),key:"novaVariavel",defaultValue:false};
  project.variables.push(v);selected={type:"variable",id:v.id};scheduleSave();renderAll();
}
$("addEnvironmentBtn").onclick=addEnvironment;$("addViewBtn").onclick=addView;$("addHotspotBtn").onclick=addHotspot;
$("addItemBtn").onclick=addItem;$("addCombinationBtn").onclick=addCombination;$("addDialogueBtn").onclick=addDialogue;$("addVariableBtn").onclick=addVariable;

function renderInspector(){
  const box=$("inspectorContent");box.innerHTML="";
  $("inspectorEmpty").classList.toggle("hidden",!!selected);
  box.classList.toggle("hidden",!selected);
  if(!selected)return;

  if(selected.type==="environment")return inspectorEnvironment(box,env(selected.id));
  if(selected.type==="view")return inspectorView(box,view(selected.id));
  if(selected.type==="hotspot")return inspectorHotspot(box,currentHotspot());
  if(selected.type==="item")return inspectorItem(box,item(selected.id));
  if(selected.type==="combination")return inspectorCombination(box,project.combinations.find(x=>x.id===selected.id));
  if(selected.type==="dialogue")return inspectorDialogue(box,dialogue(selected.id));
  if(selected.type==="variable")return inspectorVariable(box,variable(selected.id));
}

function setHTML(box,html){box.innerHTML=html;}
function bind(id,event,fn){const n=$(id);if(n)n.addEventListener(event,fn);}
function val(id){return $(id)?.value??"";}

function inspectorEnvironment(box,e){
  if(!e)return;
  setHTML(box,`
    <div class="inspector-group"><div class="inspector-group-title">AMBIENTE</div>
      <label>Nome<input id="envNameI" value="${esc(e.name)}"></label>
    </div>
    <button id="deleteEnvI" class="danger-btn">Apagar ambiente</button>`);
  bind("envNameI","input",()=>{e.name=val("envNameI");scheduleSave();renderLists();renderScene();});
  bind("deleteEnvI","click",()=>{
    if(project.environments.length<=1)return alert("O jogo precisa de pelo menos um ambiente.");
    if(confirm("Apagar este ambiente?")){
      project.environments=project.environments.filter(x=>x.id!==e.id);
      currentEnvironmentId=project.environments[0].id;currentViewId=project.environments[0].views[0]?.id;selected={type:"environment",id:currentEnvironmentId};scheduleSave();renderAll();
    }
  });
}
function inspectorView(box,v){
  if(!v)return;
  setHTML(box,`
    <div class="inspector-group"><div class="inspector-group-title">VISTA</div>
      <label>Nome<input id="viewNameI" value="${esc(v.name)}"></label>
      <label>URL da imagem<textarea id="viewUrlI" rows="4" placeholder="https://...">${esc(v.imageUrl||"")}</textarea></label>
    </div>
    <button id="deleteViewI" class="danger-btn">Apagar vista</button>`);
  bind("viewNameI","input",()=>{v.name=val("viewNameI");scheduleSave();renderLists();renderScene();});
  bind("viewUrlI","input",()=>{v.imageUrl=val("viewUrlI").trim();scheduleSave();renderScene();});
  bind("deleteViewI","click",()=>{
    if(env().views.length<=1)return alert("O ambiente precisa de pelo menos uma vista.");
    if(confirm("Apagar esta vista?")){
      env().views=env().views.filter(x=>x.id!==v.id);currentViewId=env().views[0].id;selected={type:"view",id:currentViewId};scheduleSave();renderAll();
    }
  });
}

function optionList(arr,getLabel,getId,selectedId,none=true){
  let html=none?'<option value="">— Nenhum —</option>':"";
  return html+arr.map(x=>`<option value="${esc(getId(x))}" ${getId(x)===selectedId?"selected":""}>${esc(getLabel(x))}</option>`).join("");
}
function allViews(){
  const out=[];project.environments.forEach(e=>e.views.forEach(v=>out.push({id:v.id,label:`${e.name} → ${v.name}`,envId:e.id})));return out;
}

function inspectorHotspot(box,h){
  if(!h)return;
  setHTML(box,`
    <div class="inspector-group"><div class="inspector-group-title">HOTSPOT</div>
      <label>Nome<input id="hsLabelI" value="${esc(h.label)}"></label>
      <label>Texto mostrado<input id="hsButtonI" value="${esc(h.buttonLabel||"")}"></label>
      <label>Mostrar como<select id="hsDisplayI">
        <option value="hotspot" ${h.displayMode==="hotspot"?"selected":""}>Zona na imagem</option>
        <option value="button" ${h.displayMode==="button"?"selected":""}>Botão abaixo</option>
        <option value="both" ${h.displayMode==="both"?"selected":""}>Ambos</option>
      </select></label>
      <div class="row2">
        <label>X %<input id="hsXI" type="number" step=".1" value="${h.x.toFixed(1)}"></label>
        <label>Y %<input id="hsYI" type="number" step=".1" value="${h.y.toFixed(1)}"></label>
      </div>
      <div class="row2">
        <label>Largura %<input id="hsWI" type="number" step=".1" value="${h.w.toFixed(1)}"></label>
        <label>Altura %<input id="hsHI" type="number" step=".1" value="${h.h.toFixed(1)}"></label>
      </div>
    </div>

    <div class="inspector-group"><div class="inspector-group-title">CONDIÇÃO DE VISIBILIDADE</div>
      <label>Tipo<select id="condTypeI">
        <option value="none" ${(h.visibilityCondition?.type||"none")==="none"?"selected":""}>Sempre</option>
        <option value="hasItem" ${h.visibilityCondition?.type==="hasItem"?"selected":""}>Tem item</option>
        <option value="missingItem" ${h.visibilityCondition?.type==="missingItem"?"selected":""}>Não tem item</option>
        <option value="variableEquals" ${h.visibilityCondition?.type==="variableEquals"?"selected":""}>Variável = valor</option>
      </select></label>
      <label>Item<select id="condItemI">${optionList(project.items,x=>x.name,x=>x.id,h.visibilityCondition?.itemId)}</select></label>
      <label>Variável<input id="condKeyI" value="${esc(h.visibilityCondition?.key||"")}"></label>
      <label>Valor<input id="condValueI" value="${esc(h.visibilityCondition?.value??"")}"></label>
    </div>

    <div class="inspector-group"><div class="inspector-group-title">ITEM OBRIGATÓRIO</div>
      <label>Item necessário<select id="requiredItemI">${optionList(project.items,x=>x.name,x=>x.id,h.requiredItemId)}</select></label>
      <label class="checkbox-row"><input id="consumeRequiredI" type="checkbox" ${h.consumeRequiredItem?"checked":""}> Consumir item</label>
      <label>Mensagem se faltar<input id="failMessageI" value="${esc(h.failMessage||"")}"></label>
    </div>

    <div class="inspector-group"><div class="inspector-group-title">AÇÕES NORMAIS</div>
      <div id="normalActionsI" class="action-builder"></div>
      <div class="inline-add"><select id="newActionTypeI">${actionTypeOptions()}</select><button id="addActionI" class="mini-btn">+</button></div>
    </div>

    <div class="inspector-group"><div class="inspector-group-title">USAR ITEM NESTE HOTSPOT</div>
      <div id="itemRulesI"></div>
      <div class="inline-add"><select id="newRuleItemI">${optionList(project.items,x=>x.name,x=>x.id,"",false)}</select><button id="addRuleI" class="mini-btn">+</button></div>
      <label>Mensagem para item errado<input id="wrongItemMessageI" value="${esc(h.wrongItemMessage||"Esse item não parece servir aqui.")}"></label>
    </div>

    <button id="deleteHsI" class="danger-btn">Apagar hotspot</button>`);

  const simple=[
    ["hsLabelI","label"],["hsButtonI","buttonLabel"],["hsDisplayI","displayMode"],
    ["hsXI","x",Number],["hsYI","y",Number],["hsWI","w",Number],["hsHI","h",Number],
    ["failMessageI","failMessage"],["wrongItemMessageI","wrongItemMessage"]
  ];
  simple.forEach(([id,p,conv])=>bind(id,"input",()=>{h[p]=conv?conv(val(id)):val(id);scheduleSave();renderScene();renderHotspotTable();}));
  ["condTypeI","condItemI","condKeyI","condValueI"].forEach(id=>bind(id,"input",()=>{
    h.visibilityCondition={type:val("condTypeI"),itemId:val("condItemI"),key:val("condKeyI"),value:val("condValueI")};scheduleSave();
  }));
  bind("requiredItemI","input",()=>{h.requiredItemId=val("requiredItemI")||null;scheduleSave();});
  bind("consumeRequiredI","change",()=>{h.consumeRequiredItem=$("consumeRequiredI").checked;scheduleSave();});
  renderActionBuilder("normalActionsI",h.actions||[],()=>scheduleSave());
  bind("addActionI","click",()=>{h.actions.push(defaultAction(val("newActionTypeI")));scheduleSave();renderInspector();});

  const rules=$("itemRulesI");rules.innerHTML="";
  (h.itemRules||[]).forEach((r,ri)=>{
    const card=document.createElement("div");card.className="action-card";
    card.innerHTML=`<div class="action-card-head"><span>${esc(item(r.itemId)?.name||"Item")}</span><button data-rm="${ri}">✕</button></div>
      <label class="checkbox-row"><input type="checkbox" data-consume="${ri}" ${r.consumeItem?"checked":""}> Consumir item</label>
      <div id="ruleActions_${ri}" class="action-builder"></div>
      <div class="inline-add"><select id="ruleType_${ri}">${actionTypeOptions()}</select><button data-addact="${ri}" class="mini-btn">+</button></div>`;
    rules.appendChild(card);
    renderActionBuilder(`ruleActions_${ri}`,r.actions||[],()=>scheduleSave());
    card.querySelector(`[data-rm="${ri}"]`).onclick=()=>{h.itemRules.splice(ri,1);scheduleSave();renderInspector();};
    card.querySelector(`[data-consume="${ri}"]`).onchange=e=>{r.consumeItem=e.target.checked;scheduleSave();};
    card.querySelector(`[data-addact="${ri}"]`).onclick=()=>{r.actions.push(defaultAction($(`ruleType_${ri}`).value));scheduleSave();renderInspector();};
  });
  bind("addRuleI","click",()=>{
    const id=val("newRuleItemI");if(!id)return;
    h.itemRules=h.itemRules||[];h.itemRules.push({itemId:id,consumeItem:false,actions:[{type:"message",text:"Funcionou."}]});scheduleSave();renderInspector();
  });
  bind("deleteHsI","click",()=>{view().hotspots=view().hotspots.filter(x=>x.id!==h.id);selected={type:"view",id:currentViewId};scheduleSave();renderAll();});
}

function actionTypeOptions(){
  return `
    <option value="message">Mostrar texto</option>
    <option value="changeView">Mudar vista</option>
    <option value="changeEnvironment">Mudar ambiente</option>
    <option value="dialogue">Abrir diálogo</option>
    <option value="giveItem">Dar item</option>
    <option value="removeItem">Remover item</option>
    <option value="setVariable">Alterar variável</option>
    <option value="openImage">Abrir imagem</option>
    <option value="playAudio">Tocar áudio</option>`;
}
function defaultAction(type){
  if(type==="message")return{type,text:"Texto..."};
  if(type==="changeView")return{type,viewId:env()?.views[0]?.id||""};
  if(type==="changeEnvironment")return{type,environmentId:project.environments[0]?.id||"",viewId:project.environments[0]?.views[0]?.id||""};
  if(type==="dialogue")return{type,dialogueId:project.dialogues[0]?.id||""};
  if(type==="giveItem")return{type,itemId:project.items[0]?.id||"",message:""};
  if(type==="removeItem")return{type,itemId:project.items[0]?.id||""};
  if(type==="setVariable")return{type,key:project.variables[0]?.key||"",value:"true"};
  if(type==="openImage")return{type,url:"https://"};
  if(type==="playAudio")return{type,url:"https://"};
  return{type:"message",text:""};
}
function renderActionBuilder(rootId,actions,onChange){
  const root=$(rootId);if(!root)return;root.innerHTML="";
  actions.forEach((a,i)=>{
    const card=document.createElement("div");card.className="action-card";
    card.innerHTML=`<div class="action-card-head"><span>${actionTitle(a.type)}</span><button data-remove="${i}">✕</button></div>${actionFields(a,i)}`;
    root.appendChild(card);
    card.querySelector(`[data-remove="${i}"]`).onclick=()=>{actions.splice(i,1);onChange();renderInspector();};
    card.querySelectorAll("[data-field]").forEach(inp=>inp.oninput=()=>{
      const f=inp.dataset.field;
      a[f]=inp.type==="checkbox"?inp.checked:inp.value;
      if(a.type==="changeEnvironment" && f==="environmentId"){
        const target=project.environments.find(e=>e.id===a.environmentId);
        a.viewId=target?.views[0]?.id||"";
        onChange();
        renderInspector();
        return;
      }
      onChange();
    });
  });
}
function actionTitle(t){return({message:"Mostrar texto",changeView:"Mudar vista",changeEnvironment:"Mudar ambiente",dialogue:"Diálogo",giveItem:"Dar item",removeItem:"Remover item",setVariable:"Variável",openImage:"Abrir imagem",playAudio:"Tocar áudio"})[t]||t;}
function actionFields(a,i){
  if(a.type==="message")return `<label>Texto<textarea data-field="text" rows="3">${esc(a.text||"")}</textarea></label>`;
  if(a.type==="changeView")return `<label>Vista<select data-field="viewId">${optionList(env().views,x=>x.name,x=>x.id,a.viewId,false)}</select></label>`;
  if(a.type==="changeEnvironment"){
    const target=project.environments.find(e=>e.id===a.environmentId)||project.environments[0];
    return `<label>Ambiente<select data-field="environmentId">${optionList(project.environments,x=>x.name,x=>x.id,a.environmentId,false)}</select></label>
      <label>Vista<select data-field="viewId">${optionList(target?.views||[],x=>x.name,x=>x.id,a.viewId)}</select></label>`;
  }
  if(a.type==="dialogue")return `<label>Diálogo<select data-field="dialogueId">${optionList(project.dialogues,x=>x.name,x=>x.id,a.dialogueId,false)}</select></label>`;
  if(a.type==="giveItem")return `<label>Item<select data-field="itemId">${optionList(project.items,x=>x.name,x=>x.id,a.itemId,false)}</select></label><label>Mensagem<input data-field="message" value="${esc(a.message||"")}"></label>`;
  if(a.type==="removeItem")return `<label>Item<select data-field="itemId">${optionList(project.items,x=>x.name,x=>x.id,a.itemId,false)}</select></label>`;
  if(a.type==="setVariable")return `<label>Chave<input data-field="key" value="${esc(a.key||"")}"></label><label>Valor<input data-field="value" value="${esc(a.value??"")}"></label>`;
  if(a.type==="openImage"||a.type==="playAudio")return `<label>URL<input data-field="url" value="${esc(a.url||"")}"></label>`;
  return "";
}

function inspectorItem(box,x){
  if(!x)return;
  setHTML(box,`<div class="inspector-group"><div class="inspector-group-title">ITEM</div>
    <label>Nome<input id="itemNameI" value="${esc(x.name)}"></label>
    <label>URL do ícone<input id="itemIconI" value="${esc(x.iconUrl||"")}"></label>
    <label>Descrição<textarea id="itemDescI" rows="4">${esc(x.description||"")}</textarea></label>
  </div><button id="deleteItemI" class="danger-btn">Apagar item</button>`);
  [["itemNameI","name"],["itemIconI","iconUrl"],["itemDescI","description"]].forEach(([id,p])=>bind(id,"input",()=>{x[p]=val(id);scheduleSave();renderLists();}));
  bind("deleteItemI","click",()=>{project.items=project.items.filter(i=>i.id!==x.id);selected=null;scheduleSave();renderAll();});
}
function inspectorCombination(box,c){
  if(!c)return;
  setHTML(box,`<div class="inspector-group"><div class="inspector-group-title">COMBINAÇÃO</div>
    <label>Item A<select id="comboAI">${optionList(project.items,x=>x.name,x=>x.id,c.itemAId,false)}</select></label>
    <label>Item B<select id="comboBI">${optionList(project.items,x=>x.name,x=>x.id,c.itemBId,false)}</select></label>
    <label>Resultado<select id="comboResultI">${optionList(project.items,x=>x.name,x=>x.id,c.resultItemId)}</select></label>
    <label class="checkbox-row"><input id="consumeAI" type="checkbox" ${c.consumeA?"checked":""}> Consumir A</label>
    <label class="checkbox-row"><input id="consumeBI" type="checkbox" ${c.consumeB?"checked":""}> Consumir B</label>
    <label>Mensagem<input id="comboMessageI" value="${esc(c.message||"")}"></label>
  </div><button id="deleteComboI" class="danger-btn">Apagar combinação</button>`);
  [["comboAI","itemAId"],["comboBI","itemBId"],["comboResultI","resultItemId"],["comboMessageI","message"]].forEach(([id,p])=>bind(id,"input",()=>{c[p]=val(id);scheduleSave();renderLists();}));
  bind("consumeAI","change",()=>{c.consumeA=$("consumeAI").checked;scheduleSave();});bind("consumeBI","change",()=>{c.consumeB=$("consumeBI").checked;scheduleSave();});
  bind("deleteComboI","click",()=>{project.combinations=project.combinations.filter(x=>x.id!==c.id);selected=null;scheduleSave();renderAll();});
}
function inspectorVariable(box,v){
  if(!v)return;
  setHTML(box,`<div class="inspector-group"><div class="inspector-group-title">VARIÁVEL</div>
    <label>Chave<input id="varKeyI" value="${esc(v.key)}"></label>
    <label>Valor inicial<input id="varDefaultI" value="${esc(v.defaultValue)}"></label>
  </div><button id="deleteVarI" class="danger-btn">Apagar variável</button>`);
  bind("varKeyI","input",()=>{v.key=val("varKeyI");scheduleSave();renderLists();});
  bind("varDefaultI","input",()=>{v.defaultValue=val("varDefaultI");scheduleSave();});
  bind("deleteVarI","click",()=>{project.variables=project.variables.filter(x=>x.id!==v.id);selected=null;scheduleSave();renderAll();});
}
function inspectorDialogue(box,d){
  if(!d)return;
  let nodesHtml=d.nodes.map((n,ni)=>`
    <div class="action-card" data-node="${ni}">
      <div class="action-card-head"><span>Fala ${ni+1}</span><button data-delnode="${ni}">✕</button></div>
      <label>Personagem<input data-nodefield="speaker" data-ni="${ni}" value="${esc(n.speaker||"")}"></label>
      <label>Texto<textarea data-nodefield="text" data-ni="${ni}" rows="3">${esc(n.text||"")}</textarea></label>
      <label>Próxima fala<select data-nodefield="nextNodeId" data-ni="${ni}">
        <option value="">— Terminar —</option>
        ${d.nodes.map((x,xi)=>`<option value="${x.id}" ${n.nextNodeId===x.id?"selected":""}>Fala ${xi+1}</option>`).join("")}
      </select></label>
      <div class="inspector-group-title">ESCOLHAS</div>
      ${(n.choices||[]).map((c,ci)=>`
        <div class="choice-card">
          <label>Texto<input data-choicefield="text" data-ni="${ni}" data-ci="${ci}" value="${esc(c.text||"")}"></label>
          <label>Próxima fala<select data-choicefield="nextNodeId" data-ni="${ni}" data-ci="${ci}">
            <option value="">— Terminar —</option>
            ${d.nodes.map((x,xi)=>`<option value="${x.id}" ${c.nextNodeId===x.id?"selected":""}>Fala ${xi+1}</option>`).join("")}
          </select></label>
          <label>Alterar variável<input data-choicefield="setVariableKey" data-ni="${ni}" data-ci="${ci}" value="${esc(c.setVariableKey||"")}" placeholder="opcional"></label>
          <label>Para valor<input data-choicefield="setVariableValue" data-ni="${ni}" data-ci="${ci}" value="${esc(c.setVariableValue||"")}"></label>
          <div class="choice-actions"><button class="mini-btn" data-delchoice="${ni}:${ci}">✕</button></div>
        </div>`).join("")}
      <button class="secondary-btn full" data-addchoice="${ni}">+ Escolha</button>
    </div>`).join("");

  setHTML(box,`<div class="inspector-group"><div class="inspector-group-title">DIÁLOGO</div>
    <label>Nome<input id="dialogueNameI" value="${esc(d.name)}"></label>
    <label>Personagem padrão<input id="dialogueSpeakerI" value="${esc(d.defaultSpeaker||"")}"></label>
    <label>Fala inicial<select id="dialogueStartI">${d.nodes.map((x,xi)=>`<option value="${x.id}" ${d.startNodeId===x.id?"selected":""}>Fala ${xi+1}</option>`).join("")}</select></label>
  </div>
  <div class="inspector-group"><div class="inspector-group-title">FALAS</div>${nodesHtml}<button id="addNodeI" class="secondary-btn full">+ Nova fala</button></div>
  <button id="deleteDialogueI" class="danger-btn">Apagar diálogo</button>`);

  bind("dialogueNameI","input",()=>{d.name=val("dialogueNameI");scheduleSave();renderLists();});
  bind("dialogueSpeakerI","input",()=>{d.defaultSpeaker=val("dialogueSpeakerI");scheduleSave();});
  bind("dialogueStartI","input",()=>{d.startNodeId=val("dialogueStartI");scheduleSave();});
  box.querySelectorAll("[data-nodefield]").forEach(inp=>inp.oninput=()=>{d.nodes[+inp.dataset.ni][inp.dataset.nodefield]=inp.value;scheduleSave();});
  box.querySelectorAll("[data-choicefield]").forEach(inp=>inp.oninput=()=>{d.nodes[+inp.dataset.ni].choices[+inp.dataset.ci][inp.dataset.choicefield]=inp.value;scheduleSave();});
  box.querySelectorAll("[data-addchoice]").forEach(btn=>btn.onclick=()=>{d.nodes[+btn.dataset.addchoice].choices.push({text:"Escolha",nextNodeId:"",setVariableKey:"",setVariableValue:""});scheduleSave();renderInspector();});
  box.querySelectorAll("[data-delchoice]").forEach(btn=>btn.onclick=()=>{const [ni,ci]=btn.dataset.delchoice.split(":").map(Number);d.nodes[ni].choices.splice(ci,1);scheduleSave();renderInspector();});
  box.querySelectorAll("[data-delnode]").forEach(btn=>btn.onclick=()=>{
    if(d.nodes.length<=1)return alert("O diálogo precisa de pelo menos uma fala.");
    const n=d.nodes[+btn.dataset.delnode];d.nodes.splice(+btn.dataset.delnode,1);
    if(d.startNodeId===n.id)d.startNodeId=d.nodes[0].id;scheduleSave();renderInspector();
  });
  bind("addNodeI","click",()=>{const n={id:ARGStore.uid("node"),speaker:"",text:"Nova fala.",nextNodeId:"",choices:[]};d.nodes.push(n);scheduleSave();renderInspector();});
  bind("deleteDialogueI","click",()=>{project.dialogues=project.dialogues.filter(x=>x.id!==d.id);selected=null;scheduleSave();renderAll();});
}

function renderGameSettings(){
  $("gameNameInput").value=project.game.name;
  $("startEnvironmentSelect").innerHTML=optionList(project.environments,x=>x.name,x=>x.id,project.game.startEnvironmentId,false);
  const se=project.environments.find(e=>e.id===project.game.startEnvironmentId)||project.environments[0];
  $("startViewSelect").innerHTML=optionList(se?.views||[],x=>x.name,x=>x.id,project.game.startViewId,false);
  $("showHotspotOutlinesInput").checked=!!project.game.showHotspotOutlines;
  $("showButtonListInput").checked=!!project.game.showButtonList;
}
$("gameNameInput").oninput=()=>{project.game.name=$("gameNameInput").value;scheduleSave();$("editorGameName").textContent=project.game.name;};
$("startEnvironmentSelect").oninput=()=>{project.game.startEnvironmentId=$("startEnvironmentSelect").value;project.game.startViewId=(project.environments.find(e=>e.id===project.game.startEnvironmentId)?.views[0]?.id)||"";scheduleSave();renderGameSettings();};
$("startViewSelect").oninput=()=>{project.game.startViewId=$("startViewSelect").value;scheduleSave();};
$("showHotspotOutlinesInput").onchange=()=>{project.game.showHotspotOutlines=$("showHotspotOutlinesInput").checked;scheduleSave();};
$("showButtonListInput").onchange=()=>{project.game.showButtonList=$("showButtonListInput").checked;scheduleSave();};

function renderHotspotTable(){
  const root=$("hotspotTable");root.innerHTML="";
  (view()?.hotspots||[]).forEach(h=>{
    const n=document.createElement("div");n.className="hotspot-row"+(selected.type==="hotspot"&&selected.id===h.id?" selected":"");
    n.innerHTML=`<strong>${esc(h.label)}</strong><div>${esc(h.buttonLabel||"")}</div>`;
    n.onclick=()=>{selected={type:"hotspot",id:h.id};renderAll();};
    root.appendChild(n);
  });
}

$("deleteHotspotBtn").onclick=()=>{
  const h=currentHotspot();if(!h)return;
  view().hotspots=view().hotspots.filter(x=>x.id!==h.id);selected={type:"view",id:currentViewId};scheduleSave();renderAll();
};
$("testBtn").onclick=()=>{ARGStore.saveProject(project);ARGStore.clearSession();window.open("game.html?new=1","_blank");};
$("undoBtn").onclick=undo;$("redoBtn").onclick=redo;

document.querySelectorAll("[data-left-tab]").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll("[data-left-tab]").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".left-tab").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");$("left-"+btn.dataset.leftTab).classList.add("active");
});
document.querySelectorAll("[data-right-tab]").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll("[data-right-tab]").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".right-tab").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");$("right-"+btn.dataset.rightTab).classList.add("active");
});
document.querySelectorAll("[data-bottom-tab]").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll("[data-bottom-tab]").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".bottom-content").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");$("bottom-"+btn.dataset.bottomTab).classList.add("active");
});

$("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(project,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=(project.game.name||"jogo").replace(/[^\w\-]+/g,"_")+".json";a.click();URL.revokeObjectURL(url);
};
$("importInput").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const p=JSON.parse(await f.text());
    if(!p.game||!p.environments)throw new Error();
    project=p;currentEnvironmentId=p.game.startEnvironmentId||p.environments[0]?.id;currentViewId=p.game.startViewId||p.environments[0]?.views[0]?.id;selected={type:"view",id:currentViewId};snapshot();scheduleSave(false);renderAll();
  }catch{alert("Ficheiro de projeto inválido.");}
  e.target.value="";
};

window.addEventListener("keydown",e=>{
  const typing=["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName);
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();e.shiftKey?redo():undo();}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="y"){e.preventDefault();redo();}
  else if(!typing&&e.key==="Delete")$("deleteHotspotBtn").click();
});

snapshot();renderAll();

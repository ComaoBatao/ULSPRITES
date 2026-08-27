const grid=document.getElementById("projectGrid");
const empty=document.getElementById("emptyState");
const count=document.getElementById("projectCount");
const dialog=document.getElementById("newProjectDialog");
const form=document.getElementById("newProjectForm");

document.getElementById("newProjectBtn").onclick=()=>dialog.showModal();

function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}

function render(){
  const projects=ARGEngineStorage.readAll();
  grid.innerHTML="";
  count.textContent=projects.length;
  empty.classList.toggle("hidden",projects.length>0);

  for(const p of projects){
    const map=p.maps[0];
    const card=document.createElement("article");
    card.className="project-card";
    card.innerHTML=`
      <div class="thumb" style="background:${map?.backgroundColor||"#161922"}"></div>
      <h3>${esc(p.name)}</h3>
      <div class="project-meta">${esc(p.player?.name||"Protagonista")} · ${p.maps.length} mapa(s)</div>
      <div class="card-actions">
        <button class="secondary-btn edit">Editar</button>
        <button class="delete-project-btn delete">Apagar</button>
      </div>`;
    card.querySelector(".edit").onclick=()=>location.href=`editor.html?id=${encodeURIComponent(p.id)}`;
    card.querySelector(".delete").onclick=()=>{
      if(confirm(`Apagar "${p.name}"?`)){ARGEngineStorage.deleteProject(p.id);render();}
    };
    grid.appendChild(card);
  }
}

form.addEventListener("submit",e=>{
  e.preventDefault();
  const p=ARGEngineStorage.createProject(
    document.getElementById("projectName").value.trim(),
    document.getElementById("protagonistName").value.trim(),
    document.getElementById("mapName").value.trim()
  );
  dialog.close();
  location.href=`editor.html?id=${encodeURIComponent(p.id)}`;
});

render();

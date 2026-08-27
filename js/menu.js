const project=ARGStore.loadProject();
document.getElementById("gameTitle").textContent=project.game.name;

const editBtn=document.getElementById("editBtn");
const adminStatus=document.getElementById("adminStatus");

if(ARGStore.isAdmin()){
  editBtn.classList.remove("hidden");
  adminStatus.classList.remove("hidden");
}

document.getElementById("playBtn").onclick=()=>{
  ARGStore.clearSession();
  location.href="game.html?new=1";
};

editBtn.onclick=()=>location.href="editor.html";

document.getElementById("logoutBtn").onclick=()=>{
  ARGStore.setAdmin(false);
  location.reload();
};

const dialog=document.getElementById("loadDialog");
document.getElementById("loadBtn").onclick=()=>dialog.showModal();
document.getElementById("closeLoadDialog").onclick=
document.getElementById("cancelLoadBtn").onclick=()=>dialog.close();

document.getElementById("loadForm").addEventListener("submit",e=>{
  e.preventDefault();
  const err=document.getElementById("loadError");
  err.textContent="";
  try{
    const state=ARGStore.decodeSave(document.getElementById("saveCodeInput").value);
    ARGStore.setSession(state);
    location.href="game.html?load=1";
  }catch(ex){
    err.textContent="Esse código de save não é válido.";
  }
});
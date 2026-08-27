if(ARGStore.isAdmin()){
  location.href="editor.html";
}
document.getElementById("adminForm").addEventListener("submit",e=>{
  e.preventDefault();
  const pass=document.getElementById("passwordInput").value;
  if(pass===ARG_CONFIG.ADMIN_PASSWORD){
    ARGStore.setAdmin(true);
    location.href="index.html";
  }else{
    document.getElementById("adminError").textContent="Palavra-passe incorreta.";
  }
});
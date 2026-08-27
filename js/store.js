window.ARGStore = (() => {
  const PROJECT_KEY = "arg_pointclick_project_v01";
  const ADMIN_KEY = "arg_pointclick_admin_v01";
  const SESSION_KEY = "arg_pointclick_session_v01";

  const uid = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
  const clone = obj => JSON.parse(JSON.stringify(obj));

  function starterProject(){
    const envId = uid("env");
    const viewId = uid("view");
    return {
      version:"0.1",
      game:{
        name:"NOME DO JOGO",
        startEnvironmentId:envId,
        startViewId:viewId,
        showHotspotOutlines:true,
        showButtonList:true
      },
      environments:[{
        id:envId,
        name:"Sala Inicial",
        views:[{
          id:viewId,
          name:"Centro",
          imageUrl:"",
          hotspots:[]
        }]
      }],
      items:[],
      combinations:[],
      dialogues:[],
      variables:[],
      updatedAt:Date.now()
    };
  }

  function loadProject(){
    try{
      const raw=localStorage.getItem(PROJECT_KEY);
      if(!raw){
        const p=starterProject(); saveProject(p); return p;
      }
      return JSON.parse(raw);
    }catch{
      const p=starterProject(); saveProject(p); return p;
    }
  }

  function saveProject(project){
    project.updatedAt=Date.now();
    localStorage.setItem(PROJECT_KEY,JSON.stringify(project));
  }

  function setAdmin(on){ localStorage.setItem(ADMIN_KEY,on?"1":"0"); }
  function isAdmin(){ return localStorage.getItem(ADMIN_KEY)==="1"; }

  function setSession(session){ sessionStorage.setItem(SESSION_KEY,JSON.stringify(session)); }
  function getSession(){
    try{return JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");}catch{return null;}
  }
  function clearSession(){ sessionStorage.removeItem(SESSION_KEY); }

  function encodeSave(state){
    const payload={v:1,state};
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }
  function decodeSave(code){
    const payload=JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if(!payload||payload.v!==1||!payload.state) throw new Error("Save inválido");
    return payload.state;
  }

  return {uid,clone,starterProject,loadProject,saveProject,setAdmin,isAdmin,setSession,getSession,clearSession,encodeSave,decodeSave};
})();
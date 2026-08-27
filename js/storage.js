const ARGEngineStorage = (() => {
  const KEY = "arg_engine_projects_v02";

  const deepClone = obj => JSON.parse(JSON.stringify(obj));
  const uid = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;

  function readAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  }

  function writeAll(projects) {
    localStorage.setItem(KEY, JSON.stringify(projects));
  }

  function createProject(name, protagonistName, mapName) {
    const project = {
      version: "0.2",
      id: uid("project"),
      name: name || "Novo Projeto",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settings: { argMode: false, gridSize: 32, snapToGrid: false },
      player: {
        id: "player_main",
        name: protagonistName || "Protagonista",
        spriteAssetId: null,
        width: 28,
        height: 36,
        speed: 190,
        color: "#785cff"
      },
      assets: [],
      variables: [],
      dialogues: [],
      events: [],
      maps: []
    };

    project.maps.push(makeMap(mapName || "Sala Inicial"));
    const projects = readAll();
    projects.unshift(project);
    writeAll(projects);
    return project;
  }

  function makeMap(name="Novo Mapa") {
    return {
      id: uid("map"),
      name,
      width: 960,
      height: 640,
      backgroundColor: "#161922",
      spawn: { x: 480, y: 320 },
      entities: []
    };
  }

  function getProject(id) {
    return readAll().find(p => p.id === id) || null;
  }

  function saveProject(project) {
    const projects = readAll();
    const i = projects.findIndex(p => p.id === project.id);
    project.updatedAt = Date.now();
    if (i >= 0) projects[i] = project; else projects.unshift(project);
    writeAll(projects);
  }

  function deleteProject(id) {
    writeAll(readAll().filter(p => p.id !== id));
  }

  return { readAll, createProject, makeMap, getProject, saveProject, deleteProject, deepClone, uid };
})();

const ARGEngineStorage = (() => {
  const KEY = "arg_engine_projects_v01";

  function readAll() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  }

  function writeAll(projects) {
    localStorage.setItem(KEY, JSON.stringify(projects));
  }

  function uid() {
    return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  }

  function createProject(name, mapName) {
    const projects = readAll();
    const project = {
      id: uid(),
      name: name || "Novo Projeto",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settings: {
        argMode: false
      },
      player: {
        speed: 190,
        size: 28,
        color: "#7c5cff"
      },
      maps: [{
        id: "map_main",
        name: mapName || "Sala Inicial",
        width: 960,
        height: 640,
        backgroundColor: "#161922",
        spawn: { x: 480, y: 320 }
      }]
    };

    projects.unshift(project);
    writeAll(projects);
    return project;
  }

  function getProject(id) {
    return readAll().find(p => p.id === id) || null;
  }

  function saveProject(project) {
    const projects = readAll();
    const index = projects.findIndex(p => p.id === project.id);
    project.updatedAt = Date.now();

    if (index >= 0) projects[index] = project;
    else projects.unshift(project);

    writeAll(projects);
  }

  function deleteProject(id) {
    writeAll(readAll().filter(p => p.id !== id));
  }

  return { readAll, createProject, getProject, saveProject, deleteProject };
})();

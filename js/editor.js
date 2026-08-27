const params = new URLSearchParams(location.search);
const projectId = params.get("id");
let project = ARGEngineStorage.getProject(projectId);

if (!project) {
  alert("Projeto não encontrado.");
  location.href = "index.html";
  throw new Error("Project not found");
}

let map = project.maps[0];
let saveTimer = null;

const el = {
  projectTitle: document.getElementById("projectTitle"),
  saveStatus: document.getElementById("saveStatus"),
  projectNameInput: document.getElementById("projectNameInput"),
  mapNameInput: document.getElementById("mapNameInput"),
  mapWidthInput: document.getElementById("mapWidthInput"),
  mapHeightInput: document.getElementById("mapHeightInput"),
  backgroundColorInput: document.getElementById("backgroundColorInput"),
  playerSpeedInput: document.getElementById("playerSpeedInput"),
  playerSizeInput: document.getElementById("playerSizeInput"),
  playerColorInput: document.getElementById("playerColorInput"),
  workspaceMapName: document.getElementById("workspaceMapName"),
  mapCanvas: document.getElementById("mapCanvas"),
  spawnMarker: document.getElementById("spawnMarker"),
  spawnXInput: document.getElementById("spawnXInput"),
  spawnYInput: document.getElementById("spawnYInput"),
  playBtn: document.getElementById("playBtn"),
  resetSpawnBtn: document.getElementById("resetSpawnBtn"),
  centerPlayerBtn: document.getElementById("centerPlayerBtn")
};

function renderAll() {
  el.projectTitle.textContent = project.name;
  el.projectNameInput.value = project.name;
  el.mapNameInput.value = map.name;
  el.mapWidthInput.value = map.width;
  el.mapHeightInput.value = map.height;
  el.backgroundColorInput.value = map.backgroundColor;

  el.playerSpeedInput.value = project.player.speed;
  el.playerSizeInput.value = project.player.size;
  el.playerColorInput.value = project.player.color;

  el.workspaceMapName.textContent = map.name;
  el.mapCanvas.style.width = `${map.width}px`;
  el.mapCanvas.style.height = `${map.height}px`;
  el.mapCanvas.style.background = map.backgroundColor;

  renderSpawn();
}

function renderSpawn() {
  const s = project.player.size;
  el.spawnMarker.style.left = `${map.spawn.x}px`;
  el.spawnMarker.style.top = `${map.spawn.y}px`;
  el.spawnMarker.style.width = `${s}px`;
  el.spawnMarker.style.height = `${s}px`;
  el.spawnMarker.style.background = hexToRgba(project.player.color, .35);
  el.spawnMarker.style.borderColor = project.player.color;
  el.spawnMarker.style.fontSize = `${Math.max(12, s * .62)}px`;

  el.spawnXInput.value = Math.round(map.spawn.x);
  el.spawnYInput.value = Math.round(map.spawn.y);
}

function scheduleSave() {
  el.saveStatus.textContent = "A guardar...";
  el.saveStatus.classList.add("dirty");

  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    ARGEngineStorage.saveProject(project);
    el.saveStatus.textContent = "Guardado";
    el.saveStatus.classList.remove("dirty");
  }, 250);
}

function bindTextInput(input, setter) {
  input.addEventListener("input", () => {
    setter(input.value);
    scheduleSave();
  });
}

bindTextInput(el.projectNameInput, value => {
  project.name = value || "Sem nome";
  el.projectTitle.textContent = project.name;
});

bindTextInput(el.mapNameInput, value => {
  map.name = value || "Mapa";
  el.workspaceMapName.textContent = map.name;
});

el.mapWidthInput.addEventListener("input", () => {
  map.width = clamp(+el.mapWidthInput.value || 320, 320, 4000);
  map.spawn.x = clamp(map.spawn.x, 0, map.width);
  renderAll();
  scheduleSave();
});

el.mapHeightInput.addEventListener("input", () => {
  map.height = clamp(+el.mapHeightInput.value || 240, 240, 4000);
  map.spawn.y = clamp(map.spawn.y, 0, map.height);
  renderAll();
  scheduleSave();
});

el.backgroundColorInput.addEventListener("input", () => {
  map.backgroundColor = el.backgroundColorInput.value;
  el.mapCanvas.style.background = map.backgroundColor;
  scheduleSave();
});

el.playerSpeedInput.addEventListener("input", () => {
  project.player.speed = clamp(+el.playerSpeedInput.value || 190, 40, 800);
  scheduleSave();
});

el.playerSizeInput.addEventListener("input", () => {
  project.player.size = clamp(+el.playerSizeInput.value || 28, 8, 128);
  renderSpawn();
  scheduleSave();
});

el.playerColorInput.addEventListener("input", () => {
  project.player.color = el.playerColorInput.value;
  renderSpawn();
  scheduleSave();
});

function setSpawn(x, y) {
  map.spawn.x = clamp(x, 0, map.width);
  map.spawn.y = clamp(y, 0, map.height);
  renderSpawn();
  scheduleSave();
}

el.spawnXInput.addEventListener("input", () => setSpawn(+el.spawnXInput.value || 0, map.spawn.y));
el.spawnYInput.addEventListener("input", () => setSpawn(map.spawn.x, +el.spawnYInput.value || 0));

el.resetSpawnBtn.onclick = el.centerPlayerBtn.onclick = () => {
  setSpawn(map.width / 2, map.height / 2);
};

let dragging = false;

el.spawnMarker.addEventListener("pointerdown", e => {
  dragging = true;
  el.spawnMarker.setPointerCapture(e.pointerId);
});

el.spawnMarker.addEventListener("pointermove", e => {
  if (!dragging) return;
  const rect = el.mapCanvas.getBoundingClientRect();
  setSpawn(e.clientX - rect.left, e.clientY - rect.top);
});

el.spawnMarker.addEventListener("pointerup", () => {
  dragging = false;
});

el.playBtn.onclick = () => {
  ARGEngineStorage.saveProject(project);
  window.open(`play.html?id=${encodeURIComponent(project.id)}`, "_blank");
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

renderAll();

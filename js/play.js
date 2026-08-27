const params = new URLSearchParams(location.search);
const projectId = params.get("id");
const project = ARGEngineStorage.getProject(projectId);

if (!project) {
  alert("Projeto não encontrado.");
  location.href = "index.html";
  throw new Error("Project not found");
}

const map = project.maps[0];
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

document.getElementById("gameProjectName").textContent = project.name;
document.getElementById("gameMapName").textContent = map.name;

const pauseOverlay = document.getElementById("pauseOverlay");
const resumeBtn = document.getElementById("resumeBtn");
const backEditorBtn = document.getElementById("backEditorBtn");

canvas.width = map.width;
canvas.height = map.height;

let player = {
  x: map.spawn.x,
  y: map.spawn.y,
  size: project.player.size,
  speed: project.player.speed,
  color: project.player.color
};

const keys = new Set();
let paused = false;
let last = performance.now();

function resizeCanvasCSS() {
  const maxW = innerWidth;
  const maxH = innerHeight;
  const scale = Math.min(maxW / canvas.width, maxH / canvas.height);
  canvas.style.width = `${Math.floor(canvas.width * scale)}px`;
  canvas.style.height = `${Math.floor(canvas.height * scale)}px`;
}
addEventListener("resize", resizeCanvasCSS);
resizeCanvasCSS();

addEventListener("keydown", e => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) {
    e.preventDefault();
  }

  if (e.key === "Escape") {
    paused = !paused;
    pauseOverlay.classList.toggle("hidden", !paused);
    return;
  }

  keys.add(e.key.toLowerCase());
});

addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));

resumeBtn.onclick = () => {
  paused = false;
  pauseOverlay.classList.add("hidden");
};

backEditorBtn.onclick = () => {
  location.href = `editor.html?id=${encodeURIComponent(project.id)}`;
};

function update(dt) {
  if (paused) return;

  let dx = 0, dy = 0;
  if (keys.has("w") || keys.has("arrowup")) dy -= 1;
  if (keys.has("s") || keys.has("arrowdown")) dy += 1;
  if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
  if (keys.has("d") || keys.has("arrowright")) dx += 1;

  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;
  }

  const half = player.size / 2;
  player.x = clamp(player.x, half, map.width - half);
  player.y = clamp(player.y, half, map.height - half);
}

function draw() {
  ctx.fillStyle = map.backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();

  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.beginPath();
  ctx.ellipse(0, player.size * .42, player.size * .48, player.size * .2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = player.color;
  const s = player.size;
  roundRect(ctx, -s/2, -s/2, s, s, Math.max(4, s*.18));
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-s*.16, -s*.08, Math.max(1.5, s*.055), 0, Math.PI * 2);
  ctx.arc(s*.16, -s*.08, Math.max(1.5, s*.055), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawGrid() {
  const step = 32;
  ctx.strokeStyle = "rgba(255,255,255,.04)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= canvas.width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function loop(now) {
  const dt = Math.min((now - last) / 1000, .05);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

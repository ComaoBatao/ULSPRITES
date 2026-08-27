const grid = document.getElementById("projectGrid");
const empty = document.getElementById("emptyState");
const count = document.getElementById("projectCount");
const dialog = document.getElementById("newProjectDialog");
const form = document.getElementById("newProjectForm");
const newBtn = document.getElementById("newProjectBtn");

function render() {
  const projects = ARGEngineStorage.readAll();
  grid.innerHTML = "";
  count.textContent = projects.length;

  empty.classList.toggle("hidden", projects.length > 0);

  projects.forEach(project => {
    const map = project.maps[0];
    const card = document.createElement("article");
    card.className = "project-card";

    card.innerHTML = `
      <div class="thumb" style="background:${map.backgroundColor}"></div>
      <h3>${escapeHTML(project.name)}</h3>
      <div class="project-meta">${escapeHTML(map.name)} · ${map.width}×${map.height}</div>
      <div class="card-actions">
        <button class="secondary-btn edit-btn">Editar</button>
        <button class="delete-btn">Apagar</button>
      </div>
    `;

    card.querySelector(".edit-btn").onclick = () => {
      location.href = `editor.html?id=${encodeURIComponent(project.id)}`;
    };

    card.querySelector(".delete-btn").onclick = () => {
      if (confirm(`Apagar "${project.name}"?`)) {
        ARGEngineStorage.deleteProject(project.id);
        render();
      }
    };

    grid.appendChild(card);
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[c]));
}

newBtn.onclick = () => dialog.showModal();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const projectName = document.getElementById("projectName").value.trim();
  const mapName = document.getElementById("mapName").value.trim();

  if (!projectName) return;

  const project = ARGEngineStorage.createProject(projectName, mapName);
  dialog.close();
  location.href = `editor.html?id=${encodeURIComponent(project.id)}`;
});

render();

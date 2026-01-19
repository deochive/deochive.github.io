window.setLayout = function (layout) {
  document
    .querySelectorAll(".layout-buttons button")
    .forEach((b) => b.classList.remove("active"));

  const btn = document.querySelector(
    `.layout-buttons button[onclick="setLayout('${layout}')"]`,
  );
  if (btn) btn.classList.add("active");

  const grid = document.getElementById("youtube-videos");
  grid.className = "videos-grid " + layout + "-view";
};

window.addEventListener("DOMContentLoaded", () => {
  setLayout("grid");
});

const root = document.documentElement;
const savedTheme = localStorage.getItem("theme");

if (savedTheme) {
  root.setAttribute("data-theme", savedTheme);
} else {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme", prefersDark ? "dark" : "light");
}

window.setLayout = function (layout) {
  document
    .querySelectorAll(".controls-bar button")
    .forEach((b) => b.classList.remove("active"));

  const btn = document.querySelector(
    `.controls-bar button[onclick="setLayout('${layout}')"]`,
  );
  if (btn) btn.classList.add("active");
  const grid = document.getElementById("youtube-videos");
  if (grid) grid.className = "videos-grid " + layout + "-view";
};

window.addEventListener("DOMContentLoaded", () => {
  setLayout("grid");

  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const isLight = root.getAttribute("data-theme") === "light";
    const nextTheme = isLight ? "dark" : "light";

    root.setAttribute("data-theme", nextTheme);
    localStorage.setItem("theme", nextTheme);
  });
});

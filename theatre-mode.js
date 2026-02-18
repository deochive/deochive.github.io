const theatreToggle = document.getElementById("theatre-toggle");
theatreToggle.addEventListener("click", () => {
  if (document.body.classList.contains("theatre-mode")) {
    disableTheatreMode();
  } else {
    enableTheatreMode();
  }
});

function enableTheatreMode() {
  let overlay = document.querySelector(".theatre-container");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "theatre-container";
    document.body.appendChild(overlay);
  }

  overlay.offsetHeight;
  document.body.classList.add("theatre-mode");
}

function disableTheatreMode() {
  const overlay = document.querySelector(".theatre-container");
  if (!overlay) return;

  document.body.classList.remove("theatre-mode");
  overlay.addEventListener(
    "transitionend",
    () => {
      if (!document.body.classList.contains("theatre-mode")) {
        overlay.remove();
      }
    },
    { once: true }
  );
}

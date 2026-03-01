document.addEventListener("DOMContentLoaded", () => {
  const root = document.documentElement;
  const savedTheme =
    localStorage.getItem("theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");
  root.setAttribute("data-theme", savedTheme);
  const savedBorder = localStorage.getItem("border-theme") || "outline";
  root.setAttribute("data-border", savedBorder);
  function applyBorderTheme(border) {
    root.setAttribute("data-border", border);
    localStorage.setItem("border-theme", border);

    if (border === "animated") {
      root.style.setProperty("--acc1", "#ff4111");
    } else if (border === "outline") {
      root.style.setProperty("--acc1", "#fff511");
    }
  }

  applyBorderTheme(savedBorder);
  function setupPopup(buttonId, popupId, optionsCallback, storageKey) {
    const btn = document.getElementById(buttonId);
    const popup = document.getElementById(popupId);
    if (!btn || !popup) return;

    const options = Array.from(popup.querySelectorAll(".popup-option"));
    if (storageKey) {
      const savedValue = localStorage.getItem(storageKey);
      if (savedValue) {
        const activeOption = options.find(
          (opt) =>
            opt.dataset.theme === savedValue ||
            opt.dataset.border === savedValue,
        );
        if (activeOption) {
          options.forEach((opt) => opt.classList.remove("active"));
          activeOption.classList.add("active");
        }
      }
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = popup.style.display === "flex";
      popup.style.display = isOpen ? "none" : "flex";
      btn.setAttribute("aria-expanded", String(!isOpen));
      if (!isOpen) options[0].focus();
    });

    popup.addEventListener("click", (e) => e.stopPropagation());
    options.forEach((option) => {
      option.addEventListener("click", () => {
        optionsCallback(option);
        options.forEach((opt) => opt.classList.remove("active"));
        option.classList.add("active");
        if (storageKey) {
          if (option.dataset.theme)
            localStorage.setItem(storageKey, option.dataset.theme);
          if (option.dataset.border)
            localStorage.setItem(storageKey, option.dataset.border);
        }

        popup.style.display = "none";
        btn.focus();
      });

      option.addEventListener("keydown", (e) => {
        let index = options.indexOf(document.activeElement);
        if (e.key === "ArrowDown") {
          e.preventDefault();
          options[(index + 1) % options.length].focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          options[(index - 1 + options.length) % options.length].focus();
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          option.click();
        } else if (e.key === "Escape") {
          popup.style.display = "none";
          btn.focus();
        }
      });
    });

    document.addEventListener("click", () => {
      popup.style.display = "none";
      btn.setAttribute("aria-expanded", "false");
    });
  }

  setupPopup("theme-button", "theme-popup", (option) => {
    if (option.dataset.theme) {
      root.setAttribute("data-theme", option.dataset.theme);
      localStorage.setItem("theme", option.dataset.theme);
    }
    if (option.dataset.border) {
      applyBorderTheme(option.dataset.border);
    }
  });

  setupPopup("border-theme-button", "border-theme-popup", (option) => {
    if (option.dataset.border) {
      applyBorderTheme(option.dataset.border);
    }
  });

  window.setLayout = function (view, button) {
    const container = document.getElementById("youtube-videos");
    if (!container) return;

    container.classList.remove("list-view", "compact-view");
    if (view === "list") container.classList.add("list-view");

    if (view === "compact") container.classList.add("compact-view");

    document.querySelectorAll("[onclick^='setLayout']").forEach((btn) => {
      btn.classList.remove("active");
    });
    if (button) button.classList.add("active");

    const layoutPopup = document.getElementById("sort-popup");
    if (layoutPopup) {
      layoutPopup.style.display = "none";
    }
  };
});

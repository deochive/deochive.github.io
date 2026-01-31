const HISTORY_KEY = "watchHistory";
const MAX_HISTORY = 20;
let cachedHistory = null;

function loadHistory() {
  if (cachedHistory) return cachedHistory;
  cachedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY)) ?? [];
  return cachedHistory;
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(cachedHistory));
}

function addToHistory(video) {
  cachedHistory = loadHistory().filter((v) => v.videoId !== video.videoId);

  cachedHistory.unshift(video);
  cachedHistory.length = Math.min(cachedHistory.length, MAX_HISTORY);

  saveHistory();
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById("history-list");
  if (!list) return;
  const fragment = document.createDocumentFragment();

  loadHistory().forEach(({ videoId, title, channelTitle, thumbnail }) => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.dataset.videoId = videoId;

    item.innerHTML = `
      <img src="${thumbnail}" alt="">
      <div>
        <div class="history-title">${title}</div>
        <div class="history-meta">${channelTitle}</div>
      </div>
    `;

    fragment.appendChild(item);
  });
  list.replaceChildren(fragment);
}

document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.querySelector(".content-wrapper");
  const historyBtn = document.getElementById("history-toggle");
  const closeBtn = document.getElementById("history-close");
  const pinBtn = document.getElementById("history-pin");
  const list = document.getElementById("history-list");

  historyBtn?.addEventListener("click", () => {
    const open = wrapper.classList.toggle("history-open");
    if (!open) {
      wrapper.classList.remove("history-pinned");
      pinBtn.classList.remove("active");
    }
  });

  closeBtn?.addEventListener("click", () => {
    wrapper.classList.remove("history-open", "history-pinned");
    pinBtn.classList.remove("active");
  });

  pinBtn?.addEventListener("click", () => {
    const pinned = wrapper.classList.toggle("history-pinned");
    pinBtn.classList.toggle("active", pinned);
  });

  list?.addEventListener("click", (e) => {
    const item = e.target.closest(".history-item");
    if (!item) return;

    window.location.href = `v.html?videoId=${item.dataset.videoId}`;
  });
  renderHistory();
});

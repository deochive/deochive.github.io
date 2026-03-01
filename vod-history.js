const HISTORY_KEY = "watchHistory";
const MAX_HISTORY = 20;
let cachedHistory = null;
let lastAddedVideoId = null;

function loadHistory() {
  if (cachedHistory) return cachedHistory;
  cachedHistory = JSON.parse(localStorage.getItem(HISTORY_KEY)) ?? [];
  return cachedHistory;
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(cachedHistory));
}

function addToHistory(video) {
  cachedHistory = loadHistory().filter(v => v.videoId !== video.videoId);
  cachedHistory.unshift(video);
  cachedHistory.length = Math.min(cachedHistory.length, MAX_HISTORY);
  saveHistory();
  renderHistory();
}

function getVideoIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  const videoId = params.get("videoId");
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId) ? videoId : null;
}

function detectAndAddVideo() {
  const checkVideo = () => {
    const iframe = document.querySelector("#player");
    const videoId = iframe?.src?.match(/\/embed\/([^?&]+)/)?.[1] || getVideoIdFromURL();
    if (!videoId) return;

    if (videoId === lastAddedVideoId) return;

    const titleEl = document.querySelector("h2.video-title") || document.querySelector("title");
    const channelEl = document.querySelector(".channel-row .creator-name") || document.querySelector("meta[itemprop='author']");
    if (!titleEl || !channelEl) return;

    const title = titleEl.textContent.trim() || titleEl.getAttribute("content") || "Unknown Title";
    const channelTitle = channelEl.textContent.trim() || channelEl.getAttribute("content") || "Unknown Channel";
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
    addToHistory({ videoId, title, channelTitle, thumbnail });
    lastAddedVideoId = videoId;
  };

  setInterval(checkVideo, 500);
}

function renderHistory() {
  const list = document.getElementById("history-list");
  if (!list) return;

  const fragment = document.createDocumentFragment();
  loadHistory().forEach(({ videoId, title, channelTitle, thumbnail }) => {
    const item = document.createElement("button");
    item.className = "history-item";
    item.type = "button";
    item.dataset.videoId = videoId;
    item.dataset.title = title;
    item.dataset.channel = channelTitle;
    item.dataset.thumbnail = thumbnail;
    item.innerHTML = `
      <img src="${thumbnail}" alt="${title}" width="160" height="90">
      <div>
        <div class="history-title">${title}</div>
        <div class="history-meta">${channelTitle}</div>
      </div>
    `;
    item.addEventListener("click", () => {
      window.location.href = `vod/?videoId=${videoId}`;
    });
    fragment.appendChild(item);
  });
  list.replaceChildren(fragment);
}

document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.querySelector(".content-wrapper");
  const historyBtn = document.getElementById("history-toggle");
  const closeBtn = document.getElementById("history-close");
  const pinBtn = document.getElementById("history-pin");
  let pinned = false;

  historyBtn?.addEventListener("click", () => {
    const open = wrapper.classList.toggle("history-open");
    if (!open) {
      wrapper.classList.remove("history-pinned");
      pinBtn.classList.remove("active");
    }
  });

  closeBtn?.addEventListener("click", () => wrapper.classList.remove("history-open"));
  pinBtn?.addEventListener("click", () => {
    pinned = !pinned;
    wrapper.classList.toggle("history-pinned", pinned);
    pinBtn.classList.toggle("active", pinned);
  });

  const isVideoPage = !!document.querySelector("#player") || getVideoIdFromURL();
  const isMainPage = !!document.getElementById("history-list");

  if (isVideoPage) detectAndAddVideo();
  
  if (isMainPage) renderHistory();
});
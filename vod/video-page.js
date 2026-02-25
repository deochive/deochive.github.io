const kx = "AIzaSyCdgQXCJk3uMF9Afiu-XnBr6RwO-31n2_0";
const params = new URLSearchParams(window.location.search);

let player;
let playerReady = false;
let currentVideoId = null;
let startTime = 0;
let timestampQueue = [];

function getQueryParam(name) {
  return params.get(name);
}

function formatDate(isoDate) {
  if (!isoDate) return null;
  return new Date(isoDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatNumber(num) {
  return Number(num).toLocaleString("en-GB");
}

function timestampToSeconds(ts) {
  let s = 0;
  ts.split(":").forEach((n) => (s = s * 60 + Number(n)));
  return s;
}

function escapeHTML(str) {
  return str.replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        m
      ],
  );
}

function processDescription(text) {
  if (!text) return "No description available.";
  const escaped = escapeHTML(text).replace(/\n/g, "<br>");
  return escaped.replace(
    /(https?:\/\/[^\s<]+)|\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g,
    (match, url, ts) => {
      if (url)
        return `<a href="${url}" target="_blank" rel="noopener">${url}</a>`;
      const seconds = timestampToSeconds(ts);
      return `<a href="?v=${currentVideoId}&t=${seconds}" class="timestamp" data-seconds="${seconds}">${ts}</a>`;
    },
  );
}

function getCachedData(key) {
  const cached = localStorage.getItem(key);
  if (!cached) return null;

  const { data, expiry } = JSON.parse(cached);

  if (Date.now() > expiry) {
    localStorage.removeItem(key);
    return null;
  }

  return data;
}

function setCachedData(key, data, ttlMs) {
  const payload = {
    data,
    expiry: Date.now() + ttlMs,
  };
  localStorage.setItem(key, JSON.stringify(payload));
}

async function loadVideoData() {
  const container = document.getElementById("video-container");
  if (!container) return;
  let infoContainer = document.getElementById("video-info");

  if (!infoContainer) {
    infoContainer = document.createElement("div");
    infoContainer.id = "video-info";
    container.appendChild(infoContainer);
  }

  try {
    const videoId = currentVideoId;
    const cacheKey = `video_${videoId}`;
    let data = getCachedData(cacheKey);

    if (!data) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${kx}`,
      );
      data = await res.json();
      setCachedData(cacheKey, data, 60 * 60 * 1000);
    }
    if (!data.items?.length) {
      infoContainer.textContent = "Video not found.";
      return;
    }

    const videoData = data.items[0];
    const { title, channelTitle, description, publishedAt, channelId } =
      videoData.snippet;
    const { viewCount, likeCount } = videoData.statistics;
    const channelCacheKey = `channel_${channelId}`;
    let channelData = getCachedData(channelCacheKey);

    if (!channelData) {
      const channelRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${kx}`,
      );
      channelData = await channelRes.json();

      setCachedData(channelCacheKey, channelData, 60 * 60 * 1000);
    }
    const channelSnippet = channelData.items?.[0]?.snippet;
    const channelStats = channelData.items?.[0]?.statistics;
    let channelIcon = channelSnippet?.thumbnails?.medium?.url || "";
    if (channelIcon.includes("=s240")) {
      channelIcon = channelIcon.replace("=s240", "=s88");
    }
    const subscriberCount = channelStats?.subscriberCount;
    const publishDate = formatDate(publishedAt);

    infoContainer.innerHTML = `
      <h2 class="video-title">${escapeHTML(title)}</h2>
      <div class="video-data">
        <div class="video-stats">
          ${formatNumber(viewCount)} views
          ${likeCount ? ` • ${formatNumber(likeCount)} likes` : ""}
          ${publishDate ? ` • YouTube upload date: ${publishDate}` : ""}
        </div>
      </div>
      <div class="video-actions">
        <a class="video-button watch-youtube"
          href="https://www.youtube.com/watch?v=${videoId}"
          target="_blank" rel="noopener">
          ▶ Watch on YouTube
        </a>

        <button type="button" class="video-button share-video">
          🔗 Share
        </button>
      </div>
      <div class="channel-row">
        <img class="channel-icon" src="${channelIcon}" alt="Channel icon">
        <div class="channel-info">
          <div class="creator-name">${escapeHTML(channelTitle)}</div>
          <div class="subscriber-count">
            ${subscriberCount ? `${formatNumber(subscriberCount)} subscribers` : ""}
          </div>
        </div>
      </div>

      <div class="video-description">
        Description:<br>${processDescription(description)}
      </div>
    `;
  } catch (err) {
    console.error(err);
    infoContainer.textContent = "Failed to load video.";
  }
}

(function loadYouTubeAPI() {
  if (window.YT && window.YT.Player) {
    onYouTubeIframeAPIReady();
    return;
  }
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
})();

function onYouTubeIframeAPIReady() {
  const container = document.getElementById("video-container");
  if (!container) return console.error("No #video-container found");

  currentVideoId = getQueryParam("videoId") || "";
  startTime = Number(getQueryParam("t") || 0);
  let playerEl = document.getElementById("player");
  if (!playerEl) {
    playerEl = document.createElement("div");
    playerEl.id = "player";
    container.insertAdjacentElement("afterbegin", playerEl);
  }

  player = new YT.Player("player", {
    videoId: currentVideoId,
    playerVars: { autoplay: 1, mute: 1 },
    events: {
      onReady: (ev) => {
        playerReady = true;
        if (startTime) ev.target.seekTo(startTime, true);
        timestampQueue.forEach((sec) => ev.target.seekTo(sec, true));
        timestampQueue = [];

        ev.target.playVideo();
        loadVideoData();
      },
      onError: (e) => console.error("YouTube player error", e),
    },
  });
}

document.addEventListener("click", (e) => {
  const ts = e.target.closest(".timestamp");
  if (!ts) return;
  e.preventDefault();

  const seconds = Number(ts.dataset.seconds);
  if (Number.isNaN(seconds)) return;
  if (!playerReady || !player) {
    timestampQueue.push(seconds);
    return;
  }

  player.seekTo(seconds, true);
  player.playVideo();
  document.getElementById("player")?.scrollIntoView({ behavior: "smooth" });
});

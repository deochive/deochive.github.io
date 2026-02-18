const kx = "AIzaSyCdgQXCJk3uMF9Afiu-XnBr6RwO-31n2_0";
const params = new URLSearchParams(window.location.search);

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

function processDescription(text, videoId) {
  if (!text) return "No description available.";
  const escaped = escapeHTML(text).replace(/\n/g, "<br>");

  return escaped.replace(
    /(https?:\/\/[^\s<]+)|\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g,
    (match, url, ts) => {
      if (url) {
        return `<a href="${url}" target="_blank" rel="noopener">${url}</a>`;
      }
      const seconds = timestampToSeconds(ts);
      return `<a href="#" class="timestamp" data-seconds="${seconds}">${ts}</a>`;
    },
  );
}

let player;

  function onYouTubeIframeAPIReady() {
    const videoId = getQueryParam("videoId") || "dQw4w9WgXcQ"; // fallback video
    const startTime = Number(getQueryParam("t") || 0);

    player = new YT.Player('player', {
      videoId,
      playerVars: { autoplay: 1, mute: 1, start: startTime },
      events: {
        onReady: () => console.log("YouTube player ready"),
      }
    });
  }

async function loadVideo() {
  const videoId = getQueryParam("videoId");
  const container = document.getElementById("video-container");
  const startTime = Number(getQueryParam("t") || 0);

  if (!videoId) {
    container.textContent = "No video selected.";
    return;
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${kx}`,
    );
    const data = await res.json();

    if (!data.items?.length) {
      container.textContent = "Video not found.";
      return;
    }

    const videoData = data.items[0];
    const { title, channelTitle, description, publishedAt, thumbnails, channelId } =
      videoData.snippet;

    const { viewCount, likeCount } = videoData.statistics;

    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${kx}`
    );
    const channelData = await channelRes.json();
    const channelSnippet = channelData.items?.[0]?.snippet;
    const channelStats = channelData.items?.[0]?.statistics;
    const channelIcon = channelSnippet?.thumbnails?.medium?.url || "";
    const subscriberCount = channelStats?.subscriberCount;

    addToHistory({
      videoId,
      title,
      channelTitle,
      thumbnail: thumbnails?.medium?.url || "",
    });
    const publishDate = formatDate(publishedAt);

    container.innerHTML = `
      <div class="video-wrapper">
        <div id="player"></div>
        <iframe
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&start=${startTime}"
          title="${escapeHTML(title)}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
      <h1 class="video-title">${escapeHTML(title)}</h1>
      <div class="video-data">
        <div class="video-stats">
          ${formatNumber(viewCount)} views
          ${likeCount ? ` • ${formatNumber(likeCount)} likes` : ""}
          ${publishDate ? ` • YouTube upload date: ${publishDate}` : "No upload date available."}
        </div>
      </div>
      <a class="watch-youtube"
         href="https://www.youtube.com/watch?v=${videoId}"
         target="_blank"
         rel="noopener">
        ▶ Watch on YouTube
      </a>
      <div class="channel-row">
        <img class="channel-icon" src="${channelIcon}" alt="Channel icon">
        <div class="channel-info">
          <div class="creator-name">
            ${escapeHTML(channelTitle)}
          </div>
          <div class="subscriber-count">
            ${subscriberCount ? `${formatNumber(subscriberCount)} subscribers` : ""}
          </div>
        </div>
        </div>
      <div class="video-description">
        Description:<br>
        ${processDescription(description?.trim(), videoId)}
      </div>
    `;
  } catch (err) {
    console.error(err);
    container.textContent = "Failed to load video.";
  }
}

loadVideo();

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('timestamp')) {
    e.preventDefault();
    const seconds = Number(e.target.dataset.seconds);
    if (player) {
      player.seekTo(seconds, true);
      player.playVideo();
    }
  }
});
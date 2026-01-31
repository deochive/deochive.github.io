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
      return `<a href="?videoId=${videoId}&t=${seconds}" class="timestamp">${ts}</a>`;
    },
  );
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
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${kx}`,
    );
    const data = await res.json();

    if (!data.items?.length) {
      container.textContent = "Video not found.";
      return;
    }

    const { title, channelTitle, description, publishedAt, thumbnails } =
      data.items[0].snippet;

    addToHistory({
      videoId,
      title,
      channelTitle,
      thumbnail: thumbnails?.medium?.url || "",
    });
    const publishDate = formatDate(publishedAt);

    container.innerHTML = `
      <div class="video-wrapper">
        <iframe
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&start=${startTime}"
          title="${escapeHTML(title)}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
      <h1 class="video-title">${escapeHTML(title)}</h1>
      <a class="watch-youtube"
         href="https://www.youtube.com/watch?v=${videoId}"
         target="_blank"
         rel="noopener">
        ▶ Watch on YouTube
      </a>
      <div class="publish-date">
        ${
          publishDate
            ? `YouTube upload date: ${publishDate}`
            : "No upload date available."
        }
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

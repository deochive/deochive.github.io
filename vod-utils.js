import { durations, container } from "./share-mod.js";

export function formatDuration(isoDuration) {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";

  const h = parseInt(match[1] || 0);
  const m = parseInt(match[2] || 0);
  const s = parseInt(match[3] || 0);

  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m}:${s.toString().padStart(2, "0")}`;
}

export function convertToSeconds(duration) {
  const parts = duration.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

export function extractDate(video) {
  if (video._manualDate) return video._manualDate;

  let match = video.description?.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
  if (match) return match[1];

  match = video.title?.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
  if (match) return match[1];

  return null;
}

export function normalizeDate(dateStr) {
  if (!dateStr.includes("/")) return dateStr;

  let [a, b, y] = dateStr.split("/").map(Number);
  if (a > 12) [a, b] = [b, a];

  return `${String(a).padStart(2, "0")}/${String(b).padStart(2, "0")}/${y}`;
}

export function formatDisplayDate(dateStr) {
  if (!dateStr) return "Unknown";

  if (dateStr.includes("T")) {
    const d = new Date(dateStr);
    if (isNaN(d)) return "Unknown";

    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const yyyy = d.getFullYear();

    return `${mm}/${dd}/${yyyy}`;
  }

  return normalizeDate(dateStr);
}

export function parseDateString(dateStr) {
  if (!dateStr) return null;
  if (!dateStr.includes("/")) return new Date(dateStr);

  const [mm, dd, yyyy] = normalizeDate(dateStr).split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

export function prepareVideo(video) {
  const rawDate = extractDate(video);
  video._rawDate = rawDate;

  const parsed = rawDate ? parseDateString(rawDate) : null;
  video._parsedDate = parsed && !isNaN(parsed) ? parsed : null;

  video._durationSeconds = convertToSeconds(durations?.[video.videoId] || "0:00");
}

export function renderSkeletons(count = 20) {
  container.innerHTML = "";
  container.classList.add("skeleton");

  for (let i = 0; i < count; i++) {
    container.innerHTML += `
      <div class="video-skeleton">
          <div class="spinner"></div>
          <div class="loading-text">Loading Video...</div>
      </div>
    `;
  }
}

export function renderVideos(videos) {
  container.innerHTML = "";

  videos.forEach((video, index) => {
    const rawDate = extractDate(video);
    const isFirst = index === 0;

    container.innerHTML += `
<a href="vod/?videoId=MDsolMqwrhc" class="video-link">
  <div class="video"
    data-date="${rawDate ? parseDateString(rawDate).toISOString() : ""}"
    data-length="${convertToSeconds(durations?.[video.videoId] || "0:00")}"
    data-title="${video.title.toLowerCase()}"
    data-creator="${video.channelTitle.toLowerCase()}"
  >
    <div class="thumbnail-container">
      <img
        src="${video.thumbnail}"
        alt="${video.title}"
        ${isFirst ? 'fetchpriority="high" loading="eager"' : 'loading="lazy"'}
        decoding="async"
      >
      <span class="duration">${durations?.[video.videoId] || "0:00"}</span>
    </div>
    <div class="video-content">
      <p class="title"><strong>${video.title}</strong></p>
      <div class="info">
        <div class="creator">
          <img src="${video.channelIcon}" class="creator-icon" alt="${video.channelTitle}">
          <span class="creator-name">${video.channelTitle}</span>
        </div>
        <div class="publish-date">
          Date: ${formatDisplayDate(rawDate)}
        </div>
      </div>
    </div>
  </div>
</a>`;
  });
}

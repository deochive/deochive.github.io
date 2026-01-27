// i am aware the key is public

const API_KEY = "AIzaSyCdgQXCJk3uMF9Afiu-XnBr6RwO-31n2_0";
const VIDEOS_PER_PAGE = 27;

let allVideos = [];
let durations = {};
let videoBatches = [];
let loadedBatches = 0;
let isLoading = false;

const container = document.getElementById("youtube-videos");
const paginationContainer = document.getElementById("pagination");
let currentPage = 1;
let currentSort = null;

function formatDuration(isoDuration) {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const h = parseInt(match[1] || 0);
  const m = parseInt(match[2] || 0);
  const s = parseInt(match[3] || 0);
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m}:${s.toString().padStart(2, "0")}`;
}

function convertToSeconds(duration) {
  const parts = duration.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function extractDate(video) {
  let match = video.description?.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
  if (match) return match[1];

  match = video.title?.match(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/);
  if (match) return match[1];

  return null;
}

function normalizeDate(dateStr) {
  let [a, b, y] = dateStr.split("/").map(Number);
  if (a > 12) [a, b] = [b, a];
  return `${String(a).padStart(2, "0")}/${String(b).padStart(2, "0")}/${y}`;
}

function parseDateString(dateStr) {
  const [mm, dd, yyyy] = normalizeDate(dateStr).split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "");
}

function renderVideos(videos) {
  container.innerHTML = "";
  videos.forEach((video) => {
    const rawDate = extractDate(video);
    const date = rawDate ? normalizeDate(rawDate) : "Unknown";

    container.innerHTML += `
<a href="v.html?videoId=${video.videoId}" class="video-link">
  <div class="video"
    data-date="${rawDate ? parseDateString(rawDate).toISOString() : ""}"
    data-length="${convertToSeconds(durations[video.videoId] || "0:00")}"
    data-title="${video.title.toLowerCase()}"
    data-creator="${video.channelTitle.toLowerCase()}"
  >
    <div class="thumbnail-container">
      <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
      <span class="duration">${durations[video.videoId]}</span>
    </div>
    <div class="video-content">
      <p class="title"><strong>${video.title}</strong></p>
      <div class="info">
        <div class="creator">
          <img src="${video.channelIcon}" class="creator-icon" loading="lazy">
          <span class="creator-name">${video.channelTitle}</span>
        </div>
        <div class="publish-date">YouTube upload date: ${date}</div>
      </div>
    </div>
  </div>
</a>`;
  });
}

function renderPage(page, videos = allVideos) {
  currentPage = page;
  const start = (page - 1) * VIDEOS_PER_PAGE;
  const end = start + VIDEOS_PER_PAGE;
  renderVideos(videos.slice(start, end));
  renderPagination(videos);
}

function renderPagination(videos = allVideos) {
  paginationContainer.innerHTML = "";
  const totalPages = Math.ceil(videos.length / VIDEOS_PER_PAGE);

  const leftBtn = document.createElement("button");
  leftBtn.textContent = "◀";
  leftBtn.disabled = currentPage === 1;
  leftBtn.addEventListener("click", () => renderPage(currentPage - 1, videos));
  paginationContainer.appendChild(leftBtn);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = i === currentPage ? "active" : "";
    btn.addEventListener("click", () => renderPage(i, videos));
    paginationContainer.appendChild(btn);
  }

  const rightBtn = document.createElement("button");
  rightBtn.textContent = "▶";
  rightBtn.disabled = currentPage === totalPages;
  rightBtn.addEventListener("click", () => renderPage(currentPage + 1, videos));
  paginationContainer.appendChild(rightBtn);
}

function sortVideos(type) {
  if (!type) return;
  currentSort = type;

  switch (type) {
    case "date-new":
      allVideos.sort(
        (a, b) =>
          parseDateString(extractDate(b)) - parseDateString(extractDate(a)),
      );
      break;
    case "date-old":
      allVideos.sort(
        (a, b) =>
          parseDateString(extractDate(a)) - parseDateString(extractDate(b)),
      );
      break;
    case "length-long":
      allVideos.sort(
        (a, b) =>
          convertToSeconds(durations[b.videoId] || "0:00") -
          convertToSeconds(durations[a.videoId] || "0:00"),
      );
      break;
    case "length-short":
      allVideos.sort(
        (a, b) =>
          convertToSeconds(durations[a.videoId] || "0:00") -
          convertToSeconds(durations[b.videoId] || "0:00"),
      );
      break;
    case "title-az":
      allVideos.sort((a, b) =>
        a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
      );
      break;
    case "title-za":
      allVideos.sort((a, b) =>
        b.title.toLowerCase().localeCompare(a.title.toLowerCase()),
      );
      break;
    case "creator-az":
      allVideos.sort((a, b) =>
        a.channelTitle
          .toLowerCase()
          .localeCompare(b.channelTitle.toLowerCase()),
      );
      break;
    case "creator-za":
      allVideos.sort((a, b) =>
        b.channelTitle
          .toLowerCase()
          .localeCompare(a.channelTitle.toLowerCase()),
      );
      break;
  }

  renderPage(1);
}

function filterVideos() {
  const query = normalizeText(
    document.getElementById("video-search").value.trim(),
  );
  if (!query) {
    renderPage(1);
    return;
  }

  const filtered = allVideos.filter((video) => {
    const title = normalizeText(video.title);
    const creator = normalizeText(video.channelTitle);
    return title.includes(query) || creator.includes(query);
  });

  renderPage(1, filtered);
}

async function fetchPlaylistVideos(playlistId) {
  let list = [],
    nextPageToken = "";
  do {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${nextPageToken}&key=${API_KEY}`,
    );
    const data = await res.json();
    if (!data.items) break;
    list.push(
      ...data.items.map((item) => ({
        videoId: item.snippet?.resourceId?.videoId || "",
        title: item.snippet?.title || "Untitled",
        thumbnail: item.snippet?.thumbnails?.medium?.url || "",
        description: item.snippet?.description || "",
        channelTitle: item.snippet?.videoOwnerChannelTitle || "Playlist Video",
        channelIcon: item.snippet?.thumbnails?.default?.url || "",
        fromPlaylist: true,
      })),
    );
    nextPageToken = data.nextPageToken || "";
  } while (nextPageToken);
  return list.filter((v) => v.videoId);
}

async function fetchChannelVideos(channelId) {
  let list = [];
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channelId}&key=${API_KEY}`,
  );
  const channelData = await channelRes.json();
  const uploadsPlaylistId =
    channelData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) return list;
  const channelTitle = channelData.items[0].snippet.title || "Channel";
  const channelIcon =
    channelData.items[0].snippet?.thumbnails?.default?.url || "";

  let nextPageToken = "";
  do {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}&pageToken=${nextPageToken}&key=${API_KEY}`,
    );
    const data = await res.json();
    if (!data.items) break;
    list.push(
      ...data.items.map((item) => ({
        videoId: item.snippet?.resourceId?.videoId || "",
        title: item.snippet?.title || "Untitled",
        thumbnail: item.snippet?.thumbnails?.medium?.url || "",
        description: item.snippet?.description || "",
        channelTitle,
        channelIcon,
        fromPlaylist: false,
      })),
    );
    nextPageToken = data.nextPageToken || "";
  } while (nextPageToken);
  return list.filter((v) => v.videoId);
}

async function fetchChannelIcons(videos) {
  const uniqueChannelIds = [
    ...new Set(videos.map((v) => v.channelId).filter(Boolean)),
  ];

  for (let i = 0; i < uniqueChannelIds.length; i += 50) {
    const batch = uniqueChannelIds.slice(i, i + 50);
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${batch.join(",")}&key=${API_KEY}`,
    );
    const data = await res.json();
    data.items?.forEach((item) => {
      const icon = item.snippet?.thumbnails?.default?.url || "";
      videos.forEach((v) => {
        if (v.channelId === item.id) v.channelIcon = icon;
      });
    });
  }
}

async function loadVideos() {
  try {
    const channelIds = [
      "UC7uyXhlffDK6AAWxh1PGXWg",
      "UCS5oTYx88yJrnyS37eB-0XQ",
      "UCBbGvsqEVGMGEO13Y8rg3Lg",
      "UCvGZKQYEQ8nhqoUX89iEXWg"
    ];
    const playlistId = "PLcqL_aHxpQfLhXpa0dc1FhNGELRv9T_ss";
    let videos = [];

    const playlistVideos = await fetchPlaylistVideos(playlistId);
    videos.push(...playlistVideos);

    for (const id of channelIds) {
      const channelVideos = await fetchChannelVideos(id);
      videos.push(...channelVideos);
    }

    const videoIds = videos.map(v => v.videoId).filter(Boolean);
    const videoBatches = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      videoBatches.push(videoIds.slice(i, i + 50));
    }

    const seenDates = {};
    const filteredVideos = [];

    async function loadNextBatch(batchIndex = 0) {
      if (batchIndex >= videoBatches.length) return;

      const batch = videoBatches[batchIndex];
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${batch.join(",")}&key=${API_KEY}`
      );
      const data = await res.json();

      data.items?.forEach(item => {
        const video = videos.find(v => v.videoId === item.id);
        if (!video) return;

        video.thumbnail = item.snippet.thumbnails?.medium?.url || video.thumbnail;
        video.channelTitle = item.snippet.channelTitle || video.channelTitle;
        video.channelId = item.snippet.channelId || video.channelId;
        durations[item.id] = formatDuration(item.contentDetails?.duration || "PT0S");

        const combinedText = (video.title + " " + video.description).toLowerCase();
        const titleLower = video.title.toLowerCase();
        const isSpecialVideo =
           !titleLower.includes("opening") && (
    video.fromPlaylist||
          combinedText.includes("brucedropemoff stream") ||
          combinedText.includes("brucedropemoff vod") ||
          combinedText.includes("ecurb"));

        if (!isSpecialVideo) return;
        if (convertToSeconds(durations[video.videoId]) < 3600) return;

        const rawDate = extractDate(video);
        if (!rawDate) return;

        const parsedDate = parseDateString(rawDate).toISOString().split("T")[0];
        if (!seenDates[parsedDate] || convertToSeconds(durations[video.videoId]) > convertToSeconds(durations[seenDates[parsedDate].videoId])) {
          seenDates[parsedDate] = video;
        }
      });

      filteredVideos.length = 0;
      filteredVideos.push(...Object.values(seenDates));
      filteredVideos.sort(
        (a, b) => parseDateString(extractDate(b)) - parseDateString(extractDate(a))
      );
      allVideos = filteredVideos;

      renderPage(currentPage);
      await fetchChannelIcons(videos);

      await loadNextBatch(batchIndex + 1);
    }

    loadNextBatch();
  } catch (err) {
    console.error("LOAD VIDEOS ERROR:", err);
    container.innerHTML = "Failed to load videos.";
  }
}

document
  .getElementById("video-search")
  ?.addEventListener("input", filterVideos);

const sortButton = document.getElementById("sort-button");
const sortPopup = document.getElementById("sort-popup");
const sortOptions = Array.from(sortPopup.querySelectorAll(".sort-option"));

sortButton.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = sortPopup.style.display === "flex";
  sortPopup.style.display = isOpen ? "none" : "flex";
  sortButton.setAttribute("aria-expanded", String(!isOpen));
  if (!isOpen) sortOptions[0].focus();
});

sortOptions.forEach((option) => {
  option.addEventListener("click", () => {
    sortVideos(option.dataset.sort);
    sortPopup.style.display = "none";
  });
  option.addEventListener("keydown", (e) => {
    let index = sortOptions.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      sortOptions[(index + 1) % sortOptions.length].focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      sortOptions[
        (index - 1 + sortOptions.length) % sortOptions.length
      ].focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      sortVideos(option.dataset.sort);
      sortPopup.style.display = "none";
    } else if (e.key === "Escape") {
      sortPopup.style.display = "none";
      sortButton.focus();
    }
  });
});

document.addEventListener("click", () => {
  sortPopup.style.display = "none";
});

loadVideos();

import {
  durations,
  allVideos,
  container,
  VIDEOS_PER_PAGE,
} from "./share-mod.js";
import {
  prepareVideo,
  renderVideos,
  renderSkeletons,
  parseDateString,
  extractDate,
  convertToSeconds,
  formatDuration,
} from "./vod-utils.js";

const kx = "AIzaSyCdgQXCJk3uMF9Afiu-XnBr6RwO-31n2_0";
let videoBatches = [];
let loadedBatches = 0;
let isLoading = false;
let currentPage = 1;
let currentSort = null;
let isRefreshingCache = false;
let currentQuery = "";
const paginationContainer = document.getElementById("pagination");
const sortButton = document.getElementById("sort-button");
const sortPopup = document.getElementById("sort-popup");
const sortOptions = Array.from(sortPopup.querySelectorAll(".popup-option"));
const CACHE_KEY = "cachedVideos_v1";
const CACHE_TIME_KEY = "cachedVideos_time";
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6hrs cache time
const channelIconCache = new Map();

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
      allVideos.sort((a, b) => b._parsedDate - a._parsedDate);
      break;

    case "date-old":
      allVideos.sort((a, b) => a._parsedDate - b._parsedDate);
      break;

    case "length-long":
      allVideos.sort((a, b) => b._durationSeconds - a._durationSeconds);
      break;

    case "length-short":
      allVideos.sort((a, b) => a._durationSeconds - b._durationSeconds);
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

async function fetchPlaylistVideos(playlistId) {
  let list = [],
    nextPageToken = "";
  do {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${nextPageToken}&key=${kx}`,
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
        channelIcon: "",
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
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${channelId}&key=${kx}`,
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
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}&pageToken=${nextPageToken}&key=${kx}`,
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
  const missingChannelIds = [
    ...new Set(
      videos
        .map((v) => v.channelId)
        .filter((id) => id && !channelIconCache.has(id)),
    ),
  ];

  if (!missingChannelIds.length) return;
  for (let i = 0; i < missingChannelIds.length; i += 50) {
    const batch = missingChannelIds.slice(i, i + 50);

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${batch.join(",")}&key=${kx}`,
    );
    const data = await res.json();
    data.items?.forEach((item) => {
      const icon = item.snippet?.thumbnails?.default?.url || "";
      channelIconCache.set(item.id, icon);
    });
  }

  videos.forEach((v) => {
    if (
      channelIconCache.has(v.channelId) &&
      (!v.channelIcon || v.channelIcon === v.thumbnail)
    ) {
      v.channelIcon = channelIconCache.get(v.channelId);
    }
  });
  applySearch();
}

async function fetchManualVideos() {
  if (!Array.isArray(window.manualVideos)) {
    return [];
  }

  const videoIds = window.manualVideos
    .map((url) => {
      const match = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/);
      return match ? match[1] : null;
    })
    .filter(Boolean);

  if (!videoIds.length) return [];

  const batches = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    batches.push(videoIds.slice(i, i + 50));
  }

  const results = [];
  for (const batch of batches) {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${batch.join(
        ",",
      )}&key=${kx}`,
    );
    const data = await res.json();

    data.items?.forEach((item) => {
      const video = {
        videoId: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.medium?.url || "",
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        channelIcon: channelIconCache.get(item.snippet?.channelId) || "",
        fromPlaylist: false,
        manual: true,
        _manualDate: item.snippet.publishedAt,
      };
      video._parsedDate = parseDateString(video._manualDate);
      durations[video.videoId] = formatDuration(
        item.contentDetails?.duration || "PT0S",
      );
      results.push(video);
    });
  }
  await fetchChannelIcons(results);
  return results;
}

function loadFromCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return false;

    const parsed = JSON.parse(cached);
    allVideos.length = 0;
    allVideos.push(...(parsed.videos || []));
    Object.keys(durations).forEach((k) => delete durations[k]);
    Object.assign(durations, parsed.durations || {});
    allVideos.forEach(prepareVideo);
    renderPage(1);

    return true;
  } catch (e) {
    console.warn("Cache load failed", e);
    return false;
  }
}

function saveToCache() {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        videos: allVideos,
        durations,
      }),
    );
    localStorage.setItem(CACHE_TIME_KEY, Date.now());
  } catch (e) {
    console.warn("Cache save failed", e);
  }
}

function isCacheFresh() {
  const time = Number(localStorage.getItem(CACHE_TIME_KEY));
  return time && Date.now() - time < CACHE_TTL;
}

async function loadVideos() {
  renderSkeletons(VIDEOS_PER_PAGE);
  try {
    const hadCache = loadFromCache();
    if (!hadCache) {
      await refreshVideosInBackground(true);
      if (allVideos.length > 0) {
        renderPage(1);
      }
    } else {
      refreshVideosInBackground();
    }
  } catch (err) {
    console.error("LOAD VIDEOS ERROR:", err);
    container.innerHTML = "Failed to load videos.";
  }
}

async function refreshVideosInBackground(force = false) {
  if (isRefreshingCache && !force) return;
  isRefreshingCache = true;

  try {
    const channelIds = [
      "UCvGZKQYEQ8nhqoUX89iEXWg",
      "UCS5oTYx88yJrnyS37eB-0XQ",
      "UCBbGvsqEVGMGEO13Y8rg3Lg",
      "UC7uyXhlffDK6AAWxh1PGXWg",
    ];
    const playlistId = "PLcqL_aHxpQfLhXpa0dc1FhNGELRv9T_ss";

    let videos = [];
    const playlistVideos = await fetchPlaylistVideos(playlistId);
    videos.push(...playlistVideos);

    const channelPromises = channelIds.map(fetchChannelVideos);
    const channelResults = await Promise.all(channelPromises);
    channelResults.forEach((list) => videos.push(...list));

    const manualVideosFetched = await fetchManualVideos();
    videos.push(...manualVideosFetched);

    const videoIds = videos.map((v) => v.videoId).filter(Boolean);
    const videoBatches = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      videoBatches.push(videoIds.slice(i, i + 50));
    }

    const seenDates = {};

    async function loadNextBatch(batchIndex = 0) {
      if (batchIndex >= videoBatches.length) return;

      const batch = videoBatches[batchIndex];
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${batch.join(
          ",",
        )}&key=${kx}`,
      );
      const data = await res.json();

      data.items?.forEach((item) => {
        const video = videos.find((v) => v.videoId === item.id);
        if (!video) return;

        video.thumbnail =
          item.snippet.thumbnails?.medium?.url || video.thumbnail;
        video.channelTitle = item.snippet.channelTitle || video.channelTitle;
        video.channelId = item.snippet.channelId || video.channelId;
        durations[video.videoId] = formatDuration(
          item.contentDetails?.duration || "PT0S",
        );

        if (!video.manual) {
          const combinedText = (
            video.title +
            " " +
            video.description
          ).toLowerCase();
          const titleLower = video.title.toLowerCase();
          const isSpecialVideo =
            !titleLower.includes("opening") &&
            (video.fromPlaylist ||
              combinedText.includes("brucedropemoff stream") ||
              combinedText.includes("brucedropemoff vod") ||
              combinedText.includes("ecurb"));

          if (!isSpecialVideo) return;
          if (convertToSeconds(durations[video.videoId]) < 3600) return;
        }

        const rawDate = extractDate(video);
        if (!rawDate) return;

        const parsedDate = parseDateString(rawDate).toISOString().split("T")[0];
        if (!seenDates[parsedDate]) {
          seenDates[parsedDate] = [];
        }

        const isPartVideo = /part\s?\d+/i.test(video.title);
        if (!seenDates[parsedDate].length) {
          seenDates[parsedDate].push(video);
        } else {
          const existingVideos = seenDates[parsedDate];

          if (isPartVideo) {
            existingVideos.push(video);
          } else {
            const longest = existingVideos.reduce((a, b) =>
              convertToSeconds(durations[a.videoId]) >
              convertToSeconds(durations[b.videoId])
                ? a
                : b,
            );

            if (
              convertToSeconds(durations[video.videoId]) >
              convertToSeconds(durations[longest.videoId])
            ) {
              seenDates[parsedDate] = [video];
            }
          }
        }
      });

      const filteredVideos = Object.values(seenDates).flat();
      filteredVideos.sort(
        (a, b) =>
          parseDateString(extractDate(b)) - parseDateString(extractDate(a)),
      );
      allVideos.length = 0;
      allVideos.push(...filteredVideos);
      applySearch();
      await fetchChannelIcons(allVideos);
      await loadNextBatch(batchIndex + 1);
    }
    await loadNextBatch();

    manualVideosFetched.forEach((video) => {
      const rawDate = extractDate(video);
      if (!rawDate) return;

      const parsedDate = parseDateString(rawDate).toISOString().split("T")[0];
      if (!seenDates[parsedDate]) {
        seenDates[parsedDate] = [];
      }

      const isPartVideo = /part\s?\d+/i.test(video.title);
      if (!seenDates[parsedDate].length) {
        seenDates[parsedDate].push(video);
      } else {
        const existingVideos = seenDates[parsedDate];

        if (isPartVideo) {
          existingVideos.push(video);
        } else {
          const longest = existingVideos.reduce((a, b) =>
            convertToSeconds(durations[a.videoId]) >
            convertToSeconds(durations[b.videoId])
              ? a
              : b,
          );

          if (
            convertToSeconds(durations[video.videoId]) >
            convertToSeconds(durations[longest.videoId])
          ) {
            seenDates[parsedDate] = [video];
          }
        }
      }
    });

    allVideos.length = 0;
    allVideos.push(...Object.values(seenDates).flat());
    allVideos.forEach(prepareVideo);
    allVideos.sort((a, b) => b._parsedDate - a._parsedDate);
    await fetchChannelIcons(allVideos);
    applySearch();
    saveToCache();
    if (!currentQuery) {
      renderPage(1);
    }
  } catch (err) {
    console.error("Background refresh failed:", err);
  } finally {
    isRefreshingCache = false;
  }
}

function applySearch() {
  if (!currentQuery) {
    renderPage(1);
    return;
  }

  const filtered = allVideos.filter((video) => {
    return (
      video.title.toLowerCase().includes(currentQuery) ||
      video.channelTitle.toLowerCase().includes(currentQuery)
    );
  });
  renderPage(1, filtered);
}

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

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("video-search");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentQuery = searchInput.value.trim().toLowerCase();
      applySearch();
    });
  }

  loadVideos().then(() => {
    if (searchInput.value.trim() !== "") {
      currentQuery = searchInput.value.trim().toLowerCase();
    }
  });
});

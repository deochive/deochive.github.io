const API_KEY = "AIzaSyCdgQXCJk3uMF9Afiu-XnBr6RwO-31n2_0";

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function formatDate(isoDate) {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

async function loadVideo() {
  const videoId = getQueryParam("videoId");
  const container = document.getElementById("video-container");

  if (!videoId) {
    container.textContent = "No video selected.";
    return;
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`
    );
    const data = await res.json();

    if (!data.items?.length) {
      container.textContent = "Video not found.";
      return;
    }

    const video = data.items[0].snippet;
    const publishDate = formatDate(video.publishedAt);

    container.innerHTML = `
      <div class="video-wrapper">
        <iframe
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1"
          title="${video.title}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
          <h1 class="video-title">${video.title}</h1>
      <a
        class="watch-youtube"
        href="https://www.youtube.com/watch?v=${videoId}"
        target="_blank"
        rel="noopener"
      >
        ▶ Watch on YouTube
      </a>

            <div class="publish-date">
        ${publishDate ? `YouTube upload date: ${publishDate}` : "No upload date available."}
      </div>

      <div class="video-description">
        Description:<br>${video.description
      ? video.description.trim().replace(/\n/g, "<br>")
      : "No description available."}
      </div>
    `;
  } catch (err) {
    console.error(err);
    container.textContent = "Failed to load video.";
  }
}

loadVideo();
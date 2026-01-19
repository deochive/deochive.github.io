const API_KEY = "AIzaSyCdgQXCJk3uMF9Afiu-XnBr6RwO-31n2_0";

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

async function loadVideo() {
  const videoId = getQueryParam("videoId");
  const container = document.getElementById("video-container");

  if (!videoId) {
    container.innerHTML = "No video selected.";
    return;
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${API_KEY}`,
    );
    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      container.innerHTML = "Video not found.";
      return;
    }

    const video = data.items[0].snippet;
    const publishDate = formatDate(video.publishedAt);

    container.innerHTML = `
            <h1>${publishDate}</h1>
            <iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" 
                title="${video.title}" frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowfullscreen>
            </iframe>
            <h2>${video.title}</h2>
            <p>${video.description || "No description available."}</p>
        `;
  } catch (err) {
    console.error(err);
    container.innerHTML = "Failed to load video.";
  }
}

loadVideo();

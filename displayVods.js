const API_KEY = "AIzaSyCdgQXCJk3uMF9Afiu-XnBr6RwO-31n2_0";
const CHANNEL_ID = "UC7uyXhlffDK6AAWxh1PGXWg";

function formatDuration(isoDuration) {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    : `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

async function loadVideos() {
  const container = document.getElementById("youtube-videos");
  container.innerHTML = "Loading videos...";

  try {
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`,
    );
    const channelData = await channelRes.json();
    const uploadsPlaylistId =
      channelData.items[0].contentDetails.relatedPlaylists.uploads;
    const channelTitle = channelData.items[0].snippet.title;
    const channelIcon = channelData.items[0].snippet.thumbnails.default.url;

    let videos = [];
    let nextPageToken = "";
    do {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}&pageToken=${nextPageToken}&key=${API_KEY}`,
      );
      const data = await res.json();
      if (!data.items) break;

      videos.push(
        ...data.items.map((item) => ({
          videoId: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          publishedAt: item.snippet.publishedAt,
          thumbnail: item.snippet.thumbnails.medium.url,
        })),
      );

      nextPageToken = data.nextPageToken || "";
    } while (nextPageToken);

    const videoIds = videos.map((v) => v.videoId);
    const durations = {};
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batch.join(",")}&key=${API_KEY}`,
      );
      const data = await res.json();
      data.items.forEach((item) => {
        durations[item.id] = formatDuration(item.contentDetails.duration);
      });
    }

    container.innerHTML = "";
    videos.forEach((video) => {
      const publishDate = new Date(video.publishedAt).toLocaleDateString();
      const videoHTML = `
<a href="v.html?videoId=${video.videoId}" class="video-link">
    <div class="video">
        <div class="thumbnail-container">
            <img src="${video.thumbnail}" alt="${video.title}">
            <span class="duration">${durations[video.videoId]}</span>
        </div>
        <div class="video-content">
            <p class="title"><strong>${video.title}</strong></p>
            <div class="info">
                <div class="creator">
                    <img src="${channelIcon}" alt="${channelTitle}" class="creator-icon">
                    <span class="creator-name">${channelTitle}</span>
                </div>
                <div class="publish-date">Published: ${publishDate}</div>
            </div>
        </div>
    </div>
</a>
            `;
      container.innerHTML += videoHTML;
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = "Failed to load videos.";
  }
}

loadVideos();

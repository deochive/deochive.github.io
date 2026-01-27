document.addEventListener("DOMContentLoaded", () => {
  const disclaimer = document.querySelector(".disclaimer");
  const users = ["bradygoo"];
  const CLIENT_ID = "h6e18v19zv1lzx36kyv700os8adys0";
  const OAUTH_TOKEN = "iiup8vm86l2ubrgjoci7w1cvvv07j7";

  async function isUserLive(username) {
    try {
      const url = `https://api.twitch.tv/helix/streams?user_login=${username}`;
      const res = await fetch(url, {
        headers: {
          "Client-ID": CLIENT_ID,
          "Authorization": `Bearer ${OAUTH_TOKEN}`,
        },
      });
      const data = await res.json();
      return data.data && data.data.length > 0;
    } catch (err) {
      console.error("Fetch error:", err);
      return false;
    }
  }

  function placeUserElement(userEl) {
    if (!userEl.parentElement) {
      // Always insert after disclaimer
      disclaimer.insertAdjacentElement("afterend", userEl);
    }
    userEl.style.position = "relative";
    userEl.style.left = "";
    userEl.style.top = "";
    userEl.style.transform = "";
    userEl.style.margin = "10px auto";
  }

  async function updateLiveStatus() {
    for (const username of users) {
      let userEl = document.getElementById(`user-${username}`);
      const live = await isUserLive(username);

      if (live && !userEl) {
        userEl = document.createElement("a");
        userEl.id = `user-${username}`;
        userEl.className = "user live-user";
        userEl.href = `https://twitch.tv/${username}`;
        userEl.target = "_blank";

        const badge = document.createElement("span");
        badge.className = "live-badge";
        badge.textContent = "LIVE";

        const nameSpan = document.createElement("span");
        nameSpan.className = "username";
        nameSpan.textContent = username;

        userEl.appendChild(badge);
        userEl.appendChild(nameSpan);

        placeUserElement(userEl);

        // Pulse animation
        setInterval(() => {
          badge.classList.remove("pulse");
          void badge.offsetWidth;
          badge.classList.add("pulse");
        }, 3000);

      } else if (!live && userEl) {
        userEl.remove();
      } else if (live && userEl) {
        placeUserElement(userEl);
      }
    }
  }

  updateLiveStatus();
  setInterval(updateLiveStatus, 30000);

  window.addEventListener("resize", () => {
    document.querySelectorAll(".user").forEach(placeUserElement);
  });
});
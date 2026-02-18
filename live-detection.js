document.addEventListener("DOMContentLoaded", () => {
  const users = ["brucedropemoff"];
  const pxk = "h6e18v19zv1lzx36kyv700os8adys0";
  const dpq = "iiup8vm86l2ubrgjoci7w1cvvv07j7";
  const userElements = new Map();
  const dismissed = sessionStorage.getItem(`live-dismissed-${username}`);
  async function isUserLive(username) {
    try {
      const res = await fetch(
        `https://api.twitch.tv/helix/streams?user_login=${username}`,
        {
          headers: {
            "Client-ID": pxk,
            Authorization: `Bearer ${dpq}`,
          },
        },
      );

      if (!res.ok) return false;

      const data = await res.json();
      return Array.isArray(data.data) && data.data.length > 0;
    } catch (err) {
      console.error("Twitch fetch error:", err);
      return false;
    }
  }

  function placeUserElement(el) {
    if (!el.parentElement) {
      document.body.appendChild(el);
    }
  }

  function createUserElement(username) {
    const popup = document.createElement("div");
    popup.className = "live-popup";
    popup.id = `user-${username}`;
    const badge = document.createElement("span");
    badge.className = "live-badge";
    badge.textContent = "LIVE";
    const link = document.createElement("a");
    link.className = "username";
    link.href = `https://twitch.tv/${username}`;
    link.target = "_blank";
    link.textContent = username;
    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.innerHTML = "✕";
    closeBtn.addEventListener("click", () => {
      sessionStorage.setItem(`live-dismissed-${username}`, "true");
      popup.remove();
      userElements.delete(username);
    });

    popup.append(badge, link, closeBtn);
    setTimeout(() => popup.classList.add("show"), 50);
    return popup;
  }

  async function updateLiveStatus() {
    for (const username of users) {
      const live = await isUserLive(username);
      const existingEl = userElements.get(username);

      if (live && !existingEl && !dismissed) {
        const el = createUserElement(username);
        userElements.set(username, el);
        placeUserElement(el);
      } else if (!live && existingEl) {
        existingEl.remove();
        userElements.delete(username);
      }
    }
  }

  updateLiveStatus();
  setInterval(updateLiveStatus, 30000);
});

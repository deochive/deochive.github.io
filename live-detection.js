document.addEventListener("DOMContentLoaded", () => {
  const disclaimer = document.querySelector(".disclaimer");
  const users = ["brucedropemoff"];
  const pxk = "h6e18v19zv1lzx36kyv700os8adys0";
  const dpq = "iiup8vm86l2ubrgjoci7w1cvvv07j7";
  const userElements = new Map();

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

      const data = await res.json();
      return Array.isArray(data.data) && data.data.length > 0;
    } catch (err) {
      console.error("Twitch fetch error:", err);
      return false;
    }
  }

  function placeUserElement(el) {
    if (!el.parentElement) {
      disclaimer.insertAdjacentElement("afterend", el);
    }

    Object.assign(el.style, {
      position: "relative",
      margin: "10px auto",
      left: "",
      top: "",
      transform: "",
    });
  }

  function createUserElement(username) {
    const el = document.createElement("a");
    el.id = `user-${username}`;
    el.className = "user live-user";
    el.href = `https://twitch.tv/${username}`;
    el.target = "_blank";

    const badge = document.createElement("span");
    badge.className = "live-badge";
    badge.textContent = "LIVE";

    const name = document.createElement("span");
    name.className = "username";
    name.textContent = username;

    el.append(badge, name);
    return el;
  }

  async function updateLiveStatus() {
    for (const username of users) {
      const live = await isUserLive(username);
      const existingEl = userElements.get(username);

      if (live && !existingEl) {
        const el = createUserElement(username);
        userElements.set(username, el);
        placeUserElement(el);
      } else if (!live && existingEl) {
        existingEl.remove();
        userElements.delete(username);
      } else if (live && existingEl) {
        placeUserElement(existingEl);
      }
    }
  }

  updateLiveStatus();
  setInterval(updateLiveStatus, 30_000);

  window.addEventListener("resize", () => {
    userElements.forEach(placeUserElement);
  });
});

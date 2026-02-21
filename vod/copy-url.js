document.addEventListener("click", async (e) => {
  const button = e.target.closest(".share-video");
  if (!button) return;

  const url = window.location.href;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
    } else {
      fallbackCopy(url);
    }

    button.textContent = "✔ Copied!";
    button.classList.add("copied");
    setTimeout(() => {
      button.textContent = "🔗 Share";
      button.classList.remove("copied");
    }, 2000);

  } catch (err) {
    alert("Failed to copy link.");
  }
});

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}
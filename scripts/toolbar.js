const Toolbar = (() => {
  const element = document.querySelector(".toolbar");
  const playBtn = element.querySelector(".play");
  const volumeBtn = element.querySelector(".volume-btn");
  const rateBtn = element.querySelector(".rate .rate-btn");

  let hideTimeout = null;

  function show() {
    element.style.opacity = 1;

    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => hide(), 3000);
  }

  function hide() {
    element.style.opacity = null;
  }

  function update() {
    playBtn.classList.toggle("hidden", !hasClipboardAccess);

    volumeBtn.innerHTML = `
      <span class="tooltip-text">Volume ${currentVolume}% ${muted ? "(Muted)" : ""}</span>
      ${getVolumeIcon()}
    `;

    rateBtn.innerHTML = `
    <div class="text">${currentRate}x</div>
    <span class="tooltip-text">Playback speed ${currentRate}x</span>
  `;
  }

  return { show, hide, update };
})();

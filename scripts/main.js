const focusBtn = document.querySelector(".focus-btn");
const homeScreen = document.querySelector(".home-screen");
const playerScreen = document.querySelector(".player-screen");
const urlInput = homeScreen.querySelector(".url-input input");
const messageEl = homeScreen.querySelector(".message");
const clipboardBtn = homeScreen.querySelector(".clipboard-btn");
const historyList = document.querySelector(".history .list");
const detailsModal = document.querySelector(".details-modal");

let currentVideo = null;
let isLoading = false;
let isPlayerReady = false;
let hasClipboardAccess = false;
let histories = load("histories", []);
let currentVolume = load("currentVolume", 50);
let muted = load("muted", false);
let currentRate = 1;

document.addEventListener("DOMContentLoaded", function () {
  getClipboardAccess();
  updateHistoryList();
  maintainFocus();
  handleHistory();
});

function maintainFocus() {
  if (currentVideo && isPlayerReady) focusBtn.focus();

  setTimeout(() => {
    maintainFocus();
  }, 250);
}

function handleHistory() {
  addHistory();

  setTimeout(() => {
    handleHistory();
  }, 5000);
}

function toggleMessageEl(message = "") {
  messageEl.textContent = message;
  messageEl.classList.toggle("hidden", !message);
}

function goHome() {
  window.history.pushState(null, null, window.location.pathname);

  document.title = "YT Video Player";
  urlInput.value = "";
  toggleMessageEl();
  show(homeScreen);
  currentVideo = null;
  changeScreen("home-screen");

  if (isPlayerReady) player.pauseVideo();
}

function displayPlayer() {
  urlInput.value = "";
  player.getIframe().classList.remove("hidden");
  document.title = currentVideo.title;
  hide(homeScreen);
  Toolbar.update();
  if (currentRate !== 1) setPlayBackRate(1);
  Toolbar.show();
  changeScreen("player-screen");

  isLoading = false;
}

// This code loads the IFrame Player API code asynchronously.
var tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// This function creates a YouTube player after the API code downloads.
let player;
// This function creates an <iframe> (and YouTube player)
// after the API code downloads.
function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    playerVars: {
      rel: 0,
      cc_load_policy: 1,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onVolumeChange: onVolumeChange,
      onPlaybackRateChange: onPlaybackRateChange,
      onError: onPlayerError,
    },
  });
}

function onPlayerReady(event) {
  isPlayerReady = true;

  muted ? player.mute() : player.unMute();
  player.setVolume(currentVolume);
  player.getIframe().classList.add("hidden");

  const videoId = urlParams.get("videoid");
  if (videoId) loadVideo(`https://www.youtube.com/watch?v=${videoId}`);
}

function onPlayerStateChange(event) {
  // -1 – unstarted
  // 0 – ended
  // 1 – playing
  // 2 – paused
  // 3 – buffering
  // 5 – video cued

  switch (event.data) {
    case 0:
      Toolbar.show();
      break;
    case 1:
      Toolbar.hide();
      break;
    default:
      break;
  }
}

function onVolumeChange(event) {
  Toolbar.update();
}

function onPlaybackRateChange(event) {
  Toolbar.update();
}

function onPlayerError(event) {
  console.error("YouTube Player API error: ", event.data);
  goHome();
  isLoading = false;
  toggleMessageEl(`YouTube Player API error: ${event.data}`);
}

async function loadVideo(url = urlInput.value, shouldShowMsg = true) {
  if (!isPlayerReady || isLoading) return;
  isLoading = true;

  let { videoId = currentVideo?.id, startSeconds = player?.getCurrentTime() } = getVideoCue(url);

  if (!videoId) {
    urlInput.value = "";
    if (shouldShowMsg) toggleMessageEl("Please enter a valid video URL");
    isLoading = false;
    return;
  }

  if (videoId === currentVideo?.id) {
    isLoading = false;
    return;
  }

  window.history.pushState(null, null, `?videoid=${videoId}`);

  currentVideo = await getVideoDetails(videoId);
  player.cueVideoById(videoId, startSeconds);

  displayPlayer();
}

function getVideoCue(url) {
  // Extract video ID from YouTube URL
  const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|shorts\/|live\/|.*[?&]v=))([^"&?\/\s]{11})/);
  const videoId = videoIdMatch ? videoIdMatch[1] : null;

  // Extract start seconds from YouTube URL
  const startSecondsMatch = url.match(/[?&]t=(\d+)/);
  const startSeconds = startSecondsMatch ? parseInt(startSecondsMatch[1]) : null;

  return {
    videoId: videoId,
    startSeconds: startSeconds,
  };
}

async function getVideoFromClipboard(shouldShowMsg = true) {
  await sleep(1000);
  if (!document.hasFocus()) return;

  if (isLoading) return;
  isLoading = true;

  const clipboardText = await readClipboard();

  isLoading = false;

  if (!clipboardText) return;

  loadVideo(clipboardText, shouldShowMsg);
}

function addHistory() {
  if (!currentVideo) return;
  if (player.getPlayerState() === YT.PlayerState.CUED) return;

  const isInHistory = histories.some((history) => history.id === currentVideo.id);

  if (!isInHistory) {
    const history = { title: currentVideo.title, id: currentVideo.id, time: player.getCurrentTime() };

    histories.unshift(history);
    if (histories.length > 3) histories.pop();
  } else {
    const history = histories.find((history) => history.id === currentVideo.id);
    history.time = player.getCurrentTime();
  }

  save("histories", histories);

  updateHistoryList();
}

function updateHistoryList() {
  const hasHistories = histories.length > 0;

  document.querySelector(".history").classList.toggle("hidden", !hasHistories);
  historyList.innerHTML = hasHistories
    ? histories
        .map((history) => {
          const time = Math.max(0, history.time - 5);
          return `
          <button onclick="loadVideo('https://www.youtube.com/watch?v=${history.id}?t=${time}')" class="item truncated">${history.title}</button>
          `;
        })
        .join("")
    : "";
}

function pauseVideo() {
  if (!currentVideo || !isPlayerReady) return;

  const playing = player.getPlayerState() === YT.PlayerState.PLAYING;
  playing ? player.pauseVideo() : player.playVideo();
}

function getVolumeIcon() {
  let icon = "";
  if (currentVolume <= 0 || muted) icon = `<i class="bi bi-volume-mute-fill"></i>`;
  else if (currentVolume <= 50) icon = `<i class="bi bi-volume-down-fill"></i>`;
  else icon = `<i class="bi bi-volume-up-fill"></i>`;

  return icon;
}

function mute() {
  if (!currentVideo || !isPlayerReady) return;

  muted = !muted;
  muted ? player.mute() : player.unMute();

  Toolbar.update();
  save("muted", muted);
}

function setVolume(value) {
  if (!currentVideo || !isPlayerReady) return;

  currentVolume = value != null ? value : (currentVolume + 25) % 125;
  currentVolume = clamp(currentVolume, 0, 100);
  player.setVolume(currentVolume);
  save("currentVolume", currentVolume);

  Toast.show(`${getVolumeIcon()} ${currentVolume}%`);
}

function setPlayBackRate(value) {
  if (!currentVideo || !isPlayerReady) return;

  currentRate = value != null ? value : (currentRate + 0.25) % 1.5;
  currentRate = clamp(currentRate, 0.75, 1.25);
  player.setPlaybackRate(currentRate);
  save("currentRate", currentRate);

  Toast.show(`${currentRate}x`);
}

function replayVideo() {
  if (!currentVideo || !isPlayerReady) return;

  player.seekTo(0);
  player.playVideo();
}

async function copyTitle() {
  const title = currentVideo.title;
  await navigator.clipboard.writeText(title);
  Toast.show("Video title copied to clipboard")
}

async function copyLink() {
  const link = `https://www.youtube.com/watch?v=${currentVideo.id}`;
  await navigator.clipboard.writeText(link);
  Toast.show("Video link copied to clipboard")
}

function jump(amount) {
  if (!currentVideo || !isPlayerReady) return;

  player.seekTo(player.getCurrentTime() + amount);
  Toast.show(`${amount} seconds`);
}

async function getClipboardAccess() {
  const clipboardText = await readClipboard();
  if (!clipboardText) return;

  hasClipboardAccess = true;
  clipboardBtn.classList.remove("hidden");
  Toolbar.update();
}

async function getVideoDetails(videoId) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();
  const videoDetails = { id: data.items[0].id, ...data.items[0]?.snippet };
  return videoDetails;
}

function updateDetailsModal() {
  if (!currentVideo || !isPlayerReady) return;

  detailsModal.querySelector(".title").textContent = currentVideo.title;
  const descriptionEl = detailsModal.querySelector(".description");
  descriptionEl.textContent = currentVideo.description;
  createLinks(descriptionEl);
}

function toggleDetailsModal() {
  updateDetailsModal();
  detailsModal.classList.toggle("hidden");
}

function openVideoUrl() {
  if (!currentVideo || !isPlayerReady) return;

  window.open(player.getVideoUrl(), "_blank");
}

function adjustVolume(volumeUp) {
  const increment = volumeUp ? (currentVolume < 5 ? 1 : 5) : currentVolume <= 5 ? -1 : -5;
  setVolume(currentVolume + increment);
}

const keyActions = {
  Space: pauseVideo,
  KeyK: pauseVideo,
  ArrowUp: () => adjustVolume(true),
  KeyW: () => adjustVolume(true),
  KeyI: () => adjustVolume(true),
  ArrowDown: () => adjustVolume(false),
  KeyS: () => adjustVolume(false),
  KeyU: () => adjustVolume(false),
  KeyM: mute,
  KeyL: () => jump(5),
  ArrowRight: () => jump(5),
  KeyD: () => jump(5),
  KeyJ: () => jump(-5),
  ArrowLeft: () => jump(-5),
  KeyA: () => jump(-5),
  KeyF: toggleFullscreen,
};

document.addEventListener("keydown", (event) => {
  const action = keyActions[event.code];
  if (action) {
    event.preventDefault();
    action();
  }
});


const storagePrefix = 'yt-player_'

const startModal = document.querySelector(".start-modal")
const urlInput = document.querySelector(".url-input")
const msg = document.querySelector(".msg")
const quickBtn = document.querySelector(".quick-btn")
const toolbar = document.querySelector(".tools-container")
const homeBtn = document.querySelector(".tools .home")
const lockBtn = document.querySelector(".tools .lock")
const playBtn = document.querySelector(".tools .play")
const volumeBtn = document.querySelector(".tools .volume-btn")
const rateBtn = document.querySelector(".tools .rate .rate-btn")
const replayBtn = document.querySelector(".tools .replay")
const stopBtn = document.querySelector(".tools .stop")
const resizeBtn = document.querySelector(".tools .resize")
const historyList = document.querySelector(".history .list")

let loading = false
let playerIsReady = false
let currentVideoId = null
let videoIsLocked = true
let clipboardAllowed = false

let history = JSON.parse(localStorage.getItem(storagePrefix + "history")) || []

const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)

let currentVolume = parseInt(localStorage.getItem(storagePrefix + "currentVolume")) || 50
let muted = JSON.parse(localStorage.getItem(storagePrefix + "muted")) || false
let currentWidth = parseInt(localStorage.getItem(storagePrefix + "currentWidth")) || 100

function stopPropagation(event) {
  event.stopPropagation()
}

function goHome() {
  window.history.pushState(null, null, window.location.pathname)

  document.title = "YT Video Player"
  urlInput.value = ""
  msg.innerHTML = ""
  startModal.style.display = "block"
  toolbar.classList.add("hidden")
  currentVideoId = null
  
  if (playerIsReady) player.pauseVideo()
}

const focusBtn = document.getElementById("focusBtn")
function update() {
  if (currentVideoId && playerIsReady) focusBtn.focus()
  
  setTimeout(() => {
    update()
  }, 250);
}

function displayPlayer() {
  urlInput.value = ""
  player.getIframe().classList.remove("hidden")
  document.title = player.getVideoData().title
  startModal.style.display = "none"
  updateVolumeBtn()
  setPlayBackRate(1)
  updateResizeBtn()
  toolbar.classList.remove("hidden")
  showToolbar()

  loading = false
}

let toolbarTimeout = null
function showToolbar() {
  toolbar.style.opacity = 1
  clearTimeout(toolbarTimeout)
  toolbarTimeout = setTimeout(() => {
    toolbar.style.opacity = null
  }, 5000);
}

// This code loads the IFrame Player API code asynchronously.
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);


// This function creates a YouTube player after the API code downloads.
let player;
// This function creates an <iframe> (and YouTube player)
// after the API code downloads.
function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    playerVars: {
      'rel': 0,
      'cc_load_policy': 1,
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onVolumeChange': onVolumeChange,
      'onPlaybackRateChange': onPlaybackRateChange,
      'onError': onPlayerError
    }
  });
}

function onPlayerReady(event) {  
  playerIsReady = true

  // if (videoIsLocked) lockVideo()
  muted ? player.mute() : player.unMute()
  player.setVolume(currentVolume)
  player.getIframe().classList.add("hidden")
  
  const videoId = urlParams.get('videoid')
  if (videoId) getVideoByUrl(`https://www.youtube.com/watch?v=${videoId}`)
  else if (clipboardAllowed) getVideoFromClipboard(false)
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
      showToolbar()
      break;
    case 1:
      addHistory()
      toolbar.style.opacity = null
      break;
    case 2:
      showToolbar()
      break;
    case 5:
      displayPlayer()
      showToolbar()
      break;
  
    default:
      break;
  }
}

function volumeIcon() {
  let icon = ""
  if (currentVolume <= 0 || muted) 
    icon = `<i class="bi bi-volume-mute-fill"></i>`
  else if (currentVolume <= 50) 
    icon = `<i class="bi bi-volume-down-fill"></i>`
  else 
    icon = `<i class="bi bi-volume-up-fill"></i>`

  return icon
}

function onVolumeChange(event) {
  updateVolumeBtn(player.getVolume())
}

function onPlaybackRateChange(event) {
  updateRateBtn(player.getPlaybackRate())
}

function onPlayerError(event) {
  console.error('An error occurred: ', event.data);

  goHome()
  loading = false

  switch (event.data) {
    case 2:
      msg.textContent = "Error: Invalid URL!"   
      break
    case 5:
      msg.textContent = "Error: Error related to the HTML5 player has occurred!"
      break
    case 100:
      msg.textContent = "Error: The video requested was not found!"
      break
    case 101:
      msg.textContent = "Error: The owner of the requested video does not allow it to be played in embedded players."
      break
    case 150:
      msg.textContent = "Error: The owner of the requested video does not allow it to be played in embedded players."
      break
  }
}


function getVideoByUrl(url) {
  if (!playerIsReady || loading) return
  loading = true

  const videoId = getVideoIdFromUrl(url)
  
  if (videoId) {
    window.history.pushState(null, null, `?videoid=${videoId}`)

    player.cueVideoById(videoId)
    currentVideoId = videoId
  } else {  
    urlInput.value = ""
    msg.textContent = "Error: Invalid URL!"
    loading = false
  }
}

function getVideoIdFromUrl(url) {
  // Extract video ID from YouTube URL
  const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|shorts\/|.*[?&]v=))([^"&?\/\s]{11})/);
  return videoIdMatch ? videoIdMatch[1] : null;
}

async function getVideoIdFromClipboard() {
  if (!document.hasFocus()) return null
  const clipboardText = await navigator.clipboard.readText();
  if (!clipboardText) return null
  const videoId = getVideoIdFromUrl(clipboardText)
  if (!videoId) return null
  return videoId 
}

async function getVideoFromClipboard(showMsg) {
  if (loading) return
  loading = true
  try {
    const videoId = await getVideoIdFromClipboard()
    
    if (!videoId) {
      if (showMsg) msg.textContent = `Error: Invalid URL!`
      loading = false
      return
    } else if (videoId === currentVideoId) {
      loading = false
      return
    }

    loading = false
    getVideoByUrl(`https://www.youtube.com/watch?v=${videoId}`)
  } catch (error) {
    console.error(error)
    if (showMsg) msg.textContent = `Error: ` + error
    loading = false
  }
}

function addHistory() {
  const videoUrl = player.getVideoUrl()
  const videoId = getVideoIdFromUrl(videoUrl)
  
  const historyExist = history.some((item) => item.id === videoId)

  if (!historyExist) {
    const newHistoryItem = { title: player.getVideoData().title, url: videoUrl, id: videoId }

    history.unshift(newHistoryItem)
    if (history.length > 3) history.pop()
  } else {
    const historyItem = history.find((item) => item.id === videoId)

    history.splice(history.indexOf(historyItem), 1)
    
    history.unshift(historyItem)
  }

  localStorage.setItem(storagePrefix + "history", JSON.stringify(history))

  updateHistory()
}

function updateHistory() {
  historyList.innerHTML = ""
  if (history.length > 0) {
    document.querySelector(".history h1").style.display = "block"

    history.forEach((item) => {
      historyList.innerHTML += `
        <button onclick="getVideoByUrl('${item.url}')" class="item">${item.title}</button>
      `
    })
  }
}



function pauseVideo() {
  if (!currentVideoId || !playerIsReady) return
  
  const playing = player.getPlayerState() === YT.PlayerState.PLAYING
  playing ? player.pauseVideo() : player.playVideo()
}



homeBtn.addEventListener("click", goHome)

lockBtn.addEventListener("click", lockVideo)
function lockVideo() {
  if (!currentVideoId || !playerIsReady) return

  videoIsLocked = !videoIsLocked

  lockBtn.innerHTML = 
  videoIsLocked 
  ? `<i class="bi bi-lock-fill"></i><span class="tooltip-text">Unlock</span>` 
  : `<i class="bi bi-unlock-fill"></i><span class="tooltip-text">Lock</span>`
}

playBtn.addEventListener("click", ()=>getVideoFromClipboard(true))


volumeBtn.addEventListener("click", mute)
function mute() {
  if (!currentVideoId || !playerIsReady) return

  muted = !muted
  muted ? player.mute() : player.unMute()

  updateVolumeBtn()
  localStorage.setItem(storagePrefix + "muted", muted.toString())
}

function setVolume(volume) {
  if (!currentVideoId || !playerIsReady) return

  currentVolume = Math.min(Math.max(volume, 0), 100)

  player.setVolume(currentVolume)

  localStorage.setItem(storagePrefix + "currentVolume", currentVolume.toString())
  updateVolumeBtn()

  notice(`
    <div>
      ${volumeIcon() + " " + currentVolume}%
    </div>`)
}

function updateVolumeBtn() {
  volumeBtn.innerHTML = `
    ${volumeIcon()}
    <span class="tooltip-text">Volume ${currentVolume}% ${muted ? "(Muted)" : ""}</span>
  `
}

function setPlayBackRate(value) {
  if (!currentVideoId || !playerIsReady) return

  player.setPlaybackRate(value)

  updateRateBtn(value)
}
function updateRateBtn(rate) {
  rateBtn.innerHTML = `
    <div class="text">${rate}x</div>
    <span class="tooltip-text">Playback speed ${rate}x</span>
  `
}

replayBtn.addEventListener("click", replayVideo)
function replayVideo() {
  if (!currentVideoId || !playerIsReady) return
  
  player.seekTo(0)
  player.playVideo()
}

stopBtn.addEventListener("click", stopVideo)
function stopVideo() {
  if (!currentVideoId || !playerIsReady) return
  
  player.stopVideo()
}

resizeBtn.addEventListener("click", resizePlayer)
function resizePlayer() {

  currentWidth -= 10
  if (currentWidth < 50) currentWidth = 100
  
  localStorage.setItem(storagePrefix + "currentWidth", currentWidth)

  document.getElementById("player").style.width = `${currentWidth}%`

  updateResizeBtn()
}
function updateResizeBtn() {
  resizeBtn.innerHTML = `
    <i class="bi bi-aspect-ratio"></i>
    <span class="tooltip-text">Size ${currentWidth}%</span>
  `
}


function seek(amount) {
  if (!currentVideoId || !playerIsReady) return

  player.seekTo(player.getCurrentTime() + amount)

  const noticeContent = amount > 0 ? `
    <div>
      <i class="bi bi-caret-right-fill"></i>
      <i class="bi bi-caret-right-fill"></i>
    </div>
    ${amount} seconds
  ` : `
    <div>
      <i class="bi bi-caret-left-fill"></i>
      <i class="bi bi-caret-left-fill"></i>
    </div>
    ${Math.abs(amount)} seconds
  `

  notice(noticeContent)
}

let noticeTimeOut = null
function notice(content) {
  const noticebox = document.querySelector(".noticebox")
  clearTimeout(noticeTimeOut)
  noticebox.classList.remove("hidden")
  noticebox.innerHTML = content
  noticeTimeOut = setTimeout(() => {
    noticebox.classList.add("hidden")
  }, 1000);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.body.requestFullscreen().catch(err => {
      console.error('Error attempting to enable full-screen mode:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

function setupClipboard() {
  setTimeout(() => {
    if (document.hasFocus()) {
      navigator.clipboard.readText().then(()=>{
        clipboardAllowed = true
        playBtn.classList.remove("hidden")
        // lockBtn.classList.remove("hidden")
        quickBtn.classList.remove("hidden")
      })
    }
  }, 1000);
}


function hideToolModal(element) {
  element.classList.add("hidden")

  setTimeout(() => {
    element.classList.remove("hidden")
  }, 100);
}


document.addEventListener("keydown", function(event) {
  // Play/Pause
  if (event.key === " " || event.key === "k") pauseVideo()
  // Volume
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    let amount = 5
    if (event.key === "ArrowUp") {
      amount = currentVolume < 5 ? 1 : 5
    } else {
      amount = currentVolume <= 5 ? -1 : -5
    }
    setVolume(currentVolume + amount)
  }
  if (event.key === "m") mute()
  // Jump backward/forward
  if (event.key === "j" || event.key === "ArrowLeft") seek(-5)
  if (event.key === "l" || event.key === "ArrowRight") seek(5)
  // Fullscreen
  if (event.key === 'f') toggleFullscreen()
})

document.addEventListener("visibilitychange", function() {
  if (!clipboardAllowed) {
    setupClipboard()
    return
  }

  if (!videoIsLocked && !document.hidden && playerIsReady) {
    // Wait until tab has focus
    setTimeout(() => {
      getVideoFromClipboard(false)
    }, 1000);
  }

});

document.addEventListener("DOMContentLoaded", function() { 
  document.getElementById("player").style.width = `${currentWidth}%`
  setupClipboard()
  updateHistory()
  update()
})



window.addEventListener("error", (event) => {
  const error = `${event.type}: ${event.message}`
  console.error(error)
  alert(error)
})


// document.addEventListener("keydown", function(event) {
//   if (event.key === "d") {
//     console.log("loading: ", loading)
//     console.log("currentVideoId: ", currentVideoId)
//   }
// })
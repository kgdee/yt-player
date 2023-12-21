
const storagePrefix = 'yt-player_'

const startModal = document.querySelector(".start-modal")
const urlInput = document.querySelector(".url-input")
const msg = document.querySelector(".msg")
const homeBtn = document.querySelector(".tools .home")
const lockBtn = document.querySelector(".tools .lock")
const copyBtn = document.querySelector(".tools .copy")
const volumeBtn = document.querySelector(".tools .volume-btn")
const rateBtn = document.querySelector(".tools .rate .rate-btn")
const stopBtn = document.querySelector(".tools .stop")
const historyList = document.querySelector(".history .list")

let loading = false
let playerIsReady = false
let currentVideoId = null
let videoIsLocked = false

let history = JSON.parse(localStorage.getItem(storagePrefix + "history")) || []

const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)

const savedVolume = parseInt(localStorage.getItem(storagePrefix + "volume"))
let volume = Number.isInteger(savedVolume) ? parseInt(savedVolume) : 50


function startup() {
  window.history.pushState(null, null, window.location.pathname)

  document.title = "YT Video Player"
  msg.innerHTML = ""
  startModal.style.display = "block"
  document.querySelector(".tools-container").classList.add("hidden")
  currentVideoId = null
  
  if (playerIsReady) {
    if (videoIsLocked) lockVideo()
    player.pauseVideo()
    player.setVolume(volume)
    player.getIframe().classList.add("hidden")
  }
}

function showPlayer() {
  player.getIframe().classList.remove("hidden")
  document.title = player.getVideoData().title
  startModal.style.display = "none"
  document.querySelector(".tools-container").classList.remove("hidden")
  updateVolumeBtn(player.getVolume())
  updateRateBtn(player.getPlaybackRate())
  loading = false
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
      'cc_load_policy': 1
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
  startup()

  const videoId = urlParams.get('videoid')
  if (videoId) getVideo(`https://www.youtube.com/watch?v=${videoId}`)
  else getVideoFromClipboard(false)
}

function onPlayerStateChange(event) {
  // -1 – unstarted
  // 0 – ended
  // 1 – playing
  // 2 – paused
  // 3 – buffering
  // 5 – video cued

  switch (event.data) {
    case 1:
      addHistory()
      break;
    case 5:
      showPlayer()
      break;
  
    default:
      break;
  }
}

function onVolumeChange(event) {
  volume = player.getVolume()
  localStorage.setItem(storagePrefix + "volume", volume.toString())
  updateVolumeBtn(volume)

  document.querySelector(".tools .volume .tool-modal").classList.remove("hidden")
}
function onPlaybackRateChange(event) {
  updateRateBtn(player.getPlaybackRate())

  document.querySelector(".tools .rate .tool-modal").classList.remove("hidden")
}

function onPlayerError(event) {
  console.error('An error occurred: ', event.data);

  startModal.style.display = "block"
  urlInput.value = ""
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




function getVideo(url) {
  if (!playerIsReady || loading) return
  loading = true

  const videoId = getVideoIdFromUrl(url)
  
  if (videoId) {
    window.history.pushState(null, null, `?videoid=${videoId}`)

    player.cueVideoById(videoId)
    currentVideoId = videoId
  }
  else {  
    urlInput.value = ""
    msg.textContent = "Invalid URL!"
  }
}

function getVideoIdFromUrl(url) {
  // Extract video ID from YouTube URL
  const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/);
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

async function getVideoFromClipboard(byBtn) {
  if (loading) return
  loading = true
  try {
    const videoId = await getVideoIdFromClipboard()

    if (!byBtn && videoId === currentVideoId) {
      loading = false
      return
    }

    if (!videoId) {
      if (byBtn) msg.textContent = `Error: The content in the clipboard is not recognized as a valid YouTube video URL!`
      loading = false
      return
    }

    getVideo(`https://www.youtube.com/watch?v=${videoId}`)
  } catch (error) {
    console.error(error)
    if (byBtn) msg.textContent = `Error: ` + error
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
        <button onclick="getVideo('${item.url}')" class="item">${item.title}</button>
      `
    })
  }
}



function pauseVideo() {
  const playing = player.getPlayerState() === YT.PlayerState.PLAYING
  playing ? player.pauseVideo() : player.playVideo()
}



homeBtn.addEventListener("click", goHome)
function goHome() {
  startup()
}

lockBtn.addEventListener("click", lockVideo)
function lockVideo() {
  if (!currentVideoId || !playerIsReady) return

  videoIsLocked = !videoIsLocked

  lockBtn.innerHTML = 
  videoIsLocked 
  ? `<i class="bi bi-lock-fill"></i><span class="tooltip-text">Unlock</span>` 
  : `<i class="bi bi-unlock-fill"></i><span class="tooltip-text">Lock</span>`
}

copyBtn.addEventListener("click", copyTitle)
async function copyTitle() {
  if (!currentVideoId || !playerIsReady) return

  try {
    await navigator.clipboard.writeText(player.getVideoData().title)
  } catch (error) {
    console.error(error)
  } 
}


volumeBtn.addEventListener("click", mute)
function mute() {
  if (!currentVideoId || !playerIsReady) return

  player.isMuted() ? player.unMute() : player.mute()
}

function changeVolume(value) {
  if (!currentVideoId || !playerIsReady) return

  const volume = Math.min(Math.max(value, 0), 100)
  player.setVolume(volume)
  if (volume > 0) player.unMute()

  document.querySelector(".tools .volume .tool-modal").classList.add("hidden")

  notice(`${volume}%`)
}

function updateVolumeBtn(volume) {
  let muted = player.isMuted()
  let icon = ""

  if (volume <= 0 || muted) 
    icon = `<i class="bi bi-volume-mute-fill"></i>`
  else if (volume <= 50) 
    icon = `<i class="bi bi-volume-down-fill"></i>`
  else 
    icon = `<i class="bi bi-volume-up-fill"></i>`

  volumeBtn.innerHTML = `
    ${icon}
    <span class="tooltip-text">Volume ${volume}% ${muted ? "(Muted)" : ""}</span>
  `
}

function changePlayBackRate(value) {
  if (!currentVideoId || !playerIsReady) return

  player.setPlaybackRate(value)

  document.querySelector(".tools .rate .tool-modal").classList.add("hidden")
}
function updateRateBtn(rate) {
  rateBtn.innerHTML = `
    <div class="text">${rate}x</div>
    <span class="tooltip-text">Speed ${rate}x</span>
  `
}

stopBtn.addEventListener("click", stopVideo)
function stopVideo() {
  if (!currentVideoId || !playerIsReady) return
  
  player.stopVideo()
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
  var iframe = document.getElementById('player');
  if (!document.fullscreenElement) {
    iframe.requestFullscreen().catch(err => {
      console.error('Error attempting to enable full-screen mode:', err);
    });
  } else {
    document.exitFullscreen();
  }
}

document.addEventListener("keydown", function(event) {
  // Play/Pause
  if (event.key === " " || event.key === "k") pauseVideo()
  // Volume
  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    if (!currentVideoId || !playerIsReady) return
    let amount = 5
    const playerVol = player.getVolume()
    if (event.key === "ArrowUp") {
      amount = playerVol < 5 ? 1 : 5
    } else {
      amount = playerVol <= 5 ? -1 : -5
    }
    
    const totalVolume = Math.min(Math.max((playerVol + amount), 0), 100)
    player.setVolume(totalVolume)
    notice(`
    <div>
      <i class="bi bi-volume-down-fill"></i>
      ${totalVolume}%
    </div>`)
  }
  if (event.key === "m") mute()
  // Jump backward/forward
  if (event.key === "j" || event.key === "ArrowLeft") seek(-3)
  if (event.key === "l" || event.key === "ArrowRight") seek(3)
  // fullscreen
  if (event.key === 'f') toggleFullscreen()
})

document.addEventListener("visibilitychange", function() {
  if (!videoIsLocked && !document.hidden && playerIsReady) {
    // Wait until tab has focus
    setTimeout(() => {
      getVideoFromClipboard(false)
    }, 1000);
  }

});

document.addEventListener("DOMContentLoaded", function() {
  updateHistory()
})
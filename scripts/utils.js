window.addEventListener("error", (event) => {
  const error = `${event.type}: ${event.message}`;
  console.error(error);
  alert(error);
});

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hide(element) {
  element.classList.add("hidden");
}

function show(element) {
  element.classList.remove("hidden");
}

function blink(element) {
  element.classList.add("hidden");

  setTimeout(() => element.classList.remove("hidden"), 100);
}

function save(key, value) {
  localStorage.setItem(`${projectName}_${key}`, JSON.stringify(value));
}

function load(key, defaultValue) {
  const savedValue = localStorage.getItem(`${projectName}_${key}`);
  if (savedValue == null) return defaultValue;
  return JSON.parse(savedValue);
}

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

function getFileName(file) {
  const encoded = file.name;
  const decoded = decodeURIComponent(encoded);
  const fileName = decoded.split("/").pop();

  return fileName;
}

function getFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

function getFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
}

async function convertSrtToVtt(srtFile) {
  if (!srtFile) return "";

  let srtText = await getFileText(srtFile);

  // Convert SRT to VTT format
  let vttText =
    "WEBVTT\n\n" +
    srtText
      .replace(/\r\n|\r|\n/g, "\n") // Normalize new lines
      .replace(/(\d+)\n(\d{2}:\d{2}:\d{2}),(\d{3}) --> (\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1\n$2.$3 --> $4.$5");

  const blob = new Blob([vttText], { type: "text/vtt" });
  const dataUrl = URL.createObjectURL(blob);
  return dataUrl;
}

function changeScreen(screenName) {
  document.querySelectorAll(".screen").forEach((element) => {
    element.classList.add("hidden");
  });

  document.querySelector(`.screen.${screenName}`).classList.remove("hidden");
}

function createLinks(element) {
  const text = element.innerHTML;
  const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
  const replacedText = text.replace(urlPattern, (url) => `<a href="${url}" target="_blank">${url}</a>`);
  element.innerHTML = replacedText;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readClipboard() {
  await sleep(1000);
  if (!document.hasFocus()) return;
  if (!(navigator.clipboard && navigator.clipboard.readText)) return;

  const clipboardText = await navigator.clipboard.readText();

  return clipboardText;
}

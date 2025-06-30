const Toast = (() => {
  const element = document.querySelector(".toast");
  let currentItems = [];
  const max = 1;

  function show(message) {
    if (!message) return;
    const itemId = generateId();
    currentItems.push(itemId);
    element.innerHTML += `
      <div class="item" data-item="${itemId}">
        ${message}
      </div>
    `;
    element.classList.remove("hidden");

    if (currentItems.length > max) removeItem(currentItems[0]) 
    setTimeout(() => {
      removeItem(itemId);
    }, 3000);
  }

  function removeItem(itemId) {
    if (!currentItems.includes(itemId)) return
    const itemEl = element.querySelector(`[data-item="${itemId}"]`);
    itemEl.remove();
    currentItems = currentItems.filter((item) => item !== itemId);
    if (currentItems.length <= 0) element.classList.add("hidden");
  }

  return { show };
})();

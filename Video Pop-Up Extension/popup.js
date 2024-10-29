document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('extensionToggle');

  chrome.storage.sync.get(['videoPopupEnabled'], (result) => {
    toggle.checked = result.videoPopupEnabled || false;
  });

  toggle.addEventListener('change', (event) => {
    chrome.storage.sync.set({ videoPopupEnabled: event.target.checked });
  });
});

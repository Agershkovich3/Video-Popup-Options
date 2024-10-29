let videoQueue = [];
let isPlaying = false;
let popupPosition = 'permanent'; // Options: 'word', 'top-right', or 'permanent'
let topRightOffset = 10; // Track the Y-offset for stacking popups (not used in 'permanent' mode)
const popupLifetime = 10000; // Lifetime of each popup in milliseconds
let persistent = true; // Variable to control if videos should remain until closed

document.addEventListener('mouseup', handleTextSelection);

function handleTextSelection() {
  const selection = window.getSelection();
  
  if (selection.rangeCount > 0) {
    const selectedText = selection.toString().trim().toLowerCase();

    // Only enqueue if the selection is not empty
    if (selectedText.length > 0) {
      enqueueVideo(selectedText);
    }
  }
}

function enqueueVideo(selectedText) {
  fetch(chrome.runtime.getURL('mediaMapping.json'))
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      const videoSrc = data[selectedText];

      if (videoSrc) {
        // Handle permanent popup mode
        if (popupPosition === 'permanent') {
          playPermanentVideo(videoSrc, selectedText);
        } else {
          // Clear any existing queue and enqueue the new video
          videoQueue = [{ videoSrc, word: selectedText }];
          console.log(`Enqueued video: ${videoSrc}`);

          // Start playing the video immediately if none is currently playing
          if (!isPlaying) {
            topRightOffset = 10; // Reset the offset for a new video
            playNextVideo(0);
          }
        }
      } else {
        console.error('No video found for the selected text:', selectedText);
      }
    })
    .catch(error => console.error('Error fetching mediaMapping.json:', error));
}

function playPermanentVideo(videoSrc, word) {
  // Remove any existing permanent popup
  let existingPopup = document.querySelector('.permanent-media-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  // Create a new permanent popup
  const mediaPopup = createPermanentMediaPopup(videoSrc, word);
  document.body.appendChild(mediaPopup);
}

function createPermanentMediaPopup(videoSrc, word) {
  const mediaPopup = document.createElement('div');
  mediaPopup.className = 'permanent-media-popup';
  mediaPopup.style.position = 'absolute';
  mediaPopup.style.width = '320px';
  mediaPopup.style.height = '270px';
  mediaPopup.style.backgroundColor = 'white';
  mediaPopup.style.border = '1px solid black';
  mediaPopup.style.zIndex = 10000;
  mediaPopup.style.padding = '10px';
  mediaPopup.style.boxShadow = '0px 0px 10px rgba(0,0,0,0.5)';
  mediaPopup.style.top = '10px';
  mediaPopup.style.right = '10px';

  // Create the video element
  let videoElement = document.createElement('video');
  videoElement.src = chrome.runtime.getURL(videoSrc);
  videoElement.style.width = '100%';
  videoElement.style.height = '80%';
  videoElement.controls = true;
  videoElement.autoplay = true;

  // Create label to display the associated word
  let wordLabel = document.createElement('div');
  wordLabel.innerText = `Word: ${word}`;
  wordLabel.style.fontWeight = 'bold';
  wordLabel.style.marginBottom = '5px';

  // Create a close button
  let closeButton = document.createElement('button');
  closeButton.innerText = 'Close';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '5px';
  closeButton.style.right = '5px';
  closeButton.onclick = () => {
    mediaPopup.remove();
    videoElement.pause();
  };

  mediaPopup.appendChild(wordLabel);
  mediaPopup.appendChild(videoElement);
  mediaPopup.appendChild(closeButton);

  return mediaPopup;
}

function playNextVideo(cycleCount) {
  if (videoQueue.length === 0) {
    console.log("No more videos in the queue.");
    return;
  }

  isPlaying = true;
  const { videoSrc, word } = videoQueue.shift();
  console.log(`Now playing: ${videoSrc} for word: ${word}`);

  const mediaPopup = createMediaPopup(videoSrc, word, cycleCount);
  document.body.appendChild(mediaPopup);
  dragElement(mediaPopup);
}

function createMediaPopup(videoSrc, word, cycleCount) {
  const mediaPopup = document.createElement('div');
  mediaPopup.className = 'media-popup';
  mediaPopup.style.position = 'absolute';
  mediaPopup.style.width = '320px';
  mediaPopup.style.height = '270px';
  mediaPopup.style.backgroundColor = 'white';
  mediaPopup.style.border = '1px solid black';
  mediaPopup.style.zIndex = 10000;
  mediaPopup.style.padding = '10px';
  mediaPopup.style.boxShadow = '0px 0px 10px rgba(0,0,0,0.5)';
  mediaPopup.style.cursor = 'move';

  // Position popup based on `popupPosition`
  if (popupPosition === 'word') {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    mediaPopup.style.top = `${rect.bottom + window.scrollY + 20}px`;
    mediaPopup.style.left = `${rect.left + window.scrollX}px`;
  } else { // 'top-right' position
    mediaPopup.style.top = `${topRightOffset}px`;
    mediaPopup.style.right = '10px';
    topRightOffset += 290;
  }

  let videoElement = document.createElement('video');
  videoElement.src = chrome.runtime.getURL(videoSrc);
  videoElement.style.width = '100%';
  videoElement.style.height = '80%';
  videoElement.controls = true;
  videoElement.autoplay = true;

  let wordLabel = document.createElement('div');
  wordLabel.innerText = `Word: ${word}`;
  wordLabel.style.fontWeight = 'bold';
  wordLabel.style.marginBottom = '5px';

  videoElement.onended = () => {
    if (persistent) {
      videoElement.pause();
      isPlaying = false;
    } else {
      mediaPopup.remove();
      isPlaying = false;
      updateTopRightPopups();
    }
  };

  let closeButton = document.createElement('button');
  closeButton.innerText = 'Close';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '5px';
  closeButton.style.right = '5px';
  closeButton.onclick = () => {
    mediaPopup.remove();
    videoElement.pause();
    isPlaying = false;
    updateTopRightPopups();
  };

  mediaPopup.appendChild(wordLabel);
  mediaPopup.appendChild(videoElement);
  mediaPopup.appendChild(closeButton);

  if (!persistent) {
    setTimeout(() => {
      if (mediaPopup.parentElement) {
        mediaPopup.remove();
        videoElement.pause();
        isPlaying = false;
        updateTopRightPopups();
      }
    }, popupLifetime);
  }

  return mediaPopup;
}

function updateTopRightPopups() {
  const popups = document.querySelectorAll('.media-popup');
  popups.forEach((popup, index) => {
    popup.style.top = `${10 + (index * 290)}px`;
  });
}

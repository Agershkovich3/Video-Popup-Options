// Add the CSS style for .shift-content to shift content left
const style = document.createElement('style');
style.textContent = `
  .shift-content {
    margin-right: 320px; /* Width of the popup to shift content left */
  }
`;
document.head.appendChild(style);

// Global variables to control video queue and popup behavior
let videoQueue = [];
let isPlaying = false;
let popupPosition = 'top-right'; // Options: 'word', 'top-right', or 'permanent'
let topRightOffset = 10; // Tracks the Y-offset for stacking popups
const popupLifetime = 10000; // Lifetime of each popup in milliseconds
let persistent = true; // Controls if videos should remain until closed

// Event listener for text selection to enqueue a video based on selected word
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

// Adds a video to the queue based on the selected text
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
        // Add new video to the queue
        videoQueue.push({ videoSrc, word: selectedText });

        // Start playing the next video if not already playing
        if (!isPlaying) {
          topRightOffset = 10; // Reset stacking offset
          playNextVideo();
        }
      } else {
        console.error('No video found for the selected text:', selectedText);
      }
    })
    .catch(error => console.error('Error fetching mediaMapping.json:', error));
}

// Plays the next video in the queue and handles the popup display
function playNextVideo() {
  if (videoQueue.length === 0) {
    console.log("No more videos in the queue.");
    return;
  }

  isPlaying = true;
  const { videoSrc, word } = videoQueue.shift();
  console.log(`Now playing: ${videoSrc} for word: ${word}`);

  const mediaPopup = createMediaPopup(videoSrc, word);
  document.body.appendChild(mediaPopup);
  dragElement(mediaPopup);

  // Add shift-content class to body if position is 'top-right'
  if (popupPosition === 'top-right') {
    document.body.classList.add('shift-content');
  }
}

// Creates and displays a popup for the selected word and its video
function createMediaPopup(videoSrc, word) {
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

  // Position popup based on chosen location (e.g., by word or in the top-right corner)
  if (popupPosition === 'word') {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    mediaPopup.style.top = `${rect.bottom + window.scrollY + 20}px`;
    mediaPopup.style.left = `${rect.left + window.scrollX}px`;
  } else { // 'top-right' position
    mediaPopup.style.top = `${topRightOffset}px`;
    mediaPopup.style.right = '10px';
    topRightOffset += 290;
  }

  // Setup video element within the popup
  const videoElement = document.createElement('video');
  videoElement.src = chrome.runtime.getURL(videoSrc);
  videoElement.style.width = '100%';
  videoElement.style.height = '80%';
  videoElement.controls = true;
  videoElement.autoplay = true;

  // Display selected word label
  const wordLabel = document.createElement('div');
  wordLabel.innerText = `Word: ${word}`;
  wordLabel.style.fontWeight = 'bold';
  wordLabel.style.marginBottom = '5px';

  // Functionality for automatic closure of the popup
  videoElement.onended = () => {
    if (!persistent) {
      closePopup(mediaPopup);
    }
  };

  // Close button to allow manual closure
  const closeButton = document.createElement('button');
  closeButton.innerText = 'Close';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '5px';
  closeButton.style.right = '5px';
  closeButton.onclick = () => {
    closePopup(mediaPopup);
  };

  // Append video, label, and close button to the popup
  mediaPopup.appendChild(wordLabel);
  mediaPopup.appendChild(videoElement);
  mediaPopup.appendChild(closeButton);

  // Automatic removal of non-persistent popups after a certain duration
  if (!persistent) {
    setTimeout(() => {
      closePopup(mediaPopup);
    }, popupLifetime);
  }

  return mediaPopup;
}

// Removes a popup and updates other popups' positions accordingly
function closePopup(mediaPopup) {
  if (mediaPopup.parentElement) {
    mediaPopup.remove();
    isPlaying = false;
    updateTopRightPopups();
    document.body.classList.remove('shift-content');
    playNextVideo(); // Play the next video in the queue, if any
  }
}

// Adjusts top-right popups' positions after one is closed
function updateTopRightPopups() {
  const popups = document.querySelectorAll('.media-popup');
  topRightOffset = 10; // Reset offset before repositioning
  popups.forEach((popup, index) => {
    popup.style.top = `${topRightOffset}px`;
    topRightOffset += 290;
  });
}

// Enables drag functionality for popups
function dragElement(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  element.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

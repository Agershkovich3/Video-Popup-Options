let videoQueue = [];
let isPlaying = false;
let popupPosition = 'word'; // Options: 'word' or 'top-right'
let topRightOffset = 10; // Track the Y-offset for stacking popups
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
        // Clear any existing queue and enqueue the new video
        videoQueue = [{ videoSrc, word: selectedText }];
        console.log(`Enqueued video: ${videoSrc}`);

        // Start playing the video immediately if none is currently playing
        if (!isPlaying) {
          topRightOffset = 10; // Reset the offset for a new video
          playNextVideo(0);
        }
      } else {
        console.error('No video found for the selected text:', selectedText);
      }
    })
    .catch(error => console.error('Error fetching mediaMapping.json:', error));
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
  mediaPopup.style.height = '270px'; // Adjusted to fit word label
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
    const rect = range.getBoundingClientRect(); // Bounding box of the selected text
    mediaPopup.style.top = `${rect.bottom + window.scrollY + 20}px`; // Adjusted to be 20 pixels lower than the word
    mediaPopup.style.left = `${rect.left + window.scrollX}px`; // Align with the left side of the word
  } else { // 'top-right' position
    mediaPopup.style.top = `${topRightOffset}px`;
    mediaPopup.style.right = '10px';
    topRightOffset += 290; // Increment the Y-offset for stacking
  }

  // Create the video element
  let videoElement = document.createElement('video');
  videoElement.src = chrome.runtime.getURL(videoSrc);
  videoElement.style.width = '100%';
  videoElement.style.height = '80%'; // Adjusted height for space
  videoElement.controls = true;
  videoElement.autoplay = true;

  // Create label to display the associated word
  let wordLabel = document.createElement('div');
  wordLabel.innerText = `Word: ${word}`;
  wordLabel.style.fontWeight = 'bold';
  wordLabel.style.marginBottom = '5px';

  // Handle end of video
  videoElement.onended = () => {
    if (persistent) {
      // If persistent, do not remove the popup and simply stop the video
      videoElement.pause();
      isPlaying = false;
    } else {
      mediaPopup.remove();
      isPlaying = false;
      updateTopRightPopups(); // Update positions of remaining popups
    }
  };

  // Create a close button
  let closeButton = document.createElement('button');
  closeButton.innerText = 'Close';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '5px';
  closeButton.style.right = '5px';
  closeButton.onclick = () => {
    mediaPopup.remove();
    videoElement.pause();
    isPlaying = false;
    updateTopRightPopups(); // Update positions of remaining popups
  };

  mediaPopup.appendChild(wordLabel);
  mediaPopup.appendChild(videoElement);
  mediaPopup.appendChild(closeButton);

  // Automatically remove the popup after its lifetime if not persistent
  if (!persistent) {
    setTimeout(() => {
      if (mediaPopup.parentElement) {
        mediaPopup.remove(); // Remove the popup
        videoElement.pause(); // Stop the video if it's still playing
        isPlaying = false; // Update the playing state
        updateTopRightPopups(); // Update positions of remaining popups
      }
    }, popupLifetime);
  }

  return mediaPopup;
}

function updateTopRightPopups() {
  const popups = document.querySelectorAll('.media-popup');
  popups.forEach((popup, index) => {
    popup.style.top = `${10 + (index * 290)}px`; // Update Y-position to move up
  });
}

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

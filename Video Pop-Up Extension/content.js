const style = document.createElement('style');
style.textContent = `
  .shift-content {
    margin-right: 350px; /* Shift content to the left to make room for popups */
  }

  .popup-container {
    position: absolute;
    top: 10px;
    right: 350px; /* Adjusted right value to shift popups 350px to the left */
    z-index: 10000;
  }

  .media-popup {
    width: 320px;
    height: 270px;
    background-color: white;
    border: 1px solid black;
    padding: 10px;
    box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
    cursor: move;
    position: absolute;
  }
`;
document.head.appendChild(style);

let videoQueue = []; // Holds the video src, word, position and container
let persistent = true; // Control for persistent videos
let popupContainer = null;
let currentTopPosition = 0; // Variable to control the vertical positioning of popups

document.addEventListener('mouseup', handleTextSelection);

function handleTextSelection() {
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const selectedText = selection.toString().trim().toLowerCase();
    const range = selection.getRangeAt(0);
    const wordPosition = range.startOffset; // Position of the word
    const container = range.startContainer; // Container where word was selected

    if (selectedText.length > 0) {
      enqueueVideo(selectedText, wordPosition, container);
    }
  }
}

function enqueueVideo(selectedText, wordPosition, container) {
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
        // Ensure the word is not already in the queue before adding a new video
        if (!videoQueue.some(entry => entry.word === selectedText)) {
          // Create new video object with position
          const videoData = { videoSrc, word: selectedText, position: wordPosition, container };

          // Directly push the videoData to the queue in the order of appearance
          videoQueue.push(videoData);

          // Initialize popup container if it's not already initialized
          if (!popupContainer) {
            popupContainer = document.createElement('div');
            popupContainer.classList.add('popup-container');
            document.body.appendChild(popupContainer);
          }

          // Play the next video (if there is one)
          playNextVideo();
        }
      } else {
        console.error('No video found for the selected text:', selectedText);
      }
    })
    .catch(error => console.error('Error fetching mediaMapping.json:', error));
}

function playNextVideo() {
  if (videoQueue.length === 0) {
    console.log("No more videos in the queue.");
    return;
  }

  const { videoSrc, word } = videoQueue.shift();
  console.log(`Now playing: ${videoSrc} for word: ${word}`);

  // Create and display a popup for the selected word and its video
  const mediaPopup = createMediaPopup(videoSrc, word);
  popupContainer.appendChild(mediaPopup);

  // Add shift-content class to body if there is a video in the top-right corner
  document.body.classList.add('shift-content');
}

function createMediaPopup(videoSrc, word) {
  const mediaPopup = document.createElement('div');
  mediaPopup.classList.add('media-popup');

  // Set the top position for the popup so that each popup is 300px below the previous one
  mediaPopup.style.top = `${currentTopPosition}px`;
  currentTopPosition += 300; // Increased spacing between popups to 300px

  // Setup video element within the popup
  const videoElement = document.createElement('video');
  videoElement.src = chrome.runtime.getURL(videoSrc);
  videoElement.style.width = '100%';
  videoElement.style.height = '80%';
  videoElement.controls = true;
  videoElement.autoplay = true;

  let playCount = 0; // Track the number of times the video has played

  // Video playback ended handling
  videoElement.onended = () => {
    playCount++;
    if (!persistent && playCount < 2) {
      videoElement.currentTime = 0;
      videoElement.play();
    } else if (!persistent) {
      closePopup(mediaPopup);
    }
  };

  // Display selected word label
  const wordLabel = document.createElement('div');
  wordLabel.innerText = `Word: ${word}`;
  wordLabel.style.fontWeight = 'bold';
  wordLabel.style.marginBottom = '5px';

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

  return mediaPopup;
}

function closePopup(mediaPopup) {
  if (mediaPopup.parentElement) {
    mediaPopup.remove();

    if (popupContainer.childElementCount === 0) {
      document.body.classList.remove('shift-content');
    }

    playNextVideo();
  }

  // Update the positions of remaining popups after a popup is closed
  updatePopupsPosition();
}

function updatePopupsPosition() {
  const popups = document.querySelectorAll('.media-popup');
  currentTopPosition = 0; // Reset the top position counter

  popups.forEach((popup) => {
    popup.style.top = `${currentTopPosition}px`;
    currentTopPosition += 300; // Ensure 300px spacing between popups
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'textHighlighted') {
    // This pretty much allows us to check if there is a video already
    // on the users page. If there is, we know we don't need to create more

    //For Hassan: This fixed the issue that the previous iteration of the
    //extension had. NO MORE DUPLICATES!!! YAY.
    
    //Only create a new window if one doesn't already exist
    chrome.windows.getAll({populate: true}, (windows) => {
      let popupExists = windows.some(window => window.type === 'popup' && window.tabs.some(tab => tab.url.includes('popup.html')));
      if (!popupExists) {
        chrome.windows.create({
          url: chrome.runtime.getURL('popup.html'),
          type: 'popup',
          width: 320,
          height: 240
        });
      }
    });
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'startDrawing') {
      chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          files: ['drawingtool.js']
      });
  } else if (request.action === 'fetchHeadlines') {
      fetchHeadlines(sendResponse);
      return true; // Indicates that the response will be sent asynchronously
  }
});

function fetchHeadlines(sendResponse) {
  fetch('https://api.mediastack.com/v1/news?access_key=e20e3ffc76578182dbda0c8ee47d11ad&categories=business&limit=5')
      .then(response => response.json())
      .then(data => {
          const headlines = data.data.map(item => item.title);
          sendResponse({headlines: headlines});
      })
      .catch(error => {
          console.error('Error fetching headlines:', error);
          sendResponse({error: 'Failed to fetch headlines'});
      });
}
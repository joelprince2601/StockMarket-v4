document.addEventListener('DOMContentLoaded', function() {
    // Add sophisticated styling
    document.body.style.backgroundColor = '#0a0f0d';
    document.body.style.color = '#00ff41';
    document.body.style.fontFamily = 'Courier New, monospace';

    const title = document.querySelector('h1');
    if (title) {
        title.style.borderBottom = '1px solid #00ff41';
        title.style.paddingBottom = '10px';
        title.style.textShadow = '0 0 5px rgba(0, 255, 65, 0.5)';
    }

    const startButton = document.getElementById('startTool');
    if (startButton) {
        startButton.style.backgroundColor = 'rgba(0, 255, 65, 0.1)';
        startButton.style.color = '#00ff41';
        startButton.style.border = '1px solid #00ff41';
        startButton.style.padding = '10px 20px';
        startButton.style.cursor = 'pointer';
        startButton.style.transition = 'all 0.3s ease';
        startButton.style.fontFamily = 'Courier New, monospace';
        startButton.style.textTransform = 'uppercase';
        startButton.style.letterSpacing = '1px';

        startButton.addEventListener('mouseover', () => {
            startButton.style.backgroundColor = 'rgba(0, 255, 65, 0.2)';
            startButton.style.boxShadow = '0 0 10px rgba(0, 255, 65, 0.3)';
        });

        startButton.addEventListener('mouseout', () => {
            startButton.style.backgroundColor = 'rgba(0, 255, 65, 0.1)';
            startButton.style.boxShadow = 'none';
        });
    }

    // Add typing animation for the title
    const typeWriter = (element, text, speed = 50) => {
        let i = 0;
        element.innerHTML = '';
        const timer = setInterval(() => {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
    };

    if (title) {
        typeWriter(title, 'MARKET INTELLIGENCE SUITE');
    }

    // Original event listener functionality
    document.getElementById('startTool').addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['html2canvas.min.js', 'drawingTool.js']
            });
        });
    });
});

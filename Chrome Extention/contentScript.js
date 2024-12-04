// contentScript.js

let drawing = false;
let startX, startY;
let box = null;

function onMouseDown(e) {
  if (drawing) return;
  drawing = true;
  startX = e.clientX + window.scrollX;
  startY = e.clientY + window.scrollY;

  box = document.createElement('div');
  box.style.position = 'absolute';
  box.style.border = '2px dashed #00ff41';
  box.style.boxShadow = '0 0 10px rgba(0, 255, 65, 0.5)';
  box.style.left = `${startX}px`;
  box.style.top = `${startY}px`;
  box.style.backgroundColor = 'rgba(0, 20, 0, 0.1)';
  document.body.appendChild(box);
}

function onMouseMove(e) {
  if (!drawing) return;
  const currentX = e.clientX + window.scrollX;
  const currentY = e.clientY + window.scrollY;

  const width = currentX - startX;
  const height = currentY - startY;

  box.style.width = `${Math.abs(width)}px`;
  box.style.height = `${Math.abs(height)}px`;

  box.style.left = `${width < 0 ? currentX : startX}px`;
  box.style.top = `${height < 0 ? currentY : startY}px`;
}

function onMouseUp(e) {
  if (!drawing) return;
  drawing = false;

  // Capture the screenshot and copy to clipboard
  captureAndCopy();
}

function captureAndCopy() {
  const boxRect = box.getBoundingClientRect();
  
  // Add capture effect
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.left = `${boxRect.left}px`;
  overlay.style.top = `${boxRect.top}px`;
  overlay.style.width = `${boxRect.width}px`;
  overlay.style.height = `${boxRect.height}px`;
  overlay.style.border = '2px solid #00ff41';
  overlay.style.animation = 'scanEffect 1s linear';
  overlay.style.zIndex = '10000';
  document.body.appendChild(overlay);

  // Add scanning animation style
  const style = document.createElement('style');
  style.textContent = `
      @keyframes scanEffect {
          0% { border-top: 2px solid #00ff41; }
          100% { border-top: 2px solid #00ff41; transform: translateY(${boxRect.height}px); }
      }
  `;
  document.head.appendChild(style);

  // Continue with the capture after animation
  setTimeout(() => {
      document.body.removeChild(overlay);
      document.head.removeChild(style);
      performCapture(boxRect);
  }, 1000);
}

function performCapture(boxRect) {
  html2canvas(document.body, {
      x: boxRect.left + window.scrollX,
      y: boxRect.top + window.scrollY,
      width: boxRect.width,
      height: boxRect.height
  }).then(canvas => {
      canvas.toBlob(blob => {
          const item = new ClipboardItem({ 'image/png': blob });
          navigator.clipboard.write([item]).then(() => {
              showCaptureConfirmation();
              document.body.removeChild(box);
          });
      }, 'image/png');
  });
}

function showCaptureConfirmation() {
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.padding = '15px 20px';
  notification.style.backgroundColor = 'rgba(0, 20, 0, 0.9)';
  notification.style.color = '#00ff41';
  notification.style.fontFamily = 'Courier New, monospace';
  notification.style.border = '1px solid #00ff41';
  notification.style.boxShadow = '0 0 10px rgba(0, 255, 65, 0.3)';
  notification.style.zIndex = '10000';
  notification.style.borderRadius = '5px';
  notification.innerHTML = '>> Analysis Captured <<';
  
  document.body.appendChild(notification);
  setTimeout(() => document.body.removeChild(notification), 3000);
}

function grayscaleImage(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = avg;     // Red
    data[i + 1] = avg; // Green
    data[i + 2] = avg; // Blue
  }

  ctx.putImageData(imageData, 0, 0);
}

function enableDrawing() {
  document.body.style.cursor = 'crosshair';
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

enableDrawing();

// Global variables
let drawing = false;
let startX, startY;
let box = null;
const apiKey = 'e20e3ffc76578182dbda0c8ee47d11ad';
const alphaVantageApiKey = '6H8T62K80FUAWG96';
const googleCloudApiKey = 'YOUR_GOOGLE_CLOUD_API_KEY';

// Drawing functions
function onMouseDown(e) {
    if (drawing) return;
    drawing = true;
    startX = e.clientX + window.scrollX;
    startY = e.clientY + window.scrollY;

    box = document.createElement('div');
    box.style.position = 'absolute';
    box.style.border = '2px dashed red';
    box.style.left = `${startX}px`;
    box.style.top = `${startY}px`;
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
    
    // Only capture if we've actually drawn a box
    if (box && box.offsetWidth > 10 && box.offsetHeight > 10) {
        captureAndCopy();
    } else {
        // Remove the box if it's too small
        if (box) {
            document.body.removeChild(box);
        }
    }
}

function captureAndCopy() {
    const boxRect = box.getBoundingClientRect();

    html2canvas(document.body, {
        x: boxRect.left + window.scrollX,
        y: boxRect.top + window.scrollY,
        width: boxRect.width,
        height: boxRect.height
    }).then(canvas => {
        canvas.toBlob(blob => {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(() => {
                console.log('Screenshot copied to clipboard!');
                document.body.removeChild(box);
                // Only perform technical analysis after successful capture
                retraceLines(canvas);
                compareWithCharts(canvas);
            }).catch(err => {
                console.error('Error copying to clipboard:', err);
            });
        }, 'image/png');
    });
}

// Chart comparison functions
async function compareWithCharts(capturedCanvas) {
    const capturedImageData = capturedCanvas.toDataURL().split(',')[1];
    const chartsFolder = chrome.runtime.getURL('charts');
    const charts = ['chart1.png', 'chart2.png', 'chart3.png'];

    let bestMatch = null;
    let maxSimilarity = -1;

    for (const chart of charts) {
        const chartImage = await loadImage(`${chartsFolder}/${chart}`);
        const similarity = await compareImagesWithVisionAPI(capturedImageData, chartImage);

        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            bestMatch = chart;
        }
    }

    if (bestMatch && maxSimilarity >= 0) {
        showPopup(`Best match: ${bestMatch}, Similarity: ${(maxSimilarity * 100).toFixed(2)}%`);
    } else {
        showPopup('No match found with any chart');
    }
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL().split(',')[1]);
        };
        img.onerror = reject;
        img.src = src;
    });
}

// Stock recommendation functions
async function displayHeadlinesAndRecommendations(headlines) {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.left = '10px';
    container.style.padding = '10px';
    container.style.backgroundColor = 'white';
    container.style.border = '1px solid black';
    container.style.zIndex = '10000';
    container.style.display = 'flex';
    container.style.maxWidth = '600px';
    container.style.maxHeight = '80vh';
    container.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    container.style.borderRadius = '8px';

    const headlinesDiv = document.createElement('div');
    headlinesDiv.style.flex = '1';
    headlinesDiv.style.marginRight = '10px';
    headlinesDiv.style.overflowY = 'auto';
    headlinesDiv.style.padding = '10px';

    const recommendationsDiv = document.createElement('div');
    recommendationsDiv.style.flex = '1';
    recommendationsDiv.style.overflowY = 'auto';
    recommendationsDiv.style.padding = '10px';
    recommendationsDiv.style.borderLeft = '1px solid #eee';

    container.appendChild(headlinesDiv);
    container.appendChild(recommendationsDiv);

    // Headlines section
    const headlinesTitle = document.createElement('h3');
    headlinesTitle.innerText = 'Top 5 Stock Market Headlines';
    headlinesTitle.style.marginBottom = '15px';
    headlinesTitle.style.color = '#2c3e50';
    headlinesDiv.appendChild(headlinesTitle);

    headlines.forEach(headline => {
        const headlineElement = document.createElement('p');
        headlineElement.innerText = headline;
        headlineElement.style.marginBottom = '10px';
        headlineElement.style.lineHeight = '1.4';
        headlinesDiv.appendChild(headlineElement);
    });

    // Recommendations section
    const recommendationsTitle = document.createElement('h3');
    recommendationsTitle.innerText = 'Stock Recommendations';
    recommendationsTitle.style.marginBottom = '15px';
    recommendationsTitle.style.color = '#2c3e50';
    recommendationsDiv.appendChild(recommendationsTitle);

    document.body.appendChild(container);

    // Close button
    const closeButton = document.createElement('button');
    closeButton.innerText = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.right = '10px';
    closeButton.style.top = '10px';
    closeButton.style.border = 'none';
    closeButton.style.background = 'none';
    closeButton.style.fontSize = '20px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => document.body.removeChild(container);
    container.appendChild(closeButton);

    // Fetch and display recommendations
    const recommendations = await getStockRecommendations(headlines);
    const validRecommendations = recommendations.filter(rec => rec.recommendation !== "Unable to analyze");

    if (validRecommendations.length > 0) {
        validRecommendations.forEach(rec => {
            const recElement = document.createElement('div');
            recElement.style.marginBottom = '15px';
            recElement.style.padding = '10px';
            recElement.style.borderRadius = '4px';
            recElement.style.backgroundColor = '#f8f9fa';

            const recommendationColor = {
                'Strong Buy': '#28a745',
                'Buy': '#17a2b8',
                'Hold': '#ffc107',
                'Sell': '#dc3545'
            };

            recElement.innerHTML = `
                <div style="font-weight: bold; color: #2c3e50; margin-bottom: 5px;">${rec.symbol}</div>
                <div style="color: ${recommendationColor[rec.recommendation] || '#6c757d'}">
                    ${rec.recommendation}
                </div>
            `;
            recommendationsDiv.appendChild(recElement);
        });
    } else {
        const noDataElement = document.createElement('p');
        noDataElement.innerText = 'No stock recommendations available at this time.';
        noDataElement.style.color = '#6c757d';
        noDataElement.style.fontStyle = 'italic';
        recommendationsDiv.appendChild(noDataElement);
    }
}

async function getStockRecommendations(headlines) {
    const stockSymbols = [
        'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'HINDUNILVR', 'KOTAKBANK',
        'SBIN', 'BHARTIARTL', 'HCLTECH', 'ITC', 'BAJFINANCE', 'ASIANPAINT', 'LT', 'AXISBANK',
        'ULTRACEMCO', 'WIPRO', 'MARUTI', 'DMART', 'ADANIGREEN'
    ];
    const recommendations = [];

    for (const symbol of stockSymbols) {
        try {
            const sentiment = await fetchStockSentiment(symbol);
            if (sentiment && sentiment.feed && sentiment.feed.length > 0) {
                const recommendation = analyzeStockSentiment(sentiment, headlines);
                if (recommendation !== "Unable to analyze") {
                    recommendations.push({ symbol, recommendation });
                }
            }
        } catch (error) {
            console.error(`Error fetching sentiment for ${symbol}:`, error);
            continue;
        }
    }

    return recommendations;
}

async function fetchStockSentiment(symbol) {
    try {
        const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${alphaVantageApiKey}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Check for API limit message
        if (data.Note || data["Error Message"]) {
            console.warn(`API limit reached or error for ${symbol}`);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error(`Error fetching sentiment data for ${symbol}:`, error);
        return null;
    }
}

function analyzeStockSentiment(sentimentData, headlines) {
    if (!sentimentData || !sentimentData.feed || sentimentData.feed.length === 0) {
        return "Unable to analyze";
    }

    let sentimentScore = 0;
    let relevantArticles = 0;
    let relevanceScore = 0;

    sentimentData.feed.forEach(article => {
        if (article.overall_sentiment_score) {
            const sentiment = parseFloat(article.overall_sentiment_score);
            const relevance = parseFloat(article.relevance_score) || 1;
            
            sentimentScore += sentiment * relevance;
            relevanceScore += relevance;
            relevantArticles++;
        }
    });

    if (relevantArticles === 0) {
        return "Unable to analyze";
    }

    const averageSentiment = sentimentScore / relevanceScore;

    // Check for company mentions in headlines
    const companyName = sentimentData.feed[0]?.ticker_sentiment[0]?.ticker;
    const negativeHeadline = headlines.some(headline => 
        headline.toLowerCase().includes(companyName.toLowerCase()) && 
        (headline.toLowerCase().includes('fall') || 
         headline.toLowerCase().includes('drop') || 
         headline.toLowerCase().includes('decline') ||
         headline.toLowerCase().includes('crash') ||
         headline.toLowerCase().includes('plunge'))
    );

    // Enhanced recommendation logic
    if (averageSentiment > 0.3 && !negativeHeadline) {
        return "Strong Buy";
    } else if (averageSentiment > 0.1 && !negativeHeadline) {
        return "Buy";
    } else if (averageSentiment < -0.2 || negativeHeadline) {
        return "Sell";
    } else if (averageSentiment >= -0.2 && averageSentiment <= 0.1) {
        return "Hold";
    } else {
        return "Unable to analyze";
    }
}


// Utility functions
function showPopup(message) {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.bottom = '10px';
    popup.style.left = '10px';
    popup.style.padding = '10px';
    popup.style.backgroundColor = 'white';
    popup.style.border = '1px solid black';
    popup.style.zIndex = '10000';
    popup.style.borderRadius = '4px';
    popup.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    popup.innerText = message;
    document.body.appendChild(popup);

    setTimeout(() => {
        document.body.removeChild(popup);
    }, 5000);
}

function retraceLines(canvas) {
    const retraceCanvas = document.createElement('canvas');
    retraceCanvas.width = canvas.width;
    retraceCanvas.height = canvas.height;
    const retraceCtx = retraceCanvas.getContext('2d');

    // Copy original image to retracing canvas
    retraceCtx.drawImage(canvas, 0, 0);

    // Get image data for processing
    const imageData = retraceCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Enhanced edge detection using Sobel operator
    const edges = detectEdges(imageData);
    
    // Detect potential support and resistance levels
    const horizontalLines = detectHorizontalLines(edges, canvas.width, canvas.height);
    
    // Detect trend lines
    const trendLines = detectTrendLines(edges, canvas.width, canvas.height);
    
    // Detect common patterns
    const patterns = detectPatterns(edges, canvas.width, canvas.height);

    // Draw the detected features
    drawDetectedFeatures(retraceCtx, horizontalLines, trendLines, patterns);

    // Show retraced lines in a styled popup
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.padding = '20px';
    popup.style.backgroundColor = 'white';
    popup.style.border = '1px solid #ddd';
    popup.style.borderRadius = '8px';
    popup.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
    popup.style.zIndex = '10000';

    // Add title
    const title = document.createElement('h3');
    title.textContent = 'Technical Analysis';
    title.style.marginBottom = '10px';
    popup.appendChild(title);

    // Add the analyzed image
    const img = new Image();
    img.src = retraceCanvas.toDataURL();
    img.style.maxWidth = '800px';
    img.style.maxHeight = '600px';
    popup.appendChild(img);

    // Add pattern descriptions if found
    if (patterns.length > 0) {
        const patternList = document.createElement('div');
        patternList.style.marginTop = '10px';
        patternList.innerHTML = '<strong>Detected Patterns:</strong><br>' +
            patterns.map(p => `- ${p.name}: ${p.description}`).join('<br>');
        popup.appendChild(patternList);
    }

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.right = '10px';
    closeButton.style.top = '10px';
    closeButton.style.border = 'none';
    closeButton.style.background = 'none';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => document.body.removeChild(popup);
    popup.appendChild(closeButton);

    document.body.appendChild(popup);
}

function detectEdges(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const edges = new Uint8ClampedArray(width * height);

    // Sobel operators
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let pixelX = 0;
            let pixelY = 0;

            // Apply Sobel operators
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const idx = ((y + i) * width + (x + j)) * 4;
                    const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    pixelX += gray * sobelX[(i + 1) * 3 + (j + 1)];
                    pixelY += gray * sobelY[(i + 1) * 3 + (j + 1)];
                }
            }

            const magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
            edges[y * width + x] = magnitude > 128 ? 255 : 0;
        }
    }

    return edges;
}

function detectHorizontalLines(edges, width, height) {
    const lines = [];
    const threshold = width * 0.3; // Minimum length for horizontal lines

    for (let y = 0; y < height; y++) {
        let count = 0;
        let start = -1;

        for (let x = 0; x < width; x++) {
            if (edges[y * width + x] > 0) {
                if (start === -1) start = x;
                count++;
            } else if (start !== -1) {
                if (count > threshold) {
                    lines.push({
                        y: y,
                        start: start,
                        end: x - 1,
                        strength: count
                    });
                }
                count = 0;
                start = -1;
            }
        }
    }

    return lines;
}

function detectTrendLines(edges, width, height) {
    const lines = [];
    const points = [];

    // Collect edge points
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (edges[y * width + x] > 0) {
                points.push({ x, y });
            }
        }
    }

    // Use RANSAC algorithm to detect trend lines
    if (points.length > 2) {
        for (let i = 0; i < 10; i++) { // Try 10 iterations
            const line = ransacLine(points);
            if (line) lines.push(line);
        }
    }

    return lines;
}

function detectPatterns(edges, width, height) {
    const patterns = [];
    
    // Define common patterns and their detection criteria
    const patternDefinitions = [
        {
            name: 'Double Top',
            detect: (data) => detectDoubleTop(data),
            description: 'Bearish reversal pattern'
        },
        {
            name: 'Double Bottom',
            detect: (data) => detectDoubleBottom(data),
            description: 'Bullish reversal pattern'
        },
        {
            name: 'Head and Shoulders',
            detect: (data) => detectHeadAndShoulders(data),
            description: 'Bearish reversal pattern'
        }
        // Add more patterns as needed
    ];

    // Process the edge data to detect patterns
    patternDefinitions.forEach(pattern => {
        if (pattern.detect(edges)) {
            patterns.push({
                name: pattern.name,
                description: pattern.description
            });
        }
    });

    return patterns;
}

function drawDetectedFeatures(ctx, horizontalLines, trendLines, patterns) {
    // Set styles for different features
    const styles = {
        support: { color: 'rgba(0, 255, 0, 0.5)', width: 2 },
        resistance: { color: 'rgba(255, 0, 0, 0.5)', width: 2 },
        trend: { color: 'rgba(0, 0, 255, 0.5)', width: 2 },
        pattern: { color: 'rgba(255, 165, 0, 0.8)', width: 3 }
    };

    // Draw horizontal lines (support/resistance)
    ctx.lineWidth = styles.support.width;
    horizontalLines.forEach(line => {
        ctx.strokeStyle = line.strength > 100 ? styles.resistance.color : styles.support.color;
        ctx.beginPath();
        ctx.moveTo(line.start, line.y);
        ctx.lineTo(line.end, line.y);
        ctx.stroke();
    });

    // Draw trend lines
    ctx.strokeStyle = styles.trend.color;
    ctx.lineWidth = styles.trend.width;
    trendLines.forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.stroke();
    });

    // Enhanced pattern visualization
    patterns.forEach(pattern => {
        drawPatternIndicator(ctx, pattern);
    });
}

function drawPatternIndicator(ctx, pattern) {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 165, 0, 0.8)';
    ctx.lineWidth=2;
    ctx.setLineDash([5, 3]);

    switch (pattern.name) {
        case 'Double Top':
            // Draw double top pattern
            if (pattern.points) {
                const { peak1, peak2 } = pattern.points;
                ctx.beginPath();
                ctx.moveTo(peak1.x, peak1.y);
                ctx.quadraticCurveTo(
                    (peak1.x + peak2.x) / 2, 
                    Math.min(peak1.y, peak2.y) - 20,
                    peak2.x, 
                    peak2.y
                );
                ctx.stroke();
            }
            // Add label
            break;

        case 'Double Bottom':
            if (pattern.points) {
                const { trough1, trough2 } = pattern.points;
                ctx.beginPath();
                ctx.moveTo(trough1.x, trough1.y);
                ctx.quadraticCurveTo(
                    (trough1.x + trough2.x) / 2, 
                    Math.max(trough1.y, trough2.y) + 20,
                    trough2.x, 
                    trough2.y
                );
                ctx.stroke();
            }
            break;

        case 'Head and Shoulders':
            // Draw head and shoulders pattern
            if (pattern.points) {
                const { leftShoulder, head, rightShoulder } = pattern.points;
                ctx.beginPath();
                ctx.moveTo(leftShoulder.x, leftShoulder.y);
                ctx.quadraticCurveTo(
                    (leftShoulder.x + head.x) / 2,
                    Math.min(leftShoulder.y, head.y) - 10,
                    head.x,
                    head.y
                );
                ctx.quadraticCurveTo(
                    (head.x + rightShoulder.x) / 2,
                    Math.min(head.y, rightShoulder.y) - 10,
                    rightShoulder.x,
                    rightShoulder.y
                );
                ctx.stroke();
            }

            // Add label
            break;
    }

    ctx.restore();
}

function drawPatternLabel(ctx, text, x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw text outline
    ctx.strokeText(text, x, y);
    // Draw text fill
    ctx.fillText(text, x, y);
    ctx.restore();
}

// Update pattern detection functions to include pattern points
function detectDoubleTop(data) {
    // Enhanced implementation
    const peaks = findPeaks(data);
    if (peaks.length >= 2) {
        const [peak1, peak2] = peaks.slice(-2);
        if (Math.abs(peak1.y - peak2.y) < 10) { // Similar height threshold
            return {
                detected: true,
                points: {
                    maxY: Math.min(peak1.y, peak2.y),
                    peak1: peak1,
                    peak2: peak2
                }
            };
        }
    }
    return { detected: false };
}

function detectDoubleBottom(data) {
    // Enhanced implementation
    const troughs = findTroughs(data);
    if (troughs.length >= 2) {
        const [trough1, trough2] = troughs.slice(-2);
        if (Math.abs(trough1.y - trough2.y) < 10) { // Similar height threshold
            return {
                detected: true,
                points: {
                    minY: Math.max(trough1.y, trough2.y),
                    trough1: trough1,
                    trough2: trough2
                }
            };
        }
    }
    return { detected: false };
}

// Helper functions for peak/trough detection
function findPeaks(data) {
    // Implementation for finding local maxima
    const peaks = [];
    const windowSize = 10;
    
    for (let i = windowSize; i < data.length - windowSize; i++) {
        const window = data.slice(i - windowSize, i + windowSize);
        if (data[i] === Math.max(...window)) {
            peaks.push({ x: i, y: data[i] });
        }
    }
    return peaks;
}

function findTroughs(data) {
    // Implementation for finding local minima
    const troughs = [];
    const windowSize = 10;
    
    for (let i = windowSize; i < data.length - windowSize; i++) {
        const window = data.slice(i - windowSize, i + windowSize);
        if (data[i] === Math.min(...window)) {
            troughs.push({ x: i, y: data[i] });
        }
    }
    return troughs;
}

function detectHeadAndShoulders(data) {
    // Implementation for head and shoulders pattern detection
    return false; // Placeholder
}

function ransacLine(points) {
    // Basic RANSAC implementation for line detection
    if (points.length < 2) return null;

    const iterations = 100;
    const threshold = 5;
    let bestLine = null;
    let maxInliers = 0;

    for (let i = 0; i < iterations; i++) {
        // Randomly select two points
        const idx1 = Math.floor(Math.random() * points.length);
        const idx2 = Math.floor(Math.random() * points.length);
        if (idx1 === idx2) continue;

        const p1 = points[idx1];
        const p2 = points[idx2];

        // Calculate line parameters
        const slope = (p2.y - p1.y) / (p2.x - p1.x);
        const intercept = p1.y - slope * p1.x;

        // Count inliers
        let inliers = 0;
        points.forEach(point => {
            const distance = Math.abs(point.y - (slope * point.x + intercept));
            if (distance < threshold) inliers++;
        });

        if (inliers > maxInliers) {
            maxInliers = inliers;
            bestLine = { start: p1, end: p2, slope, intercept };
        }
    }

    return bestLine;
}

// Initialize everything
function enableDrawing() {
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function fetchHeadlines() {
    chrome.runtime.sendMessage({ action: 'fetchHeadlines' }, response => {
        if (response && response.headlines) {
            displayHeadlinesAndRecommendations(response.headlines);
        } else {
            console.error('Failed to fetch headlines');
            showPopup('Failed to fetch headlines. Please try again later.');
        }
    });
}

// Image comparison function using Vision API
async function compareImagesWithVisionAPI(image1Data, image2Data) {
    const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${googleCloudApiKey}`;

    const requestBody = {
        requests: [
            {
                image: { content: image1Data },
                features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
            },
            {
                image: { content: image2Data },
                features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
            }
        ]
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Vision API error: ${data.error?.message || 'Unknown error'}`);
        }

        // Compare the text detected in both images
        const text1 = data.responses[0].fullTextAnnotation?.text || '';
        const text2 = data.responses[1].fullTextAnnotation?.text || '';

        // Calculate similarity using Levenshtein distance
        const similarity = 1 - (levenshteinDistance(text1, text2) / Math.max(text1.length, text2.length));

        return similarity;
    } catch (error) {
        console.error('Error comparing images:', error);
        return 0;
    }
}

// Levenshtein distance calculation
function levenshteinDistance(s1, s2) {
    const m = s1.length;
    const n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) {
        dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
        dp[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j - 1], // substitution
                    dp[i - 1][j],     // deletion
                    dp[i][j - 1]      // insertion
                ) + 1;
            }
        }
    }

    return dp[m][n];
}

// Error handling wrapper
function errorHandler(error, context) {
    console.error(`Error in ${context}:`, error);
    showPopup(`An error occurred in ${context}. Please try again.`);
}

// Rate limiting functionality
const rateLimiter = {
    requests: {},
    limit: 5,
    interval: 60000, // 1 minute

    canMakeRequest(endpoint) {
        const now = Date.now();
        const requests = this.requests[endpoint] || [];
        
        // Clean up old requests
        this.requests[endpoint] = requests.filter(time => now - time < this.interval);
        
        if (this.requests[endpoint].length < this.limit) {
            this.requests[endpoint].push(now);
            return true;
        }
        return false;
    }
};

// Enhanced API request function with rate limiting
async function makeAPIRequest(endpoint, options) {
    if (!rateLimiter.canMakeRequest(endpoint)) {
        throw new Error('Rate limit exceeded. Please try again later.');
    }

    try {
        const response = await fetch(endpoint, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        errorHandler(error, `API request to ${endpoint}`);
        throw error;
    }
}

// Event listeners for cleanup
window.addEventListener('beforeunload', () => {
    // Clean up any remaining elements
    if (box) {
        document.body.removeChild(box);
    }
});

// Initialize the application
function initializeApp() {
    try {
        enableDrawing();
        fetchHeadlines();
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Cancel current drawing
                if (drawing && box) {
                    document.body.removeChild(box);
                    drawing = false;
                }
            }
        });

        console.log('Drawing tool initialized successfully');
    } catch (error) {
        errorHandler(error, 'initialization');
    }
}

// Start the application
initializeApp();

// Export necessary functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        enableDrawing,
        fetchHeadlines,
        analyzeStockSentiment,
        compareImagesWithVisionAPI,
        levenshteinDistance,
        rateLimiter
    };
}

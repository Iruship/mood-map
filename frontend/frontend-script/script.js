const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const result = document.getElementById('result');
const previewCanvas = document.getElementById('previewCanvas');
const previewContext = previewCanvas.getContext('2d');
const captureHistory = document.getElementById('captureHistory');


const MAX_HISTORY = 100;
let captureHistoryData = [];
let isProcessing = false;  
let lastProcessedTime = 0;
const PROCESS_INTERVAL = 100;  
let lastDetectedFaces = [];    


async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 30 }
            } 
        });
        video.srcObject = stream;
        video.addEventListener('loadeddata', () => {
            
            requestAnimationFrame(updatePreview);
            processVideoFrame();
        });
    } catch (err) {
        console.error('Error accessing camera:', err);
        result.textContent = 'Error accessing camera. Please make sure you have granted camera permissions.';
    }
}


function updatePreview() {
    
    previewCanvas.width = video.videoWidth;
    previewCanvas.height = video.videoHeight;
    previewContext.drawImage(video, 0, 0);
    
    
    if (lastDetectedFaces.length > 0) {
        drawFaceOverlays(previewContext, lastDetectedFaces);
    }
    
    
    requestAnimationFrame(updatePreview);
}


async function processVideoFrame() {
    const currentTime = Date.now();
    
    
    if (!isProcessing && currentTime - lastProcessedTime >= PROCESS_INTERVAL) {
        isProcessing = true;
        lastProcessedTime = currentTime;

        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('image', blob, 'capture.jpg');

            try {
                const response = await fetch('http://127.0.0.1:5000/detect-emotion', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Accept': 'application/json',
                    },
                    mode: 'cors'
                });
                
                const data = await response.json();
                
                if (data.success && data.faces.length > 0) {
                    
                    lastDetectedFaces = data.faces;
                    
                    
                    const faceResults = data.faces.map(face => 
                        `${face.emotion} (${(face.confidence * 100).toFixed(1)}%)`
                    ).join(', ');
                    result.textContent = `Detected ${data.faces.length} face(s): ${faceResults}`;
                    
                    
                    if (shouldSaveToHistory(data.faces)) {
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        addToHistory(imageData, data.faces, Date.now());
                    }
                }
            } catch (err) {
                console.error('Error processing frame:', err);
            } finally {
                isProcessing = false;
            }
        }, 'image/jpeg', 0.8); 
    }
    
    
    requestAnimationFrame(processVideoFrame);
}


function drawFaceOverlays(context, faces) {
    faces.forEach(face => {
        const { x, y, width: faceWidth, height: faceHeight } = face.face_location;
        
        
        context.strokeStyle = '#00ff00';
        context.lineWidth = 2;
        context.strokeRect(x, y, faceWidth, faceHeight);
        
        
        const confidence = (face.confidence * 100).toFixed(1);
        const label = `${face.emotion} (${confidence}%)`;
        
        
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(x, y - 25, context.measureText(label).width + 10, 25);
        
        context.fillStyle = '#00ff00';
        context.font = '16px Arial';
        context.fillText(label, x + 5, y - 5);
    });
}


function shouldSaveToHistory(faces) {
    if (captureHistoryData.length === 0) return true;
    
    const lastFaces = captureHistoryData[0].faces;
    
    return faces.some((face, i) => {
        return !lastFaces[i] || face.emotion !== lastFaces[i].emotion;
    });
}


function addToHistory(imageData, faces, timestamp) {
    
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    
    const historyCanvas = document.createElement('canvas');
    historyCanvas.className = 'history-canvas';
    
    
    const aspectRatio = imageData.width / imageData.height;
    const thumbnailHeight = 150;
    const thumbnailWidth = thumbnailHeight * aspectRatio;
    
    
    const thumbnailContext = historyCanvas.getContext('2d');
    historyCanvas.width = thumbnailWidth;
    historyCanvas.height = thumbnailHeight;
    
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempContext = tempCanvas.getContext('2d');
    tempContext.putImageData(imageData, 0, 0);
    
    
    thumbnailContext.drawImage(tempCanvas, 0, 0, imageData.width, imageData.height, 0, 0, thumbnailWidth, thumbnailHeight);
    
    
    const scaledFaces = faces.map(face => ({
        ...face,
        face_location: {
            x: face.face_location.x * (thumbnailWidth / imageData.width),
            y: face.face_location.y * (thumbnailHeight / imageData.height),
            width: face.face_location.width * (thumbnailWidth / imageData.width),
            height: face.face_location.height * (thumbnailHeight / imageData.height)
        }
    }));
    drawFaceOverlays(thumbnailContext, scaledFaces);
    
    
    const info = document.createElement('div');
    info.className = 'history-info';
    
    
    const emotions = faces.map(face => face.emotion).join(', ');
    info.innerHTML = `
        <div>Emotions: ${emotions}</div>
        <div class="history-timestamp">${new Date(timestamp).toLocaleTimeString()}</div>
    `;
    
    
    historyItem.appendChild(historyCanvas);
    historyItem.appendChild(info);
    
    
    captureHistoryData.unshift({
        imageData,
        faces,
        timestamp,
        element: historyItem
    });
    
    
    if (captureHistoryData.length > MAX_HISTORY) {
        const removed = captureHistoryData.pop();
        removed.element.remove();
    }
    
    
    if (captureHistory.firstChild) {
        captureHistory.insertBefore(historyItem, captureHistory.firstChild);
    } else {
        captureHistory.appendChild(historyItem);
    }
}


setupCamera();
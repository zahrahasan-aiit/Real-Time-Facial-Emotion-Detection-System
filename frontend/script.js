const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const emoji = document.getElementById('emoji');
const emotionText = document.getElementById('emotion');
const confidenceText = document.getElementById('confidence');
const statusText = document.getElementById('statusText');
const probabilityBars = document.getElementById('probabilityBars');

const BACKEND_URL = 'http://localhost:5000';
let stream = null;
let detectionInterval = null;

// Emoji mapping for emotions
const emojiMap = {
    'happy': '😊',
    'sad': '😢',
    'angry': '😠',
    'surprise': '😮',
    'fear': '😨',
    'disgust': '🤢',
    'neutral': '😐'
};

// Color mapping for emotions
const colorMap = {
    'happy': '#4CAF50',
    'sad': '#2196F3',
    'angry': '#F44336',
    'surprise': '#FF9800',
    'fear': '#9C27B0',
    'disgust': '#795548',
    'neutral': '#607D8B'
};

// Start camera
startBtn.addEventListener('click', async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 640, 
                height: 480 
            } 
        });
        video.srcObject = stream;
        
        startBtn.disabled = true;
        stopBtn.disabled = false;
        updateStatus('Camera active - Detecting emotions...', true);
        
        // Start emotion detection every 1 second
        detectionInterval = setInterval(detectEmotion, 1000);
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Unable to access camera. Please check permissions.');
    }
});

// Stop camera
stopBtn.addEventListener('click', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    
    if (detectionInterval) {
        clearInterval(detectionInterval);
    }
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    updateStatus('Camera stopped', false);
    resetDisplay();
});

// Capture frame and send to backend
async function detectEmotion() {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    // Convert canvas to base64 image
    const imageData = canvas.toDataURL('image/jpeg');
    
    try {
        const response = await fetch(`${BACKEND_URL}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageData })
        });
        
        if (response.ok) {
            const data = await response.json();
            updateEmotionDisplay(data);
        } else {
            const error = await response.json();
            console.error('Prediction error:', error);
            if (error.error === 'No face detected') {
                updateStatus('No face detected - Please face the camera', false);
            }
        }
    } catch (error) {
        console.error('Network error:', error);
        updateStatus('Error connecting to server', false);
    }
}

// Update emotion display
function updateEmotionDisplay(data) {
    const emotion = data.emotion;
    const confidence = data.confidence;
    const allProbs = data.all_probabilities;
    
    // Update emoji and text
    emoji.textContent = emojiMap[emotion] || '🤔';
    emotionText.textContent = emotion.charAt(0).toUpperCase() + emotion.slice(1);
    confidenceText.textContent = `Confidence: ${confidence.toFixed(1)}%`;
    
    // Update emoji color
    emoji.style.color = colorMap[emotion] || '#333';
    
    // Update status
    updateStatus(`Detected: ${emotion} (${confidence.toFixed(1)}%)`, true);
    
    // Update probability bars
    updateProbabilityBars(allProbs);
}

// Update probability bars
function updateProbabilityBars(probabilities) {
    probabilityBars.innerHTML = '';
    
    // Sort by probability descending
    const sortedEmotions = Object.entries(probabilities)
        .sort((a, b) => b[1] - a[1]);
    
    sortedEmotions.forEach(([emotion, probability]) => {
        const item = document.createElement('div');
        item.className = 'probability-item';
        
        const label = document.createElement('div');
        label.className = 'probability-label';
        label.innerHTML = `
            <span>${emotion.charAt(0).toUpperCase() + emotion.slice(1)}</span>
            <span>${probability.toFixed(1)}%</span>
        `;
        
        const bar = document.createElement('div');
        bar.className = 'probability-bar';
        
        const fill = document.createElement('div');
        fill.className = 'probability-fill';
        fill.style.width = `${probability}%`;
        fill.style.background = `linear-gradient(90deg, ${colorMap[emotion]}, ${colorMap[emotion]}dd)`;
        
        bar.appendChild(fill);
        item.appendChild(label);
        item.appendChild(bar);
        probabilityBars.appendChild(item);
    });
}

// Update status indicator
function updateStatus(message, isActive) {
    statusText.textContent = message;
    const indicator = document.querySelector('.status-indicator');
    
    if (isActive) {
        indicator.classList.add('active');
    } else {
        indicator.classList.remove('active');
    }
}

// Reset display
function resetDisplay() {
    emoji.textContent = '😊';
    emotionText.textContent = 'Waiting...';
    confidenceText.textContent = '';
    probabilityBars.innerHTML = '';
}

// Check backend connection on load
window.addEventListener('load', async () => {
    try {
        const response = await fetch(`${BACKEND_URL}/health`);
        const data = await response.json();
        
        if (data.model_loaded) {
            updateStatus('Ready to start - Model loaded', false);
        } else {
            updateStatus('Warning: Model not found. Train model first.', false);
            showError('Model not loaded! Please train the model using the Jupyter notebook first.');
        }
    } catch (error) {
        updateStatus('Backend server not running', false);
        showError('Cannot connect to backend server. Please start the Flask server first.');
    }
});

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.querySelector('.results-section').prepend(errorDiv);
}

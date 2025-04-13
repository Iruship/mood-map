import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './LiveDepressionDetection.css';

const LiveDepressionDetection = () => {
  const navigate = useNavigate();
  const [depressionLevel, setDepressionLevel] = useState('Normal');
  const [depressionScore, setDepressionScore] = useState(0);
  const [analysisTime, setAnalysisTime] = useState(0);
  
  // Emotion weights for depression scoring
  const EMOTION_WEIGHTS = {
    'Angry': 0.7,    // High contribution to depression
    'Disgusted': 0.6,
    'Fearful': 0.8,
    'Happy': -1.0,   // Reduces depression score
    'Neutral': 0.2,
    'Sad': 1.0,      // Highest contribution to depression
    'Surprised': 0.3
  };

  // Depression level thresholds
  const DEPRESSION_LEVELS = {
    NORMAL: { max: 0.3, label: 'Normal' },
    MILD: { max: 0.5, label: 'Mild Depression' },
    MODERATE: { max: 0.7, label: 'Moderate Depression' },
    SEVERE: { max: 1.0, label: 'Severe Depression' }
  };

  // Function to calculate depression level based on score
  const calculateDepressionLevel = (score) => {
    if (score <= DEPRESSION_LEVELS.NORMAL.max) return DEPRESSION_LEVELS.NORMAL.label;
    if (score <= DEPRESSION_LEVELS.MILD.max) return DEPRESSION_LEVELS.MILD.label;
    if (score <= DEPRESSION_LEVELS.MODERATE.max) return DEPRESSION_LEVELS.MODERATE.label;
    return DEPRESSION_LEVELS.SEVERE.label;
  };

  // Format seconds to mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle cleanup when navigating away
  const handleNavigateBack = useCallback(() => {
    // Stop all media tracks
    const videoEl = document.getElementById('video');
    if (videoEl && videoEl.srcObject) {
      const tracks = videoEl.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }

    // Clear any intervals
    if (window.analysisInterval) {
      clearInterval(window.analysisInterval);
      delete window.analysisInterval;
    }

    // Remove global functions
    delete window.updateDepressionScore;
    delete window.updateAnalysisTime;

    // Navigate back
    navigate('/dashboard');
  }, [navigate]);

  useEffect(() => {
    // Initialize the vanilla JS code
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        // Get DOM elements
        const videoEl = document.getElementById('video');
        const canvasEl = document.getElementById('canvas');
        const previewCanvasEl = document.getElementById('previewCanvas');
        const previewContextEl = previewCanvasEl.getContext('2d');

        let isProcessing = false;  
        let lastProcessedTime = 0;
        const PROCESS_INTERVAL = 100;  
        let lastDetectedFaces = [];
        let emotionHistory = [];
        let startTime = Date.now();
        
        // Update analysis time every second
        window.analysisInterval = setInterval(() => {
          if (window.updateAnalysisTime) {
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            window.updateAnalysisTime(elapsedSeconds);
          }
        }, 1000);

        // Emotion weights for depression scoring
        const EMOTION_WEIGHTS = {
          'Angry': 0.7,
          'Disgusted': 0.6,
          'Fearful': 0.8,
          'Happy': -1.0,
          'Neutral': 0.2,
          'Sad': 1.0,
          'Surprised': 0.3
        };

        // Calculate depression score based on detected emotions
        function calculateDepressionScore(emotions) {
          if (!emotions || emotions.length === 0) return 0;
          
          // Get the primary emotion (first detected emotion)
          const primaryEmotion = emotions[0].emotion;
          
          // Return the weight for that emotion
          const score = EMOTION_WEIGHTS[primaryEmotion] || 0;
          
          // Normalize to 0-1 range
          return Math.max(0, Math.min(1, (score + 1) / 2));
        }

        // Calculate average depression score from history
        function calculateAverageScore() {
          if (emotionHistory.length === 0) return 0;
          
          const totalScore = emotionHistory.reduce((sum, entry) => sum + entry.depressionScore, 0);
          return totalScore / emotionHistory.length;
        }

        async function setupCamera() {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
              video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 30 }
              } 
            });
            videoEl.srcObject = stream;
            videoEl.addEventListener('loadeddata', () => {
              requestAnimationFrame(updatePreview);
              processVideoFrame();
            });
          } catch (err) {
            console.error('Error accessing camera:', err);
          }
        }

        function updatePreview() {
          previewCanvasEl.width = videoEl.videoWidth;
          previewCanvasEl.height = videoEl.videoHeight;
          previewContextEl.drawImage(videoEl, 0, 0);
          
          if (lastDetectedFaces.length > 0) {
            drawFaceOverlays(previewContextEl, lastDetectedFaces);
          }
          
          requestAnimationFrame(updatePreview);
        }

        function drawFaceOverlays(context, faces) {
          faces.forEach(face => {
            const { x, y, width: faceWidth, height: faceHeight } = face.face_location;
            
            context.strokeStyle = '#00ff00';
            context.lineWidth = 2;
            context.strokeRect(x, y, faceWidth, faceHeight);
            
            const label = face.emotion;
            
            context.fillStyle = 'rgba(0, 0, 0, 0.5)';
            context.fillRect(x, y - 25, context.measureText(label).width + 10, 25);
            
            context.fillStyle = '#00ff00';
            context.font = '16px Arial';
            context.fillText(label, x + 5, y - 5);
          });
        }

        async function processVideoFrame() {
          const currentTime = Date.now();
          
          if (!isProcessing && currentTime - lastProcessedTime >= PROCESS_INTERVAL) {
            isProcessing = true;
            lastProcessedTime = currentTime;

            canvasEl.width = videoEl.videoWidth;
            canvasEl.height = videoEl.videoHeight;
            const ctx = canvasEl.getContext('2d');
            ctx.drawImage(videoEl, 0, 0);
            
            canvasEl.toBlob(async (blob) => {
              const formData = new FormData();
              formData.append('image', blob, 'capture.jpg');

              try {
                const response = await fetch('http://127.0.0.1:5001/api/emotion-detection/detect', {
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
                  
                  // Calculate depression score
                  const currentDepressionScore = calculateDepressionScore(data.faces);
                  
                  // Store score in history
                  emotionHistory.push({
                    timestamp: new Date().toISOString(),
                    emotion: data.faces[0].emotion,
                    depressionScore: currentDepressionScore
                  });
                  
                  // Keep only last 100 entries
                  if (emotionHistory.length > 100) {
                    emotionHistory.shift();
                  }
                  
                  // Calculate and update average depression score
                  const averageScore = calculateAverageScore();
                  window.updateDepressionScore(averageScore);
                  
                  console.log('Current emotion:', data.faces[0].emotion);
                  console.log('Depression score:', currentDepressionScore);
                  console.log('Average depression score:', averageScore);
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

        setupCamera();
      })();
    `;
    document.body.appendChild(script);

    // Add global function to update depression score and analysis time
    window.updateDepressionScore = (score) => {
      setDepressionScore(score);
      setDepressionLevel(calculateDepressionLevel(score));
    };

    window.updateAnalysisTime = (seconds) => {
      setAnalysisTime(seconds);
    };

    return () => {
      // Cleanup when component unmounts
      const videoEl = document.getElementById('video');
      if (videoEl && videoEl.srcObject) {
        const tracks = videoEl.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }

      if (window.analysisInterval) {
        clearInterval(window.analysisInterval);
        delete window.analysisInterval;
      }

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

      delete window.updateDepressionScore;
      delete window.updateAnalysisTime;
    };
  }, []);

  return (
    <div className="live-depression-detection">
      <div className="header">
        <button className="back-button" onClick={handleNavigateBack}>
          ← Back to Dashboard
        </button>
      <h1 className="heading">Live Depression Detection</h1>
      </div>
      
      <div className="container">
        <div className="info-block">
          <div className="info-content">
            <h3>About the Analysis</h3>
            <p>
              The analysis becomes more accurate over time as it collects more emotional data. 
              Longer analysis times provide a more reliable assessment of your emotional state.
            </p>
            <div className="analysis-time">
              <span className="time-label">Analysis Time:</span>
              <span className="time-value">{formatTime(analysisTime)}</span>
            </div>
          </div>
        </div>

        <div className="camera-section">
          <div className="camera-container">
            <video id="video" autoPlay playsInline style={{ display: 'none' }}></video>
            <canvas id="previewCanvas"></canvas>
            <canvas id="canvas" style={{ display: 'none' }}></canvas>
          </div>
        </div>
        
        <div className="depression-meter">
          <div className="depression-score-container">
            <div className="depression-label">{depressionLevel}</div>
            <div className="depression-slider">
              <div 
                className="depression-slider-fill" 
                style={{ width: `${depressionScore * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDepressionDetection;

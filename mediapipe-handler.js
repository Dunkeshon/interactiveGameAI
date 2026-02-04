/**
 * MediaPipe Hand Tracking Handler
 * Detects hand gestures for game control
 */

class MediaPipeHandler {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.isReady = false;
        
        // Gesture state
        this.gestureState = {
            handDetected: false,
            direction: { x: 0, y: 0 },
            isInteracting: false,
            confidence: 0
        };
        
        this.onReadyCallback = null;
    }
    
    async initialize(videoElement, canvasElement, onReady) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.canvasCtx = canvasElement.getContext('2d');
        this.onReadyCallback = onReady;
        
        // Initialize MediaPipe Hands
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });
        
        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5
        });
        
        this.hands.onResults((results) => this.onResults(results));
        
        // Start camera
        this.camera = new Camera(videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: videoElement });
            },
            width: 640,
            height: 480
        });
        
        await this.camera.start();
        this.isReady = true;
        
        if (this.onReadyCallback) {
            this.onReadyCallback();
        }
    }
    
    onResults(results) {
        // Set canvas dimensions
        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;
        
        // Clear canvas
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            // Draw hand landmarks
            this.drawHandLandmarks(landmarks);
            
            // Calculate gesture state
            this.calculateGestureState(landmarks);
            
            this.gestureState.handDetected = true;
        } else {
            this.gestureState.handDetected = false;
            this.gestureState.direction = { x: 0, y: 0 };
            this.gestureState.isInteracting = false;
        }
    }
    
    drawHandLandmarks(landmarks) {
        // Draw connections
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],     // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8],     // Index
            [0, 9], [9, 10], [10, 11], [11, 12], // Middle
            [0, 13], [13, 14], [14, 15], [15, 16], // Ring
            [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
            [5, 9], [9, 13], [13, 17]           // Palm
        ];
        
        this.canvasCtx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
        this.canvasCtx.lineWidth = 2;
        
        for (const [start, end] of connections) {
            const startPt = landmarks[start];
            const endPt = landmarks[end];
            
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(startPt.x * this.canvasElement.width, startPt.y * this.canvasElement.height);
            this.canvasCtx.lineTo(endPt.x * this.canvasElement.width, endPt.y * this.canvasElement.height);
            this.canvasCtx.stroke();
        }
        
        // Draw landmarks
        for (const landmark of landmarks) {
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(
                landmark.x * this.canvasElement.width,
                landmark.y * this.canvasElement.height,
                4, 0, 2 * Math.PI
            );
            this.canvasCtx.fillStyle = 'rgba(255, 107, 157, 0.9)';
            this.canvasCtx.fill();
        }
        
        // Highlight index finger tip
        const indexTip = landmarks[8];
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(
            indexTip.x * this.canvasElement.width,
            indexTip.y * this.canvasElement.height,
            8, 0, 2 * Math.PI
        );
        this.canvasCtx.fillStyle = 'rgba(251, 191, 36, 0.9)';
        this.canvasCtx.fill();
    }
    
    calculateGestureState(landmarks) {
        // Landmark indices
        const WRIST = 0;
        const THUMB_TIP = 4;
        const INDEX_TIP = 8;
        const MIDDLE_TIP = 12;
        const RING_TIP = 16;
        const PINKY_TIP = 20;
        const INDEX_MCP = 5;
        const PINKY_MCP = 17;
        
        // Calculate palm center (average of wrist and finger bases)
        const palmCenter = {
            x: (landmarks[WRIST].x + landmarks[INDEX_MCP].x + landmarks[PINKY_MCP].x) / 3,
            y: (landmarks[WRIST].y + landmarks[INDEX_MCP].y + landmarks[PINKY_MCP].y) / 3
        };
        
        // Calculate index finger direction (from palm center to index finger tip)
        // Note: Camera is mirrored, so we invert X
        const indexDir = {
            x: -(landmarks[INDEX_TIP].x - palmCenter.x),
            y: landmarks[INDEX_TIP].y - palmCenter.y
        };
        
        // Normalize direction
        const magnitude = Math.sqrt(indexDir.x * indexDir.x + indexDir.y * indexDir.y);
        if (magnitude > 0.05) {
            this.gestureState.direction = {
                x: indexDir.x / magnitude,
                y: indexDir.y / magnitude
            };
        } else {
            this.gestureState.direction = { x: 0, y: 0 };
        }
        
        // Detect open palm (all fingers extended)
        const fingerTips = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];
        const fingerMCPs = [5, 9, 13, 17];
        
        let fingersExtended = 0;
        for (let i = 0; i < fingerTips.length; i++) {
            const tip = landmarks[fingerTips[i]];
            const mcp = landmarks[fingerMCPs[i]];
            
            // Finger is extended if tip is above (lower y value) the MCP joint
            // Account for some flexibility
            if (tip.y < mcp.y + 0.05) {
                fingersExtended++;
            }
        }
        
        // Also check thumb extension
        const thumbExtended = Math.abs(landmarks[THUMB_TIP].x - palmCenter.x) > 0.1;
        
        // Open palm = at least 4 fingers extended including thumb
        this.gestureState.isInteracting = fingersExtended >= 3 && thumbExtended;
    }
    
    getGestureState() {
        return { ...this.gestureState };
    }
}

// Export globally
window.MediaPipeHandler = MediaPipeHandler;

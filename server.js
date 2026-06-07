const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.static('public'));

// Game state
let currentMode = 30;
let timer = 30;
let timerInterval = null;
let history = [];
let clients = new Set();

// Color mapping function
function getColor(number) {
    if (number === 0 || number === 5) return 'Violet';
    if ([1, 3, 7, 9].includes(number)) return 'Red';
    return 'Green';
}

// Size mapping function
function getSize(number) {
    return number >= 5 ? 'Big' : 'Small';
}

// Generate random result
function generateRandomResult() {
    const number = Math.floor(Math.random() * 10);
    return {
        number: number,
        color: getColor(number),
        size: getSize(number),
        timestamp: Date.now()
    };
}

// Advanced AI Prediction Algorithm
function generateAIPrediction() {
    if (history.length < 3) {
        return {
            color: 'Green',
            size: 'Big',
            number: 5,
            confidence: 70,
            pattern: 'Insufficient data - Starting soon',
            details: {
                colorConfidence: 70,
                sizeConfidence: 70,
                numberConfidence: 70
            }
        };
    }

    // Get last results
    const last10 = history.slice(-10);
    const last5 = history.slice(-5);

    // COLOR PREDICTION
    const colorCount = { Green: 0, Violet: 0, Red: 0 };
    for (let i = 0; i < last10.length; i++) {
        colorCount[last10[i].color]++;
    }

    let predColor = 'Green';
    let colorConfidence = 0;

    // Check for streak
    const lastColor = last10[last10.length - 1].color;
    let streakCount = 0;
    for (let i = last10.length - 1; i >= 0; i--) {
        if (last10[i].color === lastColor) {
            streakCount++;
        } else {
            break;
        }
    }

    if (streakCount >= 3) {
        // Streak of 3 or more - change color
        const oppositeColors = ['Green', 'Violet', 'Red'].filter(function(c) {
            return c !== lastColor;
        });
        predColor = oppositeColors[Math.floor(Math.random() * oppositeColors.length)];
        colorConfidence = 65;
    } else {
        // Pick most frequent color
        let maxCount = 0;
        for (var color in colorCount) {
            if (colorCount[color] > maxCount) {
                maxCount = colorCount[color];
                predColor = color;
                colorConfidence = 60 + (maxCount * 5);
            }
        }
    }

    // SIZE PREDICTION
    const sizeCount = { Big: 0, Small: 0 };
    for (let i = 0; i < last10.length; i++) {
        sizeCount[last10[i].size]++;
    }

    let predSize = sizeCount.Big >= sizeCount.Small ? 'Big' : 'Small';
    let sizeConfidence = 60 + Math.abs(sizeCount.Big - sizeCount.Small) * 2;

    // Pattern check
    const last3Sizes = [];
    for (let i = last10.length - 3; i < last10.length; i++) {
        if (last10[i]) last3Sizes.push(last10[i].size);
    }

    if (last3Sizes.length === 3) {
        if (last3Sizes[0] === 'Small' && last3Sizes[1] === 'Small' && last3Sizes[2] === 'Small') {
            predSize = 'Big';
            sizeConfidence = 75;
        } else if (last3Sizes[0] === 'Big' && last3Sizes[1] === 'Big' && last3Sizes[2] === 'Big') {
            predSize = 'Small';
            sizeConfidence = 75;
        }
    }

    // NUMBER PREDICTION
    const numberCount = {};
    for (let i = 0; i < last10.length; i++) {
        const num = last10[i].number;
        numberCount[num] = (numberCount[num] || 0) + 1;
    }

    let predNumber = 5;
    let maxNumCount = 0;
    for (var num in numberCount) {
        if (numberCount[num] > maxNumCount) {
            maxNumCount = numberCount[num];
            predNumber = parseInt(num);
        }
    }

    // Adjust based on color prediction
    if (predColor === 'Red' && predNumber < 5) predNumber += 5;
    if (predColor === 'Green' && predNumber > 5) predNumber = Math.max(0, predNumber - 3);
    if (predColor === 'Violet') {
        if (predNumber === 0) predNumber = 5;
        else if (predNumber === 5) predNumber = 0;
    }

    predNumber = Math.max(0, Math.min(9, predNumber));

    // Calculate number confidence
    let numberConfidence = 50 + (maxNumCount * 5);

    // Overall confidence
    const overallConfidence = Math.min(88, Math.floor((colorConfidence + sizeConfidence + numberConfidence) / 3));

    // Pattern detection for UI
    let pattern = '';
    if (streakCount >= 3) {
        pattern = '⚠️ ' + lastColor + ' streak of ' + (streakCount + 1) + ', possible change';
    } else if (colorCount.Green > 5) {
        pattern = '📊 Green dominance detected';
    } else if (colorCount.Violet > 5) {
        pattern = '📊 Violet dominance detected';
    } else if (colorCount.Red > 5) {
        pattern = '📊 Red dominance detected';
    } else {
        pattern = '📈 Following recent trends';
    }

    return {
        color: predColor,
        size: predSize,
        number: predNumber,
        confidence: overallConfidence,
        pattern: pattern,
        details: {
            colorConfidence: Math.floor(colorConfidence),
            sizeConfidence: Math.floor(sizeConfidence),
            numberConfidence: Math.floor(numberConfidence)
        }
    };
}

// Generate period number
function generatePeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');

    return year + month + day + hours + minutes + seconds + random;
}

// Broadcast to all clients
function broadcast(event, data) {
    clients.forEach(function(client) {
        client.emit(event, data);
    });
}

// Start game timer
function startGameTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timer = currentMode;

    timerInterval = setInterval(function() {
        if (timer <= 0) {
            // Generate new result
            const result = generateRandomResult();
            const period = generatePeriod();

            // Add to history
            const historyItem = {
                number: result.number,
                color: result.color,
                size: result.size,
                period: period,
                timestamp: Date.now()
            };
            history.unshift(historyItem);

            // Keep only last 30
            if (history.length > 30) history.pop();

            // Generate next prediction
            const prediction = generateAIPrediction();

            // Broadcast result to all clients
            broadcast('game_result', {
                result: result,
                period: period,
                timestamp: Date.now()
            });

            // Broadcast new prediction
            broadcast('prediction_update', {
                prediction: prediction,
                timestamp: Date.now()
            });

            // Broadcast updated history
            broadcast('history_update', {
                history: history,
                timestamp: Date.now()
            });

            // Reset timer
            timer = currentMode;

            // Broadcast timer sync
            broadcast('timer_sync', {
                time: timer,
                mode: currentMode
            });
        } else {
            timer--;

            // Broadcast timer update every second
            broadcast('timer_update', {
                time: timer,
                mode: currentMode
            });

            // Update prediction confidence every 5 seconds
            if (timer % 5 === 0 && timer > 0) {
                const prediction = generateAIPrediction();
                broadcast('prediction_update', {
                    prediction: prediction,
                    timestamp: Date.now()
                });
            }
        }
    }, 1000);
}

// Change game mode
function changeMode(seconds) {
    currentMode = seconds;
    timer = seconds;

    broadcast('mode_changed', {
        mode: seconds,
        time: seconds
    });

    // Restart timer
    if (timerInterval) {
        clearInterval(timerInterval);
        startGameTimer();
    }
}

// Socket.IO connection handling
io.on('connection', function(socket) {
    console.log('New client connected:', socket.id);
    clients.add(socket);

    // Send initial data
    socket.emit('initial_data', {
        history: history,
        currentMode: currentMode,
        currentTime: timer,
        currentPrediction: generateAIPrediction()
    });

    // Client requests mode change
    socket.on('change_mode', function(data) {
        const mode = data.mode;
        if (mode === 30 || mode === 60 || mode === 180 || mode === 300) {
            changeMode(mode);
            console.log('Mode changed to', mode, 'seconds');
        }
    });

    // Client requests manual prediction
    socket.on('request_prediction', function() {
        const prediction = generateAIPrediction();
        socket.emit('prediction_update', {
            prediction: prediction,
            timestamp: Date.now()
        });
    });

    // Client requests history
    socket.on('request_history', function() {
        socket.emit('history_update', {
            history: history,
            timestamp: Date.now()
        });
    });

    // Client disconnection
    socket.on('disconnect', function() {
        console.log('Client disconnected:', socket.id);
        clients.delete(socket);
    });
});

// Initialize with sample history
function initSampleHistory() {
    const sampleNumbers = [7, 3, 0, 9, 2, 5, 8, 1, 4, 6];
    const sampleColors = ['Red', 'Green', 'Violet', 'Red', 'Green', 'Violet', 'Red', 'Green', 'Green', 'Red'];
    const sampleSizes = ['Big', 'Small', 'Small', 'Big', 'Small', 'Big', 'Big', 'Small', 'Small', 'Big'];

    for (let i = 0; i < sampleNumbers.length; i++) {
        const period = '20260607' + String(100000 + i).padStart(6, '0');
        history.push({
            number: sampleNumbers[i],
            color: sampleColors[i],
            size: sampleSizes[i],
            period: period,
            timestamp: Date.now() - (i * 60000)
        });
    }
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, function() {
    console.log('');
    console.log('🚀 91CLUB Real-time Server Started!');
    console.log('=====================================');
    console.log('📍 URL: http://localhost:' + PORT);
    console.log('📡 WebSocket: Ready');
    console.log('🎯 AI Prediction Engine: Active');
    console.log('=====================================');
    console.log('');

    initSampleHistory();
    startGameTimer();
});
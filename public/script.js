// Socket connection
const socket = io();

// DOM Elements
const connStatus = document.getElementById('connStatus');
const periodEl = document.getElementById('period');
const timerEl = document.getElementById('timer');
const confidenceEl = document.getElementById('confidence');
const predColorEl = document.getElementById('predColor');
const predSizeEl = document.getElementById('predSize');
const predNumberEl = document.getElementById('predNumber');
const patternNote = document.getElementById('patternNote');
const historyList = document.getElementById('historyList');
const simpleChart = document.getElementById('simpleChart');
const strategyText = document.getElementById('strategyText');
const strategyStats = document.getElementById('strategyStats');

// Connection events
socket.on('connect', () => {
    connStatus.innerHTML = '🟢 Connected to AI Server';
    connStatus.style.background = '#00ff8820';
    connStatus.style.color = '#00ff88';
    setTimeout(() => {
        connStatus.style.opacity = '0';
        setTimeout(() => connStatus.style.display = 'none', 1000);
    }, 3000);
});

socket.on('disconnect', () => {
    connStatus.style.display = 'flex';
    connStatus.innerHTML = '🔴 Disconnected - Reconnecting...';
    connStatus.style.background = '#ff335520';
    connStatus.style.color = '#ff3355';
});

// Initial data from server
socket.on('initial_data', (data) => {
    console.log('Initial data received', data);

    // Update history
    if (data.history && data.history.length) {
        updateHistoryUI(data.history);
        updateChart(data.history);
    }

    // Update timer
    const minutes = Math.floor(data.currentTime / 60);
    const seconds = data.currentTime % 60;
    timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Update prediction
    if (data.currentPrediction) {
        updatePredictionUI(data.currentPrediction);
    }
});

// Game result from server
socket.on('game_result', (data) => {
    console.log('Game result:', data);

    // Update last result display
    const lastResultDiv = document.getElementById('lastResult');
    const resultNumber = lastResultDiv.querySelector('.result-number');
    const resultColorSpan = lastResultDiv.querySelector('.result-color');

    resultNumber.textContent = data.result.number;

    let colorStyle = '';
    if (data.result.color === 'Green') colorStyle = '#00ff88';
    else if (data.result.color === 'Violet') colorStyle = '#bf40ff';
    else colorStyle = '#ff3355';

    resultColorSpan.textContent = data.result.color;
    resultColorSpan.style.background = `${colorStyle}30`;
    resultColorSpan.style.color = colorStyle;

    // Update period
    periodEl.textContent = data.period;

    // Animation effect
    lastResultDiv.style.transform = 'scale(1.05)';
    setTimeout(() => {
        lastResultDiv.style.transform = 'scale(1)';
    }, 300);
});

// Prediction update from server
socket.on('prediction_update', (data) => {
    updatePredictionUI(data.prediction);
});

// History update from server
socket.on('history_update', (data) => {
    updateHistoryUI(data.history);
    updateChart(data.history);
});

// Timer update from server
socket.on('timer_update', (data) => {
    const minutes = Math.floor(data.time / 60);
    const seconds = data.time % 60;
    timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

// Timer sync
socket.on('timer_sync', (data) => {
    const minutes = Math.floor(data.time / 60);
    const seconds = data.time % 60;
    timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

// Mode changed
socket.on('mode_changed', (data) => {
    const minutes = Math.floor(data.time / 60);
    const seconds = data.time % 60;
    timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
});

// Update prediction UI
function updatePredictionUI(prediction) {
    // Update color with dot
    const dotClass = prediction.color === 'Green' ? 'green-dot' :
        prediction.color === 'Violet' ? 'violet-dot' : 'red-dot';
    predColorEl.innerHTML = `<span class="color-dot ${dotClass}"></span> ${prediction.color}`;

    // Update size
    predSizeEl.innerHTML = prediction.size === 'Big' ? 'Big 🔴' : 'Small 🔵';

    // Update number
    predNumberEl.textContent = prediction.number;

    // Update confidence
    confidenceEl.textContent = `Confidence: ${prediction.confidence}%`;

    // Update pattern note
    if (prediction.pattern) {
        patternNote.innerHTML = `📊 ${prediction.pattern}`;
    }

    // Update strategy text
    if (strategyText) {
        strategyText.innerHTML = `🎯 AI suggests: Bet on <strong>${prediction.color}</strong> next round<br>
        <small style="font-size: 11px;">Pattern: ${prediction.pattern || 'Following trends'}</small>`;
    }

    // Update strategy stats
    if (strategyStats && prediction.details) {
        strategyStats.innerHTML = `
            <span>🎨 Color: ${prediction.details.colorConfidence}% confidence</span>
            <span>📏 Size: ${prediction.details.sizeConfidence}% confidence</span>
            <span>🔢 Number: ${prediction.details.numberConfidence}% confidence</span>
        `;
    }
}

// Update history UI
function updateHistoryUI(history) {
    if (!historyList) return;

    historyList.innerHTML = '';
    history.slice(0, 15).forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';

        let colorClass = '';
        if (item.color === 'Green') colorClass = '#00ff88';
        else if (item.color === 'Violet') colorClass = '#bf40ff';
        else colorClass = '#ff3355';

        div.innerHTML = `
            <span>${item.period}</span>
            <span class="history-number">${item.number}</span>
            <span>${item.size}</span>
            <span><span class="history-color" style="background: ${colorClass}20; color: ${colorClass}">${item.color}</span></span>
        `;
        historyList.appendChild(div);
    });
}

// Update chart
function updateChart(history) {
    if (!simpleChart || !history.length) return;

    const counts = { Green: 0, Violet: 0, Red: 0 };
    history.forEach(h => counts[h.color]++);
    const total = history.length;

    simpleChart.innerHTML = `
        <div style="text-align:center">
            <div style="background:#00ff88; width:${(counts.Green/total)*200}px; height:30px; margin:5px 0; border-radius:5px"></div>
            <span>Green ${counts.Green}</span>
        </div>
        <div style="text-align:center">
            <div style="background:#bf40ff; width:${(counts.Violet/total)*200}px; height:30px; margin:5px 0; border-radius:5px"></div>
            <span>Violet ${counts.Violet}</span>
        </div>
        <div style="text-align:center">
            <div style="background:#ff3355; width:${(counts.Red/total)*200}px; height:30px; margin:5px 0; border-radius:5px"></div>
            <span>Red ${counts.Red}</span>
        </div>
    `;
}

// Mode change handler
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = parseInt(btn.getAttribute('data-mode'));
        socket.emit('change_mode', { mode: mode });
    });
});

// Number buttons - request prediction on click
document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        socket.emit('request_prediction');
        const num = btn.textContent;
        btn.style.transform = 'scale(0.9)';
        setTimeout(() => btn.style.transform = '', 200);
    });
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabId}Tab`).classList.add('active');
    });
});

console.log('Socket.IO client ready');
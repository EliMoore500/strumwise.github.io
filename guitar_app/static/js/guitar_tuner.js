let micStream = null;
let animationId = null;
let audioCtx = null;
let analyser = null;
let timeData = null;
let freqData = null;

// Circular buffer to store frequencies for the last 2 seconds
const frequencyBuffer = [];
const bufferSize = 120; // Assuming 60 frames per second, 2 seconds = 120 frames

const stringFrequencies = {
    "E2": 82.41,
    "A2": 110.00,
    "D3": 146.83,
    "G3": 196.00,
    "B3": 246.94,
    "E4": 329.63
};

function startListening() {
    console.log("🎧 Requesting microphone...");
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        micStream = stream;
        console.log("✅ Microphone stream received");

        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;

        const bufferLength = analyser.frequencyBinCount;
        timeData = new Float32Array(bufferLength);
        freqData = new Uint8Array(bufferLength);

        source.connect(analyser);

        console.log("📊 Starting detection loop...");
        animationId = requestAnimationFrame(detectFrequency);
    }).catch(err => {
        console.error("❌ getUserMedia error:", err);
    });
}

function stopListening() {
    console.log("🛑 Stopping microphone...");
    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        micStream = null;
    }
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    const frequencyDisplay = document.getElementById("frequencyDisplay");
    if (frequencyDisplay) frequencyDisplay.textContent = "Frequency: -- Hz";

    const tuningStatus = document.getElementById("tuningStatus");
    if (tuningStatus) tuningStatus.textContent = "Tuning stopped.";

    const currentNoteDisplay = document.getElementById("currentNote");
    if (currentNoteDisplay) currentNoteDisplay.textContent = "None";

    // Clear the frequency buffer
    frequencyBuffer.length = 0;
}

function detectFrequency() {
    animationId = requestAnimationFrame(detectFrequency);
    if (!analyser) return;

    analyser.getFloatTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);

    const maxIndex = freqData.indexOf(Math.max(...freqData));
    const frequency = maxIndex * (audioCtx.sampleRate / analyser.fftSize);

    // Add the current frequency to the buffer
    if (frequency > 0) {
        if (frequencyBuffer.length >= bufferSize) {
            frequencyBuffer.shift(); // Remove the oldest frequency
        }
        frequencyBuffer.push(frequency);
    }

    // Calculate the average frequency
    const averageFrequency = frequencyBuffer.reduce((sum, freq) => sum + freq, 0) / frequencyBuffer.length;

    const frequencyDisplay = document.getElementById("frequencyDisplay");
    if (frequencyDisplay) frequencyDisplay.textContent = `Frequency: ${averageFrequency.toFixed(2)} Hz`;

    const note = freqToNoteName(averageFrequency);
    if (note) {
        const currentNoteDisplay = document.getElementById("currentNote");
        if (currentNoteDisplay) currentNoteDisplay.textContent = note;

        checkTuning(note);
    }
}

function freqToNoteName(freq) {
    if (!freq || freq <= 0) return null;
    const noteNames = Object.keys(stringFrequencies);
    let closestNote = noteNames[0];
    let minDiff = Math.abs(freq - stringFrequencies[closestNote]);

    noteNames.forEach(note => {
        const diff = Math.abs(freq - stringFrequencies[note]);
        if (diff < minDiff) {
            minDiff = diff;
            closestNote = note;
        }
    });

    return closestNote;
}

function checkTuning(note) {
    const tuningStatus = document.getElementById("tuningStatus");
    const targetFrequency = stringFrequencies[note];
    const averageFrequency = frequencyBuffer.reduce((sum, freq) => sum + freq, 0) / frequencyBuffer.length;

    if (tuningStatus && targetFrequency) {
        const diff = Math.abs(targetFrequency - averageFrequency);
        tuningStatus.textContent = diff < 5 ? "In Tune" : "Out of Tune";
    }
}

let selectedString = null; // Track the selected string

function updateDesiredFrequencyDisplay() {
    const desiredFrequencyDisplay = document.getElementById("desiredFrequencyDisplay");
    if (desiredFrequencyDisplay && selectedString) {
        desiredFrequencyDisplay.textContent = `Desired Frequency: ${stringFrequencies[selectedString]} Hz`;
    } else if (desiredFrequencyDisplay) {
        desiredFrequencyDisplay.textContent = "Desired Frequency: -- Hz";
    }
}

function handleStringSelection(event) {
    selectedString = event.target.value; // Get the selected string
    if (stringFrequencies[selectedString]) {
        updateDesiredFrequencyDisplay(); // Update the display with the correct frequency
    } else {
        console.warn("⚠️ Selected string does not match any known frequencies.");
    }
}

function updateDesiredFrequencyDisplay() {
    const desiredFrequencyDisplay = document.getElementById("desiredFrequencyDisplay");
    if (desiredFrequencyDisplay && selectedString) {
        desiredFrequencyDisplay.textContent = `Desired Frequency: ${stringFrequencies[selectedString]} Hz`;
    } else if (desiredFrequencyDisplay) {
        desiredFrequencyDisplay.textContent = "Desired Frequency: -- Hz";
    }
}

window.addEventListener("load", () => {
    console.log("🕓 window.load triggered!");

    const startBtn = document.getElementById('startTuningBtn');
    const stopBtn = document.getElementById('stopTuningBtn');

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            console.log("🟢 Start button clicked!");
            startListening();

            // Enable the stop button and disable the start button
            startBtn.disabled = true;
            stopBtn.disabled = false;
        });
    } else {
        console.warn("⚠️ No start button found!");
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            console.log("🔴 Stop button clicked!");
            stopListening();

            // Enable the start button and disable the stop button
            startBtn.disabled = false;
            stopBtn.disabled = true;
        });

        // Ensure the stop button is initially disabled
        stopBtn.disabled = true;
    } else {
        console.warn("⚠️ No stop button found!");
    }
});
let micStream = null;
let animationId = null;
let spectrumId = null;

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
  if (spectrumId) {
    cancelAnimationFrame(spectrumId);
    spectrumId = null;
  }

  const rmsDisplay = document.getElementById("rmsDisplay");
  if (rmsDisplay) rmsDisplay.textContent = "RMS Volume: --";

  const chordNameSpan = document.getElementById("chord-name");
  if (chordNameSpan) chordNameSpan.textContent = "None";

  const canvas = document.getElementById("spectrumCanvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}


const chordData = {
  "A":  { notes: ["A","C#","E"],   positions: ["X", 0, 2, 2, 2, 0] },
  "Am": { notes: ["A","C","E"],    positions: ["X", 0, 2, 2, 1, 0] },
  "B":  { notes: ["B","D#","F#"],  positions: ["X", 2, 4, 4, 4, 2] },
  "Bm": { notes: ["B","D","F#"],   positions: ["X", 2, 4, 4, 3, 2] },
  "C":  { notes: ["C","E","G"],    positions: ["X", 3, 2, 0, 1, 0] },
  "Cm": { notes: ["C","D#","G"],   positions: ["X", 3, 5, 5, 4, 3] },
  "D":  { notes: ["D","F#","A"],   positions: ["X", "X", 0, 2, 3, 2] },
  "Dm": { notes: ["D","F","A"],    positions: ["X", "X", 0, 2, 3, 1] },
  "E":  { notes: ["E","G#","B"],   positions: [0, 2, 2, 1, 0, 0] },
  "Em": { notes: ["E","G","B"],    positions: [0, 2, 2, 0, 0, 0] },
  "F":  { notes: ["F","A","C"],    positions: [1, 3, 3, 2, 1, 1] },
  "Fm": { notes: ["F","G#","C"],   positions: [1, 3, 3, 1, 1, 1] },
  "G":  { notes: ["G","B","D"],    positions: [3, 2, 0, 0, 0, 3] },
  "Gm": { notes: ["G","A#","D"],   positions: [3, 5, 5, 3, 3, 3] }
};

const noteNames = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
let audioCtx = null;
let analyser = null;
let timeData = null;
let freqData = null;

function freqToNoteName(freq) {
  if (!freq || freq <= 0) return null;
  const noteNum = Math.round(12 * (Math.log2(freq / 440))) + 69;
  const noteIndex = ((noteNum % 12) + 12) % 12;
  const noteName = noteNames[noteIndex];
  console.log(`Frequency: ${freq.toFixed(2)} Hz -> Note: ${noteName}`);
  return noteName;
}

function detectLoop() {
  animationId = requestAnimationFrame(detectLoop);
  if (!analyser) return;

  analyser.getFloatTimeDomainData(timeData);
  analyser.getByteFrequencyData(freqData);

  let sumSquares = 0;
  for (let i = 0; i < timeData.length; i++) {
    sumSquares += timeData[i] * timeData[i];
  }
  const rms = Math.sqrt(sumSquares / timeData.length);

  if (typeof window.__rms_frame === 'undefined') window.__rms_frame = 0;
  if (window.__rms_frame++ % 60 === 0) {
    console.clear();
    console.log("🎵 Real-Time Audio Monitor");
    console.log("RMS Volume:", rms.toFixed(6));
    const rmsDisplay = document.getElementById("rmsDisplay");
    if (rmsDisplay) rmsDisplay.textContent = `RMS Volume: ${rms.toFixed(6)}`;
  }

  if (rms < 0.001) {
    const rmsDisplay = document.getElementById("rmsDisplay");
    if (rmsDisplay) rmsDisplay.textContent = "RMS Volume too low. Please play louder or check your microphone.";
    return;
  }

  let peaks = [];
  let maxVal = Math.max(...freqData);
  const threshold = maxVal * 0.6;

  for (let i = 1; i < freqData.length - 1; i++) {
    if (freqData[i] > threshold && freqData[i] > freqData[i - 1] && freqData[i] > freqData[i + 1]) {
      const freq = i * (audioCtx.sampleRate / analyser.fftSize);
      peaks.push(freq);
    }
  }

  const detectedNotes = new Set();
  peaks.forEach(freq => {
    const note = freqToNoteName(freq);
    if (note) detectedNotes.add(note);
  });

  let detectedName = "";
  if (detectedNotes.size === 1) {
    detectedName = Array.from(detectedNotes)[0];
  } else {
    for (const [chordName, data] of Object.entries(chordData)) {
      const chordNotes = data.notes;
      if (chordNotes.length === detectedNotes.size && chordNotes.every(n => detectedNotes.has(n))) {
        detectedName = chordName;
        break;
      }
    }
    if (!detectedName) {
      for (const [chordName, data] of Object.entries(chordData)) {
        if (data.notes.every(n => detectedNotes.has(n))) {
          detectedName = chordName;
          break;
        }
      }
    }
    if (!detectedName) detectedName = "Unknown";
  }

  const nameSpan = document.getElementById('chord-name');
  if (nameSpan && detectedName && nameSpan.textContent !== detectedName) {
    nameSpan.textContent = detectedName;
    if (chordData[detectedName]) renderChordDiagram(detectedName);
    checkTrainingMatch(detectedName);
  }

  console.log("Frequency Peaks:", peaks);
  console.log("Detected Notes:", Array.from(detectedNotes));
  console.log("Detected Chord:", detectedName);
}

function renderChordDiagram(chordName) {
  console.log("📣 rendering:", chordName);
  const diagramDiv = document.getElementById('diagram');
  console.log("🎯 diagramDiv found?", diagramDiv);
  if (!diagramDiv) return;
  const chord = chordData[chordName];
  if (!chord) {
    diagramDiv.innerHTML = "";
    return;
  }

  const pos = chord.positions;
  let html = "<table class='chord-table'><tr>";
  pos.forEach(p => html += `<td>${p === "X" ? "X" : p === 0 ? "O" : "&nbsp;"}</td>`);
  html += "</tr>";
  for (let fret = 1; fret <= 4; fret++) {
    html += "<tr>";
    pos.forEach(p => html += `<td>${p === fret ? "●" : "&nbsp;"}</td>`);
    html += "</tr>";
  }
  html += "</table>";
  diagramDiv.innerHTML = html;
}


function startAudio() {
  console.log("🎧 Requesting microphone...");
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    micStream = stream;
    console.log("✅ Microphone stream received");

    const source = audioCtx.createMediaStreamSource(stream);
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 2.0;

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;

    source.connect(gainNode);
    gainNode.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    timeData = new Float32Array(bufferLength);
    freqData = new Uint8Array(bufferLength);

    console.log("📊 Starting detection loop...");
    animationId = requestAnimationFrame(detectLoop);
    spectrumId = requestAnimationFrame(drawSpectrum);
  }).catch(err => {
    console.error("❌ getUserMedia error:", err);
  });
}

function drawSpectrum() {
  const canvas = document.getElementById("spectrumCanvas");
  if (!analyser || !canvas) return;
  const ctx = canvas.getContext("2d");
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const barWidth = (canvas.width / data.length) * 2.5;
  let x = 0;
  for (let i = 0; i < data.length; i++) {
    const barHeight = data[i];
    ctx.fillStyle = `rgb(${barHeight + 100},50,100)`;
    ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
    x += barWidth + 1;
  }
  spectrumId = requestAnimationFrame(drawSpectrum);
  console.log("Spectrum Data:", data);
}

function checkTrainingMatch(detected) {
  const target = document.getElementById("target-chord")?.textContent;
  const feedback = document.getElementById("training-feedback");
  if (!target || !feedback) return;
  if (detected === target) {
    feedback.textContent = "✅ Correct!";
    feedback.className = "text-success";
    speak("Correct chord");
  } else {
    feedback.textContent = "❌ Try Again";
    feedback.className = "text-danger";
  }
}

function speak(text) {
  if ('speechSynthesis' in window) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
  }
}

window.addEventListener("load", () => {
  console.log("🕓 window.load triggered!");

  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const chordSelect = document.getElementById('chordSelect');

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      console.log("🟢 Start button clicked!");
      startAudio();
    });
  } else {
    console.warn("⚠️ No start button found!");
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      console.log("🔴 Stop button clicked!");
      stopListening();
    });
  } else {
    console.warn("⚠️ No stop button found!");
  }

  if (chordSelect) {
    console.log("🎯 #chordSelect found! Binding change event...");
    chordSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      console.log("🎸 Chord selected from dropdown:", selected);
      if (selected && chordData[selected]) {
        renderChordDiagram(selected);
      } else {
        const diagramDiv = document.getElementById('diagram');
        if (diagramDiv) diagramDiv.innerHTML = "";
      }
    });
  } else {
    console.warn("⚠️ No #chordSelect element found!");
  }
});
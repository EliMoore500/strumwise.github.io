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
  let recordingInterval = null;
  let currentChord = null;
  let chordSequence = [];
  
  function freqToNoteName(freq) {
    if (!freq || freq <= 0) return null;
    const noteNum = Math.round(12 * (Math.log2(freq / 440))) + 69;
    const noteIndex = ((noteNum % 12) + 12) % 12;
    return noteNames[noteIndex];
  }
  
  function startRecording() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const bufferLength = analyser.frequencyBinCount;
      timeData = new Float32Array(bufferLength);
      freqData = new Uint8Array(bufferLength);
      chordSequence = [];
      currentChord = null;
      recordingInterval = setInterval(detectChord, 300);
    }).catch(err => {
      alert("Microphone access is required to record.");
      console.error("Mic error:", err);
    });
  }
  
  function stopRecording() {
    if (recordingInterval) {
      clearInterval(recordingInterval);
      recordingInterval = null;
    }
    currentChord = null;
  }
  
  function detectChord() {
    if (!analyser) return;
    analyser.getFloatTimeDomainData(timeData);
    analyser.getByteFrequencyData(freqData);
    let sumSquares = 0;
    for (let v of timeData) sumSquares += v * v;
    const rms = Math.sqrt(sumSquares / timeData.length);
    if (rms < 0.01) {
      currentChord = null;
      return;
    }
  
    let peaks = [];
    let maxVal = 0;
    for (let i = 0; i < freqData.length; i++) {
      if (freqData[i] > maxVal) maxVal = freqData[i];
    }
    const threshold = maxVal * 0.6;
    for (let i = 1; i < freqData.length - 1; i++) {
      if (freqData[i] > threshold && freqData[i] > freqData[i-1] && freqData[i] > freqData[i+1]) {
        const freq = i * (audioCtx.sampleRate / analyser.fftSize);
        peaks.push(freq);
      }
    }
  
    const detectedNotes = new Set();
    peaks.forEach(freq => {
      const note = freqToNoteName(freq);
      if (note) detectedNotes.add(note);
    });
    if (detectedNotes.size === 0) return;
  
    let name = "";
    if (detectedNotes.size === 1) {
      name = Array.from(detectedNotes)[0];
    } else {
      for (const [chordName, data] of Object.entries(chordData)) {
        const chordNotes = data.notes;
        if (chordNotes.length === detectedNotes.size && chordNotes.every(n => detectedNotes.has(n))) {
          name = chordName;
          break;
        }
      }
      if (!name) {
        for (const [chordName, data] of Object.entries(chordData)) {
          if (data.notes.every(n => detectedNotes.has(n))) {
            name = chordName;
            break;
          }
        }
      }
      if (!name) name = "Unknown";
    }
  
    if (!name || name === "Unknown") return;
  
    if (name !== currentChord) {
      chordSequence.push(name);
      currentChord = name;
      const textarea = document.getElementById('id_chords');
      if (textarea) textarea.value = chordSequence.join(' ');
    }
  }
  
  document.getElementById('startRecBtn').addEventListener('click', () => {
    startRecording();
    document.getElementById('startRecBtn').disabled = true;
    document.getElementById('stopRecBtn').disabled = false;
    document.getElementById('recordingStatus').textContent = "Recording... (play your chords)";
  });
  
  document.getElementById('stopRecBtn').addEventListener('click', () => {
    stopRecording();
    document.getElementById('startRecBtn').disabled = false;
    document.getElementById('stopRecBtn').disabled = true;
    document.getElementById('recordingStatus').textContent = "Recording stopped.";
  });
  
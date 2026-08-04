let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function beep(freq1, freq2, duration, gainVal) {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq1, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq2, ac.currentTime + duration);
    gain.gain.setValueAtTime(gainVal, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration);
  } catch {}
}

export function playSnap()  { beep(900, 300, 0.07, 0.25); }
export function playErase() { beep(300, 150, 0.09, 0.18); }

// Tiny optional UI click sound made with the Web Audio API (no audio files, no music).
// Sound is OFF by default and only plays when the person turns it on in the header.

let ctx = null;

function getContext() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** A very short, quiet, soft "tick". `pitch` slightly changes the tone (used when sound is switched on). */
export function playClick(pitch = 1) {
  try {
    const audio = getContext();
    if (!audio) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(720 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(480 * pitch, now + 0.05);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  } catch {
    /* audio is optional; never break the page because of it */
  }
}

const KEY = "animalscope-sound";

export function loadSoundPreference() {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function saveSoundPreference(on) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

// --- Web Audio API for Simple Sounds ---

let audioCtx;

// Initialize AudioContext on first interaction (or attempt to)
function getAudioContext() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn("Web Audio API is not supported in this browser.", e);
        }
    }
    return audioCtx;
}

function playTone(type, frequency, duration = 0.1, volume = 0.3) {
    const ctx = getAudioContext();
    if (!ctx) return; // No audio context available

    // Ensure context is running (might be suspended initially)
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type; // 'sine', 'square', 'sawtooth', 'triangle'
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    // Quick fade out to make it sound like a 'click' or 'blip'
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
}

export function playSuccessSound() {
    // Higher pitched, short sine wave
    playTone('sine', 880, 0.08, 0.25); // A5 note
    // Optional second harmonic for richness
    // setTimeout(() => playTone('sine', 1320, 0.05, 0.1), 30); // E6 note briefly
}

export function playErrorSound() {
    // Lower pitched, slightly longer square wave for harsher sound
    playTone('square', 220, 0.12, 0.3); // A3 note
}

// Call getAudioContext once on load to try and initialize early,
// although playback will likely still require user interaction.
// getAudioContext();
// Better: Ensure it's called before the first playTone via game start or interaction.
// The first button click should resume the context if needed.

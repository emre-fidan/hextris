// audio.js - Procedural sound effects using Web Audio API
// No external audio files needed. All sounds are generated in real-time.

var AudioCtx = window.AudioContext || window.webkitAudioContext;
var audioCtx = null;

function ensureAudioCtx() {
	if (!audioCtx) {
		audioCtx = new AudioCtx();
	}
	if (audioCtx.state === 'suspended') {
		audioCtx.resume();
	}
	return audioCtx;
}

// 1. Rotation sound - short subtle click
function playRotateSound() {
	var ctx = ensureAudioCtx();
	var osc = ctx.createOscillator();
	var gain = ctx.createGain();

	osc.type = 'sine';
	osc.frequency.setValueAtTime(1800, ctx.currentTime);
	osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.03);

	gain.gain.setValueAtTime(0.08, ctx.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

	osc.connect(gain);
	gain.connect(ctx.destination);

	osc.start(ctx.currentTime);
	osc.stop(ctx.currentTime + 0.05);
}

// 2. Block landing/placement - soft thud
function playLandSound() {
	var ctx = ensureAudioCtx();
	var osc = ctx.createOscillator();
	var gain = ctx.createGain();

	osc.type = 'sine';
	osc.frequency.setValueAtTime(150, ctx.currentTime);
	osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);

	gain.gain.setValueAtTime(0.15, ctx.currentTime);
	gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

	osc.connect(gain);
	gain.connect(ctx.destination);

	osc.start(ctx.currentTime);
	osc.stop(ctx.currentTime + 0.12);
}

// 3. Combo/line clear - ascending chime, pitch scales with combo multiplier
function playClearSound(comboMultiplier) {
	var ctx = ensureAudioCtx();
	var mult = comboMultiplier || 1;
	var baseFreq = 400 + (mult - 1) * 80;
	var noteCount = 3;
	var noteDuration = 0.08;

	for (var i = 0; i < noteCount; i++) {
		var osc = ctx.createOscillator();
		var gain = ctx.createGain();

		osc.type = 'sine';
		var freq = baseFreq + i * 120 * mult;
		var startTime = ctx.currentTime + i * noteDuration;

		osc.frequency.setValueAtTime(freq, startTime);

		gain.gain.setValueAtTime(0, startTime);
		gain.gain.linearRampToValueAtTime(0.1, startTime + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(startTime);
		osc.stop(startTime + noteDuration + 0.01);
	}
}

// 4. Game over - low descending tone
function playGameOverSound() {
	var ctx = ensureAudioCtx();
	var osc = ctx.createOscillator();
	var gain = ctx.createGain();

	osc.type = 'sawtooth';
	osc.frequency.setValueAtTime(300, ctx.currentTime);
	osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.6);

	gain.gain.setValueAtTime(0.12, ctx.currentTime);
	gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.3);
	gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

	osc.connect(gain);
	gain.connect(ctx.destination);

	osc.start(ctx.currentTime);
	osc.stop(ctx.currentTime + 0.7);
}

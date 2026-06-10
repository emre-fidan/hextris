window.MILESTONE_THRESHOLDS = [500, 1000, 1500, 2500, 3000, 5000, 7500, 10000];

// each step: page = page + giant background hexagon, play = central play-area hexagon, accent = flash/drift color
// steps 1-3 are gentle theme-specific tints; from 2500 on (index 3+) both themes converge to dark "neon mode" steps
window.MILESTONE_PALETTE = {
	light: [
		{ page: '#cfe5fb', play: '#aac6e6', accent: '#3b82f6' },
		{ page: '#c4f0e8', play: '#9fd0c5', accent: '#14b8a6' },
		{ page: '#cdf2c4', play: '#a9d0a3', accent: '#22c55e' },
		{ page: '#171003', play: '#4a3608', accent: '#ffb300' },
		{ page: '#1a0c03', play: '#532508', accent: '#ff6d00' },
		{ page: '#1d040a', play: '#560f1d', accent: '#ff1744' },
		{ page: '#100425', play: '#341060', accent: '#aa33ff' },
		{ page: '#02101a', play: '#084a63', accent: '#00e5ff' }
	],
	dark: [
		{ page: '#0d1f33', play: '#16344f', accent: '#3b82f6' },
		{ page: '#0a2925', play: '#14443d', accent: '#14b8a6' },
		{ page: '#0f2a0d', play: '#1c4519', accent: '#22c55e' },
		{ page: '#171003', play: '#4a3608', accent: '#ffb300' },
		{ page: '#1a0c03', play: '#532508', accent: '#ff6d00' },
		{ page: '#1d040a', play: '#560f1d', accent: '#ff1744' },
		{ page: '#100425', play: '#341060', accent: '#aa33ff' },
		{ page: '#02101a', play: '#084a63', accent: '#00e5ff' }
	]
};

// index of the first dark "neon mode" step
window.MILESTONE_NEON_START = 3;

// DOM colors forced while in neon mode so UI text stays readable on the dark backdrop
window.MILESTONE_NEON_UI = {
	'--text-color': '#ecf0f1',
	'--score-color': '#f8fafc',
	'--panel-bg': 'rgba(8,10,18,0.95)',
	'--button-bg': 'rgba(8,10,18,0.84)',
	'--button-border': 'rgba(255,255,255,0.18)',
	'--button-text': '#ecf0f1'
};

function createMilestoneState() {
	return {
		reachedIndex: -1,
		previousBest: null,
		recordCelebrated: false,
		suppressEffects: false
	};
}

function setupMilestones() {
	var style;

	if (window.milestoneStylesInjected) {
		return;
	}

	window.milestoneStylesInjected = true;
	style = document.createElement('style');
	style.textContent =
		"body, #canvas { transition: background-color 0.5s ease; }\n" +
		"#canvas { background-color: transparent; }\n" +
		".milestone-drift-layer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 40; pointer-events: none; overflow: hidden; }\n" +
		".milestone-drift-text { position: absolute; top: -18vh; font-family: 'Exo', sans-serif; font-weight: bold; white-space: nowrap; will-change: transform, opacity; opacity: 0; animation-name: milestoneDriftFall; animation-timing-function: linear; animation-fill-mode: forwards; }\n" +
		"@keyframes milestoneDriftFall {\n" +
		"	0% { transform: translateY(0); opacity: 0; }\n" +
		"	12% { opacity: 1; }\n" +
		"	88% { opacity: 1; }\n" +
		"	100% { transform: translateY(140vh); opacity: 0; }\n" +
		"}\n" +
		".milestone-flash { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 60; pointer-events: none; opacity: 0; animation: milestoneFlashPulse ease-out forwards; }\n" +
		"@keyframes milestoneFlashPulse {\n" +
		"	0% { opacity: 0; }\n" +
		"	18% { opacity: var(--flash-peak, 0.4); }\n" +
		"	100% { opacity: 0; }\n" +
		"}";
	document.head.appendChild(style);
}

function getStoredBestScore() {
	var best = null;
	var i;
	var value;

	if (window.highscores && highscores.length) {
		for (i = 0; i < highscores.length; i++) {
			value = parseInt(highscores[i], 10);
			if (!isNaN(value) && (best === null || value > best)) {
				best = value;
			}
		}
	}

	return best;
}

function milestoneHexToRgba(hex, alpha) {
	var r = parseInt(hex.substr(1, 2), 16);
	var g = parseInt(hex.substr(3, 2), 16);
	var b = parseInt(hex.substr(5, 2), 16);

	return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function applyMilestoneBackground() {
	var theme = window.currentTheme === 'dark' ? 'dark' : 'light';
	var idx = window.milestoneState ? window.milestoneState.reachedIndex : -1;
	var step;
	var key;

	if (idx < 0) {
		document.body.style.removeProperty('--page-bg');
		for (key in MILESTONE_NEON_UI) {
			document.body.style.removeProperty(key);
		}
		if (window.milestoneThemeHexDefault) {
			window.hexagonBackgroundColor = window.milestoneThemeHexDefault;
		}
		window.milestonePlayAreaColor = null;
		return;
	}

	step = MILESTONE_PALETTE[theme][idx];
	document.body.style.setProperty('--page-bg', step.page);
	window.hexagonBackgroundColor = step.page;
	window.milestonePlayAreaColor = step.play;

	if (idx >= MILESTONE_NEON_START) {
		for (key in MILESTONE_NEON_UI) {
			document.body.style.setProperty(key, MILESTONE_NEON_UI[key]);
		}
	} else {
		for (key in MILESTONE_NEON_UI) {
			document.body.style.removeProperty(key);
		}
	}
}

function milestonesOnGameStart() {
	setupMilestones();
	window.milestoneState = createMilestoneState();
	window.milestoneState.previousBest = getStoredBestScore();
	removeDriftLayers();
	// resumed saved games restore their score before this hook runs; sync visuals silently
	window.milestoneState.suppressEffects = true;
	milestonesOnScoreChange(window.score || 0);
	window.milestoneState.suppressEffects = false;
	if (window.milestoneState.reachedIndex < 0) {
		applyMilestoneBackground();
	}
}

function milestonesOnScoreChange(currentScore) {
	var idx;

	if (!window.milestoneState) {
		return;
	}

	idx = window.milestoneState.reachedIndex;
	while (idx + 1 < MILESTONE_THRESHOLDS.length && currentScore >= MILESTONE_THRESHOLDS[idx + 1]) {
		idx += 1;
	}

	if (idx !== window.milestoneState.reachedIndex) {
		window.milestoneState.reachedIndex = idx;
		applyMilestoneBackground();
		if (!window.milestoneState.suppressEffects) {
			showMilestoneFlash(idx);
			showMilestoneDrift(idx);
			clearMilestoneBoard();
		}
	}

	if (window.milestoneState.previousBest !== null &&
		!window.milestoneState.recordCelebrated &&
		currentScore > window.milestoneState.previousBest) {
		window.milestoneState.recordCelebrated = true;
		showNewRecordCelebration();
	}
}

function milestonesOnThemeChange() {
	// applyTheme just wrote the theme default; remember it so the base state can restore it
	window.milestoneThemeHexDefault = window.hexagonBackgroundColor;
	applyMilestoneBackground();
}

function showMilestoneFlash(idx) {
	var theme = window.currentTheme === 'dark' ? 'dark' : 'light';
	var accent = MILESTONE_PALETTE[theme][idx].accent;
	var flash = document.createElement('div');

	flash.className = 'milestone-flash';
	flash.style.background = 'radial-gradient(circle, ' + accent + ' 0%, rgba(0,0,0,0) 72%)';
	flash.style.setProperty('--flash-peak', String(0.32 + idx * 0.04));
	flash.style.animationDuration = (0.7 + idx * 0.05) + 's';
	document.body.appendChild(flash);
	setTimeout(function() {
		if (flash.parentNode) {
			flash.parentNode.removeChild(flash);
		}
	}, 1400);
}

function showDriftTexts(message, color, count) {
	var layer = document.createElement('div');
	var text;
	var i;

	layer.className = 'milestone-drift-layer';

	for (i = 0; i < count; i++) {
		text = document.createElement('div');
		text.className = 'milestone-drift-text';
		text.textContent = message;
		text.style.left = (4 + Math.random() * 62) + 'vw';
		text.style.fontSize = (7 + Math.random() * 6) + 'vw';
		text.style.color = color;
		text.style.animationDuration = (5.5 + Math.random() * 2.5) + 's';
		text.style.animationDelay = (i * 0.55) + 's';
		layer.appendChild(text);
	}

	document.body.appendChild(layer);
	setTimeout(function() {
		if (layer.parentNode) {
			layer.parentNode.removeChild(layer);
		}
	}, 11000);
}

function showMilestoneDrift(idx) {
	var theme = window.currentTheme === 'dark' ? 'dark' : 'light';
	var accent = MILESTONE_PALETTE[theme][idx].accent;

	showDriftTexts(String(MILESTONE_THRESHOLDS[idx]), milestoneHexToRgba(accent, 0.26), 4);
}

function showNewRecordCelebration() {
	var idx = window.milestoneState ? window.milestoneState.reachedIndex : -1;
	var onDarkBackdrop = window.currentTheme === 'dark' || idx >= MILESTONE_NEON_START;
	var color = onDarkBackdrop ? 'rgba(236,240,241,0.16)' : 'rgba(44,62,80,0.16)';

	showDriftTexts('NEW RECORD!', color, 5);
}

function removeDriftLayers() {
	var layers = document.querySelectorAll('.milestone-drift-layer');
	var i;

	for (i = 0; i < layers.length; i++) {
		if (layers[i].parentNode) {
			layers[i].parentNode.removeChild(layers[i]);
		}
	}
}

// celebratory board wipe: removes blocks directly (bypassing the deleted=1 pipeline)
// so blockDestroyed() never fires -- clearing the board must not accelerate the game
function clearMilestoneBoard() {
	var i;
	var j;
	var lane;

	if (!window.MainHex || !MainHex.blocks) {
		return;
	}

	for (i = 0; i < MainHex.blocks.length; i++) {
		lane = MainHex.blocks[i];
		for (j = 0; j < lane.length; j++) {
			spawnMilestoneBurst(lane[j]);
		}
		lane.length = 0;
	}

	if (window.blocks) {
		for (i = 0; i < blocks.length; i++) {
			if (!blocks[i].settled) {
				spawnMilestoneBurst(blocks[i]);
				blocks[i].removed = 1; // the update loop splices removed blocks before they can attach
			}
		}
	}
}

function spawnMilestoneBurst(block) {
	var coords;
	var k;
	var angle;
	var speed;

	if (!window.visualEffects || !visualEffects.particles || !window.findCenterOfBlocks) {
		return;
	}

	coords = findCenterOfBlocks([block]);

	for (k = 0; k < 7; k++) {
		angle = (Math.PI * 2 * k) / 7 + Math.random() * 0.5;
		speed = (1.2 + Math.random() * 2.2) * settings.scale;
		visualEffects.particles.push({
			x: coords.x,
			y: coords.y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			life: 1,
			decay: 0.025 + Math.random() * 0.012,
			size: (3 + Math.random() * 3) * settings.scale,
			color: block.color
		});
	}
}

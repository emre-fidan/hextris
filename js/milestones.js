window.MILESTONE_THRESHOLDS = [500, 1000, 1500, 2500, 3000, 5000, 7500, 10000];

// each step: page = page + giant background hexagon, play = central play-area hexagon, accent = flash color
window.MILESTONE_PALETTE = {
	light: [
		{ page: '#cfe5fb', play: '#aac6e6', accent: '#3b82f6' },
		{ page: '#c4f0e8', play: '#9fd0c5', accent: '#14b8a6' },
		{ page: '#cdf2c4', play: '#a9d0a3', accent: '#22c55e' },
		{ page: '#fceebb', play: '#ddc991', accent: '#f59e0b' },
		{ page: '#fcdcba', play: '#e0b394', accent: '#f97316' },
		{ page: '#fbcfe0', play: '#e0a8bf', accent: '#ec4899' },
		{ page: '#e6cdf9', play: '#c2a8de', accent: '#a855f7' },
		{ page: '#ccc8fb', play: '#a8a3e3', accent: '#6366f1' }
	],
	dark: [
		{ page: '#0d1f33', play: '#16344f', accent: '#3b82f6' },
		{ page: '#0a2925', play: '#14443d', accent: '#14b8a6' },
		{ page: '#0f2a0d', play: '#1c4519', accent: '#22c55e' },
		{ page: '#2b2208', play: '#463a12', accent: '#f59e0b' },
		{ page: '#301a09', play: '#4e2c12', accent: '#f97316' },
		{ page: '#310f24', play: '#4f1b3b', accent: '#ec4899' },
		{ page: '#250f3d', play: '#3d1c60', accent: '#a855f7' },
		{ page: '#131060', play: '#221d8f', accent: '#6366f1' }
	]
};

function createMilestoneState() {
	return {
		reachedIndex: -1,
		previousBest: null,
		recordCelebrated: false,
		suppressFlash: false
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
		"#milestone-record-layer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 40; pointer-events: none; overflow: hidden; }\n" +
		".milestone-record-text { position: absolute; top: -18vh; font-family: 'Exo', sans-serif; font-weight: bold; white-space: nowrap; will-change: transform, opacity; opacity: 0; animation-name: milestoneRecordFall; animation-timing-function: linear; animation-fill-mode: forwards; }\n" +
		"@keyframes milestoneRecordFall {\n" +
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

function applyMilestoneBackground() {
	var theme = window.currentTheme === 'dark' ? 'dark' : 'light';
	var step;

	if (!window.milestoneState || window.milestoneState.reachedIndex < 0) {
		document.body.style.removeProperty('--page-bg');
		if (window.milestoneThemeHexDefault) {
			window.hexagonBackgroundColor = window.milestoneThemeHexDefault;
		}
		window.milestonePlayAreaColor = null;
		return;
	}

	step = MILESTONE_PALETTE[theme][window.milestoneState.reachedIndex];
	document.body.style.setProperty('--page-bg', step.page);
	window.hexagonBackgroundColor = step.page;
	window.milestonePlayAreaColor = step.play;
}

function milestonesOnGameStart() {
	setupMilestones();
	window.milestoneState = createMilestoneState();
	window.milestoneState.previousBest = getStoredBestScore();
	removeRecordCelebration();
	// resumed saved games restore their score before this hook runs; sync silently
	window.milestoneState.suppressFlash = true;
	milestonesOnScoreChange(window.score || 0);
	window.milestoneState.suppressFlash = false;
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
		if (!window.milestoneState.suppressFlash) {
			showMilestoneFlash(idx);
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

function showNewRecordCelebration() {
	var layer;
	var text;
	var i;
	var color = window.currentTheme === 'dark' ? 'rgba(236,240,241,0.14)' : 'rgba(44,62,80,0.16)';

	removeRecordCelebration();
	layer = document.createElement('div');
	layer.id = 'milestone-record-layer';

	for (i = 0; i < 5; i++) {
		text = document.createElement('div');
		text.className = 'milestone-record-text';
		text.textContent = 'NEW RECORD!';
		text.style.left = (4 + Math.random() * 62) + 'vw';
		text.style.fontSize = (7 + Math.random() * 6) + 'vw';
		text.style.color = color;
		text.style.animationDuration = (5.5 + Math.random() * 2.5) + 's';
		text.style.animationDelay = (i * 0.55) + 's';
		layer.appendChild(text);
	}

	document.body.appendChild(layer);
	window.milestoneRecordTimeout = setTimeout(removeRecordCelebration, 11000);
}

function removeRecordCelebration() {
	var layer = document.getElementById('milestone-record-layer');

	if (window.milestoneRecordTimeout) {
		clearTimeout(window.milestoneRecordTimeout);
		window.milestoneRecordTimeout = null;
	}

	if (layer && layer.parentNode) {
		layer.parentNode.removeChild(layer);
	}
}

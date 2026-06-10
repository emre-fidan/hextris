window.MILESTONE_THRESHOLDS = [500, 1000, 1500, 2500, 3000, 5000, 7500, 10000];

window.MILESTONE_PALETTE = {
	light: ['#e2ecf7', '#d9f0ec', '#ddf2d9', '#f5eccf', '#f7e3cd', '#f7dde7', '#ebdcf6', '#dcd9f7'],
	dark: ['#101a26', '#0e2120', '#122112', '#262011', '#291811', '#291320', '#1f1430', '#191243']
};

function createMilestoneState() {
	return {
		reachedIndex: -1,
		previousBest: null,
		recordCelebrated: false
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
		"body, #canvas { transition: background-color 1.2s ease; }\n" +
		"#canvas { background-color: transparent; }\n" +
		"#milestone-record-layer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none; overflow: hidden; }\n" +
		".milestone-record-text { position: absolute; top: -18vh; font-family: 'Exo', sans-serif; font-weight: bold; white-space: nowrap; will-change: transform, opacity; opacity: 0; animation-name: milestoneRecordFall; animation-timing-function: linear; animation-fill-mode: forwards; }\n" +
		"@keyframes milestoneRecordFall {\n" +
		"	0% { transform: translateY(0); opacity: 0; }\n" +
		"	12% { opacity: 1; }\n" +
		"	88% { opacity: 1; }\n" +
		"	100% { transform: translateY(140vh); opacity: 0; }\n" +
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

	if (!window.milestoneState || window.milestoneState.reachedIndex < 0) {
		document.body.style.removeProperty('--page-bg');
		return;
	}

	document.body.style.setProperty('--page-bg', MILESTONE_PALETTE[theme][window.milestoneState.reachedIndex]);
}

function milestonesOnGameStart() {
	setupMilestones();
	window.milestoneState = createMilestoneState();
	window.milestoneState.previousBest = getStoredBestScore();
	removeRecordCelebration();
	// resumed saved games restore their score before this hook runs
	milestonesOnScoreChange(window.score || 0);
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
	}

	if (window.milestoneState.previousBest !== null &&
		!window.milestoneState.recordCelebrated &&
		currentScore > window.milestoneState.previousBest) {
		window.milestoneState.recordCelebrated = true;
		showNewRecordCelebration();
	}
}

function milestonesOnThemeChange() {
	applyMilestoneBackground();
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

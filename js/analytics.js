window.ANALYTICS_CONFIG = window.ANALYTICS_CONFIG || {
	endpoint: "https://raspi.tailcb08bd.ts.net/api/session-summary",
	buildVersion: "2026-06-10-frontend-2"
};

function getAnalyticsDefaultInputMode() {
	if (window.settings && settings.platform === "mobile") {
		return "touch";
	}

	return "keyboard_mouse";
}

function createAnalyticsState() {
	return {
		active: false,
		sent: false,
		sessionStartedAt: 0,
		activePlayStartedAt: 0,
		accumulatedActivePlayMs: 0,
		lastClearActiveMs: 0,
		platform: "desktop",
		inputModeDetected: getAnalyticsDefaultInputMode(),
		themeUsed: window.currentTheme || "light",
		resumedSavedGame: false,
		restartCount: 0,
		pauseCount: 0,
		maxComboMultiplier: 0,
		clearEventCount: 0,
		blocksClearedTotal: 0,
		blocksSpawnedTotal: 0,
		rotationsLeft: 0,
		rotationsRight: 0,
		speedUpUses: 0,
		longestNoClearMs: 0,
		helpOpened: false
	};
}

function setupAnalytics() {
	if (!window.analyticsState) {
		window.analyticsState = createAnalyticsState();
	}

	window.analyticsState.platform = settings.platform === "mobile" ? "mobile" : "desktop";
	window.analyticsState.inputModeDetected = window.analyticsState.inputModeDetected || getAnalyticsDefaultInputMode();
	window.analyticsState.themeUsed = window.currentTheme || window.analyticsState.themeUsed || "light";

	if (window.analyticsListenersBound) {
		return;
	}

	window.analyticsListenersBound = true;
	window.addEventListener("beforeunload", function() {
		finalizeAnalyticsSession("unload");
	});
	window.addEventListener("pagehide", function() {
		finalizeAnalyticsSession("pagehide");
	});
}

function resetAnalyticsSession() {
	window.analyticsState = createAnalyticsState();
	window.analyticsState.platform = settings.platform === "mobile" ? "mobile" : "desktop";
	window.analyticsState.themeUsed = window.currentTheme || "light";
}

function beginAnalyticsSession(resumedSavedGame) {
	if (!window.analyticsState) {
		setupAnalytics();
	}

	if (window.analyticsState.active) {
		return;
	}

	resetAnalyticsSession();
	window.analyticsState.active = true;
	window.analyticsState.sent = false;
	window.analyticsState.sessionStartedAt = Date.now();
	window.analyticsState.activePlayStartedAt = Date.now();
	window.analyticsState.resumedSavedGame = !!resumedSavedGame;
}

function getCurrentActivePlayMs() {
	if (!window.analyticsState || !window.analyticsState.active) {
		return 0;
	}

	if (!window.analyticsState.activePlayStartedAt) {
		return window.analyticsState.accumulatedActivePlayMs;
	}

	return window.analyticsState.accumulatedActivePlayMs + (Date.now() - window.analyticsState.activePlayStartedAt);
}

function pauseAnalyticsGameplay() {
	if (!window.analyticsState || !window.analyticsState.active || !window.analyticsState.activePlayStartedAt) {
		return;
	}

	window.analyticsState.accumulatedActivePlayMs = getCurrentActivePlayMs();
	window.analyticsState.activePlayStartedAt = 0;
}

function resumeAnalyticsGameplay() {
	if (!window.analyticsState || !window.analyticsState.active || window.analyticsState.activePlayStartedAt) {
		return;
	}

	window.analyticsState.activePlayStartedAt = Date.now();
}

function registerAnalyticsInputMode(mode) {
	if (!window.analyticsState || !window.analyticsState.active) {
		return;
	}

	window.analyticsState.inputModeDetected = mode;
}

function registerAnalyticsPause() {
	if (!window.analyticsState || !window.analyticsState.active) {
		return;
	}

	window.analyticsState.pauseCount += 1;
}

function registerAnalyticsRestart() {
	if (!window.analyticsState || !window.analyticsState.active) {
		return;
	}

	window.analyticsState.restartCount += 1;
}

function registerAnalyticsRotation(steps) {
	if (!window.analyticsState || !window.analyticsState.active) {
		return;
	}

	if (steps > 0) {
		window.analyticsState.rotationsLeft += steps;
	} else if (steps < 0) {
		window.analyticsState.rotationsRight += Math.abs(steps);
	}
}

function registerAnalyticsSpeedUpUse() {
	if (!window.analyticsState || !window.analyticsState.active) {
		return;
	}

	window.analyticsState.speedUpUses += 1;
}

function registerAnalyticsBlockSpawn() {
	if (!window.analyticsState || !window.analyticsState.active) {
		return;
	}

	window.analyticsState.blocksSpawnedTotal += 1;
}

function registerAnalyticsClearEvent(blocksCleared, comboMultiplier) {
	var currentActivePlayMs;
	var quietGapMs;

	if (!window.analyticsState || !window.analyticsState.active) {
		return;
	}

	currentActivePlayMs = getCurrentActivePlayMs();
	quietGapMs = currentActivePlayMs - window.analyticsState.lastClearActiveMs;

	if (quietGapMs > window.analyticsState.longestNoClearMs) {
		window.analyticsState.longestNoClearMs = quietGapMs;
	}

	window.analyticsState.lastClearActiveMs = currentActivePlayMs;
	window.analyticsState.clearEventCount += 1;
	window.analyticsState.blocksClearedTotal += blocksCleared;
	window.analyticsState.maxComboMultiplier = Math.max(window.analyticsState.maxComboMultiplier, comboMultiplier);
}

function registerAnalyticsHelpOpened() {
	if (!window.analyticsState || !window.analyticsState.active) {
		return;
	}

	window.analyticsState.helpOpened = true;
}

function registerAnalyticsTheme(themeName) {
	if (!window.analyticsState) {
		return;
	}

	window.analyticsState.themeUsed = themeName;
}

function buildAnalyticsSummary() {
	var survivalTimeMs;
	var finalQuietGapMs;

	if (!window.analyticsState || !window.analyticsState.active) {
		return null;
	}

	pauseAnalyticsGameplay();
	survivalTimeMs = window.analyticsState.accumulatedActivePlayMs;
	finalQuietGapMs = survivalTimeMs - window.analyticsState.lastClearActiveMs;
	window.analyticsState.longestNoClearMs = Math.max(window.analyticsState.longestNoClearMs, finalQuietGapMs);

	return {
		duration_ms: Date.now() - window.analyticsState.sessionStartedAt,
		build_version: window.ANALYTICS_CONFIG.buildVersion,
		platform: window.analyticsState.platform,
		input_mode_detected: window.analyticsState.inputModeDetected,
		theme_used: window.analyticsState.themeUsed,
		resumed_saved_game: window.analyticsState.resumedSavedGame,
		final_score: window.score || 0,
		survival_time_ms: survivalTimeMs,
		restart_count: window.analyticsState.restartCount,
		pause_count: window.analyticsState.pauseCount,
		max_combo_multiplier: window.analyticsState.maxComboMultiplier,
		clear_event_count: window.analyticsState.clearEventCount,
		blocks_cleared_total: window.analyticsState.blocksClearedTotal,
		blocks_spawned_total: window.analyticsState.blocksSpawnedTotal,
		rotations_left: window.analyticsState.rotationsLeft,
		rotations_right: window.analyticsState.rotationsRight,
		speed_up_uses: window.analyticsState.speedUpUses,
		longest_no_clear_ms: window.analyticsState.longestNoClearMs,
		help_opened: window.analyticsState.helpOpened
	};
}

function sendAnalyticsSummary(payload, useBeacon) {
	var endpoint = window.ANALYTICS_CONFIG && window.ANALYTICS_CONFIG.endpoint;
	var body;

	if (!endpoint) {
		return;
	}

	body = JSON.stringify(payload);

	if (useBeacon && navigator.sendBeacon) {
		navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
		return;
	}

	fetch(endpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: body,
		keepalive: true
	}).catch(function() {});
}

function finalizeAnalyticsSession(reason) {
	var payload;
	var shouldUseBeacon;

	if (!window.analyticsState || !window.analyticsState.active || window.analyticsState.sent) {
		return;
	}

	payload = buildAnalyticsSummary();
	if (!payload) {
		return;
	}

	shouldUseBeacon = reason === "unload" || reason === "pagehide";
	sendAnalyticsSummary(payload, shouldUseBeacon);
	window.analyticsState.sent = true;
	window.analyticsState.active = false;
}

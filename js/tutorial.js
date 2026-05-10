// tutorial.js - Step-by-step in-game tutorial for first-time players.
// Non-blocking DOM overlays. Game runs at slowed speed during the tutorial.

(function() {
	var FLAG = 'hextris_tutorial_seen';
	var SLOW_FACTOR = 0.45;

	// Each step shows a text pill and optionally a highlight.
	// Steps either auto-advance after `timeout` or wait for a `waitFor` event
	// (with `maxWait` as a safety fallback).
	var STEPS = [
		{ id: 'welcome',     text: 'Welcome to Hextris!',                            position: 'center', timeout: 2500,                            highlight: null },
		{ id: 'hexagon',     text: 'This is your hexagon',                           position: 'top',    timeout: 3000,                            highlight: 'centerGlow' },
		{ id: 'rotateLeft',  text: 'Try rotating left',                              position: 'top',    waitFor: 'rotateLeft',  maxWait: 15000,   highlight: 'leftArrow' },
		{ id: 'rotateRight', text: 'Now rotate right',                               position: 'top',    waitFor: 'rotateRight', maxWait: 15000,   highlight: 'rightArrow' },
		{ id: 'blocksFall',  text: 'Blocks fall toward the center',                  position: 'top',    waitFor: 'block',       maxWait: 6000,    highlight: null },
		{ id: 'speedUp',     text: 'Hold the down arrow to speed up falling blocks', position: 'top',    waitFor: 'speedUp',     maxWait: 8000,    highlight: 'downArrow' },
		{ id: 'match',       text: 'Match 3+ same-color blocks to clear them',       position: 'bottom', waitFor: 'match',       maxWait: 14000,   highlight: null },
		{ id: 'comboTimer',  text: 'This ring is your combo timer',                  position: 'top',    timeout: 3000,                            highlight: 'ringPointer' },
		{ id: 'overflow',    text: 'If a side fills up, the game ends',              position: 'bottom', timeout: 3000,                            highlight: 'outerRingPulse' },
		{ id: 'done',        text: "You are ready! Good luck.",                      position: 'center', timeout: 2200,                            highlight: null }
	];

	var state = {
		active: false,
		currentStep: -1,
		stepTimer: null,
		maxWaitTimer: null,
		slowdownApplied: false,
		injected: false
	};

	function isFlagSet() {
		try { return !!localStorage.getItem(FLAG); } catch (e) { return false; }
	}

	function setFlag() {
		try { localStorage.setItem(FLAG, '1'); } catch (e) {}
	}

	function injectStyles() {
		var css = [
			'.tutorial-el {',
			'  position: fixed;',
			'  pointer-events: none;',
			'  opacity: 0;',
			'  transition: opacity 0.4s ease-in-out;',
			'  z-index: 200;',
			'  font-family: \'Exo 2\', \'Exo\', sans-serif;',
			'  text-align: center;',
			'}',
			'.tutorial-el.tutorial-visible { opacity: 1; }',
			'',
			'#tutorial-pill {',
			'  left: 50%;',
			'  transform: translateX(-50%);',
			'  background: rgba(44,62,80,0.9);',
			'  color: #ecf0f1;',
			'  padding: 12px 22px;',
			'  border-radius: 24px;',
			'  font-size: 17px;',
			'  letter-spacing: 1px;',
			'  font-weight: 500;',
			'  box-shadow: 0 6px 18px rgba(0,0,0,0.22);',
			'  white-space: nowrap;',
			'  max-width: 92vw;',
			'}',
			'',
			'.tutorial-arrow {',
			'  font-size: 56px;',
			'  color: #2c3e50;',
			'  text-shadow: 0 0 14px rgba(255,255,255,0.85);',
			'  display: flex;',
			'  flex-direction: column;',
			'  align-items: center;',
			'}',
			'.tutorial-arrow.tutorial-visible {',
			'  animation: tutorialPulse 1.4s ease-in-out infinite;',
			'}',
			'#tutorial-arrow-left, #tutorial-arrow-right {',
			'  top: 50%;',
			'  transform: translateY(-50%);',
			'}',
			'#tutorial-arrow-down {',
			'  left: 50%;',
			'  transform: translateX(-50%);',
			'}',
			'.tutorial-arrow-label {',
			'  font-size: 15px;',
			'  margin-top: 4px;',
			'  text-transform: uppercase;',
			'  letter-spacing: 3px;',
			'  font-weight: 600;',
			'}',
			'',
			'#tutorial-center-glow {',
			'  top: 50%;',
			'  left: 50%;',
			'  transform: translate(-50%, -50%);',
			'  border-radius: 50%;',
			'  border: 3px solid #2c3e50;',
			'  box-shadow: 0 0 24px rgba(44,62,80,0.45), inset 0 0 14px rgba(44,62,80,0.25);',
			'}',
			'#tutorial-center-glow.tutorial-visible {',
			'  animation: tutorialGlowPulse 1.8s ease-in-out infinite;',
			'}',
			'',
			'#tutorial-ring-pointer {',
			'  left: 50%;',
			'  transform: translateX(-50%);',
			'  font-size: 30px;',
			'  color: #2c3e50;',
			'  text-shadow: 0 0 10px rgba(255,255,255,0.85);',
			'}',
			'#tutorial-ring-pointer.tutorial-visible {',
			'  animation: tutorialPulse 1.2s ease-in-out infinite;',
			'}',
			'',
			'#tutorial-outer-pulse {',
			'  top: 50%;',
			'  left: 50%;',
			'  transform: translate(-50%, -50%);',
			'  border-radius: 50%;',
			'  border: 4px solid #e67e22;',
			'  box-shadow: 0 0 30px rgba(230,126,34,0.55), inset 0 0 18px rgba(230,126,34,0.35);',
			'}',
			'#tutorial-outer-pulse.tutorial-visible {',
			'  animation: tutorialWarn 1s ease-in-out infinite;',
			'}',
			'',
			'@keyframes tutorialPulse {',
			'  0%, 100% { opacity: 0.65; }',
			'  50% { opacity: 1; }',
			'}',
			'@keyframes tutorialGlowPulse {',
			'  0%, 100% { opacity: 0.55; }',
			'  50% { opacity: 1; }',
			'}',
			'@keyframes tutorialWarn {',
			'  0%, 100% { opacity: 0.55; box-shadow: 0 0 22px rgba(230,126,34,0.4), inset 0 0 14px rgba(230,126,34,0.25); }',
			'  50% { opacity: 1; box-shadow: 0 0 38px rgba(230,126,34,0.7), inset 0 0 22px rgba(230,126,34,0.45); }',
			'}',
			'',
			'#tutorial-skip {',
			'  position: fixed;',
			'  top: 16px;',
			'  right: 16px;',
			'  font-family: \'Exo 2\', \'Exo\', sans-serif;',
			'  font-size: 13px;',
			'  color: #ecf0f1;',
			'  background: rgba(44,62,80,0.85);',
			'  cursor: pointer;',
			'  opacity: 0;',
			'  transition: opacity 0.4s ease-in-out, background 0.2s ease-in-out;',
			'  pointer-events: none;',
			'  z-index: 201;',
			'  padding: 9px 18px;',
			'  border-radius: 20px;',
			'  user-select: none;',
			'  -webkit-user-select: none;',
			'  letter-spacing: 2px;',
			'  text-transform: uppercase;',
			'  font-weight: 500;',
			'  box-shadow: 0 4px 12px rgba(0,0,0,0.18);',
			'}',
			'#tutorial-skip.tutorial-visible {',
			'  opacity: 0.95;',
			'  pointer-events: auto;',
			'}',
			'#tutorial-skip:hover { background: rgba(44,62,80,0.98); }'
		].join('\n');
		var styleEl = document.createElement('style');
		styleEl.id = 'tutorial-styles';
		styleEl.textContent = css;
		document.head.appendChild(styleEl);
	}

	function injectDOM() {
		var html = ''
			+ '<div id="tutorial-pill" class="tutorial-el"></div>'
			+ '<div id="tutorial-arrow-left" class="tutorial-el tutorial-arrow">'
			+ '<i class="fa fa-arrow-left"></i>'
			+ '<div class="tutorial-arrow-label">rotate</div>'
			+ '</div>'
			+ '<div id="tutorial-arrow-right" class="tutorial-el tutorial-arrow">'
			+ '<i class="fa fa-arrow-right"></i>'
			+ '<div class="tutorial-arrow-label">rotate</div>'
			+ '</div>'
			+ '<div id="tutorial-arrow-down" class="tutorial-el tutorial-arrow">'
			+ '<i class="fa fa-arrow-down"></i>'
			+ '<div class="tutorial-arrow-label">speed up</div>'
			+ '</div>'
			+ '<div id="tutorial-center-glow" class="tutorial-el"></div>'
			+ '<div id="tutorial-ring-pointer" class="tutorial-el"><i class="fa fa-arrow-down"></i></div>'
			+ '<div id="tutorial-outer-pulse" class="tutorial-el"></div>'
			+ '<div id="tutorial-skip">skip tutorial</div>';

		var container = document.createElement('div');
		container.innerHTML = html;
		while (container.firstChild) {
			document.body.appendChild(container.firstChild);
		}

		var skipBtn = document.getElementById('tutorial-skip');
		if (skipBtn) {
			var clickHandler = function(e) {
				if (e) { e.preventDefault(); e.stopPropagation(); }
				window.tutorialSkip();
				return false;
			};
			skipBtn.addEventListener('click', clickHandler);
			skipBtn.addEventListener('touchstart', clickHandler);
		}
	}

	function getOuterRadius() {
		if (typeof settings === 'undefined' || !settings) return 300;
		var scale = settings.scale || 1;
		var blockH = (settings.baseBlockHeight || 30) * scale;
		var hexW = (settings.baseHexWidth || 100) * scale;
		var rows = settings.rows || 6;
		return rows * blockH * (2 / Math.sqrt(3)) + hexW;
	}

	function getInnerRadius() {
		if (typeof settings === 'undefined' || !settings) return 80;
		var scale = settings.scale || 1;
		return (settings.baseHexWidth || 100) * scale;
	}

	function reposition() {
		var outerR = getOuterRadius();
		var innerR = getInnerRadius();

		var leftArrow = document.getElementById('tutorial-arrow-left');
		var rightArrow = document.getElementById('tutorial-arrow-right');
		var arrowOffset = outerR + 50;
		if (leftArrow) leftArrow.style.left = 'calc(50% - ' + arrowOffset + 'px)';
		if (rightArrow) rightArrow.style.right = 'calc(50% - ' + arrowOffset + 'px)';

		var centerGlow = document.getElementById('tutorial-center-glow');
		if (centerGlow) {
			var d = (innerR * 2) + 30;
			centerGlow.style.width = d + 'px';
			centerGlow.style.height = d + 'px';
		}

		var ringPointer = document.getElementById('tutorial-ring-pointer');
		if (ringPointer) ringPointer.style.top = 'calc(50% - ' + (outerR + 32) + 'px)';

		var downArrow = document.getElementById('tutorial-arrow-down');
		if (downArrow) downArrow.style.top = 'calc(50% + ' + (innerR + 24) + 'px)';

		var outerPulse = document.getElementById('tutorial-outer-pulse');
		if (outerPulse) {
			var d2 = (outerR * 2) + 24;
			outerPulse.style.width = d2 + 'px';
			outerPulse.style.height = d2 + 'px';
		}
	}

	function showEl(id) {
		var el = document.getElementById(id);
		if (el) el.classList.add('tutorial-visible');
	}
	function hideEl(id) {
		var el = document.getElementById(id);
		if (el) el.classList.remove('tutorial-visible');
	}

	function hideAllHighlights() {
		hideEl('tutorial-arrow-left');
		hideEl('tutorial-arrow-right');
		hideEl('tutorial-arrow-down');
		hideEl('tutorial-center-glow');
		hideEl('tutorial-ring-pointer');
		hideEl('tutorial-outer-pulse');
	}

	function showHighlight(name) {
		switch (name) {
			case 'leftArrow':       showEl('tutorial-arrow-left'); break;
			case 'rightArrow':      showEl('tutorial-arrow-right'); break;
			case 'downArrow':       showEl('tutorial-arrow-down'); break;
			case 'centerGlow':      showEl('tutorial-center-glow'); break;
			case 'ringPointer':     showEl('tutorial-ring-pointer'); break;
			case 'outerRingPulse':  showEl('tutorial-outer-pulse'); break;
		}
	}

	function setPillContent(text, position) {
		var pill = document.getElementById('tutorial-pill');
		if (!pill) return;
		pill.textContent = text;
		var outerR = getOuterRadius();
		if (position === 'top') {
			pill.style.top = 'calc(50% - ' + (outerR + 80) + 'px)';
			pill.style.bottom = 'auto';
		} else if (position === 'bottom') {
			pill.style.top = 'calc(50% + ' + (outerR + 50) + 'px)';
			pill.style.bottom = 'auto';
		} else {
			pill.style.top = '50%';
			pill.style.bottom = 'auto';
			pill.style.transform = 'translate(-50%, -50%)';
			return;
		}
		pill.style.transform = 'translateX(-50%)';
	}

	function clearStepTimers() {
		if (state.stepTimer) { clearTimeout(state.stepTimer); state.stepTimer = null; }
		if (state.maxWaitTimer) { clearTimeout(state.maxWaitTimer); state.maxWaitTimer = null; }
	}

	function startStep(idx) {
		clearStepTimers();
		hideAllHighlights();

		if (idx >= STEPS.length) { complete(); return; }

		state.currentStep = idx;
		var step = STEPS[idx];

		reposition();
		setPillContent(step.text, step.position);
		showEl('tutorial-pill');
		showEl('tutorial-skip');
		if (step.highlight) showHighlight(step.highlight);

		if (step.timeout) {
			state.stepTimer = setTimeout(function() { advance(); }, step.timeout);
		}
		if (step.maxWait) {
			state.maxWaitTimer = setTimeout(function() { advance(); }, step.maxWait);
		}
	}

	function advance() {
		if (!state.active) return;
		startStep(state.currentStep + 1);
	}

	function applySlowdown() {
		if (state.slowdownApplied) return;
		if (typeof window.rush !== 'number') return;
		state.slowdownApplied = true;
		window.rush = window.rush * SLOW_FACTOR;
	}

	function removeSlowdown() {
		if (!state.slowdownApplied) return;
		state.slowdownApplied = false;
		if (typeof window.rush !== 'number') return;
		window.rush = window.rush / SLOW_FACTOR;
	}

	function reset() {
		clearStepTimers();
		hideAllHighlights();
		hideEl('tutorial-pill');
		state.currentStep = -1;
	}

	function complete() {
		state.active = false;
		setFlag();
		clearStepTimers();
		hideAllHighlights();
		hideEl('tutorial-pill');
		hideEl('tutorial-skip');
		removeSlowdown();
	}

	window.tutorialInit = function() {
		if (state.injected) return;
		state.injected = true;
		if (isFlagSet()) return;
		injectStyles();
		injectDOM();
		state.active = true;
		window.addEventListener('resize', reposition);
	};

	window.tutorialIsActive = function() {
		return state.active;
	};

	window.tutorialOnGameStart = function() {
		if (!state.active) return;
		setTimeout(function() {
			if (!state.active) return;
			if (typeof gameState === 'undefined' || gameState !== 1) return;
			reset();
			applySlowdown();
			startStep(0);
		}, 0);
	};

	window.tutorialOnRotate = function(steps) {
		if (!state.active) return;
		var step = STEPS[state.currentStep];
		if (!step || !step.waitFor) return;
		if (step.waitFor === 'rotateLeft' && steps === 1) advance();
		else if (step.waitFor === 'rotateRight' && steps === -1) advance();
	};

	window.tutorialOnFirstBlock = function() {
		if (!state.active) return;
		var step = STEPS[state.currentStep];
		if (step && step.waitFor === 'block') advance();
	};

	window.tutorialOnFirstMatch = function() {
		if (!state.active) return;
		var step = STEPS[state.currentStep];
		if (step && step.waitFor === 'match') advance();
	};

	window.tutorialOnSpeedUp = function() {
		if (!state.active) return;
		var step = STEPS[state.currentStep];
		if (step && step.waitFor === 'speedUp') advance();
	};

	window.tutorialSkip = function() {
		complete();
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', window.tutorialInit);
	} else {
		window.tutorialInit();
	}
})();

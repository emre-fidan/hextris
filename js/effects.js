function initVisualEffects() {
	window.visualEffects = {
		particles: [],
		speedLines: []
	};
}

function ensureVisualEffects() {
	if (!window.visualEffects) {
		initVisualEffects();
	}
}

function triggerClearEffect(blocksCleared, comboMultiplier, center, color) {
	var effectColor = color || "#ffffff";
	var particleCount;
	var i;
	var angle;
	var speed;
	var size;

	ensureVisualEffects();
	particleCount = Math.min(14 + blocksCleared * 2 + Math.max(comboMultiplier - 1, 0) * 4, 28);

	for (i = 0; i < particleCount; i++) {
		angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.35;
		speed = (1.4 + Math.random() * 2.8) * settings.scale * (1 + comboMultiplier * 0.08);
		size = (3 + Math.random() * 4 + comboMultiplier) * settings.scale;

		visualEffects.particles.push({
			x: center.x,
			y: center.y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			life: 1,
			decay: 0.022 + Math.random() * 0.01,
			size: size,
			color: effectColor
		});
	}
}

function updateVisualEffects(dt) {
	var i;
	var particle;
	var speedLine;
	var spawnCount;
	var sourceBlock;
	var theta;
	var angleRad;
	var baseDistance;
	var baseX;
	var baseY;
	var edgeOffset;
	var normalX;
	var normalY;
	var halfWidth;

	ensureVisualEffects();

	if (window.settings && settings.speedUpKeyHeld && gameState === 1 && window.blocks && blocks.length) {
		spawnCount = settings.platform === "mobile" ? 2 : 3;
		for (i = 0; i < spawnCount; i++) {
			sourceBlock = blocks[randInt(0, blocks.length)];
			theta = sourceBlock.angle;
			angleRad = theta * (Math.PI / 180);
			baseDistance = sourceBlock.distFromHex + sourceBlock.height * (0.2 + Math.random() * 0.9);
			halfWidth = sourceBlock.distFromHex / Math.sqrt(3);
			edgeOffset = halfWidth * (0.72 + Math.random() * 0.2) * (Math.random() < 0.5 ? -1 : 1);
			normalX = Math.cos(angleRad);
			normalY = Math.sin(angleRad);
			baseX = trueCanvas.width / 2 + Math.sin(angleRad) * baseDistance + normalX * edgeOffset + gdx;
			baseY = trueCanvas.height / 2 - Math.cos(angleRad) * baseDistance + normalY * edgeOffset + gdy;

			visualEffects.speedLines.push({
				x: baseX,
				y: baseY,
				dx: Math.sin(angleRad),
				dy: -Math.cos(angleRad),
				length: (40 + Math.random() * 56) * settings.scale,
				speed: (20 + Math.random() * 18) * settings.scale,
				opacity: 0.12 + Math.random() * 0.12
			});
		}
	}

	for (i = visualEffects.particles.length - 1; i >= 0; i--) {
		particle = visualEffects.particles[i];
		particle.x += particle.vx * dt;
		particle.y += particle.vy * dt;
		particle.vx *= 0.985;
		particle.vy *= 0.985;
		particle.life -= particle.decay * dt;
		if (particle.life <= 0) {
			visualEffects.particles.splice(i, 1);
		}
	}

	for (i = visualEffects.speedLines.length - 1; i >= 0; i--) {
		speedLine = visualEffects.speedLines[i];
		speedLine.x += speedLine.dx * speedLine.speed * dt;
		speedLine.y += speedLine.dy * speedLine.speed * dt;
		speedLine.opacity -= (settings.speedUpKeyHeld ? 0.006 : 0.03) * dt;
		if (
			speedLine.x < -speedLine.length ||
			speedLine.x > trueCanvas.width + speedLine.length ||
			speedLine.y < -speedLine.length ||
			speedLine.y > trueCanvas.height + speedLine.length ||
			speedLine.opacity <= 0
		) {
			visualEffects.speedLines.splice(i, 1);
		}
	}
}

function renderVisualForeground() {
	var i;
	var particle;
	var speedLine;

	ensureVisualEffects();
	ctx.save();

	for (i = 0; i < visualEffects.speedLines.length; i++) {
		speedLine = visualEffects.speedLines[i];
		ctx.globalAlpha = speedLine.opacity;
		ctx.strokeStyle = "#dff6ff";
		ctx.lineWidth = 1.8 * settings.scale;
		ctx.beginPath();
		ctx.moveTo(speedLine.x, speedLine.y);
		ctx.lineTo(
			speedLine.x - speedLine.dx * speedLine.length,
			speedLine.y - speedLine.dy * speedLine.length
		);
		ctx.stroke();
	}

	for (i = 0; i < visualEffects.particles.length; i++) {
		particle = visualEffects.particles[i];
		ctx.globalAlpha = particle.life;
		ctx.fillStyle = particle.color;
		ctx.beginPath();
		ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2, false);
		ctx.fill();
	}

	ctx.restore();
}

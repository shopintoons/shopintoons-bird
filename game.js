// Flappy Shopintoons - jeu style Flappy Bird en 9:16
// Nadir doit éviter des pubs / panneaux Shopintoons

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreValueEl = document.getElementById("scoreValue");
const bestValueEl = document.getElementById("bestValue");
const overlayEl = document.getElementById("overlay");
const overlayTitleEl = document.getElementById("overlayTitle");
const overlayTextEl = document.getElementById("overlayText");
const playButton = document.getElementById("playButton");

const STORAGE_KEY = "flappy_shopintoons_best";

let gameState = "start"; // start | playing | gameover

const bird = {
  x: 90,
  y: canvas.height / 2,
  radius: 16,
  vy: 0
};

const physics = {
  gravity: 0.45,
  flap: -7
};

const pipes = [];
const pipeConfig = {
  width: 70,
  gap: 150,
  speed: 2.5,
  spawnInterval: 1600 // ms
};

const obstacleLabels = [
  "PUB TV 3H",
  "LIVE TIKTOK",
  "BUTTER STICK",
  "SAFETY COFFIN",
  "CASQUE ANTI-ODEURS",
  "COUSSIN CONNECTÉ",
  "RÉVEIL BOMBE",
  "LUNETTES ESPION"
];

let score = 0;
let bestScore = 0;
let lastSpawnTime = 0;
let lastFrameTime = 0;
let passedPipeId = null;
let pipeIdCounter = 0;

// --- utils

function resetGame() {
  score = 0;
  bird.y = canvas.height / 2;
  bird.vy = 0;
  pipes.length = 0;
  lastSpawnTime = 0;
  passedPipeId = null;
  scoreValueEl.textContent = "0";
}

function loadBestScore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const val = parseInt(raw, 10);
    if (!isNaN(val)) {
      bestScore = val;
      bestValueEl.textContent = bestScore.toString();
    }
  } catch (e) {
    console.warn("Impossible de charger le meilleur score", e);
  }
}

function saveBestScore() {
  try {
    localStorage.setItem(STORAGE_KEY, bestScore.toString());
  } catch (e) {
    console.warn("Impossible de sauvegarder le meilleur score", e);
  }
}

function flap() {
  if (gameState !== "playing") return;
  bird.vy = physics.flap;
}

// --- Pipes

function spawnPipe() {
  const minHeight = 60;
  const maxHeight = canvas.height - pipeConfig.gap - 100;
  const topHeight = Math.floor(
    minHeight + Math.random() * (maxHeight - minHeight)
  );
  const label =
    obstacleLabels[Math.floor(Math.random() * obstacleLabels.length)];

  pipes.push({
    id: pipeIdCounter++,
    x: canvas.width + pipeConfig.width,
    topHeight,
    label
  });
}

// --- Loop

function update(delta) {
  if (gameState !== "playing") return;

  // gravité
  bird.vy += physics.gravity;
  bird.y += bird.vy;

  // sol / plafond
  if (bird.y - bird.radius < 0 || bird.y + bird.radius > canvas.height) {
    triggerGameOver();
    return;
  }

  // spawn pipes
  lastSpawnTime += delta;
  if (lastSpawnTime >= pipeConfig.spawnInterval) {
    spawnPipe();
    lastSpawnTime = 0;
  }

  // déplacer pipes
  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= pipeConfig.speed;

    // collision
    if (checkCollision(bird, p)) {
      triggerGameOver();
      return;
    }

    // compter score quand on passe le milieu du pipe
    const middle = p.x + pipeConfig.width / 2;
    if (middle < bird.x && passedPipeId !== p.id) {
      passedPipeId = p.id;
      score++;
      scoreValueEl.textContent = score.toString();
      if (score > bestScore) {
        bestScore = score;
        bestValueEl.textContent = bestScore.toString();
        saveBestScore();
      }
    }

    // supprimer les pipes hors écran
    if (p.x + pipeConfig.width < 0) {
      pipes.splice(i, 1);
    }
  }
}

function triggerGameOver() {
  gameState = "gameover";
  overlayTitleEl.textContent = "GAME OVER";
  overlayTextEl.textContent = `Score : ${score}  |  Meilleur : ${bestScore}\nClique sur REJOUER pour retenter ta chance !`;
  playButton.textContent = "Rejouer";
  overlayEl.style.display = "flex";
}

// --- dessin

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#1a0029");
  grad.addColorStop(0.5, "#3d0241");
  grad.addColorStop(1, "#05020a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // sol type plateau TV
  ctx.fillStyle = "#120215";
  ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
  ctx.fillStyle = "#ffef5a33";
  ctx.fillRect(0, canvas.height - 82, canvas.width, 2);
}

function drawBird() {
  // corps
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(Math.max(-0.5, Math.min(0.6, bird.vy / 10)));
  ctx.fillStyle = "#12ffb0";
  ctx.beginPath();
  ctx.ellipse(0, 0, bird.radius + 4, bird.radius, 0, 0, Math.PI * 2);
  ctx.fill();

  // tête
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(6, -6, 8, 0, Math.PI * 2);
  ctx.fill();

  // oeil
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(8, -7, 3, 0, Math.PI * 2);
  ctx.fill();

  // bouche / barbe Nadir cartoon
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(6, -2, 5, 0.2, 2.5);
  ctx.stroke();

  ctx.restore();
}

function drawPipes() {
  pipes.forEach((p) => {
    const gapTop = p.topHeight;
    const gapBottom = p.topHeight + pipeConfig.gap;

    // top pipe
    ctx.fillStyle = "#ff4fa8";
    ctx.fillRect(p.x, 0, pipeConfig.width, gapTop);

    // bottom pipe
    ctx.fillStyle = "#00ff9d";
    ctx.fillRect(p.x, gapBottom, pipeConfig.width, canvas.height - gapBottom);

    // panneau label
    ctx.fillStyle = "#120215ee";
    const panelHeight = 26;
    const panelY = gapTop - panelHeight - 8;
    if (panelY > 0) {
      ctx.fillRect(p.x - 6, panelY, pipeConfig.width + 12, panelHeight);
      ctx.fillStyle = "#ffef5a";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.label, p.x + pipeConfig.width / 2, panelY + panelHeight / 2);
    }
  });
}

function checkCollision(b, pipe) {
  const gapTop = pipe.topHeight;
  const gapBottom = pipe.topHeight + pipeConfig.gap;

  const withinPipeX =
    b.x + b.radius > pipe.x && b.x - b.radius < pipe.x + pipeConfig.width;

  if (!withinPipeX) return false;

  const hitTop = b.y - b.radius < gapTop;
  const hitBottom = b.y + b.radius > gapBottom;

  return hitTop || hitBottom;
}

function loop(timestamp) {
  if (!lastFrameTime) lastFrameTime = timestamp;
  const delta = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  if (gameState === "playing") {
    update(delta);
  }

  drawBackground();
  drawPipes();
  drawBird();

  requestAnimationFrame(loop);
}

// --- input & démarrage

function startGame() {
  resetGame();
  overlayEl.style.display = "none";
  overlayTitleEl.textContent = "FLAPPY SHOPINTOONS";
  playButton.textContent = "Jouer";
  gameState = "playing";
}

playButton.addEventListener("click", () => {
  if (gameState === "start" || gameState === "gameover") {
    startGame();
  }
});

canvas.addEventListener("pointerdown", () => {
  if (gameState === "start") {
    startGame();
  } else if (gameState === "gameover") {
    // on bloque le clic sur le canvas en gameover, on passe par le bouton
    return;
  } else {
    flap();
  }
});

// empêcher le scroll sur mobile quand on touche le canvas
canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
  },
  { passive: false }
);

// init
loadBestScore();
requestAnimationFrame(loop);

// Flappy Shopintoons v6
// Nadir sur Butter Stick, 4 difficultés, compte à rebours, musique
// + 10 fonds qui défilent horizontalement

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreValueEl = document.getElementById("scoreValue");
const bestValueEl = document.getElementById("bestValue");
const overlayEl = document.getElementById("overlay");
const overlayTitleEl = document.getElementById("overlayTitle");
const overlayTextEl = document.getElementById("overlayText");
const playButton = document.getElementById("playButton");
const diffButtons = document.querySelectorAll(".diff-btn");
const musicGameEl = document.getElementById("musicGame");
const soundGameOverEl = document.getElementById("soundGameOver");

const STORAGE_KEY = "flappy_shopintoons_best_v6";

const difficulties = {
  facile: {
    label: "Facile",
    gap: 220,
    speed: 1.8,
    spawnInterval: 1700,
    gravity: 0.42,
    flap: -7.5
  },
  moyen: {
    label: "Moyen",
    gap: 200,
    speed: 2.2,
    spawnInterval: 1500,
    gravity: 0.46,
    flap: -7
  },
  difficile: {
    label: "Difficile",
    gap: 180,
    speed: 2.6,
    spawnInterval: 1400,
    gravity: 0.5,
    flap: -6.8
  },
  shopintueur: {
    label: "Shopintueur",
    gap: 160,
    speed: 3.0,
    spawnInterval: 1300,
    gravity: 0.55,
    flap: -6.5
  }
};

let currentDifficulty = "facile";

const bird = {
  x: 90,
  y: canvas.height / 2,
  radius: 18,
  vy: 0
};

const physics = {
  gravity: difficulties[currentDifficulty].gravity,
  flap: difficulties[currentDifficulty].flap
};

const pipes = [];
const pipeConfig = {
  width: 80,
  gap: difficulties[currentDifficulty].gap,
  speed: difficulties[currentDifficulty].speed,
  spawnInterval: difficulties[currentDifficulty].spawnInterval
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

let gameState = "start"; // start | countdown | playing | gameover
let score = 0;
let bestScore = 0;
let lastSpawnTime = 0;
let lastFrameTime = 0;
let passedPipeId = null;
let pipeIdCounter = 0;
let countdownMs = 0;

// image de Nadir
const nadirImg = new Image();
nadirImg.src = "nadir.png";

// fonds défilants
const backgroundSources = [
  "bg1.jpg",
  "bg2.jpg",
  "bg3.jpg",
  "bg4.jpg",
  "bg5.jpg",
  "bg6.jpg",
  "bg7.jpg",
  "bg8.png",
  "bg9.jpg",
  "bg10.jpg"
];

const backgrounds = backgroundSources.map((src) => {
  const img = new Image();
  img.src = src;
  return img;
});
let currentBgIndex = 0;
let bgOffset = 0;

// --- audio helpers

function playGameMusic() {
  if (!musicGameEl) return;
  try {
    musicGameEl.volume = 0.5;
    musicGameEl.currentTime = 0;
    musicGameEl.play();
  } catch (e) {
    console.warn("Musique jeu bloquée par le navigateur", e);
  }
}

function stopGameMusic() {
  if (!musicGameEl) return;
  try {
    musicGameEl.pause();
  } catch (e) {}
}

function playGameOverSound() {
  if (!soundGameOverEl) return;
  try {
    soundGameOverEl.currentTime = 0;
    soundGameOverEl.play();
  } catch (e) {
    console.warn("Son game over bloqué", e);
  }
}

// --- utils

function chooseBackground() {
  currentBgIndex = Math.floor(Math.random() * backgrounds.length);
  bgOffset = 0;
}

function applyDifficulty(key) {
  currentDifficulty = key;
  const d = difficulties[key];
  pipeConfig.gap = d.gap;
  pipeConfig.speed = d.speed;
  pipeConfig.spawnInterval = d.spawnInterval;
  physics.gravity = d.gravity;
  physics.flap = d.flap;
}

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
  const maxHeight = canvas.height - pipeConfig.gap - 120;
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
  // gestion du compte à rebours
  if (gameState === "countdown") {
    countdownMs -= delta;
    if (countdownMs <= 0) {
      gameState = "playing";
    }
  }

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
  stopGameMusic();
  playGameOverSound();
  overlayTitleEl.textContent = "GAME OVER";
  overlayTextEl.textContent = `Mode : ${
    difficulties[currentDifficulty].label
  }\nScore : ${score}  |  Meilleur : ${bestScore}`;
  playButton.textContent = "Rejouer";
  overlayEl.style.display = "flex";
}

// --- dessin

function drawBackground() {
  const bgImg = backgrounds[currentBgIndex];
  const w = canvas.width;
  const h = canvas.height;

  if (bgImg && bgImg.complete) {
    let x = bgOffset;
    // deux images côte à côte pour boucler
    ctx.drawImage(bgImg, x, 0, w, h);
    ctx.drawImage(bgImg, x + w, 0, w, h);
  } else {
    // fallback dégradé
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#1b0030");
    grad.addColorStop(0.4, "#3c0144");
    grad.addColorStop(1, "#05020a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  // légère ombre en bas pour le plateau
  const baseY = canvas.height - 80;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, baseY, w, 80);

  // bande lumineuse
  ctx.fillStyle = "#ffef5a66";
  ctx.fillRect(0, baseY - 2, w, 2);

  // leds
  for (let i = 0; i < w; i += 24) {
    ctx.fillStyle = i % 48 === 0 ? "#ff4fa8" : "#12ffb0";
    ctx.fillRect(i + 6, baseY + 40, 8, 8);
  }
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(Math.max(-0.5, Math.min(0.6, bird.vy / 10)));

  const w = 80;
  const h = 80;

  if (nadirImg.complete) {
    ctx.drawImage(nadirImg, -w / 2, -h / 2, w, h);
  } else {
    ctx.fillStyle = "#12ffb0";
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawPipes() {
  pipes.forEach((p) => {
    const gapTop = p.topHeight;
    const gapBottom = p.topHeight + pipeConfig.gap;

    // top pipe
    const topGrad = ctx.createLinearGradient(p.x, 0, p.x + pipeConfig.width, 0);
    topGrad.addColorStop(0, "#ff4fa8");
    topGrad.addColorStop(1, "#ffb347");
    ctx.fillStyle = topGrad;
    ctx.fillRect(p.x, 0, pipeConfig.width, gapTop);

    // bottom pipe
    const bottomGrad = ctx.createLinearGradient(
      p.x,
      gapBottom,
      p.x + pipeConfig.width,
      gapBottom
    );
    bottomGrad.addColorStop(0, "#12ffb0");
    bottomGrad.addColorStop(1, "#00bcd4");
    ctx.fillStyle = bottomGrad;
    ctx.fillRect(p.x, gapBottom, pipeConfig.width, canvas.height - gapBottom);

    // bordures
    ctx.strokeStyle = "#120016";
    ctx.lineWidth = 3;
    ctx.strokeRect(p.x, 0, pipeConfig.width, gapTop);
    ctx.strokeRect(p.x, gapBottom, pipeConfig.width, canvas.height - gapBottom);

    // panneau label
    ctx.fillStyle = "#120215ee";
    const panelHeight = 26;
    const panelY = gapTop - panelHeight - 8;
    if (panelY > 10) {
      ctx.fillRect(p.x - 6, panelY, pipeConfig.width + 12, panelHeight);
      ctx.fillStyle = "#ffef5a";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.label, p.x + pipeConfig.width / 2, panelY + panelHeight / 2);
    }
  });
}

function drawCountdown() {
  if (gameState !== "countdown") return;

  let text = "";
  if (countdownMs > 2400) text = "3";
  else if (countdownMs > 1600) text = "2";
  else if (countdownMs > 800) text = "1";
  else text = "GO!";

  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffef5a";
  ctx.font = text === "GO!" ? "bold 48px system-ui" : "bold 64px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
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

  // faire défiler le fond en mode countdown + playing
  if (gameState === "countdown" || gameState === "playing") {
    const bgSpeed = pipeConfig.speed * 0.4;
    bgOffset -= bgSpeed;
    if (bgOffset <= -canvas.width) {
      bgOffset += canvas.width;
    }
  }

  update(delta);
  drawBackground();
  drawPipes();
  drawBird();
  drawCountdown();

  requestAnimationFrame(loop);
}

// --- input & démarrage

function startGame() {
  resetGame();
  chooseBackground();
  overlayEl.style.display = "none";
  overlayTitleEl.textContent = "FLAPPY SHOPINTOONS";
  playButton.textContent = "Jouer";
  gameState = "countdown";
  countdownMs = 3200;
  playGameMusic();
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
    return;
  } else if (gameState === "playing") {
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

// sélection difficulté
diffButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const diff = btn.getAttribute("data-diff");
    applyDifficulty(diff);

    diffButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// init
chooseBackground();
applyDifficulty(currentDifficulty);
loadBestScore();
requestAnimationFrame(loop);

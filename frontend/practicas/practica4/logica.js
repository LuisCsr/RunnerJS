// ======================================
// Juego de Memoria — 12 cartas (6 pares)
// Usando IMÁGENES locales de /IMAGENES
// ======================================

// --- CONFIGURACIÓN DE IMÁGENES LOCALES ------------------------
// Carpeta de imágenes (relativa a index.html)
const IMAGE_PATH = "./IMAGENES/";

// Lista de archivos (los 6 .jpeg que tienes)
const IMAGE_SET = [
  "1.jpeg",
  "2.jpeg",
  "3.jpeg",
  "4.jpeg",
  "5.jpeg",
  "6.jpeg",
];

// --- ESTADO DEL JUEGO -----------------------------------------
let deck = [];
let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matches = 0;
let tries = 0;

// Temporizador
let timerId = null;
let startTime = null;
let hasStarted = false;

// --- DOM -------------------------------------------------------
const grid = document.getElementById("grid");
const timeEl = document.getElementById("time");
const triesEl = document.getElementById("tries");
const restartBtn = document.getElementById("restart");
const win = document.getElementById("win");
const finalTimeEl = document.getElementById("final-time");
const finalTriesEl = document.getElementById("final-tries");
const playAgainBtn = document.getElementById("play-again");
const closeWinBtn = document.getElementById("close-win");

// --- TEMPORIZADOR ---------------------------------------------
function startTimerOnce() {
  if (hasStarted) return;
  hasStarted = true;
  startTime = Date.now();
  timerId = setInterval(updateTimer, 250);
}
function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}
function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
function updateTimer() {
  if (!hasStarted || !startTime) return;
  const elapsed = Date.now() - startTime;
  timeEl.textContent = `⏱️ ${formatTime(elapsed)}`;
}

// --- UTILIDADES -----------------------------------------------
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function preloadImages(urls) {
  urls.forEach((u) => {
    const img = new Image();
    img.src = u;
  });
}

// Crea el mazo duplicando las 6 imágenes y asignando key para cada pareja
function buildDeck() {
  const base = IMAGE_SET.map((filename) => ({
    key: filename,
    src: IMAGE_PATH + filename,
  }));

  const pairs = base.flatMap((item) => [{ ...item }, { ...item }]);
  return shuffle(pairs);
}

// --- RENDER DEL TABLERO ---------------------------------------
function renderBoard() {
  grid.innerHTML = "";

  deck.forEach((item, index) => {
    const card = document.createElement("button");
    card.className = "card";
    card.type = "button";
    card.setAttribute("data-value", item.key);
    card.setAttribute("aria-label", `Carta ${index + 1}`);
    card.setAttribute("aria-pressed", "false");

    const inner = document.createElement("div");
    inner.className = "card-inner";

    const front = document.createElement("div");
    front.className = "face front";
    front.setAttribute("aria-hidden", "true");

    const img = document.createElement("img");
    img.src = item.src;
    img.alt = `imagen ${item.key}`;
    front.appendChild(img);

    const back = document.createElement("div");
    back.className = "face back";
    back.setAttribute("aria-hidden", "true");

    const dot = document.createElement("div");
    dot.className = "dot";
    dot.title = "Voltear";
    back.appendChild(dot);

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);

    card.addEventListener("click", () => onCardClick(card));
    grid.appendChild(card);
  });
}

// --- LÓGICA DE JUEGO ------------------------------------------
function onCardClick(card) {
  if (lockBoard) return;
  if (card === firstCard) return;
  if (card.classList.contains("matched")) return;

  startTimerOnce();
  flip(card);

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  tries++;
  triesEl.textContent = `🔁 Intentos: ${tries}`;

  lockBoard = true;
  checkMatch();
}

function flip(card) {
  card.classList.add("flipped");
  card.setAttribute("aria-pressed", "true");

  const inner = card.querySelector(".card-inner");
  if (inner && !inner.style.transform) inner.style.transform = "rotateY(180deg)";
}

function unflip(a, b) {
  a.classList.remove("flipped");
  b.classList.remove("flipped");
  a.setAttribute("aria-pressed", "false");
  b.setAttribute("aria-pressed", "false");

  const ia = a.querySelector(".card-inner");
  const ib = b.querySelector(".card-inner");
  if (ia) ia.style.transform = "";
  if (ib) ib.style.transform = "";
}

function checkMatch() {
  const isMatch = firstCard.dataset.value === secondCard.dataset.value;

  if (isMatch) {
    firstCard.classList.add("matched", "disabled");
    secondCard.classList.add("matched", "disabled");
    matches++;
    resetTurn();

    if (matches === IMAGE_SET.length) {
      stopTimer();
      const elapsed = Date.now() - startTime;
      finalTimeEl.textContent = `⏱️ ${formatTime(elapsed)}`;
      finalTriesEl.textContent = `🔁 Intentos: ${tries}`;
      win.classList.add("show");
    }
  } else {
    setTimeout(() => {
      unflip(firstCard, secondCard);
      resetTurn();
    }, 700);
  }
}

function resetTurn() {
  [firstCard, secondCard] = [null, null];
  lockBoard = false;
}

function resetGame() {
  stopTimer();
  hasStarted = false;
  startTime = null;
  timeEl.textContent = "⏱️ 00:00";
  tries = 0;
  triesEl.textContent = "🔁 Intentos: 0";
  matches = 0;
  win.classList.remove("show");

  deck = buildDeck();
  preloadImages(deck.map((c) => c.src));
  renderBoard();
}

// --- Botones
restartBtn.addEventListener("click", resetGame);
playAgainBtn.addEventListener("click", resetGame);
closeWinBtn.addEventListener("click", () => win.classList.remove("show"));

// --- Inicio
resetGame();

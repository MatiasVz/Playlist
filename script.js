// Palabras escondidas en el mismo tablero.
const TARGETS = ['TE', 'PERDONO', 'AMOR', 'DE', 'MI', 'VIDA'];

// Orden en el que se muestra la frase secreta arriba (guiones bajos).
const PHRASE = ['TE', 'PERDONO', 'AMOR', 'DE', 'MI', 'VIDA'];

// Tablero 7x7. Las 6 palabras estan dispersas y serpentean entre letras trampa.
// Cada una tiene al menos un camino de letras vecinas (incluida la diagonal):
//   PERDONO -> P(0,1) E(1,1) R(1,2) D(0,2) O(0,3) N(1,3) O(2,3)
//   AMOR    -> A(3,5) M(4,5) O(4,6) R(3,6)
//   VIDA    -> V(5,2) I(6,3) D(5,3) A(5,4)
//   TE      -> T(2,5) E(1,6)
//   DE      -> D(6,0) E(5,0)
//   MI      -> M(2,0) I(3,1)
const BOARD = [
  ['O', 'P', 'D', 'O', 'E', 'R', 'M'],
  ['T', 'E', 'R', 'N', 'A', 'O', 'E'],
  ['M', 'A', 'E', 'O', 'D', 'T', 'N'],
  ['R', 'I', 'V', 'P', 'O', 'A', 'R'],
  ['D', 'O', 'N', 'E', 'S', 'M', 'O'],
  ['E', 'L', 'V', 'D', 'A', 'T', 'I'],
  ['D', 'U', 'R', 'I', 'C', 'O', 'E'],
];

const board = document.getElementById('board');
const phraseEl = document.getElementById('phrase');
const currentWordEl = document.getElementById('current-word');
const foundCountEl = document.getElementById('found-count');
const totalCountEl = document.getElementById('total-count');
const resetButton = document.getElementById('reset-button');
const celebrate = document.getElementById('celebrate');
const celebrateAgain = document.getElementById('celebrate-again');

let selectedCells = [];
let isDragging = false;
let activePointerId = null;
const foundWords = new Set();

/* ---------- Frase con guiones bajos ---------- */

function buildPhrase() {
  phraseEl.innerHTML = '';

  PHRASE.forEach((word, wordIndex) => {
    const wordEl = document.createElement('div');
    wordEl.className = 'phrase__word';
    wordEl.dataset.word = word;
    wordEl.dataset.phraseIndex = String(wordIndex);

    word.split('').forEach((letter) => {
      const letterEl = document.createElement('span');
      letterEl.className = 'phrase__letter';
      letterEl.dataset.letter = letter;
      letterEl.textContent = '_';
      wordEl.appendChild(letterEl);
    });

    phraseEl.appendChild(wordEl);
  });
}

function revealPhraseWord(word) {
  const wordEl = phraseEl.querySelector(
    `.phrase__word[data-word="${word}"]:not(.is-found)`
  );
  if (!wordEl) {
    return;
  }

  wordEl.classList.add('is-found');
  wordEl.querySelectorAll('.phrase__letter').forEach((letterEl) => {
    letterEl.textContent = letterEl.dataset.letter;
  });
}

function updateCount() {
  foundCountEl.textContent = String(foundWords.size);
  totalCountEl.textContent = String(TARGETS.length);
}

/* ---------- Tablero ---------- */

function renderBoard() {
  board.innerHTML = '';
  board.style.gridTemplateColumns = `repeat(${BOARD[0].length}, minmax(0, 1fr))`;

  BOARD.forEach((row, rowIndex) => {
    row.forEach((letter, colIndex) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile';
      tile.textContent = letter;
      tile.dataset.row = String(rowIndex);
      tile.dataset.col = String(colIndex);
      tile.dataset.letter = letter;
      board.appendChild(tile);
    });
  });
}

function getCellFromElement(element) {
  const tile = element?.closest?.('.tile');
  if (!tile || !board.contains(tile)) {
    return null;
  }

  return {
    element: tile,
    row: Number(tile.dataset.row),
    col: Number(tile.dataset.col),
    letter: tile.dataset.letter || '',
  };
}

function getCellFromPoint(clientX, clientY) {
  return getCellFromElement(document.elementFromPoint(clientX, clientY));
}

function isAdjacent(previous, next) {
  const rowDistance = Math.abs(previous.row - next.row);
  const colDistance = Math.abs(previous.col - next.col);
  return rowDistance <= 1 && colDistance <= 1 && (rowDistance !== 0 || colDistance !== 0);
}

function clearSelection() {
  selectedCells.forEach((cell) => cell.element.classList.remove('is-selected'));
  selectedCells = [];
  currentWordEl.innerHTML = '&nbsp;';
}

function updateCurrentWord() {
  const word = selectedCells.map((cell) => cell.letter).join('');
  currentWordEl.textContent = word || ' ';
}

function addCell(cell) {
  if (!selectedCells.length) {
    selectedCells.push(cell);
    cell.element.classList.add('is-selected');
    updateCurrentWord();
    return;
  }

  // Permite retroceder: si vuelves a la penúltima, deshace la última.
  if (selectedCells.length >= 2) {
    const secondLast = selectedCells[selectedCells.length - 2];
    if (secondLast.element === cell.element) {
      const removed = selectedCells.pop();
      removed.element.classList.remove('is-selected');
      updateCurrentWord();
      return;
    }
  }

  const lastCell = selectedCells[selectedCells.length - 1];
  if (selectedCells.some((selected) => selected.element === cell.element)) {
    return;
  }
  if (!isAdjacent(lastCell, cell)) {
    return;
  }

  selectedCells.push(cell);
  cell.element.classList.add('is-selected');
  updateCurrentWord();
}

function flashSelection(className) {
  selectedCells.forEach((cell) => cell.element.classList.add(className));
  const cells = selectedCells.map((cell) => cell.element);
  window.setTimeout(() => {
    cells.forEach((el) => el.classList.remove(className));
  }, 420);
}

function submitSelection() {
  if (!selectedCells.length) {
    clearSelection();
    return;
  }

  const word = selectedCells.map((cell) => cell.letter).join('');

  if (TARGETS.includes(word) && !foundWords.has(word)) {
    foundWords.add(word);
    revealPhraseWord(word);
    updateCount();
    flashSelection('is-correct');

    if (foundWords.size === TARGETS.length) {
      window.setTimeout(launchCelebration, 500);
    }
  } else if (selectedCells.length > 1) {
    flashSelection('is-wrong');
  }

  window.setTimeout(() => clearSelection(), 200);
}

/* ---------- Eventos del tablero ---------- */

board.addEventListener('pointerdown', (event) => {
  const cell = getCellFromElement(event.target);
  if (!cell) {
    return;
  }

  event.preventDefault();
  isDragging = true;
  activePointerId = event.pointerId;
  board.setPointerCapture?.(event.pointerId);

  clearSelection();
  addCell(cell);
});

board.addEventListener('pointermove', (event) => {
  if (!isDragging || event.pointerId !== activePointerId) {
    return;
  }

  const cell = getCellFromPoint(event.clientX, event.clientY);
  if (cell) {
    addCell(cell);
  }
});

function endDrag() {
  if (!isDragging) {
    return;
  }
  isDragging = false;
  activePointerId = null;
  submitSelection();
}

board.addEventListener('pointerup', endDrag);
board.addEventListener('pointercancel', () => {
  isDragging = false;
  activePointerId = null;
  clearSelection();
});

/* ---------- Reiniciar ---------- */

function resetGame() {
  foundWords.clear();
  isDragging = false;
  activePointerId = null;
  celebrate.hidden = true;
  stopConfetti();
  buildPhrase();
  renderBoard();
  clearSelection();
  updateCount();
}

resetButton.addEventListener('click', () => {
  resetGame();
  document.querySelector('.game-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

celebrateAgain.addEventListener('click', resetGame);

/* ---------- Confeti 🎉 ---------- */

const canvas = document.getElementById('confetti');
const ctx = canvas.getContext('2d');
let confettiPieces = [];
let confettiRaf = null;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createPieces() {
  const colors = ['#ff836f', '#ffe08d', '#7ee081', '#8dd3ff', '#ff9ecd', '#ffffff'];
  confettiPieces = [];
  for (let i = 0; i < 160; i += 1) {
    confettiPieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      size: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: 2 + Math.random() * 4,
      speedX: -1.5 + Math.random() * 3,
      rotation: Math.random() * 360,
      spin: -6 + Math.random() * 12,
    });
  }
}

function drawConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  confettiPieces.forEach((piece) => {
    piece.y += piece.speedY;
    piece.x += piece.speedX;
    piece.rotation += piece.spin;

    if (piece.y > canvas.height + 20) {
      piece.y = -20;
      piece.x = Math.random() * canvas.width;
    }

    ctx.save();
    ctx.translate(piece.x, piece.y);
    ctx.rotate((piece.rotation * Math.PI) / 180);
    ctx.fillStyle = piece.color;
    ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6);
    ctx.restore();
  });

  confettiRaf = window.requestAnimationFrame(drawConfetti);
}

function launchCelebration() {
  celebrate.hidden = false;
  resizeCanvas();
  createPieces();
  if (confettiRaf) {
    window.cancelAnimationFrame(confettiRaf);
  }
  drawConfetti();
}

function stopConfetti() {
  if (confettiRaf) {
    window.cancelAnimationFrame(confettiRaf);
    confettiRaf = null;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', () => {
  if (!celebrate.hidden) {
    resizeCanvas();
  }
});

/* ---------- Inicio ---------- */

buildPhrase();
renderBoard();
updateCount();

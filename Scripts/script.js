
// Tic-Tac-Toe with bets - script.js
// Save: script.js
/* Features:
 - PvP local and vs CPU (random easy)
 - Betting UI: set bet, both players accept, pot deducted from balances, winner gets pot (draw split)
 - Balances persisted in localStorage
 - Simple history log
 - Undo last move (single undo)
*/

// --- App state & constants ---
const STARTING_BAL = 1000;
const STORAGE_KEY = 'ticbet_state_v1';

let state = {
  board: Array(9).fill(null), // 'X' or 'O' or null
  turn: 'X',
  running: false,
  mode: 'pvp', // 'pvp' or 'cpu'
  bet: 0,
  acceptX: false,
  acceptO: false,
  balances: { X: STARTING_BAL, O: STARTING_BAL },
  history: [],
  lastMove: null // {index, player}
};

// --- DOM refs ---
const boardEl = document.getElementById('board');
const statusText = document.getElementById('statusText');
const balX = document.getElementById('balX');
const balO = document.getElementById('balO');
const betInput = document.getElementById('betInput');
const setBetBtn = document.getElementById('setBet');
const potInfo = document.getElementById('potInfo');
const roundPot = document.getElementById('roundPot');
const acceptXBtn = document.getElementById('acceptX');
const acceptOBtn = document.getElementById('acceptO');
const acceptXstate = document.getElementById('acceptXstate');
const acceptOstate = document.getElementById('acceptOstate');
const startRoundBtn = document.getElementById('startRound');
const forfeitBtn = document.getElementById('forfeit');
const modeButtons = document.querySelectorAll('.mode');
const historyEl = document.getElementById('history');
const undoBtn = document.getElementById('undo');
const resetBalancesBtn = document.getElementById('resetBalances');
const newGameBtn = document.getElementById('newGame');
const playerOname = document.getElementById('playerOname');
const renameX = document.getElementById('renameX');
const renameO = document.getElementById('renameO');

// --- Utility / storage ---
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    balances: state.balances,
    history: state.history
  }));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.balances) state.balances = parsed.balances;
    if (parsed.history) state.history = parsed.history;
  } catch (e) {
    console.warn('Failed to load state', e);
  }
}

function formatRupee(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

// --- Render ---
function renderBoard() {
  boardEl.innerHTML = '';
  state.board.forEach((cell, idx) => {
    const el = document.createElement('div');
    el.className = 'cell' + (cell ? ' ' + cell.toLowerCase() : '');
    el.dataset.idx = idx;
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `cell ${idx + 1}`);
    el.textContent = cell ? cell : '';
    if (!state.running) el.classList.add('disabled');
    el.addEventListener('click', onCellClick);
    boardEl.appendChild(el);
  });
}

function renderUI() {
  balX.textContent = `Balance: ${formatRupee(state.balances.X)}`;
  balO.textContent = `Balance: ${formatRupee(state.balances.O)}`;
  potInfo.textContent = `Current bet: ${formatRupee(state.bet)} — both players must accept to start.`;
  roundPot.textContent = `Pot: ${formatRupee(state.bet * 2)}`;
  acceptXBtn.className = 'accept-btn ' + (state.acceptX ? 'accepted' : 'not-accepted');
  acceptOBtn.className = 'accept-btn ' + (state.acceptO ? 'accepted' : 'not-accepted');
  acceptXstate.textContent = state.acceptX ? 'Accepted' : 'Not accepted';
  acceptOstate.textContent = state.acceptO ? 'Accepted' : 'Not accepted';

  statusText.textContent = state.running
    ? `Turn: ${state.turn} — ${state.mode === 'cpu' && state.turn === 'O' ? 'CPU thinking...' : ''}`
    : `Waiting to start — set bet and both players accept.`;

  // mark mode buttons
  modeButtons.forEach(b => {
    b.classList.toggle('active', b.dataset.mode === state.mode);
  });

  // history
  historyEl.innerHTML = state.history.slice().reverse().map(h => {
    return `<div class="history-item">${h}</div>`;
  }).join('');
}

function updateAll() {
  renderBoard();
  renderUI();
  saveState();
}

// --- Game logic ---
const wins = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function checkWinner(board) {
  for (const line of wins) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { winner: board[a], line };
  }
  if (board.every(Boolean)) return { winner: null }; // draw
  return null; // continue
}

function highlightWinning(line) {
  if (!line) return;
  line.forEach(i => {
    const cellEl = boardEl.querySelector(`[data-idx="${i}"]`);
    if (cellEl) cellEl.classList.add('highlight');
  });
}

// --- Actions ---
function onCellClick(e) {
  const idx = Number(e.currentTarget.dataset.idx);
  if (!state.running) return;
  if (state.board[idx]) return;
  if (state.mode === 'cpu' && state.turn === 'O') return; // CPU's turn
  makeMove(idx, state.turn);
}

function makeMove(idx, player) {
  state.board[idx] = player;
  state.lastMove = { index: idx, player };
  state.history.push(`${player} placed at ${idx + 1}`);
  const result = checkWinner(state.board);
  if (result) {
    finishRound(result);
  } else {
    state.turn = (player === 'X') ? 'O' : 'X';
    updateAll();
    if (state.mode === 'cpu' && state.turn === 'O') {
      setTimeout(cpuMove, 450); // small delay for CPU
    }
  }
}

function cpuMove() {
  // easy random CPU (choose random empty cell)
  const empties = state.board.map((v, i) => v ? null : i).filter(n => n !== null);
  if (empties.length === 0) return;
  const choice = empties[Math.floor(Math.random() * empties.length)];
  makeMove(choice, 'O');
}

function finishRound(result) {
  state.running = false;
  if (result.winner === null) {
    // draw
    state.history.push(`Round draw — bet returned.`);
    // split pot back
    const share = state.bet;
    state.balances.X += share;
    state.balances.O += share;
    statusText.textContent = `Draw — pot returned.`;
  } else {
    // winner gets pot (both bets)
    state.history.push(`${result.winner} wins the round and takes the pot (${formatRupee(state.bet * 2)})`);
    state.balances[result.winner] += state.bet * 2;
    statusText.textContent = `${result.winner} wins!`;
    highlightWinning(result.line);
  }

  // reset accepts and bet for next round
  state.acceptX = false;
  state.acceptO = false;
  state.bet = 0;
  betInput.value = 0;

  updateAll();
}

function startRound() {
  // Validate bet and accepts
  if (state.bet <= 0) {
    alert('Set a bet > 0 before starting.');
    return;
  }
  if (!state.acceptX || !state.acceptO) {
    alert('Both players must accept the bet to start.');
    return;
  }
  // check balances
  if (state.balances.X < state.bet || state.balances.O < state.bet) {
    alert('One of the players lacks the balance for this bet.');
    return;
  }
  // Deduct bets and start
  state.balances.X -= state.bet;
  state.balances.O -= state.bet;
  state.running = true;
  state.turn = 'X';
  state.board = Array(9).fill(null);
  state.lastMove = null;
  state.history.push(`Round started — bet ${formatRupee(state.bet)} each. Pot ${formatRupee(state.bet * 2)}.`);

  updateAll();

  // if CPU is O and turn is O, CPU should play after X moves. (we start with X)
}

function cancelRound() {
  // refund if a round is running? If bet had been deducted it's only deducted on startRound
  state.acceptX = false;
  state.acceptO = false;
  state.bet = 0;
  betInput.value = 0;
  state.running = false;
  state.board = Array(9).fill(null);
  state.lastMove = null;
  state.history.push(`Round canceled.`);
  updateAll();
}

function undoLast() {
  if (!state.lastMove) {
    alert('No move to undo (only last move can be undone).');
    return;
  }
  // Allow undo only while round running
  if (!state.running) { alert('No active round to undo.'); return; }
  state.board[state.lastMove.index] = null;
  state.turn = state.lastMove.player;
  state.lastMove = null;
  state.history.push(`Undo: last move removed.`);
  updateAll();
}

function newGameResetBoard() {
  state.board = Array(9).fill(null);
  state.running = false;
  state.acceptX = false;
  state.acceptO = false;
  state.bet = 0;
  betInput.value = 0;
  state.lastMove = null;
  state.history.push('New game (board cleared).');
  updateAll();
}

// --- UI event wiring ---
setBetBtn.addEventListener('click', () => {
  const val = Number(betInput.value) || 0;
  if (val <= 0) { alert('Enter a positive bet.'); return; }
  // make sure players have that much
  if (val > state.balances.X || val > state.balances.O) {
    if (!confirm('One or both players might not have enough balance. Continue and players must top up or accept?')) {
      return;
    }
  }
  state.bet = val;
  state.acceptX = false;
  state.acceptO = false;
  state.history.push(`Bet set to ${formatRupee(val)}.`);
  updateAll();
});

acceptXBtn.addEventListener('click', () => {
  if (state.bet <= 0) return alert('Set a bet first.');
  state.acceptX = !state.acceptX;
  if (state.acceptX) state.history.push('X accepted the bet.');
  updateAll();
});

acceptOBtn.addEventListener('click', () => {
  if (state.bet <= 0) return alert('Set a bet first.');
  state.acceptO = !state.acceptO;
  if (state.acceptO) state.history.push('O accepted the bet.');
  updateAll();
});

startRoundBtn.addEventListener('click', startRound);
forfeitBtn.addEventListener('click', () => {
  if (!confirm('Forfeit/cancel current setup?')) return;
  cancelRound();
});

modeButtons.forEach(b => b.addEventListener('click', (e) => {
  modeButtons.forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  state.mode = b.dataset.mode;
  state.acceptX = false;
  state.acceptO = false;
  state.history.push(`Mode set to ${state.mode === 'cpu' ? 'vs CPU' : 'PvP'}.`);
  // if CPU mode, change O name
  playerOname.textContent = state.mode === 'cpu' ? 'CPU (O)' : 'Player O';
  updateAll();
}));

undoBtn.addEventListener('click', undoLast);
resetBalancesBtn.addEventListener('click', () => {
  if (!confirm('Reset both balances to starting amount?')) return;
  state.balances = { X: STARTING_BAL, O: STARTING_BAL };
  state.history.push('Balances reset.');
  saveState();
  updateAll();
});
newGameBtn.addEventListener('click', () => {
  if (!confirm('Start new game (clears board and accepts)?')) return;
  newGameResetBoard();
});

renameX.addEventListener('click', () => {
  const name = prompt('Rename Player X (display only):', 'Player X');
  if (name) {
    // change avatar letter only visually; we keep marker X
    // For simplicity we won't persist names; this is display-only.
    // In this UI we only show "Player X" label; skipping persistent names for brevity.
    alert('Rename is display-only in this sample. (Feature placeholder)');
  }
});
renameO.addEventListener('click', () => {
  const name = prompt('Rename Player O (display only):', 'Player O');
  if (name) {
    playerOname.textContent = name;
    alert('Rename is display-only in this sample. (Feature placeholder)');
  }
});

// keyboard accessibility: number keys 1-9 map to cells
document.addEventListener('keydown', (e) => {
  if (!state.running) return;
  const key = Number(e.key);
  if (key >= 1 && key <= 9) {
    const idx = key - 1;
    if (!state.board[idx]) {
      makeMove(idx, state.turn);
    }
  }
});

// save / load
loadState();
updateAll();

// initial render creation of board cells
renderBoard();
renderUI();

import { Game } from './game.js';
import { UI }   from './ui.js';

const canvas = document.getElementById('gameCanvas');
const game   = new Game(canvas);
const ui     = new UI(game);

document.getElementById('btn-start').addEventListener('click', () => {
  const splash = document.getElementById('splash');
  splash.classList.add('fade-out');
  setTimeout(() => splash.remove(), 600);
  game.start();
  ui.init();
});

// Update block count display
game.builder.onCountChange = n => {
  const el = document.getElementById('block-count');
  if (el) el.textContent = `ブロック: ${n}`;
};

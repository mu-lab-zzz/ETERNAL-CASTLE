import { Game } from './game.js';
import { UI } from './ui.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);
const ui = new UI(game);

document.getElementById('btn-start').addEventListener('click', () => {
  const splash = document.getElementById('splash');
  splash.classList.add('hidden');
  setTimeout(() => { splash.style.display = 'none'; }, 600);
  game.start();
  ui.init();
});

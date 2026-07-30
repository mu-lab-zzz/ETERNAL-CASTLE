import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { PlayerController } from './systems/PlayerController.js';
import { DungeonManager }   from './world/DungeonManager.js';
import { EnemyManager }     from './entities/EnemyManager.js';
import { UIManager }        from './systems/UIManager.js';
import { SaveSystem }       from './systems/SaveSystem.js';
import { AudioSystem }      from './systems/AudioSystem.js';

export let scene, camera, renderer, clock;
export let player, dungeon, enemies, ui, audio, save;

window.startGame = function() {
  document.getElementById('title-screen').style.display = 'none';
  init();
};

function init() {
  clock = new THREE.Clock();

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 0.6;
  renderer.setClearColor(0x000000);

  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0806, 0.045);

  // Camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(0, 1.7, 0);

  // Systems
  ui    = new UIManager();
  audio = new AudioSystem();
  save  = new SaveSystem();
  dungeon  = new DungeonManager(scene);
  enemies  = new EnemyManager(scene, camera);
  player   = new PlayerController(camera, scene, dungeon, enemies, ui, audio);

  dungeon.buildEntrance();
  enemies.spawnInitial(dungeon);

  // Intro message
  setTimeout(() => ui.showMessage('古城へようこそ。\nここから出た者はいない。', 4000), 500);

  window.addEventListener('resize', onResize);
  renderer.setAnimationLoop(tick);
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  player.update(dt);
  enemies.update(dt, player);
  ui.update(dt);
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

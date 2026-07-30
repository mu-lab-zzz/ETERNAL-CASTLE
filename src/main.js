import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { PlayerController }  from './systems/PlayerController.js';
import { DungeonManager }    from './world/DungeonManager.js';
import { EnemyManager }      from './entities/EnemyManager.js';
import { UIManager }         from './systems/UIManager.js';
import { SaveSystem }        from './systems/SaveSystem.js';
import { AudioSystem }       from './systems/AudioSystem.js';
import { MapSystem }         from './world/MapSystem.js';
import { buildUnderground }  from './world/UndergroundLevel.js';
import { BossEnemy }         from './entities/BossEnemy.js';

export let scene, camera, renderer, clock;
export let player, dungeon, enemies, ui, audio, save, mapSys, boss;

window.startGame = function() {
  document.getElementById('title-screen').style.display = 'none';
  init();
};

function init() {
  clock = new THREE.Clock();

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 0.6;
  renderer.setClearColor(0x000000);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0806, 0.045);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(0, 1.7, 0);

  ui     = new UIManager();
  audio  = new AudioSystem();
  save   = new SaveSystem();
  mapSys = new MapSystem();
  dungeon  = new DungeonManager(scene);
  enemies  = new EnemyManager(scene, camera);
  player   = new PlayerController(camera, scene, dungeon, enemies, ui, audio);

  dungeon.buildEntrance();
  enemies.spawnInitial(dungeon);

  // Underground level
  buildUnderground(scene, dungeon.walls, dungeon.interactables);

  // Boss — deep in the underground ancient chamber
  boss = new BossEnemy(scene, new THREE.Vector3(0, -3, -136), ui);
  enemies.addBoss(boss);

  // Register rooms for minimap
  const allRooms = [
    { id: 'entrance_hall', x: 0, z: 0, w: 6, d: 10, label: '大広間' },
    { id: 'corridor_n',    x: 2, z:-5, w: 2, d: 4,  label: '廊下' },
    { id: 'guard_room',    x:-4, z: 0, w: 3, d: 4,  label: '衛兵室' },
    { id: 'chapel',        x: 3, z: 3, w: 5, d: 6,  label: '礼拝堂' },
    { id: 'dungeon_stair', x: 1, z:-9, w: 2, d: 2,  label: '地下階段' },
    { id: 'prison1',       x:-2, z:-16,w: 4, d: 4,  label: '地下牢' },
    { id: 'waterway',      x: 2, z:-20,w: 3, d: 4,  label: '水路' },
    { id: 'prison2',       x:-4, z:-20,w: 3, d: 5,  label: '地下牢 II' },
    { id: 'underground_chapel', x:0, z:-26, w:6, d:6, label:'地下礼拝堂' },
    { id: 'ancient_hall',  x: 0, z:-33,w: 4, d: 4,  label: '古代の間' },
  ];
  mapSys.registerRooms(allRooms);

  setTimeout(() => ui.showMessage('古城へようこそ。\nここから出た者はいない。', 4000), 500);
  setTimeout(() => ui.showMessage('[M] でマップ  [I] で所持品  [E] で調べる', 3000), 6000);

  window.addEventListener('resize', onResize);
  renderer.setAnimationLoop(tick);
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  player.update(dt);
  enemies.update(dt, player);
  mapSys.update(camera.position);
  ui.update(dt);
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

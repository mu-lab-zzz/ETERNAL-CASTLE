let scene, camera, renderer, clock;
let player, dungeon, enemies, ui, audio, save, mapSys, boss;

window.startGame = function() {
  document.getElementById('title-screen').style.display = 'none';

  // THREE availability check
  if (typeof THREE === 'undefined') {
    document.body.insertAdjacentHTML('beforeend',
      '<div style="position:fixed;top:0;left:0;width:100%;padding:20px;color:#f00;font-size:18px;font-weight:bold;background:#000;z-index:9999">ERROR: THREE is undefined — three.min.js did not load</div>'
    );
    return;
  }

  try {
    init();
  } catch (e) {
    console.error('init failed:', e);
    document.body.insertAdjacentHTML('beforeend',
      `<div style="position:fixed;top:0;left:0;width:100%;padding:10px;color:#f44;font-size:12px;background:rgba(0,0,0,0.9);z-index:9999;white-space:pre-wrap">${e.message}\n${e.stack}</div>`
    );
  }
};

function init() {
  clock = new THREE.Clock();

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x334455);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.7, 0);

  // Debug: bright red cube directly in front of camera
  const dbgMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  dbgMesh.position.set(0, 1.7, -3);
  scene.add(dbgMesh);

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

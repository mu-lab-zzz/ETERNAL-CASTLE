// The underground level — darker, wetter, more oppressive
// Connected to entrance via the locked north corridor stairwell
function buildUnderground(scene, walls, interactables) {
  const stone = new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.98, metalness: 0 });
  const wet   = new THREE.MeshStandardMaterial({ color: 0x4a5a6a, roughness: 0.6, metalness: 0.3 });

  const ROOMS = [
    { x:-2, z:-16, w:4, d:4, label:'地下牢 I', H:3.5 },
    { x: 2, z:-20, w:3, d:4, label:'水路',   H:3 },
    { x:-4, z:-20, w:3, d:5, label:'地下牢 II', H:3.5 },
    { x: 0, z:-26, w:6, d:6, label:'地下礼拝堂', H:5 },
    { x: 0, z:-33, w:4, d:4, label:'古代の間',   H:4 },
  ];

  const Y_OFFSET = -3; // Underground sits 3m below entrance floor

  ROOMS.forEach(r => {
    const W = r.w * 4, D = r.d * 4;
    const cx = r.x * 4, cz = r.z * 4;
    const H = r.H;

    // Floor (wet stone)
    const fGeo  = new THREE.BoxGeometry(W, 0.2, D);
    const fMesh = new THREE.Mesh(fGeo, wet);
    fMesh.position.set(cx, Y_OFFSET - 0.1, cz);
    fMesh.receiveShadow = true;
    scene.add(fMesh);

    // Ceiling
    const cGeo  = new THREE.BoxGeometry(W, 0.2, D);
    const cMesh = new THREE.Mesh(cGeo, stone);
    cMesh.position.set(cx, Y_OFFSET + H, cz);
    scene.add(cMesh);

    // Walls
    _wall(scene, walls, stone, cx - W/2 - 0.15, Y_OFFSET + H/2, cz, 0.3, H, D);
    _wall(scene, walls, stone, cx + W/2 + 0.15, Y_OFFSET + H/2, cz, 0.3, H, D);
    _wall(scene, walls, stone, cx, Y_OFFSET + H/2, cz - D/2 - 0.15, W + 0.3, H, 0.3);
    _wall(scene, walls, stone, cx, Y_OFFSET + H/2, cz + D/2 + 0.15, W + 0.3, H, 0.3);

    // Wall sconces
    _sconce(scene, cx - W/2 + 0.3, Y_OFFSET + 2, cz - D/4, 8.0, 28);
    _sconce(scene, cx + W/2 - 0.3, Y_OFFSET + 2, cz - D/4, 8.0, 28);
    _sconce(scene, cx - W/2 + 0.3, Y_OFFSET + 2, cz + D/4, 8.0, 28);
    _sconce(scene, cx + W/2 - 0.3, Y_OFFSET + 2, cz + D/4, 8.0, 28);

    // Water puddles on floor (visual only)
    if (r.label === '水路') {
      const pudGeo = new THREE.BoxGeometry(W * 0.8, 0.02, D * 0.8);
      const pudMat = new THREE.MeshStandardMaterial({ color: 0x081018, roughness: 0.1, metalness: 0.9 });
      const pud = new THREE.Mesh(pudGeo, pudMat);
      pud.position.set(cx, Y_OFFSET + 0.01, cz);
      scene.add(pud);
    }

    // Boss altar in ancient chamber
    if (r.label === '古代の間') {
      _altar(scene, walls, cx, Y_OFFSET, cz, interactables);
    }
  });

  // Staircase connecting to entrance level
  _staircase(scene, walls, stone, 0, -13, Y_OFFSET);
}

function _wall(scene, walls, mat, x, y, z, w, h, d) {
  const geo  = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  scene.add(mesh);
  walls.push({ mesh, box: new THREE.Box3().setFromObject(mesh) });
}

function _sconce(scene, x, y, z, intensity, range) {
  const bGeo  = new THREE.BoxGeometry(0.08, 0.2, 0.08);
  const bMat  = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
  const b     = new THREE.Mesh(bGeo, bMat);
  b.position.set(x, y, z);
  scene.add(b);

  const light = new THREE.PointLight(0x804010, intensity, range, 2);
  light.position.set(x, y + 0.2, z);
  scene.add(light);
}

function _staircase(scene, walls, mat, x, z, yBottom) {
  const steps = 8;
  const stepH = Math.abs(yBottom) / steps;
  for (let i = 0; i < steps; i++) {
    const geo  = new THREE.BoxGeometry(2, 0.2, 0.6);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, yBottom + i * stepH, z - i * 0.6 - 13);
    scene.add(mesh);
    walls.push({ mesh, box: new THREE.Box3().setFromObject(mesh) });
  }
}

function _altar(scene, walls, cx, yBase, cz, interactables) {
  // Stone altar block
  const aGeo  = new THREE.BoxGeometry(1.5, 1.0, 0.8);
  const aMat  = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.95 });
  const altar = new THREE.Mesh(aGeo, aMat);
  altar.position.set(cx, yBase + 0.5, cz - 4);
  scene.add(altar);

  // Glowing rune
  const rGeo  = new THREE.TorusGeometry(0.3, 0.05, 8, 12);
  const rMat  = new THREE.MeshStandardMaterial({ color: 0x2030a0, emissive: 0x1020a0, emissiveIntensity: 2 });
  const rune  = new THREE.Mesh(rGeo, rMat);
  rune.position.set(cx, yBase + 1.1, cz - 4);
  rune.rotation.x = Math.PI / 2;
  scene.add(rune);

  const runeLight = new THREE.PointLight(0x2030ff, 1.5, 6);
  runeLight.position.set(cx, yBase + 1.5, cz - 4);
  scene.add(runeLight);

  // Interactable (reads inscription)
  interactables.push({
    position: new THREE.Vector3(cx, yBase + 0.5, cz - 4),
    radius: 2.5,
    type: 'npc',
    data: {
      id: 'altar',
      dialogues: [
        '「汝が城を見るとき、\n 城もまた汝を見ている」',
        '古代文字が刻まれている。\n読めるのはわずかだ：\n「王は眠る。城は目覚めた。」',
        '祭壇の奥から、\n地鳴りのような声がする。',
      ],
      dialogueIndex: 0,
    },
  });
}

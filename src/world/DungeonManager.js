const CELL = 4; // 4m per tile

// Room templates: array of [x, z, w, d] tiles
const ENTRANCE_ROOMS = [
  // Great hall
  { id: 'entrance_hall', x: 0, z: 0, w: 6, d: 10, label: '大広間' },
  { id: 'corridor_n',    x: 2, z:-5, w: 2, d: 4,  label: '廊下' },
  { id: 'guard_room',    x:-4, z: 0, w: 3, d: 4,  label: '衛兵室' },
  { id: 'chapel',        x: 3, z: 3, w: 5, d: 6,  label: '礼拝堂' },
  { id: 'dungeon_stair', x: 1, z:-9, w: 2, d: 2,  label: '地下への階段' },
];

class DungeonManager {
  constructor(scene) {
    this.scene = scene;
    this.walls = [];   // collision boxes
    this.floors = [];
    this.doors = [];   // { mesh, open, locked, keyId, position }
    this.items = [];   // { mesh, data, position }
    this.lights = [];
    this.interactables = [];
    this._mats = this._buildMaterials();
  }

  _buildMaterials() {
    const stone = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.95, metalness: 0.05 });
    const floor  = new THREE.MeshStandardMaterial({ color: 0x1e1a18, roughness: 0.9, metalness: 0.02 });
    const ceil   = new THREE.MeshStandardMaterial({ color: 0x181410, roughness: 1, metalness: 0 });
    const wood   = new THREE.MeshStandardMaterial({ color: 0x3a2810, roughness: 0.85, metalness: 0 });
    const iron   = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.8 });
    const torch  = new THREE.MeshStandardMaterial({ color: 0xff6020, emissive: 0xff4010, emissiveIntensity: 1.5, roughness: 1 });
    return { stone, floor, ceil, wood, iron, torch };
  }

  buildEntrance() {
    this._addAmbient();
    ENTRANCE_ROOMS.forEach(r => this._buildRoom(r));
    this._addDoors();
    this._addDecor();
    this._addPickups();
  }

  _addAmbient() {
    // Warm dungeon ambient — dim but not black
    const amb = new THREE.AmbientLight(0x6a5038, 1.0);
    this.scene.add(amb);
    // Dim blue fill from above (simulates faint sky through cracks)
    const fill = new THREE.HemisphereLight(0x202840, 0x100808, 0.4);
    this.scene.add(fill);
  }

  _buildRoom(r) {
    const W = r.w * CELL;
    const D = r.d * CELL;
    const cx = r.x * CELL;
    const cz = r.z * CELL;
    const H = 5;

    const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), this._mats.floor);
    floorMesh.position.set(cx, -0.1, cz);
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);
    this.floors.push(floorMesh);

    const ceilMesh = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), this._mats.ceil);
    ceilMesh.position.set(cx, H, cz);
    this.scene.add(ceilMesh);

    // Walls
    this._wall(cx - W/2 - 0.15, H/2, cz, 0.3, H, D);
    this._wall(cx + W/2 + 0.15, H/2, cz, 0.3, H, D);
    this._wall(cx, H/2, cz - D/2 - 0.15, W + 0.3, H, 0.3);
    this._wall(cx, H/2, cz + D/2 + 0.15, W + 0.3, H, 0.3);

    // Torches on walls — placed at quarter-width intervals so light covers center
    const xSteps = Math.max(1, Math.floor(W / 8));
    const zSteps = Math.max(1, Math.floor(D / 8));
    for (let zi = 0; zi < zSteps; zi++) {
      const tz = cz - D/2 + (zi + 0.5) * (D / zSteps);
      this._torch(cx - W/2 + 0.3, 2.5, tz);
      this._torch(cx + W/2 - 0.3, 2.5, tz);
    }
    for (let xi = 0; xi < xSteps; xi++) {
      const tx = cx - W/2 + (xi + 0.5) * (W / xSteps);
      this._torch(tx, 2.5, cz - D/2 + 0.3);
      this._torch(tx, 2.5, cz + D/2 - 0.3);
    }

    // Pillars for large rooms
    if (r.w >= 4 && r.d >= 6) {
      const pw = W * 0.3, pd = D * 0.3;
      [[-pw,-pd],[pw,-pd],[-pw,pd],[pw,pd]].forEach(([px,pz]) => {
        this._pillar(cx + px, cz + pz, H);
      });
    }
  }

  _wall(x, y, z, w, h, d) {
    const geo  = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, this._mats.stone);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow   = true;
    this.scene.add(mesh);
    // Collision box (simplified)
    const box = new THREE.Box3().setFromObject(mesh);
    this.walls.push({ mesh, box });
  }

  _pillar(x, z, h) {
    const geo  = new THREE.BoxGeometry(0.5, h, 0.5);
    const mesh = new THREE.Mesh(geo, this._mats.stone);
    mesh.position.set(x, h/2, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    this.walls.push({ mesh, box });
  }

  _torch(x, y, z) {
    // Sconce bracket
    const bGeo  = new THREE.BoxGeometry(0.1, 0.3, 0.1);
    const bMesh = new THREE.Mesh(bGeo, this._mats.iron);
    bMesh.position.set(x, y, z);
    this.scene.add(bMesh);

    // Flame
    const fGeo  = new THREE.ConeGeometry(0.06, 0.2, 6);
    const fMesh = new THREE.Mesh(fGeo, this._mats.torch);
    fMesh.position.set(x, y + 0.25, z);
    this.scene.add(fMesh);

    // Point light — wider range so center of room is lit, no shadows for performance
    const light = new THREE.PointLight(0xff7030, 2.0, 14, 2);
    light.position.set(x, y + 0.3, z);
    light.castShadow = false;
    this.scene.add(light);
    this.lights.push({ light, baseY: y + 0.3, baseIntensity: 2.0, time: Math.random() * Math.PI * 2 });
  }

  _addDoors() {
    // Main corridor door (locked, needs Rusty Key)
    this._door(0 * CELL, 2.5, -7.5, 'x', true, 'rusty_key', '錆びた鍵がかかっている。');
    // Guard room door (unlocked)
    this._door(-2.5 * CELL, 2.5, 0, 'z', false, null, null);
    // Chapel side door
    this._door(3 * CELL, 2.5, 1, 'z', false, null, null);
  }

  _door(x, y, z, axis, locked, keyId, lockedMsg) {
    const geo  = new THREE.BoxGeometry(axis === 'x' ? 0.15 : 2, 3, axis === 'x' ? 2 : 0.15);
    const mesh = new THREE.Mesh(geo, this._mats.wood);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.scene.add(mesh);

    const entry = { mesh, open: false, locked, keyId, lockedMsg, axis, position: new THREE.Vector3(x, y, z) };
    this.doors.push(entry);
    this.interactables.push({
      position: new THREE.Vector3(x, y, z),
      radius: 2.5,
      type: 'door',
      data: entry,
    });

    // Collision
    const box = new THREE.Box3().setFromObject(mesh);
    this.walls.push({ mesh, box, door: entry });
  }

  _addDecor() {
    // Skeleton against wall
    this._crate(8, 0.25, -3);
    this._crate(9, 0.25, -3);
    this._crate(8, 0.85, -3);

    // Fallen column
    const colGeo  = new THREE.CylinderGeometry(0.3, 0.3, 3, 8);
    const colMesh = new THREE.Mesh(colGeo, this._mats.stone);
    colMesh.rotation.z = Math.PI / 2;
    colMesh.position.set(6, 0.3, 2);
    this.scene.add(colMesh);

    // NPC: blind priest
    this._addNPC(-5, 0, 3, 0x4a3020, 'blind_priest');
  }

  _crate(x, y, z) {
    const geo  = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const mesh = new THREE.Mesh(geo, this._mats.wood);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
  }

  _addNPC(x, y, z, color, id) {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.5, 1.0, 0.3);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const body = new THREE.Mesh(bodyGeo, mat);
    body.position.y = 0.7;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.22, 8, 6);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.y = 1.45;
    group.add(head);

    group.position.set(x, y, z);
    this.scene.add(group);

    const dialogues = {
      blind_priest: [
        '…旅人よ。\nここは城ではない。',
        '王は城を建てたのではない。\n城に王が建てられたのだ。',
        '下へ行くな。\n下には、始まりがある。',
      ]
    };

    this.interactables.push({
      position: new THREE.Vector3(x, 0, z),
      radius: 2.5,
      type: 'npc',
      data: { id, dialogues: dialogues[id] || ['…。'], dialogueIndex: 0, mesh: group },
    });
  }

  _addPickups() {
    // Rusty key — deep in guard room
    this._pickup(-9, 0.15, 1, 'key', {
      id: 'rusty_key',
      name: '錆びた鍵',
      desc: '廊下の先の扉に合いそうだ。古い紋章が刻まれている。',
      icon: '🗝',
    });

    // Health potion
    this._pickup(5, 0.15, 8, 'potion', {
      id: 'health_potion',
      name: '回復薬',
      desc: '苦い液体。飲むと傷が癒える。',
      uses: 1,
      icon: '⚗',
      onUse: (player) => { player.heal(40); },
    });

    // Starting sword
    this._pickup(2, 0.15, 2, 'weapon', {
      id: 'old_sword',
      name: '古びた剣',
      desc: '王国騎士が持っていた剣。刃はまだ生きている。',
      damage: 25,
      icon: '⚔',
    });
  }

  _pickup(x, y, z, type, data) {
    const geo  = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const mat  = new THREE.MeshStandardMaterial({
      color: type === 'weapon' ? 0x8090c0 : type === 'key' ? 0xc0a020 : 0x40c060,
      emissive: type === 'weapon' ? 0x102040 : type === 'key' ? 0x402000 : 0x004020,
      emissiveIntensity: 0.5, roughness: 0.4, metalness: type === 'weapon' ? 0.8 : 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.scene.add(mesh);

    const entry = { mesh, data, position: new THREE.Vector3(x, y, z), collected: false };
    this.items.push(entry);
    this.interactables.push({
      position: new THREE.Vector3(x, y, z),
      radius: 1.8,
      type: 'item',
      data: entry,
    });
  }

  openDoor(doorEntry) {
    if (doorEntry.open) return;
    doorEntry.open = true;
    // Animate door sliding up
    const startY = doorEntry.mesh.position.y;
    const targetY = startY + 3.2;
    const dur = 1.5;
    let elapsed = 0;
    const animate = () => {
      elapsed += 0.016;
      const t = Math.min(elapsed / dur, 1);
      doorEntry.mesh.position.y = startY + (targetY - startY) * t;
      if (t < 1) requestAnimationFrame(animate);
    };
    animate();

    // Remove collision
    this.walls = this.walls.filter(w => w.door !== doorEntry);
  }

  // Flicker torches
  updateLights(dt) {
    this.lights.forEach(l => {
      l.time += dt;
      // Flicker around the base intensity stored at creation time
      l.light.intensity = l.baseIntensity + Math.sin(l.time * 7.3) * 0.18 + Math.sin(l.time * 13.7) * 0.1;
      l.light.position.y = l.baseY + Math.sin(l.time * 5.1) * 0.03;
    });
  }

  // Returns nearest interactable within range of pos
  getNearestInteractable(pos, maxDist = 2.2) {
    let best = null, bestDist = Infinity;
    this.interactables.forEach(i => {
      const d = pos.distanceTo(i.position);
      if (d < i.radius && d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  checkWallCollision(box) {
    for (const w of this.walls) {
      if (w.box.intersectsBox(box)) return w;
    }
    return null;
  }
}

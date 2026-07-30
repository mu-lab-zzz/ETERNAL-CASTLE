import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

const WALK_SPEED  = 3.5;
const RUN_SPEED   = 6.0;
const STAMINA_MAX = 100;
const HP_MAX      = 100;
const MP_MAX      = 100;
const ATTACK_RANGE = 2.2;
const ATTACK_COOLDOWN = 0.9;
const STAMINA_DRAIN_RUN = 15;
const STAMINA_REGEN = 8;

export class PlayerController {
  constructor(camera, scene, dungeon, enemies, ui, audio) {
    this.camera  = camera;
    this.scene   = scene;
    this.dungeon = dungeon;
    this.enemies = enemies;
    this.ui      = ui;
    this.audio   = audio;

    this.hp = HP_MAX;
    this.mp = MP_MAX;
    this.stamina = STAMINA_MAX;

    this.velocity = new THREE.Vector3();
    this.euler    = new THREE.Euler(0, 0, 0, 'YXZ');

    this.keys = {};
    this.isPointerLocked = false;
    this.attackTimer  = 0;
    this.attackAnim   = 0;
    this.hurtTimer    = 0;
    this.dead         = false;

    this.inventory = [];
    this.equippedWeapon = null;
    this.invOpen = false;

    // Weapon visual
    this.weaponMesh = this._buildWeaponMesh();
    this.scene.add(this.weaponMesh);

    this._setupPointerLock();
    this._setupKeys();
    this._setupMouse();
  }

  _buildWeaponMesh() {
    const group = new THREE.Group();

    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.05, 0.7, 0.05);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x8090c0, roughness: 0.3, metalness: 0.9 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.35;
    group.add(blade);

    // Guard
    const guardGeo = new THREE.BoxGeometry(0.25, 0.05, 0.05);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: 0.7 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    group.add(guard);

    // Handle
    const handleGeo = new THREE.BoxGeometry(0.05, 0.25, 0.05);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x3a2810, roughness: 0.9 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.15;
    group.add(handle);

    group.visible = false;
    return group;
  }

  _setupPointerLock() {
    const canvas = document.getElementById('canvas');
    canvas.addEventListener('click', () => {
      if (!this.isPointerLocked) canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });
  }

  _setupKeys() {
    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'KeyI') this._toggleInventory();
      if (e.code === 'KeyE') this._interact();
      if (e.code === 'Space') { e.preventDefault(); this._castMagic(); }
    });
    document.addEventListener('keyup', e => { this.keys[e.code] = false; });
  }

  _setupMouse() {
    document.addEventListener('mousemove', e => {
      if (!this.isPointerLocked) return;
      const sens = 0.002;
      this.euler.y -= e.movementX * sens;
      this.euler.x -= e.movementY * sens;
      this.euler.x  = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    });

    document.addEventListener('mousedown', e => {
      if (e.button === 0 && this.isPointerLocked) this._attack(e.shiftKey);
    });
  }

  update(dt) {
    if (this.dead) return;

    this.dungeon.updateLights(dt);
    this._updateWeaponPos();
    this._updateMovement(dt);
    this._updateTimers(dt);
    this._updateInteractPrompt();
    this.ui.updateStats(this.hp / HP_MAX, this.stamina / STAMINA_MAX, this.mp / MP_MAX);
  }

  _updateMovement(dt) {
    const isRunning = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const speed = (isRunning && this.stamina > 5) ? RUN_SPEED : WALK_SPEED;

    // Stamina drain/regen
    if (isRunning && (this.keys['KeyW'] || this.keys['ArrowUp'])) {
      this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN_RUN * dt);
    } else {
      this.stamina = Math.min(STAMINA_MAX, this.stamina + STAMINA_REGEN * dt);
    }

    const forward = new THREE.Vector3();
    const right   = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const move = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    move.addScaledVector(forward,  1);
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  move.addScaledVector(forward, -1);
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  move.addScaledVector(right,   -1);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) move.addScaledVector(right,    1);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * dt);

    // Collision – try X then Z separately
    const playerBox = this._getPlayerBox();
    const pos = this.camera.position;

    // X
    pos.x += move.x;
    playerBox.min.x += move.x; playerBox.max.x += move.x;
    if (this.dungeon.checkWallCollision(playerBox)) {
      pos.x -= move.x;
      playerBox.min.x -= move.x; playerBox.max.x -= move.x;
    }

    // Z
    pos.z += move.z;
    playerBox.min.z += move.z; playerBox.max.z += move.z;
    if (this.dungeon.checkWallCollision(playerBox)) {
      pos.z -= move.z;
    }

    pos.y = 1.7; // Fixed height (no jumping)
  }

  _getPlayerBox() {
    const p = this.camera.position;
    return new THREE.Box3(
      new THREE.Vector3(p.x - 0.3, 0, p.z - 0.3),
      new THREE.Vector3(p.x + 0.3, 2, p.z + 0.3)
    );
  }

  _updateTimers(dt) {
    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.hurtTimer > 0)   this.hurtTimer   -= dt;
    if (this.attackAnim > 0)  this.attackAnim  -= dt;
  }

  _updateWeaponPos() {
    if (!this.weaponMesh.visible) return;
    const pos = new THREE.Vector3(0.28, -0.22, -0.5);
    // Attack swing
    const swing = Math.max(0, this.attackAnim) / 0.3;
    pos.y -= swing * 0.1;
    pos.z -= swing * 0.15;

    this.weaponMesh.position.copy(this.camera.localToWorld(pos));
    this.weaponMesh.rotation.copy(this.camera.rotation);
    this.weaponMesh.rotation.order = 'YXZ';
    this.weaponMesh.rotation.x += -0.3 + swing * 0.6;
  }

  _updateInteractPrompt() {
    const nearest = this.dungeon.getNearestInteractable(this.camera.position);
    const el = document.getElementById('interact-prompt');
    el.style.opacity = nearest ? '1' : '0';
  }

  _attack(heavy = false) {
    if (this.attackTimer > 0) return;
    if (!this.equippedWeapon && !this.inventory.find(i => i.type === 'weapon')) {
      this.ui.showMessage('武器がない。', 1500);
      return;
    }

    const dmg = this.equippedWeapon ? this.equippedWeapon.damage : 15;
    const finalDmg = heavy ? Math.floor(dmg * 1.8) : dmg;

    this.attackTimer = ATTACK_COOLDOWN;
    this.attackAnim  = 0.3;
    this.audio.playAttack();

    // Raycast
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const hit = this.enemies.checkHit(ray, ATTACK_RANGE);
    if (hit) {
      hit.takeDamage(finalDmg, this.ui);
    } else {
      // Swing sound (miss)
    }
  }

  _interact() {
    const nearest = this.dungeon.getNearestInteractable(this.camera.position);
    if (!nearest) return;

    switch (nearest.type) {
      case 'door':
        this._useDoor(nearest.data);
        break;
      case 'item':
        this._pickupItem(nearest.data);
        break;
      case 'npc':
        this._talkNPC(nearest.data);
        break;
    }
  }

  _useDoor(door) {
    if (door.open) return;
    if (door.locked) {
      const key = this.inventory.find(i => i.id === door.keyId);
      if (key) {
        this.inventory = this.inventory.filter(i => i !== key);
        this.dungeon.openDoor(door);
        this.ui.showMessage('扉が開いた。', 2000);
        this.audio.playDoor();
      } else {
        this.ui.showMessage(door.lockedMsg || '鍵がかかっている。', 2000);
      }
    } else {
      this.dungeon.openDoor(door);
      this.audio.playDoor();
    }
  }

  _pickupItem(entry) {
    if (entry.collected) return;
    entry.collected = true;
    entry.mesh.visible = false;

    this.dungeon.interactables = this.dungeon.interactables.filter(i => i.data !== entry);

    this.inventory.push(entry.data);
    this.ui.showMessage(`${entry.data.name} を手に入れた。`, 2500);

    if (entry.data.id === 'old_sword') {
      this.equippedWeapon = entry.data;
      this.weaponMesh.visible = true;
    }
    this.ui.updateInventory(this.inventory);
  }

  _talkNPC(npc) {
    const d = npc.dialogues;
    const msg = d[npc.dialogueIndex % d.length];
    this.ui.showMessage(msg, 4000);
    npc.dialogueIndex++;
  }

  _castMagic() {
    if (this.mp < 20) { this.ui.showMessage('魔力が足りない。', 1500); return; }
    this.mp = Math.max(0, this.mp - 20);

    // Fire bolt
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hit = this.enemies.checkHit(ray, 15);
    if (hit) {
      hit.takeDamage(35, this.ui);
      this.ui.showMessage('炎の魔法！', 1000);
    } else {
      // Spawn fireball projectile visual
      this._spawnFireball(ray.ray.direction);
      this.ui.showMessage('炎の魔法を放った。', 1000);
    }
    this.audio.playMagic();
  }

  _spawnFireball(dir) {
    const geo = new THREE.SphereGeometry(0.12, 6, 4);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff4010, emissive: 0xff2000, emissiveIntensity: 3, roughness: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(this.camera.position).addScaledVector(dir, 1);
    this.scene.add(mesh);

    let t = 0;
    const speed = 12;
    const animate = () => {
      t += 0.016;
      mesh.position.addScaledVector(dir, speed * 0.016);
      if (t > 2) { this.scene.remove(mesh); return; }
      requestAnimationFrame(animate);
    };
    animate();
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hurtTimer = 0.5;
    this.ui.showHit();

    if (this.hp <= 0) this._die();
  }

  heal(amount) {
    this.hp = Math.min(HP_MAX, this.hp + amount);
  }

  _die() {
    this.dead = true;
    const overlay = document.getElementById('death-overlay');
    overlay.classList.add('dead');
    document.exitPointerLock();
  }

  _toggleInventory() {
    this.invOpen = !this.invOpen;
    const el = document.getElementById('inventory');
    el.style.display = this.invOpen ? 'block' : 'none';
    if (this.invOpen) {
      this.ui.updateInventory(this.inventory);
      document.exitPointerLock();
    } else {
      document.getElementById('canvas').requestPointerLock();
    }
  }
}

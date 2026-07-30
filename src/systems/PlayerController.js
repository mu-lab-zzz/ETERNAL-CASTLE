import * as THREE from '/vendor/three.module.js';

const WALK_SPEED  = 3.5;
const RUN_SPEED   = 6.0;
const STAMINA_MAX = 100;
const HP_MAX      = 100;
const MP_MAX      = 100;
const ATTACK_RANGE = 2.2;
const ATTACK_COOLDOWN = 0.9;
const STAMINA_DRAIN_RUN = 15;
const STAMINA_REGEN = 8;

const JOYSTICK_RADIUS = 65; // px, half the outer circle
const LOOK_SENSITIVITY_MOUSE = 0.002;
const LOOK_SENSITIVITY_TOUCH = 0.005;

export class PlayerController {
  constructor(camera, scene, dungeon, enemies, ui, audio) {
    this.camera  = camera;
    this.scene   = scene;
    this.dungeon = dungeon;
    this.enemies = enemies;
    this.ui      = ui;
    this.audio   = audio;

    this.hp      = HP_MAX;
    this.mp      = MP_MAX;
    this.stamina = STAMINA_MAX;

    this.euler  = new THREE.Euler(0, 0, 0, 'YXZ');
    this.keys   = {};
    this.dead   = false;
    this.attackTimer = 0;
    this.attackAnim  = 0;
    this.hurtTimer   = 0;

    this.inventory      = [];
    this.equippedWeapon = null;
    this.invOpen        = false;

    // Touch state
    this.isMobile     = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.touchMove    = { x: 0, y: 0 };   // virtual joystick [-1, 1]
    this.joystickId   = null;              // active touch id on joystick
    this.lookId       = null;              // active touch id on look zone
    this.lookLast     = { x: 0, y: 0 };   // previous look touch position
    this.runToggle    = false;             // mobile run toggle
    this.isPointerLocked = false;

    // Weapon mesh (right-hand view model)
    this.weaponMesh = this._buildWeaponMesh();
    this.scene.add(this.weaponMesh);

    if (this.isMobile) {
      this._setupTouchControls();
      this._setupTouchCamera();
    } else {
      this._setupPointerLock();
      this._setupMouse();
    }
    this._setupKeys();
  }

  // ─── Build ───────────────────────────────────────────────────────────────

  _buildWeaponMesh() {
    const group = new THREE.Group();
    const bladeMat  = new THREE.MeshStandardMaterial({ color: 0x8090c0, roughness: 0.3, metalness: 0.9 });
    const guardMat  = new THREE.MeshStandardMaterial({ color: 0x5a4020, roughness: 0.7 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x3a2810, roughness: 0.9 });

    const blade  = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.05), bladeMat);
    blade.position.y = 0.35;
    const guard  = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 0.05), guardMat);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.25, 0.05), handleMat);
    handle.position.y = -0.15;
    group.add(blade, guard, handle);
    group.visible = false;
    return group;
  }

  // ─── Desktop input ───────────────────────────────────────────────────────

  _setupPointerLock() {
    const canvas = document.getElementById('canvas');
    canvas.addEventListener('click', () => {
      if (!this.isPointerLocked && !this.invOpen) canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });
  }

  _setupMouse() {
    document.addEventListener('mousemove', e => {
      if (!this.isPointerLocked) return;
      this.euler.y -= e.movementX * LOOK_SENSITIVITY_MOUSE;
      this.euler.x -= e.movementY * LOOK_SENSITIVITY_MOUSE;
      this.euler.x  = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    });
    document.addEventListener('mousedown', e => {
      if (e.button === 0 && this.isPointerLocked) this._attack(e.shiftKey);
    });
  }

  _setupKeys() {
    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'KeyI') this._toggleInventory();
      if (e.code === 'KeyE') this._interact();
      if (e.code === 'Space') { e.preventDefault(); this._castMagic(); }
      if (e.code === 'KeyM') { /* handled by MapSystem */ }
    });
    document.addEventListener('keyup', e => { this.keys[e.code] = false; });
  }

  // ─── Mobile / Touch input ─────────────────────────────────────────────────

  _setupTouchControls() {
    // Show touch UI
    document.getElementById('touch-controls').style.display = 'block';
    document.getElementById('interact-prompt').textContent  = '[ タップ ] 調べる';

    // Update title screen hint
    const hints = document.getElementById('title-controls');
    if (hints) hints.innerHTML =
      '左スティック ― 移動 &nbsp;|&nbsp; 右スワイプ ― 視点<br>' +
      '⚔ ― 攻撃 &nbsp;|&nbsp; 🔍 ― 調べる &nbsp;|&nbsp; 🔮 ― 魔法<br>' +
      '持物 ― 所持品 &nbsp;|&nbsp; 地図 ― ミニマップ &nbsp;|&nbsp; 💨 ― 走る';

    const joystickZone = document.getElementById('joystick-zone');
    const joystickKnob = document.getElementById('joystick-knob');

    joystickZone.addEventListener('touchstart', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (this.joystickId === null) {
          this.joystickId = t.identifier;
          this._updateJoystick(t, joystickZone, joystickKnob);
        }
      }
    }, { passive: false });

    joystickZone.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === this.joystickId)
          this._updateJoystick(t, joystickZone, joystickKnob);
      }
    }, { passive: false });

    const joystickEnd = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joystickId) {
          this.joystickId = null;
          this.touchMove  = { x: 0, y: 0 };
          joystickKnob.style.transform = 'translate(-50%, -50%)';
        }
      }
    };
    joystickZone.addEventListener('touchend',    joystickEnd);
    joystickZone.addEventListener('touchcancel', joystickEnd);

    // Action buttons
    const btn = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', e => { e.preventDefault(); fn(); }, { passive: false });
    };
    btn('btn-attack',   () => this._attack(false));
    btn('btn-magic',    () => this._castMagic());
    btn('btn-interact', () => this._interact());
    btn('btn-inv',      () => this._toggleInventory());
    btn('btn-map', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM' }));
    });

    // Run toggle
    const runBtn = document.getElementById('btn-run');
    runBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      this.runToggle = !this.runToggle;
      runBtn.classList.toggle('active', this.runToggle);
    }, { passive: false });

    // Inventory close via ✕ button (already inline onclick in HTML)
    // Also close by tapping outside
    document.getElementById('inventory').addEventListener('touchstart', e => e.stopPropagation());
  }

  _updateJoystick(touch, zone, knob) {
    const rect = zone.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > JOYSTICK_RADIUS) {
      dx = dx / dist * JOYSTICK_RADIUS;
      dy = dy / dist * JOYSTICK_RADIUS;
    }
    this.touchMove.x =  dx / JOYSTICK_RADIUS;
    this.touchMove.y = -dy / JOYSTICK_RADIUS; // screen-Y inverted → up = positive
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  _setupTouchCamera() {
    const canvas = document.getElementById('canvas');

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        // Ignore joystick area
        if (this._touchInJoystickZone(t)) continue;
        if (this.lookId === null) {
          this.lookId   = t.identifier;
          this.lookLast = { x: t.clientX, y: t.clientY };
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== this.lookId) continue;
        const dx = t.clientX - this.lookLast.x;
        const dy = t.clientY - this.lookLast.y;
        this.euler.y -= dx * LOOK_SENSITIVITY_TOUCH;
        this.euler.x -= dy * LOOK_SENSITIVITY_TOUCH;
        this.euler.x  = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.euler.x));
        this.camera.quaternion.setFromEuler(this.euler);
        this.lookLast = { x: t.clientX, y: t.clientY };
      }
    }, { passive: false });

    const lookEnd = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.lookId) this.lookId = null;
      }
    };
    canvas.addEventListener('touchend',    lookEnd, { passive: false });
    canvas.addEventListener('touchcancel', lookEnd, { passive: false });
  }

  _touchInJoystickZone(touch) {
    const zone = document.getElementById('joystick-zone');
    if (!zone) return false;
    const r = zone.getBoundingClientRect();
    return touch.clientX >= r.left && touch.clientX <= r.right &&
           touch.clientY >= r.top  && touch.clientY <= r.bottom;
  }

  // ─── Game loop ───────────────────────────────────────────────────────────

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
    const isRunning = this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.runToggle;
    const hasMove   = this.keys['KeyW'] || this.keys['ArrowUp'] ||
                      Math.abs(this.touchMove.x) > 0.05 || Math.abs(this.touchMove.y) > 0.05;
    const speed = (isRunning && this.stamina > 5) ? RUN_SPEED : WALK_SPEED;

    if (isRunning && hasMove) {
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
    // Keyboard
    if (this.keys['KeyW'] || this.keys['ArrowUp'])    move.addScaledVector(forward,  1);
    if (this.keys['KeyS'] || this.keys['ArrowDown'])  move.addScaledVector(forward, -1);
    if (this.keys['KeyA'] || this.keys['ArrowLeft'])  move.addScaledVector(right,   -1);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) move.addScaledVector(right,    1);
    // Touch joystick
    if (Math.abs(this.touchMove.x) > 0.05 || Math.abs(this.touchMove.y) > 0.05) {
      move.addScaledVector(forward, this.touchMove.y);
      move.addScaledVector(right,   this.touchMove.x);
    }

    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed * dt);

    const pos = this.camera.position;
    const box = this._getPlayerBox();

    pos.x += move.x;
    box.min.x += move.x; box.max.x += move.x;
    if (this.dungeon.checkWallCollision(box)) {
      pos.x -= move.x;
      box.min.x -= move.x; box.max.x -= move.x;
    }
    pos.z += move.z;
    box.min.z += move.z; box.max.z += move.z;
    if (this.dungeon.checkWallCollision(box)) pos.z -= move.z;

    pos.y = 1.7;
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
    if (this.hurtTimer   > 0) this.hurtTimer   -= dt;
    if (this.attackAnim  > 0) this.attackAnim  -= dt;
  }

  _updateWeaponPos() {
    if (!this.weaponMesh.visible) return;
    const pos   = new THREE.Vector3(0.28, -0.22, -0.5);
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
    document.getElementById('interact-prompt').style.opacity = nearest ? '1' : '0';
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  _attack(heavy = false) {
    if (this.attackTimer > 0) return;
    if (!this.equippedWeapon && !this.inventory.find(i => i.type === 'weapon')) {
      this.ui.showMessage('武器がない。', 1500);
      return;
    }
    const dmg      = this.equippedWeapon ? this.equippedWeapon.damage : 15;
    const finalDmg = heavy ? Math.floor(dmg * 1.8) : dmg;
    this.attackTimer = ATTACK_COOLDOWN;
    this.attackAnim  = 0.3;
    this.audio.playAttack();

    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hit = this.enemies.checkHit(ray, ATTACK_RANGE);
    if (hit) hit.takeDamage(finalDmg, this.ui);
  }

  _interact() {
    const nearest = this.dungeon.getNearestInteractable(this.camera.position);
    if (!nearest) return;
    if (nearest.type === 'door') this._useDoor(nearest.data);
    else if (nearest.type === 'item') this._pickupItem(nearest.data);
    else if (nearest.type === 'npc')  this._talkNPC(nearest.data);
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
    this.ui.showMessage(d[npc.dialogueIndex % d.length], 4000);
    npc.dialogueIndex++;
  }

  _castMagic() {
    if (this.mp < 20) { this.ui.showMessage('魔力が足りない。', 1500); return; }
    this.mp = Math.max(0, this.mp - 20);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hit = this.enemies.checkHit(ray, 15);
    if (hit) {
      hit.takeDamage(35, this.ui);
      this.ui.showMessage('炎の魔法！', 1000);
    } else {
      this._spawnFireball(ray.ray.direction.clone());
      this.ui.showMessage('炎の魔法を放った。', 1000);
    }
    this.audio.playMagic();
  }

  _spawnFireball(dir) {
    const geo  = new THREE.SphereGeometry(0.12, 6, 4);
    const mat  = new THREE.MeshStandardMaterial({ color: 0xff4010, emissive: 0xff2000, emissiveIntensity: 3, roughness: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(this.camera.position).addScaledVector(dir, 1);
    this.scene.add(mesh);
    let t = 0;
    const anim = () => {
      t += 0.016;
      mesh.position.addScaledVector(dir, 12 * 0.016);
      if (t > 2) { this.scene.remove(mesh); return; }
      requestAnimationFrame(anim);
    };
    anim();
  }

  // ─── Damage / Death ──────────────────────────────────────────────────────

  takeDamage(amount) {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hurtTimer = 0.5;
    this.ui.showHit();
    if (this.hp <= 0) this._die();
  }

  heal(amount) { this.hp = Math.min(HP_MAX, this.hp + amount); }

  _die() {
    this.dead = true;
    document.getElementById('death-overlay').classList.add('dead');
    if (!this.isMobile) document.exitPointerLock();
  }

  // ─── Inventory ───────────────────────────────────────────────────────────

  _toggleInventory() {
    this.invOpen = !this.invOpen;
    const el = document.getElementById('inventory');
    el.style.display = this.invOpen ? 'block' : 'none';
    if (this.invOpen) {
      this.ui.updateInventory(this.inventory);
      if (!this.isMobile) document.exitPointerLock();
    } else {
      if (!this.isMobile) document.getElementById('canvas').requestPointerLock();
    }
  }
}

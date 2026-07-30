import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

const ENEMY_DEFS = {
  ghost_knight: {
    name: '亡霊騎士',
    hp: 60,
    maxHp: 60,
    damage: 12,
    speed: 1.4,
    attackRange: 1.5,
    detectionRange: 9,
    attackCooldown: 2.0,
    color: 0x3a4a6a,
    emissive: 0x102030,
    height: 1.8,
    scale: 1.0,
  },
  cursed_soldier: {
    name: '呪われた兵士',
    hp: 40,
    maxHp: 40,
    damage: 8,
    speed: 2.0,
    attackRange: 1.4,
    detectionRange: 7,
    attackCooldown: 1.5,
    color: 0x3a2a1a,
    emissive: 0x100800,
    height: 1.6,
    scale: 0.85,
  },
  giant_spider: {
    name: '巨大蜘蛛',
    hp: 30,
    maxHp: 30,
    damage: 6,
    speed: 2.6,
    attackRange: 1.2,
    detectionRange: 6,
    attackCooldown: 1.2,
    color: 0x1a1a1a,
    emissive: 0x0a0000,
    height: 0.8,
    scale: 0.7,
  },
};

export class Enemy {
  constructor(scene, def, position) {
    this.scene = scene;
    this.def   = { ...def };
    this.hp    = def.hp;
    this.maxHp = def.maxHp;
    this.attackTimer = 0;
    this.state = 'idle'; // idle | chase | attack | dead
    this.position = position.clone();
    this.alertTimer = 0;
    this.alive = true;
    this.hitTimer = 0;

    this.mesh = this._build(def);
    this.mesh.position.copy(position);
    scene.add(this.mesh);

    // Health bar light
    this.alertLight = new THREE.PointLight(0x200800, 0, 4);
    this.alertLight.position.copy(position).add(new THREE.Vector3(0, 2, 0));
    scene.add(this.alertLight);
  }

  _build(def) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: def.color, emissive: def.emissive, emissiveIntensity: 0.5,
      roughness: 0.9, metalness: 0.1,
    });
    const s = def.scale;

    if (def.name === '巨大蜘蛛') {
      // Spider body
      const bodyGeo = new THREE.SphereGeometry(0.35 * s, 8, 6);
      const body = new THREE.Mesh(bodyGeo, mat);
      body.position.y = 0.4 * s;
      group.add(body);
      // Legs
      for (let i = 0; i < 8; i++) {
        const legGeo = new THREE.BoxGeometry(0.06 * s, 0.04 * s, 0.5 * s);
        const leg = new THREE.Mesh(legGeo, mat);
        const angle = (i / 8) * Math.PI * 2;
        leg.position.set(Math.cos(angle) * 0.4 * s, 0.3 * s, Math.sin(angle) * 0.4 * s);
        leg.rotation.y = angle;
        group.add(leg);
      }
    } else {
      // Humanoid
      const bodyGeo = new THREE.BoxGeometry(0.5 * s, 0.9 * s, 0.3 * s);
      const body = new THREE.Mesh(bodyGeo, mat);
      body.position.y = 1.0 * s;
      group.add(body);

      const headGeo = new THREE.BoxGeometry(0.3 * s, 0.35 * s, 0.3 * s);
      const head = new THREE.Mesh(headGeo, mat);
      head.position.y = 1.65 * s;
      group.add(head);

      // Sword arm
      if (def.name === '亡霊騎士') {
        const armGeo = new THREE.BoxGeometry(0.12 * s, 0.6 * s, 0.1 * s);
        const arm = new THREE.Mesh(armGeo, mat);
        arm.position.set(0.38 * s, 0.95 * s, 0);
        arm.rotation.z = 0.3;
        group.add(arm);
        // Sword
        const swordGeo = new THREE.BoxGeometry(0.04, 0.65, 0.04);
        const swordMat = new THREE.MeshStandardMaterial({ color: 0x7080a0, roughness: 0.3, metalness: 0.9 });
        const sword = new THREE.Mesh(swordGeo, swordMat);
        sword.position.set(0.55 * s, 0.8 * s, 0);
        group.add(sword);
      }

      // Legs
      [-0.15, 0.15].forEach((xOff, i) => {
        const legGeo = new THREE.BoxGeometry(0.18 * s, 0.55 * s, 0.2 * s);
        const leg = new THREE.Mesh(legGeo, mat);
        leg.position.set(xOff * s, 0.3 * s, 0);
        group.add(leg);
      });
    }

    group.castShadow = true;
    return group;
  }

  update(dt, player) {
    if (!this.alive) return;

    this.attackTimer = Math.max(0, this.attackTimer - dt);
    this.hitTimer    = Math.max(0, this.hitTimer - dt);

    const toPlayer = player.camera.position.clone().sub(this.mesh.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    switch (this.state) {
      case 'idle':
        if (dist < this.def.detectionRange) {
          this.state = 'chase';
          this.alertTimer = 0.3;
        }
        break;

      case 'chase': {
        // Alert flash
        this.alertLight.intensity = this.alertTimer > 0 ? 2 : 0;
        this.alertLight.position.copy(this.mesh.position).add(new THREE.Vector3(0, 2, 0));

        if (dist > this.def.detectionRange * 1.5) { this.state = 'idle'; break; }
        if (dist < this.def.attackRange) { this.state = 'attack'; break; }

        // Move toward player
        const dir = toPlayer.normalize();
        this.mesh.position.addScaledVector(dir, this.def.speed * dt);
        this.mesh.lookAt(player.camera.position.x, this.mesh.position.y, player.camera.position.z);
        this._walkAnim(dt);
        break;
      }

      case 'attack':
        if (dist > this.def.attackRange * 1.3) { this.state = 'chase'; break; }
        if (this.attackTimer <= 0) {
          this.attackTimer = this.def.attackCooldown;
          player.takeDamage(this.def.damage);
          this._attackAnim();
        }
        break;
    }

    this.position.copy(this.mesh.position);
  }

  _walkAnim(dt) {
    if (!this._walkT) this._walkT = 0;
    this._walkT += dt * 5;
    this.mesh.children.forEach((c, i) => {
      if (i < 2) c.rotation.x = Math.sin(this._walkT + i) * 0.1;
    });
  }

  _attackAnim() {
    const arm = this.mesh.children[2];
    if (!arm) return;
    arm.rotation.x = -0.8;
    setTimeout(() => { if (arm) arm.rotation.x = 0; }, 300);
  }

  takeDamage(amount, ui) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitTimer = 0.2;
    this.state = 'chase';

    // Flash red
    this.mesh.children.forEach(c => {
      if (c.material) {
        const orig = c.material.emissiveIntensity;
        c.material.emissiveIntensity = 3;
        c.material.emissive.set(0x800000);
        setTimeout(() => {
          if (c.material) {
            c.material.emissiveIntensity = orig;
            c.material.emissive.set(this.def.emissive);
          }
        }, 150);
      }
    });

    const pct = this.hp / this.maxHp;
    ui.showEnemyHP(this.def.name, pct);
    if (this.hp <= 0) this._die(ui);
  }

  _die(ui) {
    this.alive = false;
    this.state = 'dead';
    ui.showMessage(`${this.def.name} を倒した。`, 2000);

    // Fall animation
    let t = 0;
    const animate = () => {
      t += 0.016;
      this.mesh.rotation.x = Math.min(Math.PI / 2, t * 2);
      this.mesh.position.y -= 0.015;
      if (t < 0.8) requestAnimationFrame(animate);
      else {
        setTimeout(() => {
          this.scene.remove(this.mesh);
          this.scene.remove(this.alertLight);
        }, 3000);
      }
    };
    animate();
  }

  getBoundingBox() {
    return new THREE.Box3().setFromObject(this.mesh);
  }
}

export class EnemyManager {
  constructor(scene, camera) {
    this.scene   = scene;
    this.camera  = camera;
    this.enemies = [];
  }

  spawnInitial(dungeon) {
    this._spawn('ghost_knight',   new THREE.Vector3(0, 0, -10));
    this._spawn('cursed_soldier', new THREE.Vector3(-7, 0, 2));
    this._spawn('cursed_soldier', new THREE.Vector3(7, 0, 6));
    this._spawn('giant_spider',   new THREE.Vector3(-10, 0, -1));
    this._spawn('giant_spider',   new THREE.Vector3(-11, 0, 1));
    this._spawn('ghost_knight',   new THREE.Vector3(14, 0, 4));
  }

  _spawn(type, pos) {
    const def = ENEMY_DEFS[type];
    if (!def) return;
    const e = new Enemy(this.scene, def, pos);
    this.enemies.push(e);
  }

  update(dt, player) {
    for (const e of this.enemies) e.update(dt, player);
  }

  checkHit(ray, maxDist) {
    let best = null, bestDist = maxDist;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const box  = e.getBoundingBox();
      const hits = ray.ray.intersectBox(box, new THREE.Vector3());
      if (hits) {
        const d = hits.distanceTo(ray.ray.origin);
        if (d < bestDist) { bestDist = d; best = e; }
      }
    }
    return best;
  }
}

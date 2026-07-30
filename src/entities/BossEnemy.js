import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

// Phase 1 boss: Ancient Knight Guardian
// Encountered deep in the underground chapel
export class BossEnemy {
  constructor(scene, position, ui) {
    this.scene    = scene;
    this.ui       = ui;
    this.hp       = 200;
    this.maxHp    = 200;
    this.alive    = true;
    this.state    = 'dormant'; // dormant | awaken | phase1 | phase2 | dead
    this.phase    = 1;
    this.attackTimer = 0;
    this.position = position.clone();
    this._buildMesh(position);
    this._buildArena(position);
  }

  _buildMesh(pos) {
    const group = new THREE.Group();

    // Main body — massive armored knight
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1a1820, roughness: 0.7, metalness: 0.8,
      emissive: 0x080412, emissiveIntensity: 0.3,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x4020a0, emissive: 0x2010a0, emissiveIntensity: 3, roughness: 1,
    });

    // Torso
    const tGeo  = new THREE.BoxGeometry(1.2, 1.5, 0.8);
    const torso = new THREE.Mesh(tGeo, bodyMat);
    torso.position.y = 1.8;
    group.add(torso);

    // Helm
    const hGeo = new THREE.BoxGeometry(0.8, 0.8, 0.7);
    const helm = new THREE.Mesh(hGeo, bodyMat);
    helm.position.y = 3.0;
    group.add(helm);

    // Visor glow (eyes)
    const eGeo = new THREE.BoxGeometry(0.5, 0.1, 0.1);
    const eyes = new THREE.Mesh(eGeo, eyeMat);
    eyes.position.set(0, 3.05, 0.38);
    group.add(eyes);

    // Eye light
    this._eyeLight = new THREE.PointLight(0x4020a0, 0, 5);
    this._eyeLight.position.set(0, 3.0, 0.5);
    group.add(this._eyeLight);

    // Pauldrons (shoulder plates)
    [-0.8, 0.8].forEach(xOff => {
      const pGeo  = new THREE.BoxGeometry(0.4, 0.4, 0.5);
      const paul  = new THREE.Mesh(pGeo, bodyMat);
      paul.position.set(xOff, 2.6, 0);
      group.add(paul);
    });

    // Arms
    [-0.85, 0.85].forEach((xOff, i) => {
      const aGeo = new THREE.BoxGeometry(0.3, 1.2, 0.3);
      const arm  = new THREE.Mesh(aGeo, bodyMat);
      arm.position.set(xOff, 1.5, 0);
      group.add(arm);
    });

    // Great sword (right hand)
    const bladeGeo = new THREE.BoxGeometry(0.12, 2.5, 0.08);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x3040a0, roughness: 0.2, metalness: 0.95,
      emissive: 0x1020a0, emissiveIntensity: 0.8,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(1.1, 0.8, 0);
    group.add(blade);
    this._blade = blade;

    // Legs
    [-0.3, 0.3].forEach(xOff => {
      const lGeo = new THREE.BoxGeometry(0.4, 1.2, 0.4);
      const leg  = new THREE.Mesh(lGeo, bodyMat);
      leg.position.set(xOff, 0.6, 0);
      group.add(leg);
    });

    group.position.copy(pos);
    group.scale.set(1.3, 1.3, 1.3);
    this.scene.add(group);
    this.mesh = group;
  }

  _buildArena(pos) {
    // Candles around boss chamber
    const candleMat = new THREE.MeshStandardMaterial({ color: 0x3a2810, roughness: 0.9 });
    const flameMat  = new THREE.MeshStandardMaterial({ color: 0xff6020, emissive: 0xff3010, emissiveIntensity: 2 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const cx = pos.x + Math.cos(angle) * 5;
      const cz = pos.z + Math.sin(angle) * 5;

      const cGeo  = new THREE.CylinderGeometry(0.08, 0.1, 0.5, 6);
      const cMesh = new THREE.Mesh(cGeo, candleMat);
      cMesh.position.set(cx, pos.y + 0.25, cz);
      this.scene.add(cMesh);

      const fGeo  = new THREE.ConeGeometry(0.06, 0.15, 6);
      const flame = new THREE.Mesh(fGeo, flameMat);
      flame.position.set(cx, pos.y + 0.6, cz);
      this.scene.add(flame);

      const l = new THREE.PointLight(0x8030a0, 0.8, 5, 2);
      l.position.set(cx, pos.y + 0.8, cz);
      this.scene.add(l);
    }
  }

  update(dt, player) {
    if (!this.alive) return;
    this.attackTimer = Math.max(0, this.attackTimer - dt);

    const toPlayer = player.camera.position.clone().sub(this.mesh.position);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    switch (this.state) {
      case 'dormant':
        if (dist < 8) this._awaken();
        break;

      case 'phase1': {
        this._eyeLight.intensity = 2 + Math.sin(Date.now() * 0.003) * 0.5;
        this.mesh.lookAt(player.camera.position.x, this.mesh.position.y, player.camera.position.z);

        if (this.hp < this.maxHp * 0.5 && this.phase === 1) this._enterPhase2();

        if (dist > 2 && dist < 20) {
          const dir = toPlayer.normalize();
          this.mesh.position.addScaledVector(dir, 1.5 * dt);
        }
        if (dist < 2.5 && this.attackTimer <= 0) {
          this.attackTimer = 2.5;
          player.takeDamage(this.phase === 1 ? 18 : 28);
          this._swingAnim();
        }
        break;
      }

      case 'phase2': {
        this._eyeLight.intensity = 4 + Math.sin(Date.now() * 0.006) * 1;
        this.mesh.lookAt(player.camera.position.x, this.mesh.position.y, player.camera.position.z);

        if (dist > 2 && dist < 20) {
          const dir = toPlayer.normalize();
          this.mesh.position.addScaledVector(dir, 2.5 * dt);
        }
        if (dist < 2.5 && this.attackTimer <= 0) {
          this.attackTimer = 1.8;
          player.takeDamage(28);
          this._swingAnim();
        }
        // Ranged attack
        if (dist < 12 && dist > 3 && this.attackTimer <= 0.5 && Math.random() < 0.01) {
          this._shootOrb(player);
        }
        break;
      }
    }
  }

  _awaken() {
    this.state = 'phase1';
    this.ui.showMessage('― 城の守護者が目覚めた ―', 4000);
    this._eyeLight.intensity = 3;
    // Rise animation
    let t = 0;
    const start = this.mesh.rotation.x;
    const anim = () => {
      t += 0.02;
      this.mesh.rotation.x = start * (1 - Math.min(t, 1));
      if (t < 1) requestAnimationFrame(anim);
    };
    anim();
  }

  _enterPhase2() {
    this.phase = 2;
    this.state = 'phase2';
    this.ui.showMessage('「城は死なぬ…\n人間よ、城に飲まれろ！」', 5000);
    // Blade glows brighter
    this._blade.material.emissiveIntensity = 3;
    this._blade.material.emissive.set(0x6040ff);
  }

  _swingAnim() {
    const blade = this._blade;
    let t = 0;
    const anim = () => {
      t += 0.04;
      blade.rotation.z = Math.sin(t * 10) * 0.5 * Math.max(0, 1 - t);
      if (t < 1) requestAnimationFrame(anim);
    };
    anim();
  }

  _shootOrb(player) {
    const geo = new THREE.SphereGeometry(0.18, 8, 6);
    const mat = new THREE.MeshStandardMaterial({ color: 0x4020a0, emissive: 0x2010a0, emissiveIntensity: 4 });
    const orb = new THREE.Mesh(geo, mat);
    orb.position.copy(this.mesh.position).add(new THREE.Vector3(0, 3.5, 0));
    this.scene.add(orb);

    const target = player.camera.position.clone();
    const dir = target.sub(orb.position).normalize();
    const speed = 6;
    let t = 0;

    const anim = () => {
      t += 0.016;
      orb.position.addScaledVector(dir, speed * 0.016);
      // Check hit
      if (orb.position.distanceTo(player.camera.position) < 0.8) {
        player.takeDamage(20);
        this.scene.remove(orb);
        return;
      }
      if (t > 3) { this.scene.remove(orb); return; }
      requestAnimationFrame(anim);
    };
    anim();
  }

  takeDamage(amount, ui) {
    if (!this.alive || this.state === 'dormant') return;
    this.hp = Math.max(0, this.hp - amount);
    ui.showEnemyHP('城の守護者', this.hp / this.maxHp);

    // Flash
    this.mesh.children.forEach(c => {
      if (c.material) {
        const orig = c.material.emissiveIntensity || 0;
        c.material.emissiveIntensity = 5;
        setTimeout(() => { if (c.material) c.material.emissiveIntensity = orig; }, 100);
      }
    });

    if (this.hp <= 0) this._die(ui);
  }

  _die(ui) {
    this.alive = false;
    this.state = 'dead';
    ui.showMessage(
      '城の守護者が倒れた。\n\n遠くで何かが崩れる音がする。\nしかし城は…まだ続いている。',
      8000
    );
    let t = 0;
    const anim = () => {
      t += 0.01;
      this.mesh.rotation.x += 0.02;
      this.mesh.position.y -= 0.02;
      this._eyeLight.intensity = Math.max(0, 2 - t * 2);
      if (t < 2) requestAnimationFrame(anim);
      else setTimeout(() => this.scene.remove(this.mesh), 2000);
    };
    anim();
  }

  getBoundingBox() {
    return new THREE.Box3().setFromObject(this.mesh);
  }
}

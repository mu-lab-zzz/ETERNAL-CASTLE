import * as THREE from 'three';

const MOVE_SPEED = 8;
const SPRINT_MULT = 2.0;
const MOUSE_SENSITIVITY = 0.0018;

export class FPSControls {
  constructor(camera, canvas, world, game) {
    this.camera = camera;
    this.canvas = canvas;
    this.world = world;
    this.game = game;
    this.selectedColor = '#e74c3c';

    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.euler.y = -Math.PI / 4;
    this.euler.x = -0.3;
    this.camera.quaternion.setFromEuler(this.euler);

    this.keys = {};
    this.locked = false;
    this.clock = new THREE.Clock();

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 10;

    // Ghost block (preview)
    const geo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    this.ghostBlock = new THREE.Mesh(geo, mat);
    this.ghostBlock.visible = false;
    game.scene.add(this.ghostBlock);
    this.ghostMat = mat;

    this._bindEvents();
  }

  _bindEvents() {
    document.addEventListener('keydown', e => { this.keys[e.code] = true; });
    document.addEventListener('keyup', e => { this.keys[e.code] = false; });

    this.canvas.addEventListener('click', () => {
      if (!this.locked) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      const hint = document.getElementById('pointer-hint');
      if (hint) hint.classList.toggle('hidden', this.locked);
    });

    document.addEventListener('mousemove', e => {
      if (!this.locked) return;
      this.euler.y -= e.movementX * MOUSE_SENSITIVITY;
      this.euler.x -= e.movementY * MOUSE_SENSITIVITY;
      this.euler.x = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    });

    this.canvas.addEventListener('mousedown', e => {
      if (!this.locked) return;
      if (e.button === 0) this._placeBlock();
      if (e.button === 2) this._removeBlock();
    });

    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('wheel', e => {
      if (!this.locked) return;
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.camera.position.addScaledVector(dir, -e.deltaY * 0.01);
    });

    document.addEventListener('keydown', e => {
      if (e.code === 'KeyG') this.game.toggleGrid();
      if (e.code === 'Escape' && this.locked) document.exitPointerLock();
    });
  }

  update() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (!this.locked) return;

    const speed = (this.keys['ShiftLeft'] || this.keys['ShiftRight'])
      ? MOVE_SPEED * SPRINT_MULT
      : MOVE_SPEED;

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, THREE.Object3D.DEFAULT_UP).normalize();

    if (this.keys['KeyW']) this.camera.position.addScaledVector(forward, speed * dt);
    if (this.keys['KeyS']) this.camera.position.addScaledVector(forward, -speed * dt);
    if (this.keys['KeyA']) this.camera.position.addScaledVector(right, -speed * dt);
    if (this.keys['KeyD']) this.camera.position.addScaledVector(right, speed * dt);
    if (this.keys['Space']) this.camera.position.y += speed * dt;
    if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
      // Only lower if also pressing S or alone (handled above for sprint)
    }

    // Down without sprint: use Ctrl or Q
    if (this.keys['KeyQ'] || this.keys['ControlLeft']) {
      this.camera.position.y -= speed * dt * 0.5;
    }

    // Clamp
    this.camera.position.y = Math.max(0.5, Math.min(50, this.camera.position.y));

    this._updateGhostBlock();
    this._updateStatus();
  }

  _raycast() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    const ground = this.game.scene.getObjectByName('ground');
    const blockMeshes = this.world.getMeshes();
    const targets = ground ? [...blockMeshes, ground] : blockMeshes;

    const hits = this.raycaster.intersectObjects(targets, false);
    return hits.length > 0 ? hits[0] : null;
  }

  _getPlacementPosition(hit) {
    if (!hit) return null;
    const normal = hit.face.normal.clone();
    const pos = hit.point.clone().add(normal.multiplyScalar(0.5));
    return new THREE.Vector3(Math.round(pos.x), Math.round(pos.y), Math.round(pos.z));
  }

  _updateGhostBlock() {
    const hit = this._raycast();
    if (!hit) {
      this.ghostBlock.visible = false;
      return;
    }
    const pos = this._getPlacementPosition(hit);
    if (!pos) {
      this.ghostBlock.visible = false;
      return;
    }
    const hex = parseInt(this.selectedColor.replace('#', ''), 16);
    this.ghostMat.color.setHex(hex);
    this.ghostBlock.position.copy(pos);
    this.ghostBlock.visible = true;
  }

  _placeBlock() {
    const hit = this._raycast();
    if (!hit) return;
    const pos = this._getPlacementPosition(hit);
    if (!pos) return;

    const placed = this.world.placeBlock(pos.x, pos.y, pos.z, this.selectedColor);
    if (placed) {
      this.game.blockCount++;
    }
  }

  _removeBlock() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects(this.world.getMeshes(), false);
    if (hits.length === 0) return;

    const mesh = hits[0].object;
    const pos = mesh.position;
    const removed = this.world.removeBlock(pos.x, pos.y, pos.z);
    if (removed) {
      this.game.blockCount = Math.max(0, this.game.blockCount - 1);
    }
  }

  _updateStatus() {
    const pos = this.camera.position;
    const coordEl = document.getElementById('coords');
    const countEl = document.getElementById('block-count');
    if (coordEl) {
      coordEl.textContent = `位置: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`;
    }
    if (countEl) {
      countEl.textContent = `ブロック数: ${this.game.blockCount}`;
    }
  }
}

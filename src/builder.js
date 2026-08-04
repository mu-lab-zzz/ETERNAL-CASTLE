import * as THREE from './three.js';
import { getBlockType, getBlockGeometry, getAnchorFromHit, getMeshCenter, getEffectiveDims } from './block-defs.js';
import { getGhostMaterial } from './materials.js';
import { playSnap, playErase } from './audio.js';

export const MODE = { NAVIGATE: 'navigate', BUILD: 'build', ERASE: 'erase' };

export class Builder {
  constructor(camera, scene, world) {
    this.camera  = camera;
    this.scene   = scene;
    this.world   = world;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 60;

    this.mode      = MODE.BUILD;
    this.typeId    = 'cube';
    this.rotY      = 0;
    this.color     = '#e74c3c';
    this.preset    = 'basic';

    this._ghost = null;
    this._ghostMat = null;
    this._groundMesh = null;

    this.onCountChange = null;
  }

  setGround(mesh) { this._groundMesh = mesh; }

  setType(id)    { this.typeId = id;     this._rebuildGhost(); }
  setColor(c)    { this.color  = c;      this._rebuildGhost(); }
  setPreset(p)   { this.preset = p; }
  setMode(m)     {
    this.mode = m;
    if (this._ghost) this._ghost.visible = (m === MODE.BUILD);
  }

  rotateBlock() {
    this.rotY = (this.rotY + 90) % 360;
    if (this._ghost) {
      this._ghost.rotation.y = (this.rotY * Math.PI) / 180;
    }
  }

  _rebuildGhost() {
    if (this._ghost) {
      this.scene.remove(this._ghost);
      this._ghost = null;
    }
    const type = getBlockType(this.typeId);
    const geo  = getBlockGeometry(type);
    this._ghostMat = getGhostMaterial(this.color);
    this._ghost    = new THREE.Mesh(geo, this._ghostMat);
    this._ghost.rotation.y = (this.rotY * Math.PI) / 180;
    this._ghost.visible = (this.mode === MODE.BUILD);
    this._ghost.renderOrder = 1;
    this.scene.add(this._ghost);
  }

  _raycastCenter() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const targets = this._groundMesh
      ? [...this.world.getMeshes(), this._groundMesh]
      : this.world.getMeshes();
    const hits = this.raycaster.intersectObjects(targets, false);
    return hits[0] ?? null;
  }

  _raycastScreen(sx, sy) {
    const ndc = new THREE.Vector2(
      (sx / window.innerWidth) * 2 - 1,
      -(sy / window.innerHeight) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const targets = this._groundMesh
      ? [...this.world.getMeshes(), this._groundMesh]
      : this.world.getMeshes();
    return this.raycaster.intersectObjects(targets, false)[0] ?? null;
  }

  // Call every frame to update ghost position
  update() {
    if (!this._ghost) this._rebuildGhost();
    if (this.mode !== MODE.BUILD) { this._ghost.visible = false; return; }

    const hit = this._raycastCenter();
    if (!hit || hit.object === this._ghost) {
      this._ghost.visible = false;
      return;
    }

    const type   = getBlockType(this.typeId);
    const anchor = getAnchorFromHit(hit.point, hit.face.normal, type, this.rotY);
    const canPlace = this.world.canPlace(anchor, this.typeId, this.rotY);
    const center = getMeshCenter(anchor, type, this.rotY);

    this._ghost.position.copy(center);
    this._ghost.rotation.y = (this.rotY * Math.PI) / 180;
    this._ghost.visible = true;
    this._ghostMat.color.set(canPlace ? this.color : '#ff4444');
    this._ghostMat.opacity = canPlace ? 0.38 : 0.22;
  }

  // Called on tap/click (screen coords)
  handleTap(sx, sy) {
    if (this.mode === MODE.NAVIGATE) return;

    const hit = this._raycastScreen(sx, sy);

    if (this.mode === MODE.BUILD) {
      if (!hit || hit.object === this._ghost) return;
      const type   = getBlockType(this.typeId);
      const anchor = getAnchorFromHit(hit.point, hit.face.normal, type, this.rotY);
      const placed = this.world.place(anchor, this.typeId, this.rotY, this.color, this.preset);
      if (placed) {
        playSnap();
        this.onCountChange?.(this.world.getBlockCount());
      }
    } else if (this.mode === MODE.ERASE) {
      if (!hit || hit.object === this._ghost) return;
      const removed = this.world.removeByMesh(hit.object);
      if (removed) {
        playErase();
        this.onCountChange?.(this.world.getBlockCount());
      }
    }
  }

  // Place at center-crosshair (button action)
  placeAtCenter() {
    const hit = this._raycastCenter();
    if (!hit || hit.object === this._ghost) return;
    const type   = getBlockType(this.typeId);
    const anchor = getAnchorFromHit(hit.point, hit.face.normal, type, this.rotY);
    const placed = this.world.place(anchor, this.typeId, this.rotY, this.color, this.preset);
    if (placed) {
      playSnap();
      this.onCountChange?.(this.world.getBlockCount());
    }
  }

  eraseAtCenter() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const hits = this.raycaster.intersectObjects(this.world.getMeshes(), false);
    if (hits[0]) {
      const removed = this.world.removeByMesh(hits[0].object);
      if (removed) {
        playErase();
        this.onCountChange?.(this.world.getBlockCount());
      }
    }
  }
}
